---
title: mybatis缓存
urlname: xrgyxb
date: 2020-09-29 20:58:00 +0800
tags: []
categories: []
---

Mybatis 分为一级缓存和二级缓存

## 一级缓存

- 一级缓存是 sqlSession 级别。不同的 sqlSession 之间的缓存区域互不影响。
- 默认是开启的。
- 缓存的 key 由 statementId,params,boundSql,rowBounds 组成

## 二级缓存

- 二级缓存是 mapper 级别。跨 sqlSession。
-
