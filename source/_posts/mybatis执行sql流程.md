---
title: mybatis执行sql流程
urlname: nx5xtx
date: '2020-10-01 19:21:31 +0800'
tags: []
categories: []
---

## SqlSession

`org.apache.ibatis.session.SqlSession`是一个接口。在 mybatis 中有两个实现类
![image.png](/images/1601551497204-0768fd64-b574-4b47-a49d-a4fbea572994.png)
下文分析的代码是默认的实现类`org.apache.ibatis.session.defaults.DefaultSqlSession```

`SqlSession`是 mybatis 用于和数据库交互的顶层类，通常将它于`ThreadLocal`绑定，一个会话使用一个`SqlSession`线程不安全，在使用完毕需要 close。

## Executor

`org.apache.ibatis.executor.Executor`是`SqlSession`中的一个属性，`SqlSession`在实际执行的过程中把命令委托给`Executor`。
`Executor`是一个接口，有三个常用的实现类

- `org.apache.ibatis.executor.BatchExecutor`重用语句，并执行批量更新
- `org.apache.ibatis.executor.ReuseExecutor`重用预处理语句 prepared statements
- `org.apache.ibatis.executor.SimpleExecutor`普通执行器，默认

## 执行 sql

获取`sqlSession`
`org.apache.ibatis.session.defaults.DefaultSqlSessionFactory#openSessionFromDataSource`

```java
  private SqlSession openSessionFromDataSource(ExecutorType execType, TransactionIsolationLevel level, boolean autoCommit) {
    // ExecutorType Executor的类型，类型对应着上面提到的三个实现类，这里外面传过来的是simple
    // TransactionIsolationLevel 事物隔离级别
    // autoCommit 是否自动提交事物
    Transaction tx = null;
    try {
      // 运行环境
      final Environment environment = configuration.getEnvironment();
      // 事物
      final TransactionFactory transactionFactory = getTransactionFactoryFromEnvironment(environment);
      tx = transactionFactory.newTransaction(environment.getDataSource(), level, autoCommit);
      // 初始化Executor，因为上面传来的type是simple，这里实际上生成的是SimpleExecutor
      final Executor executor = configuration.newExecutor(tx, execType);
      // 生产DefaultSqlSession
      return new DefaultSqlSession(configuration, executor, autoCommit);
    } catch (Exception e) {
      closeTransaction(tx); // may have fetched a connection so lets call close()
      throw ExceptionFactory.wrapException("Error opening session.  Cause: " + e, e);
    } finally {
      ErrorContext.instance().reset();
    }
  }
```

获取到`sqlSession`之后就可以使用`sqlSession`的 api 了

`org.apache.ibatis.session.defaults.DefaultSqlSession#selectList(java.lang.String, java.lang.Object, org.apache.ibatis.session.RowBounds)`

```java
  @Override
  public <E> List<E> selectList(String statement, Object parameter, RowBounds rowBounds) {
    try {
      // 根据传过来的statementId 获取MappedStatement对象，这个对象封装了sql语句
      MappedStatement ms = configuration.getMappedStatement(statement);
      // 执行查询操作。实际上是executor执行的
      return executor.query(ms, wrapCollection(parameter), rowBounds, Executor.NO_RESULT_HANDLER);
    } catch (Exception e) {
      throw ExceptionFactory.wrapException("Error querying database.  Cause: " + e, e);
    } finally {
      ErrorContext.instance().reset();
    }
  }
```

### SimpleExecutor

`org.apache.ibatis.executor.BaseExecutor#query(org.apache.ibatis.mapping.MappedStatement, java.lang.Object, org.apache.ibatis.session.RowBounds, org.apache.ibatis.session.ResultHandler)`

```java
  @Override
  public <E> List<E> query(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler) throws SQLException {
    // 根据传入参数动态获取sql
    BoundSql boundSql = ms.getBoundSql(parameter);
    // 创建本次查询的缓存key
    CacheKey key = createCacheKey(ms, parameter, rowBounds, boundSql);
    return query(ms, parameter, rowBounds, resultHandler, key, boundSql);
 }
```

`org.apache.ibatis.executor.BaseExecutor#query(org.apache.ibatis.mapping.MappedStatement, java.lang.Object, org.apache.ibatis.session.RowBounds, org.apache.ibatis.session.ResultHandler, org.apache.ibatis.cache.CacheKey, org.apache.ibatis.mapping.BoundSql)`

