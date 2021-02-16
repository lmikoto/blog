---
title: Activiti7源码分析(七)-DeploymentCache
urlname: nwxrfc
date: '2020-09-29 22:13:26 +0800'
tags: []
categories: []
---

之前提到过流程的定义是放到缓存中的，而默认缓存是在内存中的在多实例部署的情况下会有隐患。今天来看一下这个缓存是如何实现的。

```java
public interface DeploymentCache<T> {

  T get(String id);

  boolean contains(String id);

  void add(String id, T object);

  void remove(String id);

  void clear();

}
```

activiti 抽象了一个接口。并且提供了一个默认实现。
这个默认实现有两个构造函数。
先来看一下有参数的这个构造函数

```java
public DefaultDeploymentCache() {
  this.cache = synchronizedMap(new HashMap<String, T>());
}
```

当使用无参构造函数的时候。缓存容器是 HashMap
再来看一下有参构造函数

```java
public DefaultDeploymentCache(final int limit) {
  this.cache = synchronizedMap(new LinkedHashMap<String, T>(limit + 1, 0.75f, true) { // +1 is needed, because the entry is inserted first, before it is removed
        // 0.75 is the default (see javadocs)
        // true will keep the 'access-order', which is needed to have a real LRU cache
        private static final long serialVersionUID = 1L;

        protected boolean removeEldestEntry(Map.Entry<String, T> eldest) {
          boolean removeEldest = size() > limit;
          if (removeEldest && logger.isTraceEnabled()) {
            logger.trace("Cache limit is reached, {} will be evicted", eldest.getKey());
          }
          return removeEldest;
        }

      });
}
```

有参构造函数会传入一个 limit,也就是缓存大小。下面的策略说的也很明白，如果超过了这个大小就会最老的给移除掉。
如果确定流程定义很少，那么可以用无限制的，如果很多肯定要用有限制的。
所以无论有参还是无参，默认的缓存都是在内存里。
缓存的读取策略一般都是先从缓存拿，如果没拿到就从 db 拿，然后把缓存更新一下。多实例的情况下缓存不会同步，正常情况下也不会产生太多的问题，只是可能没命中多查了一次 db 而已。而之前提到的用 ProcessDefinitionKey 发起流程是特殊情况，这样的情况下没有同步缓存就会产生事故。
所以针对上述问题，个人认为最好还是使用 redis 这种中间键来做缓存。替换也很简单，实现一下 DeploymentCache 接口。然后在配置类中把他替换掉就好了。如果使用 spring 的话，直接替换 bean 即可。
