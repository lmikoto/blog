---
title: Spring IOC 循环依赖问题
urlname: bg9g35
date: '2020-10-06 14:48:56 +0800'
tags: []
categories: []
---

## Spring 中的循环依赖场景

- 构造函数注入循环依赖
- Filed 属性循环依赖

## 循环依赖处理机制

### 单例 bean 的构造函数注入的循环依赖是无法解决的

### prototype 的循环依赖无法解决的

原型 bean 的初始化过程不论是构造函数注入还是 set 方法注入，产生循环依赖 spring 都会直接报错

```java
// org.springframework.beans.factory.support.AbstractBeanFactory#doGetBean
if (isPrototypeCurrentlyInCreation(beanName)) {
    throw new BeanCurrentlyInCreationException(beanName);
}
// org.springframework.beans.factory.support.AbstractBeanFactory#isPrototypeCurrentlyInCreation
protected boolean isPrototypeCurrentlyInCreation(String beanName) {
    Object curVal = this.prototypesCurrentlyInCreation.get();
    return (curVal != null &&
            (curVal.equals(beanName) || (curVal instanceof Set && ((Set<?>) curVal).contains(beanName))));
}

```

在获取 bean 之前，如果这个原型 bean 正在被创建，则直接抛出异常。原型 bean 在创建之前会标记这个 beanName 正在被创建，等待创建结束之后会删除标记。

```java
try {
    // 创建前添加标记
    beforePrototypeCreation(beanName);
    // 创建bean
    prototypeInstance = createBean(beanName, mbd, args);
}
finally {
    // 删除标记
    afterPrototypeCreation(beanName);
}
```

### 单例 bean 通过 setXxx 或者@Autowired 进行循环依赖的

三级缓存机制解决循环依赖
一级缓存`org.springframework.beans.factory.support.DefaultSingletonBeanRegistry#singletonObjects`
二级缓存`org.springframework.beans.factory.support.DefaultSingletonBeanRegistry#earlySingletonObjects`
三级缓存`org.springframework.beans.factory.support.DefaultSingletonBeanRegistry#singletonFactories`

实例化 bean 之后会先丢到三级缓存中去
`org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory#doCreateBean`

```java
boolean earlySingletonExposure = (mbd.isSingleton() && this.allowCircularReferences &&
                                  isSingletonCurrentlyInCreation(beanName));
if (earlySingletonExposure) {
    if (logger.isTraceEnabled()) {
        logger.trace("Eagerly caching bean '" + beanName +
                     "' to allow for resolving potential circular references");
    }
    // 加入三级缓存中
    addSingletonFactory(beanName, () -> getEarlyBeanReference(beanName, mbd, bean));
}
```

获取 bean

```java
protected Object getSingleton(String beanName, boolean allowEarlyReference) {
    // 从一级缓存中拿
    Object singletonObject = this.singletonObjects.get(beanName);
    if (singletonObject == null && isSingletonCurrentlyInCreation(beanName)) {
        synchronized (this.singletonObjects) {
            // 从二级缓存中拿
            singletonObject = this.earlySingletonObjects.get(beanName);
            if (singletonObject == null && allowEarlyReference) {
                // 从三级缓存中拿
                ObjectFactory<?> singletonFactory = this.singletonFactories.get(beanName);
                if (singletonFactory != null) {
                    // 调用当时丢到三级缓存中传入的接口
                    singletonObject = singletonFactory.getObject();
                    // 丢掉二级缓存中
                    this.earlySingletonObjects.put(beanName, singletonObject);
                    // 从三级缓存中拿出去
                    this.singletonFactories.remove(beanName);
                }
            }
        }
    }
    return singletonObject;
}
```

从二级缓存丢到一级缓存

```java
protected void addSingleton(String beanName, Object singletonObject) {
    synchronized (this.singletonObjects) {
        this.singletonObjects.put(beanName, singletonObject);
        this.singletonFactories.remove(beanName);
        this.earlySingletonObjects.remove(beanName);
        this.registeredSingletons.add(beanName);
    }
}
```
