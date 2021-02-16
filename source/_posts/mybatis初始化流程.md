---
title: mybatis初始化流程
urlname: tvgs3z
date: '2020-10-01 18:53:08 +0800'
tags: []
categories: []
---

mybatis 初始化的过程首先需要把配置文件加载成字节数入流，然后把输入流传入`org.apache.ibatis.session.SqlSessionFactoryBuilder#build(java.io.InputStream)`方法来构造`SqlSessionFactory`

```java
  public SqlSessionFactory build(InputStream inputStream, String environment, Properties properties) {
    try {
      // 解析xml
      XMLConfigBuilder parser = new XMLConfigBuilder(inputStream, environment, properties);
      // 创建SqlSessionFactory parser.parse() 的返回值是Configuration
      return build(parser.parse());
    } catch (Exception e) {
      throw ExceptionFactory.wrapException("Error building SqlSession.", e);
    } finally {
      ErrorContext.instance().reset();
      try {
        inputStream.close();
      } catch (IOException e) {
        // Intentionally ignore. Prefer previous error.
      }
    }
  }
```

`org.apache.ibatis.builder.xml.XMLConfigBuilder#parse`

```java
  public Configuration parse() {
    // XMLConfigBuilder只能用一次，判断是否用过
    if (parsed) {
      throw new BuilderException("Each XMLConfigBuilder can only be used once.");
    }
    parsed = true;
    // 读取xml的顶层标签configuration作为参数传入parseConfiguration
    parseConfiguration(parser.evalNode("/configuration"));
    return configuration;
  }
```

`org.apache.ibatis.builder.xml.XMLConfigBuilder#parseConfiguration` 具体解析

```java
  private void parseConfiguration(XNode root) {
    try {
      // 解析properties标签
      propertiesElement(root.evalNode("properties"));
      // 解析settings标签
      Properties settings = settingsAsProperties(root.evalNode("settings"));
      // 加载自定义VFS实现类
      loadCustomVfs(settings);
      // 解析typeAliases标签
      typeAliasesElement(root.evalNode("typeAliases"));
      // 解析plugins标签
      pluginElement(root.evalNode("plugins"));
      // 解析objectFactory标签
      objectFactoryElement(root.evalNode("objectFactory"));
      // 解析objectWrapperFactory标签
      objectWrapperFactoryElement(root.evalNode("objectWrapperFactory"));
      // 解析reflectorFactory标签
      reflectorFactoryElement(root.evalNode("reflectorFactory"));
      // 把settings的内容设置到Configuration
      settingsElement(settings);
      // 解析environments标签
      environmentsElement(root.evalNode("environments"));
      // 解析databaseIdProvider标签
      databaseIdProviderElement(root.evalNode("databaseIdProvider"));
      // 解析typeHandlers标签
      typeHandlerElement(root.evalNode("typeHandlers"));
      // 解析mappers标签
      mapperElement(root.evalNode("mappers"));
    } catch (Exception e) {
      throw new BuilderException("Error parsing SQL Mapper Configuration. Cause: " + e, e);
    }
  }
```

结果解析方法之后得到一个`Configuration`对象

org.apache.ibatis.session.SqlSessionFactoryBuilder#build(org.apache.ibatis.session.Configuration)
构建 DefaultSqlSessionFactory

```java
  public SqlSessionFactory build(Configuration config) {
    // 传入 Configuration 对象
    return new DefaultSqlSessionFactory(config);
  }
```
