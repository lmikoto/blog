---
title: jdk spi
urlname: gbkafq
date: 2020-10-13 22:56:13 +0800
tags: []
categories: []
---

service provider interface

## JDK SPI 机制

当服务的提供者提供了一种接口的实现之后，需要在 Classpath 下的 META-INF/services/ 目录里创建一个以服务接口命名的文件，此文件记录了该 jar 包提供的服务接口的具体实现类。当某个应用引入了该 jar 包且需要使用该服务时，JDK SPI 机制就可以通过查找这个 jar 包的 META-INF/services/ 中的配置文件来获得具体的实现类名，进行实现类的加载和实例化，最终使用该实现类完成业务功能。

## Demo

[https://github.com/lmikoto/java-demo/tree/master/jdk-demo/jdk-spi-demo](https://github.com/lmikoto/java-demo/tree/master/jdk-demo/jdk-spi-demo)

## 源码解析

使用`java.util.ServiceLoader#load`经过如下链路
![image.png](/images/1602756395196-13244035-85e6-4659-8feb-649bcc166a96.png)

```java
// 缓存用于存放Service实例
private LinkedHashMap<String,S> providers = new LinkedHashMap<>();

public void reload() {
    // 清理缓存
    providers.clear();
    // 迭代器
    lookupIterator = new LazyIterator(service, loader);
}
```

最后调用的链路其实是到了`LazyIterator`中。
该迭代器最后调用到`java.util.ServiceLoader.LazyIterator#hasNextService`和`java.util.ServiceLoader.LazyIterator#nextService`中

先来看`hasNextService`方法。该方法的主要负责查找 SPI 配置文件，并解析。

```java
private static final String PREFIX = "META-INF/services/"

Enumeration<URL> configs = null;
Iterator<String> pending = null;
String nextName = null;

private boolean hasNextService() {
    if (nextName != null) {
        return true;
    }
    if (configs == null) {
        try {
            // SPI配置文件的全路径
            String fullName = PREFIX + service.getName();
            // 加载配置文件
            if (loader == null)
                configs = ClassLoader.getSystemResources(fullName);
            else
                configs = loader.getResources(fullName);
        } catch (IOException x) {
            fail(service, "Error locating configuration files", x);
        }
    }
    // 遍历配置文件中内容，及各个实现类的路径
    while ((pending == null) || !pending.hasNext()) {
        if (!configs.hasMoreElements()) {
            return false;
        }
        // 解析每一行到迭代器中
        pending = parse(service, configs.nextElement());
    }
    nextName = pending.next();
    return true;
}
```

再来看`nextService`方法

```java
private S nextService() {
    if (!hasNextService())
        throw new NoSuchElementException();
    String cn = nextName;
    nextName = null;
    Class<?> c = null;
    try {
        // 加载nextName指定的类
        c = Class.forName(cn, false, loader);
    } catch (ClassNotFoundException x) {
        fail(service,
             "Provider " + cn + " not found");
    }
    // 校验一下是不是对应的接口实现
    if (!service.isAssignableFrom(c)) {
        fail(service,
             "Provider " + cn  + " not a subtype");
    }
    try {
        // 创建实现类的对象
        S p = service.cast(c.newInstance());
        // 丢到缓存中
        providers.put(cn, p);
        return p;
    } catch (Throwable x) {
        fail(service,
             "Provider " + cn + " could not be instantiated",
             x);
    }
    throw new Error();
}
```