```java
  @Override
  public <E> List<E> query(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler, CacheKey key, BoundSql boundSql) throws SQLException {
    ErrorContext.instance().resource(ms.getResource()).activity("executing a query").object(ms.getId());
    // 执行器是否被关闭
    if (closed) {
      throw new ExecutorException("Executor was closed.");
    }
    if (queryStack == 0 && ms.isFlushCacheRequired()) {
      clearLocalCache();
    }
    List<E> list;
    try {
      queryStack++;
      // 从一级缓存中获取查询结果
      list = resultHandler == null ? (List<E>) localCache.getObject(key) : null;
      if (list != null) {
        handleLocallyCachedOutputParameters(ms, key, parameter, boundSql);
      } else {
        // 查不到，从数据库中查
        list = queryFromDatabase(ms, parameter, rowBounds, resultHandler, key, boundSql);
      }
    } finally {
      queryStack--;
    }
    if (queryStack == 0) {
      for (DeferredLoad deferredLoad : deferredLoads) {
        deferredLoad.load();
      }
      deferredLoads.clear();
      if (configuration.getLocalCacheScope() == LocalCacheScope.STATEMENT) {
        clearLocalCache();
      }
    }
    return list;
  }
```

`org.apache.ibatis.executor.BaseExecutor#queryFromDatabase`

```java
  private <E> List<E> queryFromDatabase(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler, CacheKey key, BoundSql boundSql) throws SQLException {
    List<E> list;
    // 添加占位对象，这个跟延迟加载有关。org.apache.ibatis.executor.BaseExecutor.DeferredLoad#canLoad
    localCache.putObject(key, EXECUTION_PLACEHOLDER);
    try {
      // 执行操作
      list = doQuery(ms, parameter, rowBounds, resultHandler, boundSql);
    } finally {
      // 移除占位对象
      localCache.removeObject(key);
    }
    // 添加到一级缓存中
    localCache.putObject(key, list);
    if (ms.getStatementType() == StatementType.CALLABLE) {
      localOutputParameterCache.putObject(key, parameter);
    }
    return list;
  }
```

`org.apache.ibatis.executor.SimpleExecutor#doQuery`

```java
    Statement stmt = null;
    try {
      Configuration configuration = ms.getConfiguration();
      // 创建StatementHandler对象来执行查询
      StatementHandler handler = configuration.newStatementHandler(wrapper, ms, parameter, rowBounds, resultHandler, boundSql);
      // 创建组装statement对象
      stmt = prepareStatement(handler, ms.getStatementLog());
      // 执行操作
      return handler.<E>query(stmt, resultHandler);
    } finally {
      closeStatement(stmt);
    }
```

### StatementHandler

设置参数

```java
  @Override
  public void parameterize(Statement statement) throws SQLException {
    // 真正设置参数的是parameterHandler
    parameterHandler.setParameters((PreparedStatement) statement);
  }
```

`org.apache.ibatis.scripting.defaults.DefaultParameterHandler#setParameters`

```java
  @Override
  public void setParameters(PreparedStatement ps) {
    ErrorContext.instance().activity("setting parameters").object(mappedStatement.getParameterMap().getId());
    List<ParameterMapping> parameterMappings = boundSql.getParameterMappings();
    if (parameterMappings != null) {
      for (int i = 0; i < parameterMappings.size(); i++) {
        // 获取parameterMapping
        ParameterMapping parameterMapping = parameterMappings.get(i);
        if (parameterMapping.getMode() != ParameterMode.OUT) {
          // 获取name，根据name获取值
          Object value;
          String propertyName = parameterMapping.getProperty();
          if (boundSql.hasAdditionalParameter(propertyName)) { // issue #448 ask first for additional params
            value = boundSql.getAdditionalParameter(propertyName);
          } else if (parameterObject == null) {
            value = null;
          } else if (typeHandlerRegistry.hasTypeHandler(parameterObject.getClass())) {
            value = parameterObject;
          } else {
            MetaObject metaObject = configuration.newMetaObject(parameterObject);
            value = metaObject.getValue(propertyName);
          }
          // 获取TypeHandler 负责jdbcType和javaType之间的类型转换
          TypeHandler typeHandler = parameterMapping.getTypeHandler();
          JdbcType jdbcType = parameterMapping.getJdbcType();
          if (value == null && jdbcType == null) {
            jdbcType = configuration.getJdbcTypeForNull();
          }
          // 设置？占位符的参数
          try {
            typeHandler.setParameter(ps, i + 1, value, jdbcType);
          } catch (TypeException e) {
            throw new TypeException("Could not set parameters for mapping: " + parameterMapping + ". Cause: " + e, e);
          } catch (SQLException e) {
            throw new TypeException("Could not set parameters for mapping: " + parameterMapping + ". Cause: " + e, e);
          }
        }
      }
    }
  }
```

