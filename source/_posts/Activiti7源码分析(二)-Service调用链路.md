---
title: Activiti7源码分析(二)-Service调用链路
date: 2020-05-13 00:00:00
tags: ['activiti','java']
---
## 概要
Activiti采用命令和指责链作为基础的开发模式。各Service中定义的方法都有相对应的命令对象Cmd。Service把各种请求委托给Cmd。而一个Cmd执行的过程中需要进行一些外围的处理，这些处理过程是一个职责链。
## 初始化
从流程引擎的配置实现类`ProcessEngineConfigurationImpl`为入口进入。init方法
```Java
public void init() {
  // ...

  initCommandExecutors();

  // ...
}
```
`initCommandExecutors`中会出事一些配置，比较重要的是最后两个。
```Java
public void initCommandExecutors() {
  initDefaultCommandConfig();
  initSchemaCommandConfig();
  initCommandInvoker();
  // 初始化命令拦截器
  initCommandInterceptors();
  // 初始化命令执行器
  initCommandExecutor();
}
```
首先来看`initCommandInterceptors`
```Java
public void initCommandInterceptors() {
  if (commandInterceptors == null) {
    commandInterceptors = new ArrayList<CommandInterceptor>();
    if (customPreCommandInterceptors != null) {
      commandInterceptors.addAll(customPreCommandInterceptors);
    }
    commandInterceptors.addAll(getDefaultCommandInterceptors());
    if (customPostCommandInterceptors != null) {
      commandInterceptors.addAll(customPostCommandInterceptors);
    }
    commandInterceptors.add(commandInvoker);
  }
}
```
可以看到这个方法主要做了四个事情。
1. 如果定制了前置拦截器则加入。
2. 添加activiti默认的拦截器。
3. 如果定制后置拦截器则加入。
4. 把命令执行期添加在链条的最后一环。

来看一下Activiti的默认拦截器
```Java
public Collection<? extends CommandInterceptor> getDefaultCommandInterceptors() {
  List<CommandInterceptor> interceptors = new ArrayList<CommandInterceptor>();
  interceptors.add(new LogInterceptor());

  CommandInterceptor transactionInterceptor = createTransactionInterceptor();
  if (transactionInterceptor != null) {
    interceptors.add(transactionInterceptor);
  }

  if (commandContextFactory != null) {
    interceptors.add(new CommandContextInterceptor(commandContextFactory, this));
  }

  if (transactionContextFactory != null) {
    interceptors.add(new TransactionContextInterceptor(transactionContextFactory));
  }

  return interceptors;
}
```
activiti默认添加三个拦截器及 日志拦截器、commandContext拦截器、事物拦截器。
再来看`initCommandExecutor`
```Java
public void initCommandExecutor() {
  if (commandExecutor == null) {
    CommandInterceptor first = initInterceptorChain(commandInterceptors);
    commandExecutor = new CommandExecutorImpl(getDefaultCommandConfig(), first);
  }
}
```
这个方法把之间的所有链的节点穿起来。形成了一个职责链,首节点为`first`。
然后初始化了`commandExecutor`
那么这个执行器是如何初始化到service里
```Java
public void initService(Object service) {
  if (service instanceof ServiceImpl) {
    ((ServiceImpl) service).setCommandExecutor(commandExecutor);
  }
}
```
## Service调用
下面就来说一下Service调用。
以删除任务的`deleteTask`为例
```Java
@Override
public void deleteTask(String taskId, String deleteReason) {
  commandExecutor.execute(new DeleteTaskCmd(taskId, deleteReason, false));
}
```
这里使用命令执行期执行Cmd。
看下命令执行器内部的实现，其实就是调用了职责链去执行这个Cmd，代码如下。
```Java
@Override
public <T> T execute(Command<T> command) {
  return execute(defaultConfig, command);
}

@Override
public <T> T execute(CommandConfig config, Command<T> command) {
  return first.execute(config, command);
}
```
上文我们说了，整个拦截器职责链的最后一环是`commandInvoker`,那么来看一下这个的实现
```Java
@Override
@SuppressWarnings("unchecked")
public <T> T execute(final CommandConfig config, final Command<T> command) {
  final CommandContext commandContext = Context.getCommandContext();

  // Execute the command.
  // This will produce operations that will be put on the agenda.
  commandContext.getAgenda().planOperation(new Runnable() {
    @Override
    public void run() {
      commandContext.setResult(command.execute(commandContext));
    }
  });

  // Run loop for agenda
  executeOperations(commandContext);

  // At the end, call the execution tree change listeners.
  // TODO: optimization: only do this when the tree has actually changed (ie check dbSqlSession).
  if (commandContext.hasInvolvedExecutions()) {
    Context.getAgenda().planExecuteInactiveBehaviorsOperation();
    executeOperations(commandContext);
  }

  return (T) commandContext.getResult();
}
```
也就是说实际上是在commandInvoker中调用Cmd的execute方法来执行的操作。
再来看一下Cmd中的execute
```Java
public Void execute(CommandContext commandContext) {
  if (taskId != null) {
    deleteTask(commandContext, taskId);
  } else if (taskIds != null) {
    for (String taskId : taskIds) {
      deleteTask(commandContext, taskId);
    }
  } else {
    throw new ActivitiIllegalArgumentException("taskId and taskIds are null");
  }

  return null;
}
```
看一下deleteTask的实现，然后依次往里面找。
```Java
@Override
public void deleteTask(TaskEntity task, String deleteReason, boolean cascade, boolean cancel) {
  if (!task.isDeleted()) {
    getProcessEngineConfiguration().getListenerNotificationHelper()
      .executeTaskListeners(task, TaskListener.EVENTNAME_DELETE);
    task.setDeleted(true);

    String taskId = task.getId();

    // 删除子任务
    List<Task> subTasks = findTasksByParentTaskId(taskId);
    for (Task subTask : subTasks) {
      deleteTask((TaskEntity) subTask, deleteReason, cascade, cancel);
    }

    // 删除标示和变量
    getIdentityLinkEntityManager().deleteIdentityLinksByTaskId(taskId);
    getVariableInstanceEntityManager().deleteVariableInstanceByTask(task);

    // 按需清理历史表
    if (cascade) {
      getHistoricTaskInstanceEntityManager().delete(taskId);
    } else {
      getHistoryManager().recordTaskEnd(taskId, deleteReason);
    }

    delete(task, false);

    // 发送删除事件
    if (getEventDispatcher().isEnabled()) {
      if (cancel && !task.isCanceled()) {
        task.setCanceled(true);
                getEventDispatcher().dispatchEvent(
                        ActivitiEventBuilder.createActivityCancelledEvent(task.getExecution() != null ? task.getExecution().getActivityId() : null,
                                task.getName(),
                                //temporary fix for standalone tasks
                                task.getExecutionId() != null ? task.getExecutionId() : task.getId(),
                                task.getProcessInstanceId(),
                                task.getProcessDefinitionId(),
                                "userTask",
                                deleteReason));
      }
      getEventDispatcher().dispatchEvent(ActivitiEventBuilder.createEntityEvent(ActivitiEventType.ENTITY_DELETED, task));
    }
  }
}
```
这个方法里面其实还是做了很多事情的。包括activiti的分表机制，和事件机制。这些机制后面的文章再讨论。
再往下找就是mybatis层了。至此从activiti的service层到db层的调用链路分析完毕了。从整体层面上来看，activiti的这种架构方式十分有利于代码的可读性，还是十分有学习的意义。

