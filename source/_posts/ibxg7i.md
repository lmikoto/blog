---
title: Activiti7源码分析(六)-发起流程
urlname: ibxg7i
date: 2020-09-29 22:08:35 +0800
tags: []
categories: []
---

发起流程是 service 都在 runtimeService 中。Service 的调用链路可以看之前的文章。这里直接从 cmd 开始。
发起流程肯定要获取这个流程是怎么定义的。

```Java
DeploymentManager deploymentCache = commandContext.getProcessEngineConfiguration().getDeploymentManager();

ProcessDefinitionRetriever processRetriever = new ProcessDefinitionRetriever(this.tenantId, deploymentCache);
ProcessDefinition processDefinition = processRetriever.getProcessDefinition(this.processDefinitionId, this.processDefinitionKey);
```

看一下 getProcessDefinition 的实现

```Java
if (processDefinitionId == null && processDefinitionKey == null) {
      throw new ActivitiIllegalArgumentException("processDefinitionKey and processDefinitionId are null");
  }

  ProcessDefinition processDefinition = this.getProcessDefinitionByProcessDefinitionId(processDefinitionId, deploymentCache);
  if(processDefinition == null) {
      processDefinition = (processDefinitionKey != null && hasNoTenant(tenantId)) ?
          this.getProcessDefinitionByProcessDefinitionKey(processDefinitionKey, deploymentCache):
          this.getProcessDefinitionByProcessDefinitionKeyAndTenantId(processDefinitionKey, tenantId, deploymentCache);
      if (processDefinition == null) {
          throw new ActivitiObjectNotFoundException("No process definition found for key '" + processDefinitionKey + "' for tenant identifier " + tenantId, ProcessDefinition.class);
      }
  }

  return processDefinition;
```

这里先简单介绍一下 processDefinitionId、processDefinitionKey 吧。processDefinitionId 是流程图的唯一标示。每次修改流程图，新的流程图都会和之前的不一样。而 processDefinitionKey 是创建图的时候会新建一个，而之后修改都不会变动。
调用这个 cmd 的方法，有的会把这两个都传过来，有的只会传一个，所以这里会有一些判断。
由于 processDefinitionId 是唯一的，所以他这里会先判断有没有 processDefinitionId，如果有的话用 processDefinitionId 从缓存中找流程定义。如果没有的话，再用 processDefinitionKey 从缓存中找。
这里其实有点小坑。如果在多实例的情况下，使用默认的缓存机制及内存缓存。如果更新了定义，不同实例的缓存是不会同步的。如果是用 processDefinitionKey 为依据去发起流程的话，可能会由于缓存没同步而造成事故。
针对这个坑点，发起实例尽量用 processDefinitionId 来发起，或者使用中间键作为缓存。
我们继续。这里会尝试从缓存中拿。如果拿不到就从 db 中拿。代码如下

```Java
public ProcessDefinition findDeployedProcessDefinitionById(String processDefinitionId) {
    if (processDefinitionId == null) {
      throw new ActivitiIllegalArgumentException("Invalid process definition id : null");
    }

    // first try the cache
    ProcessDefinitionCacheEntry cacheEntry = processDefinitionCache.get(processDefinitionId);
    ProcessDefinition processDefinition = cacheEntry != null ? cacheEntry.getProcessDefinition() : null;

    if (processDefinition == null) {
      processDefinition = processDefinitionEntityManager.findById(processDefinitionId);
      if (processDefinition == null) {
        throw new ActivitiObjectNotFoundException("no deployed process definition found with id '" + processDefinitionId + "'", ProcessDefinition.class);
      }
      processDefinition = resolveProcessDefinition(processDefinition).getProcessDefinition();
    }
    return processDefinition;
  }
```

拿到流程定义之后，发起流程

```Java
ProcessInstance processInstance = createAndStartProcessInstance(processDefinition, businessKey, processInstanceName, variables, transientVariables);
```

点进去这个，然后向下追踪

```Java
public ExecutionEntity createProcessInstanceWithInitialFlowElement(ProcessDefinition processDefinition,
                                                                       String businessKey,
                                                                       String processInstanceName,
                                                                       FlowElement initialFlowElement,
                                                                       Process process) {

        // ....
        ExecutionEntity processInstance = commandContext.getExecutionEntityManager()
            .createProcessInstanceExecution(processDefinition,
                businessKey,
                processDefinition.getTenantId(),
                initiatorVariableName);
        // ....

        return processInstance;
    }
```

ProcessInstance（流程实例）、Execution（执行实例)。ProcessInstance 是主执行流，继承 Execution。当流程中没有分治的时候这两个概念其实是相等的。在 activiti 中，这种情况下他们的 id 都会相同。而如果流程中存在分支比，那么在分支口会形成子 Execution。
这里我们点进去看他的方法。首先进行数据组装。

```Java
ExecutionEntity processInstanceExecution = executionDataManager.create();

if (isExecutionRelatedEntityCountEnabledGlobally()) {
    ((CountingExecutionEntity) processInstanceExecution).setCountEnabled(true);
}

processInstanceExecution.setProcessDefinitionId(processDefinition.getId());
processInstanceExecution.setProcessDefinitionKey(processDefinition.getKey());
processInstanceExecution.setProcessDefinitionName(processDefinition.getName());
processInstanceExecution.setProcessDefinitionVersion(processDefinition.getVersion());
processInstanceExecution.setAppVersion(processDefinition.getAppVersion());
processInstanceExecution.setBusinessKey(businessKey);
processInstanceExecution.setScope(true); // process instance is always a scope for all child executions

// Inherit tenant id (if any)
if (tenantId != null) {
    processInstanceExecution.setTenantId(tenantId);
}

String authenticatedUserId = Authentication.getAuthenticatedUserId();

processInstanceExecution.setStartUserId(authenticatedUserId);
```

插入数据库,这里可以看到 流程实例执行的时候会抛两个事件，ENTITY_CREATED、ENTITY_INITIALIZED 可以接一下用于定制化需求。

```Java
public void insert(EntityImpl entity, boolean fireCreateEvent) {
    getDataManager().insert(entity);

    ActivitiEventDispatcher eventDispatcher = getEventDispatcher();
    if (fireCreateEvent && eventDispatcher.isEnabled()) {
      eventDispatcher.dispatchEvent(ActivitiEventBuilder.createEntityEvent(ActivitiEventType.ENTITY_CREATED, entity));
      eventDispatcher.dispatchEvent(ActivitiEventBuilder.createEntityEvent(ActivitiEventType.ENTITY_INITIALIZED, entity));
    }
  }
```

这里插入的是 ExecutionEntity 对象，他对应的表是 ACT_RU_EXECUTION。然后返回流程实例 id。
回到之前

```Java
if (startProcessInstance) {
    CommandContext commandContext = Context.getCommandContext();
    startProcessInstance(processInstance, commandContext, variables, initialFlowElement, transientVariables);
}
```

如果创建流程实例成功。则启动实例。
具体的启动实例这里就不展开了。启动实例之后返回流程实例 id，至此流程发布结束。
