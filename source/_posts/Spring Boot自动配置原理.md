---
title: Spring Boot自动配置原理
urlname: ds3ug1
date: 2020-10-25 21:02:58 +0800
tags: []
categories: []
---

为什么 Spring Boot 可以自动配置？
为什么 Spring Boot 默认扫描的包是启动类所在的包和子包？

Spring Boot 的自动配置功能是`@EnableAutoConfiguration`注解实现的。
`@EnableAutoConfiguration`中有两个重要的注解

## @AutoConfigurationPackage

这个注解主要的功能都在 import 的`org.springframework.boot.autoconfigure.AutoConfigurationPackages.Registrar`中

```java
	private static final String BEAN = AutoConfigurationPackages.class.getName();

	public static void register(BeanDefinitionRegistry registry, String... packageNames) {
		if (registry.containsBeanDefinition(BEAN)) {
			BasePackagesBeanDefinition beanDefinition = (BasePackagesBeanDefinition) registry.getBeanDefinition(BEAN);
			beanDefinition.addBasePackages(packageNames);
		}
		else {
			registry.registerBeanDefinition(BEAN, new BasePackagesBeanDefinition(packageNames));
		}
	}
```

这里判断了一下`AutoConfigurationPackages`这个类是否在`BeanDefinitionRegistry`中，如果不在就塞进去。这里把当前的包路径给穿进去。这就是为什么 Spring Boot 默认只能扫描启动类所在的包以及子包。因为这个注解是打在启动类上的，拿到的 packageName 就是启动类所在的 package。

## @Import(AutoConfigurationImportSelector.class)

```java
	@Override
	public String[] selectImports(AnnotationMetadata annotationMetadata) {
        // 判断是否开启自动配置
		if (!isEnabled(annotationMetadata)) {
			return NO_IMPORTS;
		}
		AutoConfigurationEntry autoConfigurationEntry = getAutoConfigurationEntry(annotationMetadata);
		return StringUtils.toStringArray(autoConfigurationEntry.getConfigurations());
	}
```

逻辑都在 getAutoConfigurationEntry 里面，再来看一下这个。

```java
	protected AutoConfigurationEntry getAutoConfigurationEntry(AnnotationMetadata annotationMetadata) {
		if (!isEnabled(annotationMetadata)) {
			return EMPTY_ENTRY;
		}
		AnnotationAttributes attributes = getAttributes(annotationMetadata);
        // 获取候选的自动配置的列表
		List<String> configurations = getCandidateConfigurations(annotationMetadata, attributes);
        // 用set去重
		configurations = removeDuplicates(configurations);
        // 从注解中拿到要排除的
		Set<String> exclusions = getExclusions(annotationMetadata, attributes);
        // 校验要排除的是否在自动配置列表
		checkExcludedClasses(configurations, exclusions);
		configurations.removeAll(exclusions);
        // 排除掉filter的
        // 这里主要是 处理各种 @Conditional
        // spring-autoconfigure-metadata
		configurations = getConfigurationClassFilter().filter(configurations);
        // 出发 auto-config的事件的接口
		fireAutoConfigurationImportEvents(configurations, exclusions);
		return new AutoConfigurationEntry(configurations, exclusions);
	}
```

获取候选的自动配置列表
`org.springframework.boot.autoconfigure.AutoConfigurationImportSelector#getCandidateConfigurations`
这里很简单只是调用了`org.springframework.core.io.support.SpringFactoriesLoader#loadFactoryNames` 然后有调用了重载方法

```java

public static final String FACTORIES_RESOURCE_LOCATION = "META-INF/spring.factories";

private static Map<String, List<String>> loadSpringFactories(ClassLoader classLoader) {
    Map<String, List<String>> result = cache.get(classLoader);
    if (result != null) {
        return result;
    }

    result = new HashMap<>();
    try {
        Enumeration<URL> urls = classLoader.getResources(FACTORIES_RESOURCE_LOCATION);
        while (urls.hasMoreElements()) {
            URL url = urls.nextElement();
            UrlResource resource = new UrlResource(url);
            Properties properties = PropertiesLoaderUtils.loadProperties(resource);
            for (Map.Entry<?, ?> entry : properties.entrySet()) {
                String factoryTypeName = ((String) entry.getKey()).trim();
                String[] factoryImplementationNames =
                    StringUtils.commaDelimitedListToStringArray((String) entry.getValue());
                for (String factoryImplementationName : factoryImplementationNames) {
                    result.computeIfAbsent(factoryTypeName, key -> new ArrayList<>())
                        .add(factoryImplementationName.trim());
                }
            }
        }

        // Replace all lists with unmodifiable lists containing unique elements
        result.replaceAll((factoryType, implementations) -> implementations.stream().distinct()
                          .collect(Collectors.collectingAndThen(Collectors.toList(), Collections::unmodifiableList)));
        cache.put(classLoader, result);
    }
    catch (IOException ex) {
        throw new IllegalArgumentException("Unable to load factories from location [" +
                                           FACTORIES_RESOURCE_LOCATION + "]", ex);
    }
    return result;
}
```

autoconfig 的配置未见路径是`META-INF/spring.factories`也是在这个地方写死的。
这里其实已经到了 spring 的范畴了，并不属于 spring boot 的东西了。

这里获取到了 name 之后，会在@Import 那里转换成 BeanDefination，之后被加载程 Bean
