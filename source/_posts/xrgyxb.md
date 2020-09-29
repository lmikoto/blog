---
title: 缓存
urlname: xrgyxb
date: 2020-09-29 20:58:00 +0800
tags: []
categories: []
---

Mybatis 分为一级缓存和二级缓存

## 一级缓存

- 一级缓存是`sqlSession`级别。不同的`sqlSession`之间的缓存区域互不影响。
- 默认是开启的。

## 二级缓存

- 二级缓存是`mapper`级别。跨`sqlSession`。

![image.png](https://cdn.nlark.com/yuque/0/2020/png/328252/1601387786364-abf9ba04-d87b-438f-9824-5a1c91fc78ba.png#align=left&display=inline&height=224&margin=%5Bobject%20Object%5D&name=image.png&originHeight=448&originWidth=1282&size=54829&status=done&style=none&width=641)
