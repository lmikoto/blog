---
title: Spring MVC Handler方法执行过程
urlname: gv5dn0
date: '2020-10-17 20:10:42 +0800'
tags: []
categories: []
---

这里主要来看现在最常用的注解方式的执行过程
`org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter#handleInternal`

```java
	@Override
	protected ModelAndView handleInternal(HttpServletRequest request,
			HttpServletResponse response, HandlerMethod handlerMethod) throws Exception {

		ModelAndView mav;

        // 请求方式校验, 415错误就是在这里抛出去的
		checkRequest(request);

		// 判断是否需要支持session同步
		if (this.synchronizeOnSession) {
			HttpSession session = request.getSession(false);
			if (session != null) {
                // 生成唯一key
				Object mutex = WebUtils.getSessionMutex(session);
                // 加锁
				synchronized (mutex) {
                    // 对HanderMethod进行参数适配,并调用handler
					mav = invokeHandlerMethod(request, response, handlerMethod);
				}
			}
			else {
				// 对HanderMethod进行参数适配,并调用handler
				mav = invokeHandlerMethod(request, response, handlerMethod);
			}
		}
		else {
			// 对HanderMethod进行参数适配,并调用handler
			mav = invokeHandlerMethod(request, response, handlerMethod);
		}

		if (!response.containsHeader(HEADER_CACHE_CONTROL)) {
			if (getSessionAttributesHandler(handlerMethod).hasSessionAttributes()) {
				applyCacheSeconds(response, this.cacheSecondsForSessionAttributeHandlers);
			}
			else {
				prepareResponse(response);
			}
		}

		return mav;
	}
```

这里很容可以看出主要的执行逻辑都在`org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter#invokeHandlerMethod`

```java
	@Nullable
	protected ModelAndView invokeHandlerMethod(HttpServletRequest request,
			HttpServletResponse response, HandlerMethod handlerMethod) throws Exception {

		ServletWebRequest webRequest = new ServletWebRequest(request, response);
		try {
            // 从全局或者对应的Controller拿InitBinder注解的方法,用于进行参数绑定
			WebDataBinderFactory binderFactory = getDataBinderFactory(handlerMethod);
            // 获取容器中全局配置的和当前Method对应的Controller中配置的ModelAttribute 进行配置会在调用前执行
			ModelFactory modelFactory = getModelFactory(handlerMethod, binderFactory);

            // 将handlerMethod 封装了一下
			ServletInvocableHandlerMethod invocableMethod = createInvocableHandlerMethod(handlerMethod);
			if (this.argumentResolvers != null) {
                // 设置当前容器配置的参数解器
				invocableMethod.setHandlerMethodArgumentResolvers(this.argumentResolvers);
			}
			if (this.returnValueHandlers != null) {
                // 设置当前配置的返回值解析起
				invocableMethod.setHandlerMethodReturnValueHandlers(this.returnValueHandlers);
			}
            // 前面创建的binderFactory也塞进来
			invocableMethod.setDataBinderFactory(binderFactory);
			invocableMethod.setParameterNameDiscoverer(this.parameterNameDiscoverer);

			ModelAndViewContainer mavContainer = new ModelAndViewContainer();
            // request的属性塞进去
			mavContainer.addAllAttributes(RequestContextUtils.getInputFlashMap(request));
            // 调用前面获取到的@ModelAttribute方法
            // 从而达到@ModelAttribute标注的方法能在目标的Hander之前调用
            // 说白了就是设置参数
			modelFactory.initModel(webRequest, mavContainer, invocableMethod);
			mavContainer.setIgnoreDefaultModelOnRedirect(this.ignoreDefaultModelOnRedirect);

			AsyncWebRequest asyncWebRequest = WebAsyncUtils.createAsyncWebRequest(request, response);
			asyncWebRequest.setTimeout(this.asyncRequestTimeout);

			WebAsyncManager asyncManager = WebAsyncUtils.getAsyncManager(request);
			asyncManager.setTaskExecutor(this.taskExecutor);
			asyncManager.setAsyncWebRequest(asyncWebRequest);
			asyncManager.registerCallableInterceptors(this.callableInterceptors);
			asyncManager.registerDeferredResultInterceptors(this.deferredResultInterceptors);

			if (asyncManager.hasConcurrentResult()) {
				Object result = asyncManager.getConcurrentResult();
				mavContainer = (ModelAndViewContainer) asyncManager.getConcurrentResultContext()[0];
				asyncManager.clearConcurrentResult();
				LogFormatUtils.traceDebug(logger, traceOn -> {
					String formatted = LogFormatUtils.formatValue(result, !traceOn);
					return "Resume with async result [" + formatted + "]";
				});
				invocableMethod = invocableMethod.wrapConcurrentResult(result);
			}

            // 对请求参数进行处理,调用对应的方法,并且返回一个封装的ModelAndView
			invocableMethod.invokeAndHandle(webRequest, mavContainer);
			if (asyncManager.isConcurrentHandlingStarted()) {
				return null;
			}

            // 对ModelAndView进行处理,主要是判断是否进行了重定向
            // 如果进行了重定向需要将FlasAttributes封装到新的请求中
			return getModelAndView(mavContainer, modelFactory, webRequest);
		}
		finally {
			webRequest.requestCompleted();
		}
	}
```

