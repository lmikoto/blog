---
title: Activiti7源码分析(一)-获取源码
date: 2020-05-12 00:00:00
tags: ['activiti','java']
---
首先从github上面下载源码
```Bash
git@github.com:Activiti/Activiti.git
```
切换到要分析的tag
```Bash
git branch my v7.1.224
```
来简单的看一下activiti的项目结构
![](/images/55c83a90-df34-49d2-9dbc-e7fdbcdfe676.png)
- activiti-api 接口定义
- activiti-core 流程引擎核心实现
- activiti-core-common 流程引擎公共服务
- activiti-dependencies 该模块管理activiti的依赖关系
- activiti-dependency-check 内置build-helper-maven-plugin插件负责在安装或部署artifact的时候，附加的安装或部署一些其他资源或文件
- activiti-examples 该模块中有activiti的一些例子
