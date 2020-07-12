---
title: Activiti7源码分析(四)-id生成器
date: 2020-05-19 00:00:00
tags: ['activiti','java']
---
activiti中定义了id生成器的接口，并且提供两个实现。当然你也可以自行实现。
```Java
public interface IdGenerator {

  String getNextId();

}
```
我们来看一下这个接口的两个实现。
### DbIdGenerator
DbIdGenerator是activiti的IdGenerator默认实现。
```Java
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
从代码上很容易看出来，这种方案是在db里面记录了一个next.id的，每次生成2500个id，然后依次发放。
不过这里有点小坑。getNextId上面有synchronized关键字。保证了在单机模式下这个方法没有并发问题。但是在分布式环境下。这里有并发问题。可能生成出来的id重复。
### StrongUuidGenerator
```Java
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
这里是用jackson里面的uuid生成方法。而且也把机器环境传入进去了，这种id生成策略是不会有上面那个方法的分布式id重复问题。
