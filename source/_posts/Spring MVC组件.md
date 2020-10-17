---
title: Spring MVC组件
urlname: nkfetd
date: 2020-10-12 09:19:35 +0800
tags: []
categories: []
---

这里说的 Spring MVC 组件指的是 Spring MVC 入口`DispatcherServlet`中的九个重要的私有变量。这些组件都是接口。可以自由扩展。

### HandlerMapping 处理器映射器

`HandlerMapping`是用来查找`Hanlder`的，`Hanlder`具体的表现形式~~可以是类（继承或实现接口基本没人这么用了）~~，也可以是方法。比如标注了`@RequestMapping`的方法都是`Hanlder`。`Handler`负责具体的请求处理。在请求到达之后`HandlerMapping`的作用就是找到对应的处理的`Handler`和`Interceptor`

### HanlderAdapter 处理器适配器

`HanlderAdapter`是一个适配器。Spring MVC 中的`Hanlder`除了注解标注还有别的形式（虽然不常用）。Spring MVC 把请求转发给`Servlet`的时候。`HanlderAdapter`用来适配不同种类的`Hanlder`

### HandlerExceptionResolver

`HanlderExceptionResolver`用于处理`Handler`产生的异常情况。

### ViewResolver

视图解析器。用于将 String 类型的视图和 Local 解析成 View 类型的视图。只有一个`resolveViewName`方法。将 Controller 层返回的 String 类型的视图名称会在这里转换成`View`对象。
ViewResolver 在这个过程中做两件事。

- 找到渲染的模版
- 找到视图类型 比如 jsp

### RequestToViewNameTranslator

从请求中获取 ViewName。因为 ViewResolve 是根据 ViewName 去进行查找 View 的。但有的`Handler`处理完之后没有设置 View 和 ViewName，这个时候会通过这个组件从 Request 查找 ViewName，实际上是 path

### LocaleResolver

用于从请求中解析出 Local，这个组件是 i18n 的基础。

### ThemeResolver

用来解析主题的。主题是样式、图片及他们所形成的显示效果集合。一套主题对应一个 properties 文件。
`ThemeResolver`负责从请求中解析出主题名。ThemeResolver 根据主题名找出具体的主题，其抽象就是 Theme，可以通过 Theme 获取主题和具体资源。现在一般都不用了。

### MultipartResolver

MultipartResolver 用于上传请求，通过将普通请求包装成`MultipartHttpServletRequest`来实现的，是普通的请求拥有上传文件的功能。

### FlashMapManager

FlashMap 用于重定向的时候参数传递。实质上是把参数扔到了 OUTPUT_FLASH_MAP_ATTRIBUTE 中。

## 初始化过程

当 IOC 容器初始化完成之后发布事件，触发事件监听调用到`org.springframework.web.servlet.DispatcherServlet#onRefresh`
而这些组件是在这里初始化的

```java
@Override
protected void onRefresh(ApplicationContext context) {
    initStrategies(context);
}

protected void initStrategies(ApplicationContext context) {
    initMultipartResolver(context);
    initLocaleResolver(context);
    initThemeResolver(context);
    initHandlerMappings(context);
    initHandlerAdapters(context);
    initHandlerExceptionResolvers(context);
    initRequestToViewNameTranslator(context);
    initViewResolvers(context);
    initFlashMapManager(context);
}
```

这里大体的套路都是类似的。找一个进去看看就能明白大致的过程了。
org.springframework.web.servlet.DispatcherServlet#initHandlerMappings

```java
	private void initHandlerMappings(ApplicationContext context) {
		this.handlerMappings = null;

		if (this.detectAllHandlerMappings) {
			// 从容器中拿到所有的HandlerMapping对象
			Map<String, HandlerMapping> matchingBeans =
					BeanFactoryUtils.beansOfTypeIncludingAncestors(context, HandlerMapping.class, true, false);
			if (!matchingBeans.isEmpty()) {
				this.handlerMappings = new ArrayList<>(matchingBeans.values());
				// 按照order排序
 				AnnotationAwareOrderComparator.sort(this.handlerMappings);
			}
		}
		else {
			try {
				// 用固定的名称来找
				HandlerMapping hm = context.getBean(HANDLER_MAPPING_BEAN_NAME, HandlerMapping.class);
				this.handlerMappings = Collections.singletonList(hm);
			}
			catch (NoSuchBeanDefinitionException ex) {
				// Ignore, we'll add a default HandlerMapping later.
			}
		}

		// 如果上面没找到 走默认的
		// 默认的实际上就是读配置文件 DispatcherServlet.properties 中的配置进行加载的
		if (this.handlerMappings == null) {
			this.handlerMappings = getDefaultStrategies(context, HandlerMapping.class);
			if (logger.isTraceEnabled()) {
				logger.trace("No HandlerMappings declared for servlet '" + getServletName() +
						"': using default strategies from DispatcherServlet.properties");
			}
		}
	}
```

`org.springframework.web.servlet.DispatcherServlet#initMultipartRes olver`

```java
	private void initMultipartResolver(ApplicationContext context) {
		try {
            // 这行代码可以说明为什么多文件解析器需要配置一个固定名称的bean,因为这里是写死的
			this.multipartResolver = context.getBean(MULTIPART_RESOLVER_BEAN_NAME, MultipartResolver.class);
			if (logger.isTraceEnabled()) {
				logger.trace("Detected " + this.multipartResolver);
			}
			else if (logger.isDebugEnabled()) {
				logger.debug("Detected " + this.multipartResolver.getClass().getSimpleName());
			}
		}
		catch (NoSuchBeanDefinitionException ex) {
			this.multipartResolver = null;
			if (logger.isTraceEnabled()) {
				logger.trace("No MultipartResolver '" + MULTIPART_RESOLVER_BEAN_NAME + "' declared");
			}
		}
	}
```
