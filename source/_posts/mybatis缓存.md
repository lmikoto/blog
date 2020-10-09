---
title: mybatis缓存
urlname: xrgyxb
date: 2020-09-29 20:58:00 +0800
tags: []
categories: []
---

Mybatis 分为一级缓存和二级缓存

## 一级缓存

- 一级缓存是`sqlSession`级别。不同的`sqlSession`之间的缓存区域互不影响。
- 默认是开启的。
- 缓存的 key 由`statementId`,`params`,`boundSql`,`rowBounds`组成
- 做增删改操作，并且提交事物会刷新一级缓存。
- 一级缓存实际是一个 hashmap`org.apache.ibatis.cache.impl.PerpetualCache#cache`每一个 sqlsession 都有一个引用

![](/images/8b136521b28faac6ac81d955e229eaaa.svg)

## 二级缓存

- 二级缓存是`namespace`（`mapper`）级别。跨`sqlSession`。连表查询有问题
- 二级缓存默认关闭，需要手动开启。
- 做增删改操作，并且提交事物会清空二级缓存。
- 从二级缓存中获取数据得到的是一个新的对象。和存入对象的地址不同。
- 二级缓存是内存中的 map，因此多实例部署下会有问题。
