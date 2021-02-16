---
title: Spring Boot run方法流程
urlname: ap07gv
date: '2020-10-31 11:31:08 +0800'
tags: []
categories: []
---

spring boot 项目的启动文件会调用 `SpringApplication.run`这个静态方法
这个静态方法主要是对 run 方法做了一层静态包装

```bash
	public static ConfigurableApplicationContext run(Class<?>[] primarySources, String[] args) {
		// 1 实例化 SpringApplication
    // 2 执行run(args)
    return new SpringApplication(primarySources).run(args);
	}

```

SpringApplication 的构造方法`org.springframework.boot.SpringApplication#SpringApplication(org.springframework.core.io.ResourceLoader, java.lang.Class<?>...)`

```bash
	public SpringApplication(ResourceLoader resourceLoader, Class<?>... primarySources) {
		this.resourceLoader = resourceLoader;
		Assert.notNull(primarySources, "PrimarySources must not be null");
    // 项目启动类的class
		this.primarySources = new LinkedHashSet<>(Arrays.asList(primarySources));
    // 设置web应用类型 servlet应用 或者 reactive应用（webflux）通过判断class path中是否存在 是否有相关依赖实现的
		this.webApplicationType = WebApplicationType.deduceFromClasspath();
		this.bootstrappers = new ArrayList<>(getSpringFactoriesInstances(Bootstrapper.class));
    // 设置初始化器 实际上就是配置在 spring.factories中的 ApplicationContextInitializer类型
		setInitializers((Collection) getSpringFactoriesInstances(ApplicationContextInitializer.class));
    // 设置监听器  实际上就是配置在 spring.factories中的 ApplicationListener类型
		setListeners((Collection) getSpringFactoriesInstances(ApplicationListener.class));
    // 初始化 mainApplicationClass 用于推断并设置项目main方法启动的主程序启动类
		this.mainApplicationClass = deduceMainApplicationClass();
	}
```

再来看 run 方法
`org.springframework.boot.SpringApplication#run`

```bash
	public ConfigurableApplicationContext  run(String... args) {
		StopWatch stopWatch = new StopWatch();
		stopWatch.start();
		DefaultBootstrapContext bootstrapContext = createBootstrapContext();
		ConfigurableApplicationContext context = null;
		// 配置 handless 属性
		configureHeadlessProperty();

		// 1 获取并启动监听器
		// 从spring.factories 中读取 SpringApplicationRunListener
		SpringApplicationRunListeners listeners = getRunListeners(args);
		listeners.starting(bootstrapContext, this.mainApplicationClass);
		try {
			// 初始化默认应用的参数类 参数可以在spring中访问 比如 --server.port=8080
			ApplicationArguments applicationArguments = new DefaultApplicationArguments(args);

			// 2 environment 预配置 创建和配置environment
			// 遍历并调用所有的 SpringApplicationRunListener的 environmentPrepared方法
			ConfigurableEnvironment environment = prepareEnvironment(listeners, bootstrapContext, applicationArguments);

			configureIgnoreBeanInfo(environment);
			// 准备banner打印器
			Banner printedBanner = printBanner(environment);

			// 3 创建Spring 容器
			context = createApplicationContext();
			context.setApplicationStartup(this.applicationStartup);

			// 4 前置处理
			// 将启动类注入容器，为后续开启自动化配置奠定基础
			// 主要是容器刷新前的准备动作。
			prepareContext(bootstrapContext, context, environment, listeners, applicationArguments, printedBanner);

			// 5 刷新容器
			refreshContext(context);

			// 6 后置处理
			// 没有实现可以进行扩展
			afterRefresh(context, applicationArguments);
			stopWatch.stop();
			if (this.logStartupInfo) {
				new StartupInfoLogger(this.mainApplicationClass).logStarted(getApplicationLog(), stopWatch);
			}
			// 7 结束执行通知
			listeners.started(context);
			// 8 执行runner
			// spring boot 提供了 ApplicationRunner 和CommandLineRunner两种接口
			callRunners(context, applicationArguments);
		}
		catch (Throwable ex) {
			handleRunFailure(context, ex, listeners);
			throw new IllegalStateException(ex);
		}

		// 9 发布应用上下文就绪事件
		try {
			listeners.running(context);
		}
		catch (Throwable ex) {
			handleRunFailure(context, ex, null);
			throw new IllegalStateException(ex);
		}
		return context;
	}
```
