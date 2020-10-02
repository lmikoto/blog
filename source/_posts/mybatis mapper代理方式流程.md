---
title: mybatis mapper代理方式流程
urlname: dkaztm
date: 2020-10-01 21:04:42 +0800
tags: []
categories: []
---

mapper 代理方式的本质就是动态代理。

在解析 xml 的时候对 mapper 标签进行解析
`org.apache.ibatis.builder.xml.XMLConfigBuilder#mapperElement`

```java
  private void mapperElement(XNode parent) throws Exception {
    if (parent != null) {
      for (XNode child : parent.getChildren()) {
        if ("package".equals(child.getName())) {
          // 如果是package的方式配置
          String mapperPackage = child.getStringAttribute("name");
          configuration.addMappers(mapperPackage);
        } else {
          String resource = child.getStringAttribute("resource");
          String url = child.getStringAttribute("url");
          String mapperClass = child.getStringAttribute("class");
          if (resource != null && url == null && mapperClass == null) {
            ErrorContext.instance().resource(resource);
            InputStream inputStream = Resources.getResourceAsStream(resource);
            XMLMapperBuilder mapperParser = new XMLMapperBuilder(inputStream, configuration, resource, configuration.getSqlFragments());
            mapperParser.parse();
          } else if (resource == null && url != null && mapperClass == null) {
            ErrorContext.instance().resource(url);
            InputStream inputStream = Resources.getUrlAsStream(url);
            XMLMapperBuilder mapperParser = new XMLMapperBuilder(inputStream, configuration, url, configuration.getSqlFragments());
            mapperParser.parse();
          } else if (resource == null && url == null && mapperClass != null) {
            Class<?> mapperInterface = Resources.classForName(mapperClass);
            configuration.addMapper(mapperInterface);
          } else {
            throw new BuilderException("A mapper element may only specify a url, resource or class, but not more than one.");
          }
        }
      }
    }
  }
```

这里有个`if-esle`，对用着 mybatis 的两种`mapper`配置。这里我们来看`package`的这种配置方式。

一直往下找到`org.apache.ibatis.binding.MapperRegistry#addMappers(java.lang.String, java.lang.Class<?>)`

```java
  public void addMappers(String packageName, Class<?> superType) {
    // 使用工具类扫包下面的所有class
    ResolverUtil<Class<?>> resolverUtil = new ResolverUtil<Class<?>>();
    resolverUtil.find(new ResolverUtil.IsA(superType), packageName);
    Set<Class<? extends Class<?>>> mapperSet = resolverUtil.getClasses();
    for (Class<?> mapperClass : mapperSet) {
      addMapper(mapperClass);
    }
  }
```

使用工具类扫包下面的所有 class，然后对每个 class，调用`org.apache.ibatis.binding.MapperRegistry#addMapper`

```java
  public <T> void addMapper(Class<T> type) {
    // mapper必须是接口
    if (type.isInterface()) {
      // 只加载一次
      if (hasMapper(type)) {
        throw new BindingException("Type " + type + " is already known to the MapperRegistry.");
      }
      boolean loadCompleted = false;
      try {
        knownMappers.put(type, new MapperProxyFactory<T>(type));
        // 解析mapper上的注解
        MapperAnnotationBuilder parser = new MapperAnnotationBuilder(config, type);
        parser.parse();
        loadCompleted = true;
      } finally {
        if (!loadCompleted) {
          knownMappers.remove(type);
        }
      }
    }
  }
```

在`addMapper`这里会把当前接口添加到`knownMappers`中。这是一个 key 是接口类型，value 是`MapperProxyFactory`的 map。
再来看下什么时候会用到这个 map。
在使用`org.apache.ibatis.session.defaults.DefaultSqlSession#getMapper`获取 mapper 接口的时候。一直往下找，直到
`org.apache.ibatis.binding.MapperRegistry#getMapper`

```java
  public <T> T getMapper(Class<T> type, SqlSession sqlSession) {
    final MapperProxyFactory<T> mapperProxyFactory = (MapperProxyFactory<T>) knownMappers.get(type);
    if (mapperProxyFactory == null) {
      throw new BindingException("Type " + type + " is not known to the MapperRegistry.");
    }
    try {
      return mapperProxyFactory.newInstance(sqlSession);
    } catch (Exception e) {
      throw new BindingException("Error getting mapper instance. Cause: " + e, e);
    }
  }
```

这里会从刚才的 map 中把`MapperProxyFactory`掏出来，然后调用`newInstance`方法生成返回值。
再来看一下`newInstance`

```java
  public T newInstance(SqlSession sqlSession) {
    // 新建一个MapperProxy
    final MapperProxy<T> mapperProxy = new MapperProxy<T>(sqlSession, mapperInterface, methodCache);
    return newInstance(mapperProxy);
  }

  protected T newInstance(MapperProxy<T> mapperProxy) {
    // 返回jdk动态代理的对象。
    return (T) Proxy.newProxyInstance(mapperInterface.getClassLoader(), new Class[] { mapperInterface }, mapperProxy);
  }
```

再来看一下`MapperProxy`这个类。这个类实现了 jdk 动态代理的`InvocationHandler`

```java
  @Override
  public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
    try {
      if (Object.class.equals(method.getDeclaringClass())) {
        return method.invoke(this, args);
      } else if (isDefaultMethod(method)) {
        return invokeDefaultMethod(proxy, method, args);
      }
    } catch (Throwable t) {
      throw ExceptionUtil.unwrapThrowable(t);
    }
    final MapperMethod mapperMethod = cachedMapperMethod(method);
    // 执行方法
    return mapperMethod.execute(sqlSession, args);
  }
```

最后在`org.apache.ibatis.binding.MapperMethod#execute`中调用 sqlSession 的方法，完成调用。
