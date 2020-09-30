---
title: Activiti7源码分析(一)-获取源码
urlname: nztar0
date: 2020-09-29 22:02:30 +0800
tags: []
categories: []
---

首先从 github 上面下载源码

```bash
git@github.com:Activiti/Activiti.git
```

切换到要分析的 tag

```bash
git branch my v7.1.224
```

来简单的看一下 activiti 的项目结构
![55c83a90-df34-49d2-9dbc-e7fdbcdfe676.png](/images/55c83a90-df34-49d2-9dbc-e7fdbcdfe676.png)

- activiti-api 接口定义
- activiti-core 流程引擎核心实现
- activiti-core-common 流程引擎公共服务
- activiti-dependencies 该模块管理 activiti 的依赖关系
- activiti-dependency-check 内置 build-helper-maven-plugin 插件负责在安装或部署 artifact 的时候，附加的安装或部署一些其他资源或文件
- activiti-examples 该模块中有 activiti 的一些例子