`org.apache.ibatis.executor.statement.PreparedStatementHandler#query`

```java
  @Override
  public <E> List<E> query(Statement statement, ResultHandler resultHandler) throws SQLException {
    PreparedStatement ps = (PreparedStatement) statement;
    // 执行查询
    ps.execute();
    // 处理结果
    return resultSetHandler.<E> handleResultSets(ps);zh
  }
```

`org.apache.ibatis.executor.resultset.DefaultResultSetHandler#handleResultSets`

```java
  @Override
  public List<Object> handleResultSets(Statement stmt) throws SQLException {
    ErrorContext.instance().activity("handling results").object(mappedStatement.getId());

    // 多ResultdSet的结果集合，每个ResultSet对应一个Object对象。而实际上，每个Object都是List<Object>对象
    // 在不考虑存储过程中的多ResultdSet的情况，普通查询就有一个ResultdSet
    final List<Object> multipleResults = new ArrayList<Object>();

    int resultSetCount = 0;
    // 获取首个ResultdSet并封装成ResultSetWrapper
    ResultSetWrapper rsw = getFirstResultSet(stmt);

    // 获取resultMaps
    List<ResultMap> resultMaps = mappedStatement.getResultMaps();
    int resultMapCount = resultMaps.size();
    // 校验
    validateResultMapsCount(rsw, resultMapCount);
    while (rsw != null && resultMapCount > resultSetCount) {
      // 获取ResultMap
      ResultMap resultMap = resultMaps.get(resultSetCount);
      // 处理ResultSet 将结果放入multipleResults
      handleResultSet(rsw, resultMap, multipleResults, null);
      // 获取下一个
      rsw = getNextResultSet(stmt);
      cleanUpAfterHandlingResultSet();
      resultSetCount++;
    }

    // 存储过程中使用
    String[] resultSets = mappedStatement.getResultSets();
    if (resultSets != null) {
      while (rsw != null && resultSetCount < resultSets.length) {
        ResultMapping parentMapping = nextResultMaps.get(resultSets[resultSetCount]);
        if (parentMapping != null) {
          String nestedResultMapId = parentMapping.getNestedResultMapId();
          ResultMap resultMap = configuration.getResultMap(nestedResultMapId);
          handleResultSet(rsw, resultMap, null, parentMapping);
        }
        rsw = getNextResultSet(stmt);
        cleanUpAfterHandlingResultSet();
        resultSetCount++;
      }
    }

    // 如果是单元素，则取第一个元素返回
    return collapseSingleResultList(multipleResults);
  }
```

`org.apache.ibatis.executor.resultset.DefaultResultSetHandler#handleResultSet`

```java
  private void handleResultSet(ResultSetWrapper rsw, ResultMap resultMap, List<Object> multipleResults, ResultMapping parentMapping) throws SQLException {
    try {
      // 存储过程会调用到if中
      if (parentMapping != null) {
        handleRowValues(rsw, resultMap, null, RowBounds.DEFAULT, parentMapping);
      } else {
        if (resultHandler == null) {
          DefaultResultHandler defaultResultHandler = new DefaultResultHandler(objectFactory);
          // 处理ResultSet 返回每一行的row
          handleRowValues(rsw, resultMap, defaultResultHandler, rowBounds, null);
          // 处理后的结果添加到multipleResults
          multipleResults.add(defaultResultHandler.getResultList());
        } else {
          handleRowValues(rsw, resultMap, resultHandler, rowBounds, null);
        }
      }
    } finally {
      closeResultSet(rsw.getResultSet());
    }
  }
```
