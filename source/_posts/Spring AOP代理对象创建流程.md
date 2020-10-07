---
title: Spring AOP代理对象创建流程
urlname: tbw6g8
date: 2020-10-06 17:22:33 +0800
tags: []
categories: []
---

Spring AOP 生成对象的时机是使用了 Spring 生命周期里面的`BeanPostProcessor`中的`postProcessAfterInitialization`实现的。

`org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#postProcessAfterInitialization`

```java
@Override
public Object postProcessAfterInitialization(@Nullable Object bean, String beanName) {
    if (bean != null) {
        Object cacheKey = getCacheKey(bean.getClass(), beanName);
        if (this.earlyProxyReferences.remove(cacheKey) != bean) {
            return wrapIfNecessary(bean, beanName, cacheKey);
        }
    }
    return bean;
}
```

`org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#wrapIfNecessary`

```java
// 	...
// 找当前的bean是否有匹配的advice
Object[] specificInterceptors = getAdvicesAndAdvisorsForBean(bean.getClass(), beanName, null);
if (specificInterceptors != DO_NOT_PROXY) {
    // 标记增强为true，表示需要增强实现
    this.advisedBeans.put(cacheKey, Boolean.TRUE);
    // 创建代理
    Object proxy = createProxy(
        bean.getClass(), beanName, specificInterceptors, new SingletonTargetSource(bean));
    this.proxyTypes.put(cacheKey, proxy.getClass());
    return proxy;
}
// ...
```

`org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#createProxy`

```java
protected Object createProxy(Class<?> beanClass, @Nullable String beanName,
                             @Nullable Object[] specificInterceptors, TargetSource targetSource) {

    if (this.beanFactory instanceof ConfigurableListableBeanFactory) {
        AutoProxyUtils.exposeTargetClass((ConfigurableListableBeanFactory) this.beanFactory, beanName, beanClass);
    }

    // 创建代理工作交给ProxyFactory
    ProxyFactory proxyFactory = new ProxyFactory();
    proxyFactory.copyFrom(this);

    // 判断是否强制使用cglib代理
    if (!proxyFactory.isProxyTargetClass()) {
        if (shouldProxyTargetClass(beanClass, beanName)) {
            proxyFactory.setProxyTargetClass(true);
        }
        else {
            evaluateProxyInterfaces(beanClass, proxyFactory);
        }
    }

    // 把增强和通用拦截器对象合并，都适配成Advisor
    Advisor[] advisors = buildAdvisors(beanName, specificInterceptors);
    proxyFactory.addAdvisors(advisors);
    // 设置参数
    proxyFactory.setTargetSource(targetSource);
    customizeProxyFactory(proxyFactory);

    proxyFactory.setFrozen(this.freezeProxy);
    if (advisorsPreFiltered()) {
        proxyFactory.setPreFiltered(true);
    }

    // 准备工作完成，开始创建动态代理
    return proxyFactory.getProxy(getProxyClassLoader());
}
```

`org.springframework.aop.framework.ProxyFactory#getProxy(java.lang.ClassLoader)`
这里又封装了一层 aopProxy
`org.springframework.aop.framework.DefaultAopProxyFactory#createAopProxy`

```java
public AopProxy createAopProxy(AdvisedSupport config) throws AopConfigException {
    // 优化 强制开启cglib代理 没有接口
    if (config.isOptimize() || config.isProxyTargetClass() || hasNoUserSuppliedProxyInterfaces(config)) {
        Class<?> targetClass = config.getTargetClass();
        if (targetClass == null) {
            throw new AopConfigException("TargetSource cannot determine target class: " +
                                         "Either an interface or a target is required for proxy creation.");
        }
        // 接口 或者本身是jdl代理产生的
        if (targetClass.isInterface() || Proxy.isProxyClass(targetClass)) {
            return new JdkDynamicAopProxy(config);
        }
        return new ObjenesisCglibAopProxy(config);
    }
    // 使用jdk动态代理
    else {
        return new JdkDynamicAopProxy(config);
    }
}

```
