---
title: Activiti7源码分析(二)Service调用链路
date: 2020-05-13 09:03:17
tags: ['java','activiti']
---
## 概要
Activiti采用命令和指责链作为基础的开发模式。各Service中定义的方法都有相对应的命令对象Cmd。Service把各种请求委托给Cmd。而一个Cmd执行的过程中需要进行一些外围的处理，这些处理过程是一个职责链。

## 初始化
从流程引擎的配置实现类`ProcessEngineConfigurationImpl`为入口进入。init方法
```java
public void init() {
  // ...

  initCommandExecutors();

  // ...
}
```
`initCommandExecutors`中会出事一些配置，比较重要的是最后两个。
```java
public void initCommandExecutors() {
  initDefaultCommandConfig();
  initSchemaCommandConfig();
  initCommandInvoker();
  // 初始化命令拦截器
  initCommandInterceptors();
  // 初始化命令执行器
  initCommandExecutor();
}
```
首先来看`initCommandInterceptors`
```java
public void initCommandInterceptors() {
  if (commandInterceptors == null) {
    commandInterceptors = new ArrayList<CommandInterceptor>();
    if (customPreCommandInterceptors != null) {
      commandInterceptors.addAll(customPreCommandInterceptors);
    }
    commandInterceptors.addAll(getDefaultCommandInterceptors());
    if (customPostCommandInterceptors != null) {
      commandInterceptors.addAll(customPostCommandInterceptors);
    }
    commandInterceptors.add(commandInvoker);
  }
}
```

上班了。。。。晚上继续补