`org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod#invokeAndHandle`

```java
	public void invokeAndHandle(ServletWebRequest webRequest, ModelAndViewContainer mavContainer,
			Object... providedArgs) throws Exception {

        // 对目标的handler的参数进行处理,并且调用目标handler
		Object returnValue = invokeForRequest(webRequest, mavContainer, providedArgs);
        // 设置返回状态
		setResponseStatus(webRequest);

		if (returnValue == null) {
			if (isRequestNotModified(webRequest) || getResponseStatus() != null || mavContainer.isRequestHandled()) {
				disableContentCachingIfNecessary(webRequest);
				mavContainer.setRequestHandled(true);
				return;
			}
		}
		else if (StringUtils.hasText(getResponseStatusReason())) {
			mavContainer.setRequestHandled(true);
			return;
		}

		mavContainer.setRequestHandled(false);
		Assert.state(this.returnValueHandlers != null, "No return value handlers");
		try {
            // 处理返回值
			this.returnValueHandlers.handleReturnValue(
					returnValue, getReturnValueType(returnValue), mavContainer, webRequest);
		}
		catch (Exception ex) {
			if (logger.isTraceEnabled()) {
				logger.trace(formatErrorForReturnValue(returnValue), ex);
			}
			throw ex;
		}
	}
```

`org.springframework.web.method.support.InvocableHandlerMethod#invokeForRequest`

```java
	@Nullable
	public Object invokeForRequest(NativeWebRequest request, @Nullable ModelAndViewContainer mavContainer,
			Object... providedArgs) throws Exception {

        // 将request参数转换为当前handler的参数形式
		Object[] args = getMethodArgumentValues(request, mavContainer, providedArgs);
		if (logger.isTraceEnabled()) {
			logger.trace("Arguments: " + Arrays.toString(args));
		}
        // 反射调用目标方法
		return doInvoke(args);
	}
```

`org.springframework.web.method.support.InvocableHandlerMethod#getMethodArgumentValues`

```java
	protected Object[] getMethodArgumentValues(NativeWebRequest request, @Nullable ModelAndViewContainer mavContainer,
			Object... providedArgs) throws Exception {

        // 获取当前handler所声明的所有参数 包括参数名,参数类型,参数位置,所标注的注解等属性
		MethodParameter[] parameters = getMethodParameters();
		if (ObjectUtils.isEmpty(parameters)) {
			return EMPTY_ARGS;
		}

		Object[] args = new Object[parameters.length];
		for (int i = 0; i < parameters.length; i++) {
			MethodParameter parameter = parameters[i];
			parameter.initParameterNameDiscovery(this.parameterNameDiscoverer);
            // providedArgs是调用方提供的参数,主力主要判断这些参数中是否有当前类型.有则直接使用调用方提供的参数,对于
            // 请求处理,这里拿不到值
			args[i] = findProvidedArgument(parameter, providedArgs);
			if (args[i] != null) {
				continue;
			}
            // 遍历容器中的ArgumentResolver,判断哪种类型的Resolver
			if (!this.resolvers.supportsParameter(parameter)) {
				throw new IllegalStateException(formatArgumentError(parameter, "No suitable resolver"));
			}
			try {
                // 进行参数转换
				args[i] = this.resolvers.resolveArgument(parameter, mavContainer, request, this.dataBinderFactory);
			}
			catch (Exception ex) {
				// Leave stack trace for later, exception may actually be resolved and handled...
				if (logger.isDebugEnabled()) {
					String exMsg = ex.getMessage();
					if (exMsg != null && !exMsg.contains(parameter.getExecutable().toGenericString())) {
						logger.debug(formatArgumentError(parameter, exMsg));
					}
				}
				throw ex;
			}
		}
		return args;
	}
```
