---
title: Spring MVC处理请求流程
urlname: mozkw8
date: '2020-10-17 17:53:42 +0800'
tags: []
categories: []
---

Spring MVC 是对 Servlet 的封装。在 Web 项目中配置的 Servlet 是`org.springframework.web.servlet.DispatcherServlet`
doGet、doPost 这些方法的实现是在他的父类`FrameworkServlet`中，然后经过一系列的调研到了
`org.springframework.web.servlet.DispatcherServlet#doDispatch`
这个方法大致有四个流程

1. 调用`getHandler`获取能够处理当前请求的执行链`HandlerExecutionChain`。
1. 调用`getHandlerAdapter`获取能够执行 Handler 的适配器。
1. 适配器调用 Handler 执行方法，统一返回 ModelAndView 对象。
1. 调用 processDispatchResult 方法完成视图的渲染。

```java
protected void doDispatch(HttpServletRequest request, HttpServletResponse response) throws Exception {
    HttpServletRequest processedRequest = request;
    HandlerExecutionChain mappedHandler = null;
    boolean multipartRequestParsed = false;

    WebAsyncManager asyncManager = WebAsyncUtils.getAsyncManager(request);

    try {
        ModelAndView mv = null;
        Exception dispatchException = null;

        try {
            // 处理上传文件请求
            processedRequest = checkMultipart(request);
            multipartRequestParsed = (processedRequest != request);

            // 1 取得当前请求 Handler
            // 不是直接返回Controller 而是返回HandlerExecutionChain
            // 该对象封装了Handler和Interceptor
            mappedHandler = getHandler(processedRequest);
            if (mappedHandler == null) {
                // 没找到 404
                noHandlerFound(processedRequest, response);
                return;
            }

            // 2 获取处理请求的适配器
            HandlerAdapter ha = getHandlerAdapter(mappedHandler.getHandler());

            // 处理last-modified请求头 一些缓存的东西
            String method = request.getMethod();
            boolean isGet = "GET".equals(method);
            if (isGet || "HEAD".equals(method)) {
                long lastModified = ha.getLastModified(request, mappedHandler.getHandler());
                if (new ServletWebRequest(request, response).checkNotModified(lastModified) && isGet) {
                    return;
                }
            }

            // 拦截器
            if (!mappedHandler.applyPreHandle(processedRequest, response)) {
                return;
            }

            // 3. 实际处理请求，返回结果的视图对象
            mv = ha.handle(processedRequest, response, mappedHandler.getHandler());

            if (asyncManager.isConcurrentHandlingStarted()) {
                return;
            }

            // 结果视图处理，如果没有设置默认视图，给一个默认的视图名称，就是请求路径
            applyDefaultViewName(processedRequest, mv);
            // 拦截器 postHandler
            mappedHandler.applyPostHandle(processedRequest, response, mv);
        }
        catch (Exception ex) {
            dispatchException = ex;
        }
        catch (Throwable err) {
            dispatchException = new NestedServletException("Handler dispatch failed", err);
        }

        // 4 页面渲染
        processDispatchResult(processedRequest, response, mappedHandler, mv, dispatchException);
    }
    catch (Exception ex) {
        triggerAfterCompletion(processedRequest, response, mappedHandler, ex);
    }
    catch (Throwable err) {
        triggerAfterCompletion(processedRequest, response, mappedHandler,
                               new NestedServletException("Handler processing failed", err));
    }
    finally {
        if (asyncManager.isConcurrentHandlingStarted()) {
            // 异步的因为前面return了，会直接到这里
            if (mappedHandler != null) {
                mappedHandler.applyAfterConcurrentHandlingStarted(processedRequest, response);
            }
        }
        else {
            // Clean up any resources used by a multipart request.
            if (multipartRequestParsed) {
                cleanupMultipart(processedRequest);
            }
        }
    }
}
```

## getHandler

```java
protected HandlerExecutionChain getHandler(HttpServletRequest request) throws Exception {
    if (this.handlerMappings != null) {
        // 在运行的时候这个list里面会有两个元素
        // BeanNameUrlHandlerMapping 这个是早期用xml配置的形式用的
        // RequestMappingHandlerMapping 注解的形式
        for (HandlerMapping mapping : this.handlerMappings) {
            HandlerExecutionChain handler = mapping.getHandler(request);
            if (handler != null) {
                return handler;
            }
        }
    }
    return null;
}
```

执行的过程 [https://www.yuque.com/lmikoto/lmikoto/gv5dn0](https://www.yuque.com/lmikoto/lmikoto/gv5dn0)

## getHandlerAdapter

```java
protected HandlerAdapter getHandlerAdapter(Object handler) throws ServletException {
    if (this.handlerAdapters != null) {
        // 遍历适配器，选择支持的适配器
       	// HttpRequestHandlerAdapter 处理以继承HttpRequestHandler的方式实现的Handler
        // SimpleControllerHandlerAdapter 处理实现Controller接口定义的Handler
        // RequestMappingHandlerAdapter 处理注解形式定义的Handler
        for (HandlerAdapter adapter : this.handlerAdapters) {
            if (adapter.supports(handler)) {
                return adapter;
            }
        }
    }
    throw new ServletException("No adapter for handler [" + handler +
                               "]: The DispatcherServlet configuration needs to include a HandlerAdapter that supports this handler");
}
```
