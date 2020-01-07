---
title: 策略模式实现MQ消费
date: 2020-01-07T04:03:21.000Z
tags: ['java','spring-boot']

---


## 定义抽象策略类

```java
public interface MessageConsumer {

    String tagName();

    Boolean consume(String payload);

}
```

