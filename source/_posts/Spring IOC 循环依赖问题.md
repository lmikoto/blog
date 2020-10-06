---
title: Spring IOC 循环依赖问题
urlname: bg9g35
date: 2020-10-06 14:48:56 +0800
tags: []
categories: []
---

## Spring 中的循环依赖场景

- 构造函数注入循环依赖
- Filed 属性循环依赖

## 循环依赖处理机制

- 单例 bean 的构造函数注入的循环依赖是无法解决的

11111

- prototype 的循环依赖无法解决的
- 单例 bean 通过 setXxx 或者@Autowired 进行循环依赖的
