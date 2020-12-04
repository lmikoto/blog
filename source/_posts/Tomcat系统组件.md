---
title: Tomcat系统组件
urlname: neryv0
date: 2020-10-31 18:47:50 +0800
tags: []
categories: []
---

Tomcat 有两个身份

- http 服务器
- Tomcat 是一个 Servlet 容器

Tomcat 即按照 Servlet 规范去实现了 Servlet 容器，同时具有 Http 服务器的功能。
Http 服务器接受请求之后交给 Servlet 容器来处理。Servlet 容器通过 Servlet 接口调用业务功能。**Servlet 接口和 Servlet 容器的这一套规范叫做 Servlet 规范**
\*\*

## Tomcat Servlet 容器处理流程

1. Http 服务器会把请求信息使用 ServletRequest 对象封装起来
1. Servlet 容器拿到请求后根据 url 和 Servlet 的映射关系，找到对应的 Servlet
1. 如果 Servlet 还没被加载，就用反射生成 Servlet。并调用 Servlet 的 init 方法完成初始化
1. 调用具体 Servlet 中的方法来出气请求，处理结果使用 ServletResponse 对象封装
1. 把 ServletResponse 对象转换程 response 返回给 Http 服务器，Http 服务器把请求发送给客户端

## Tomcat 整体架构

1. Connector 组件 和客户端浏览器进行交互，进行 socket 通信，将字节流和 Request/Response 等对象进行转换
1. 容器组件 Servlet 容器处理业务逻辑

## 连接器组件 Coyote

coyote 是对外的接口，客户端通过 coyote 与服务器建立链接，发送请求并接受相应

1. Coyote 封装了底层的网络通信（Socket 请求及响应处理）
1. Coyote 使 Catalina 容器 与具体的请求协议及 io 操作方式完全解耦
1. Coyote 将 Socket 输入转换成 Request 对象，进一步分装之后交给 Catalina 容器进行处理，处理完成后，Catalina 通过 Coyote 提供的 Response 对象写入输出流。
1. Coyote 负责的是具体的协议（应用层）和 IO（传输层）的内容

### 组件及作用

| **组件**        | **作用**                                                                                                                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EndPoint        | 是 Coyote 通信端点，即通信监听的接口，是具体 Socket 的接收和发送处理器，是对传输层的抽象。用来实现 TCP/IP 协议的                                                                                                       |
| Processor       | 是 Coyote 协议处理接口，Processor 是用来实现 HTTP 协议，Processor 接收来自 EndPoint 的 Socket，读取字节流解析成 Tomcat Request 和 Response 对象，并通过 Adapter 将其提交给容器处理，Processor 是对应的应用层协议抽象。 |
| ProtocolHandler | Coyote 协议接口，通过 EndPoint 的 Processor，实现了针对具体协议的处理能力                                                                                                                                              |
| Adapter         | 将 Tomcat Request 转换成 ServletRequest，再调用容器                                                                                                                                                                    |

## Servlet 容器 Catalina

Catalina 实例通过加载 server.xml 完成实例的创建，创建并管理一个 Server，Server 创建并管理多个服务，每个服务又可以有多个 Connector 和一个 Container

### Catalina

负责解析 server.xml。以此来创建服务器 Server 组件并进行管理

### Server

Server 表示整个 Catalina Servlet 组件以及其他组件，负责组装并启动 Servlet 疫情，连接器，Server 通过实现 Lifcycle 接口，提供了一种优雅的启动和关闭整个系统的方式。

### Service

Service 是 Server 内部组件，一个 Server 保函多个 Service，他将若干个 Connector 组件绑定到一个 Container

### Container

负责处理用户的 Servlet 请求，并返回对象给 web 用户的模块

#### Engine

表示整个 Catalina 的 Servlet 引擎，用来管理多个虚拟站点，一个 Servlet 最多一个 Engine，但是一个引擎可能包含多个 Host

#### Host

代表一个虚拟主机，可以给 Tomcat 配置多个虚拟主机地址，一个虚拟主机下面有多个 Context

#### Context

表示一个 Web 应用程序，一个 Web 应用可以包含多个 Wrapper

#### Wrapper

表示一个 Servlet，Wrapper 作为容器的最底层
