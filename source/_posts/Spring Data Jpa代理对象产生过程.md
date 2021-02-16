---
title: Spring Data Jpa代理对象产生过程
urlname: ydg02g
date: '2020-10-19 14:29:27 +0800'
tags: []
categories: []
---

Spring Data Jpa(下文简称 jpa) 开发的时候只需要写接口，不需要写实现。jpa 实际上是通过动态代理来实现这个过程的。

这里主要分析由注解的方式注入的流程。
` @``EnableJpaRepositories `注解中 import 了`JpaRepositoriesRegistrar`，而`JpaRepositoriesRegistrar`继承了`org.springframework.data.repository.config.RepositoryBeanDefinitionRegistrarSupport`

```java
    public void registerBeanDefinitions(AnnotationMetadata annotationMetadata, BeanDefinitionRegistry registry) {
        Assert.notNull(annotationMetadata, "AnnotationMetadata must not be null!");
        Assert.notNull(registry, "BeanDefinitionRegistry must not be null!");
        Assert.notNull(this.resourceLoader, "ResourceLoader must not be null!");
        if (annotationMetadata.getAnnotationAttributes(this.getAnnotation().getName()) != null) {
            AnnotationRepositoryConfigurationSource configurationSource = new AnnotationRepositoryConfigurationSource(annotationMetadata, this.getAnnotation(), this.resourceLoader, this.environment, registry);
            RepositoryConfigurationExtension extension = this.getExtension();
            RepositoryConfigurationUtils.exposeRegistration(extension, registry, configurationSource);
            RepositoryConfigurationDelegate delegate = new RepositoryConfigurationDelegate(configurationSource, this.resourceLoader, this.environment);
            delegate.registerRepositoriesIn(registry, extension);
        }
    }
```

最后两行可以看出，`AbstractRepositoryConfigurationSourceSupport`对`Repository`的 Bean 进行了定义。

在`registerRepositoriesIn`这里读了全部的 JPA 接口，并且创建了`BeanDefinition`。这里只是产生了`BeanDefinition，实际上生成bean是在`

`org.springframework.data.repository.core.support.RepositoryFactorySupport#getRepository`

```java
	public <T> T getRepository(Class<T> repositoryInterface, RepositoryFragments fragments) {

		if (logger.isDebugEnabled()) {
			logger.debug(LogMessage.format("Initializing repository instance for %s…", repositoryInterface.getName()));
		}

		Assert.notNull(repositoryInterface, "Repository interface must not be null!");
		Assert.notNull(fragments, "RepositoryFragments must not be null!");

		RepositoryMetadata metadata = getRepositoryMetadata(repositoryInterface);
		RepositoryComposition composition = getRepositoryComposition(metadata, fragments);
		RepositoryInformation information = getRepositoryInformation(metadata, composition);

		validate(information, composition);

		Object target = getTargetRepository(information);

		// Create proxy
		ProxyFactory result = new ProxyFactory();
		result.setTarget(target);
		result.setInterfaces(repositoryInterface, Repository.class, TransactionalProxy.class);

		if (MethodInvocationValidator.supports(repositoryInterface)) {
			result.addAdvice(new MethodInvocationValidator());
		}

		result.addAdvisor(ExposeInvocationInterceptor.ADVISOR);

		postProcessors.forEach(processor -> processor.postProcess(result, information));

		if (DefaultMethodInvokingMethodInterceptor.hasDefaultMethods(repositoryInterface)) {
			result.addAdvice(new DefaultMethodInvokingMethodInterceptor());
		}

		ProjectionFactory projectionFactory = getProjectionFactory(classLoader, beanFactory);
		Optional<QueryLookupStrategy> queryLookupStrategy = getQueryLookupStrategy(queryLookupStrategyKey,
				evaluationContextProvider);
		result.addAdvice(new QueryExecutorMethodInterceptor(information, projectionFactory, queryLookupStrategy,
				namedQueries, queryPostProcessors, methodInvocationListeners));

		composition = composition.append(RepositoryFragment.implemented(target));
		result.addAdvice(new ImplementationMethodExecutionInterceptor(information, composition, methodInvocationListeners));

		T repository = (T) result.getProxy(classLoader);

		if (logger.isDebugEnabled()) {
			logger
					.debug(LogMessage.format("Finished creation of repository instance for {}.", repositoryInterface.getName()));
		}

		return repository;
	}

```

首先去获取我们写的 repository 接口的元数据，包括实体的 ID 类型，管理的实体类型等。接着获取 repository 的组合，主要包含 repository 的方法信息。然后再根据它俩的组合得到一个 target。这个 target 其实就是一个 SimpleJpaRepository 实体，里面包含了一些通用的方法。只有这些还不够，于是有了后面的代理工厂，对这个 target 进行进一步处理。包括事务支持，异常处理和 SQL 创造等。
