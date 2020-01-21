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
