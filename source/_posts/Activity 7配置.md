---
title: Activity 7配置
date: 2020-01-21T03:05:43.000Z
tags: ['activity']

---


## 配置 security
因为activity 7 中默认集成了spring security
![image.png](/images/1579576346951-4cc94e95-8394-4c0a-993d-a0676a0666a3.png)
后期开发也会用到，这里就不排除这个依赖了，但是为了前期开发需要，暂时配置一个简单的账号密码
```yaml
spring: 
 security:
    user:
      name: admin
      password: admin
```


## Activity配置

```yaml
spring:
  activiti:
    database-schema-update: true
    history-level: full
    db-history-used: true
```

#### database-schema-update
database-schema-update有四个值

- false activity在启动的时候会对比数据库中的表的版本，如果没有或者版本不匹配就会抛异常。
- true activity会对数据库中的所有表进行更新，如果表不存在，则activity会自动创建。
- creat-drop activity启动的时候会进行建表，关闭的时候会把表删掉
- drop-create activity启动的时候删表，关闭的时候建表。

#### history-level
history-level是对于历史数据的保留粒度，有四个配置

- none 不保留任何数据。
- activity 保留流程实例和流程行为。
- audit 保留流程实例，流程行为，以及全部流程任务和属性
- full 保留全部流程数据，包括参数

#### db-history-used
true表示使用历史表。false的话不会使用历史表，同时也无法查看历史节点。
