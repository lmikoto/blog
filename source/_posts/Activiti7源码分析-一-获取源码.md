---
title: Activiti7源码分析(一)获取源码
date: 2020-05-12 19:46:20
tags: ['java','activiti']
---
首先从github上面下载源码
```bash
git@github.com:Activiti/Activiti.git
```
切换到要分析的tag
```
git branch my v7.1.224
```
来简单的看一下activiti的项目结构

![](/images/Activiti7源码分析-一-获取源码/2020-05-12-20-05-57.png)


- activiti-api 接口定义
- activiti-core 流程引擎核心实现
- activiti-core-common 流程引擎公共服务
- activiti-dependencies 该模块管理activiti的依赖关系
- activiti-dependency-check 内置build-helper-maven-plugin插件负责在安装或部署artifact的时候，附加的安装或部署一些其他资源或文件
- activiti-examples 该模块中有activiti的一些例子


