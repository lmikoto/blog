---
title: 策略模式实现MQ消费
date: 2020-01-07T04:03:21.000Z
tags: ['java','spring-boot']

---


## 需求背景
可以无限扩展consumer，并且不需要动原来的代码。

### 实现过程

#### 定义抽象策略类

```java
public interface MessageConsumer {

    String tagName();

    Boolean consume(String payload);

}
```

#### 定义具体策略类A和B
消息A

```java
@Component
@Slf4j
public class AMessageConsumer implements MessageConsumer {
    @Override
    public String tagName() {
        return "TAG_A";
    }

    @Override
    public Boolean consume(String payload) {
        log.info("consume A req is {}",payload);
        return Boolean.TRUE;
    }
}
```
消息B

```java
@Component
@Slf4j
public class BMessageConsumer implements MessageConsumer {
    @Override
    public String tagName() {
        return "TAG_B";
    }

    @Override
    public Boolean consume(String payload) {
        log.info("consume B req is {}",payload);
        return Boolean.TRUE;
    }
}
```

#### 将具体的策略放进map里，当有事件过来的根据tag获取策略bean进行消费
将策略放进map里，并且提供根据tag获取策略的方法。

