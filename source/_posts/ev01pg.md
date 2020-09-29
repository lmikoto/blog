---
title: Activiti7源码分析(四)-id生成器
urlname: ev01pg
date: 2020-09-29 22:06:38 +0800
tags: []
categories: []
---

activiti 中定义了 id 生成器的接口，并且提供两个实现。当然你也可以自行实现。

```java
public interface IdGenerator {

  String getNextId();

}
```

我们来看一下这个接口的两个实现。

### DbIdGenerator

DbIdGenerator 是 activiti 的 IdGenerator 默认实现。

```java
public synchronized String getNextId() {
  if (lastId < nextId) {
    getNewBlock();
  }
  long _nextId = nextId++;
  return Long.toString(_nextId);
}

protected synchronized void getNewBlock() {
  IdBlock idBlock = commandExecutor.execute(commandConfig, new GetNextIdBlockCmd(idBlockSize));
  this.nextId = idBlock.getNextId();
  this.lastId = idBlock.getLastId();
}

public IdBlock execute(CommandContext commandContext) {
  PropertyEntity property = (PropertyEntity) commandContext.getPropertyEntityManager().findById("next.dbid");
  long oldValue = Long.parseLong(property.getValue());
  long newValue = oldValue + idBlockSize;
  property.setValue(Long.toString(newValue));
  return new IdBlock(oldValue, newValue - 1);
}
```

从代码上很容易看出来，这种方案是在 db 里面记录了一个 next.id 的，每次生成 2500 个 id，然后依次发放。
不过这里有点小坑。getNextId 上面有 synchronized 关键字。保证了在单机模式下这个方法没有并发问题。但是在分布式环境下。这里有并发问题。可能生成出来的 id 重复。

### StrongUuidGenerator

```java
protected void ensureGeneratorInitialized() {
  if (timeBasedGenerator == null) {
    synchronized (StrongUuidGenerator.class) {
      if (timeBasedGenerator == null) {
        timeBasedGenerator = Generators.timeBasedGenerator(EthernetAddress.fromInterface());
      }
    }
  }
}
```

这里是用 jackson 里面的 uuid 生成方法。而且也把机器环境传入进去了，这种 id 生成策略是不会有上面那个方法的分布式 id 重复问题。
