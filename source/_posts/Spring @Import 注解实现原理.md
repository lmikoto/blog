---
title: Spring @Import 注解实现原理
urlname: rv05xi
date: '2020-10-29 21:11:55 +0800'
tags: []
categories: []
---

@Import 注解用于注入指定的类属性 value 中 class 分为三类

- 普通类直接注入
- 实现 ImportSelector 接口的类
- 实现 ImportBeanDefinitionRegistrar 接口的类

说明：

- ImportSelector:返回需要导入的组件的全类名数组
- ImportBeanDefinitionRegistrar:手动注册 bean 到容器中

Spring @Import 初始化是在 refresh 方法中的`invokeBeanFactoryPostProcessors(beanFactory)` 中进行初始化的。
具体过程在`org.springframework.context.annotation.ConfigurationClassPostProcessor#postProcessBeanDefinitionRegistry`中
这里主要说@Import 注解，因此忽略@Component @CompomentScan @Bean 等直接到

```java
// ...
processImports(configClass, sourceClass, getImports(sourceClass), true);
// ...
```

在`getImports`中调入
org.springframework.context.annotation.ConfigurationClassParser#collectImports

```java
	private void collectImports(SourceClass sourceClass, Set<SourceClass> imports, Set<SourceClass> visited)
			throws IOException {

		if (visited.add(sourceClass)) {
			for (SourceClass annotation : sourceClass.getAnnotations()) {
				String annName = annotation.getMetadata().getClassName();
				if (!annName.equals(Import.class.getName())) {
					collectImports(annotation, imports, visited);
				}
			}
			imports.addAll(sourceClass.getAnnotationAttributes(Import.class.getName(), "value"));
		}
	}
```

这里的逻辑还是很简单的。使用 visited 作为来去重，如果注解上的注解上还有@Import，就递归调用，否则把@Import 注解中 value 的值塞到 import 中。

`org.springframework.context.annotation.ConfigurationClassParser#processImports`
省略校验的过程，这里的三个分之逻辑刚好对用@Import 的三个功能

```java
for (SourceClass candidate : importCandidates) {
    if (candidate.isAssignable(ImportSelector.class)) {
        // Candidate class is an ImportSelector -> delegate to it to determine imports
        Class<?> candidateClass = candidate.loadClass();
        ImportSelector selector = BeanUtils.instantiateClass(candidateClass, ImportSelector.class);
        ParserStrategyUtils.invokeAwareMethods(
            selector, this.environment, this.resourceLoader, this.registry);
        if (selector instanceof DeferredImportSelector) {
            this.deferredImportSelectorHandler.handle(configClass, (DeferredImportSelector) selector);
        }
        else {
            String[] importClassNames = selector.selectImports(currentSourceClass.getMetadata());
            Collection<SourceClass> importSourceClasses = asSourceClasses(importClassNames);
            processImports(configClass, currentSourceClass, importSourceClasses, false);
        }
    }
    else if (candidate.isAssignable(ImportBeanDefinitionRegistrar.class)) {
        // Candidate class is an ImportBeanDefinitionRegistrar ->
        // delegate to it to register additional bean definitions
        Class<?> candidateClass = candidate.loadClass();
        ImportBeanDefinitionRegistrar registrar =
            BeanUtils.instantiateClass(candidateClass, ImportBeanDefinitionRegistrar.class);
        ParserStrategyUtils.invokeAwareMethods(
            registrar, this.environment, this.resourceLoader, this.registry);
        configClass.addImportBeanDefinitionRegistrar(registrar, currentSourceClass.getMetadata());
    }
    else {
        // Candidate class not an ImportSelector or ImportBeanDefinitionRegistrar ->
        // process it as an @Configuration class
        this.importStack.registerImport(
            currentSourceClass.getMetadata(), candidate.getMetadata().getClassName());
        processConfigurationClass(candidate.asConfigClass(configClass));
    }
}
```

当然@Import 本质其实还是一种加载 Bean 的方式，因此最后都会被丢到 BeanDefinition 中，这个通过 ide 的 find useage 很容易找到。
