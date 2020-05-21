---
title: Activiti7源码分析(六)-发起流程
date: 2020-05-20 11:50:13
tags: ['activiti']
---
发起流程是service都在runtimeService中。Service的调用链路可以看之前的文章。这里直接从cmd开始。
发起流程肯定要获取这个流程是怎么定义的。
```java
DeploymentManager deploymentCache = commandContext.getProcessEngineConfiguration().getDeploymentManager();

ProcessDefinitionRetriever processRetriever = new ProcessDefinitionRetriever(this.tenantId, deploymentCache);
ProcessDefinition processDefinition = processRetriever.getProcessDefinition(this.processDefinitionId, this.processDefinitionKey);
```
看一下getProcessDefinition的实现
```java
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
这里先简单介绍一下processDefinitionId、processDefinitionKey吧。processDefinitionId是流程图的唯一标示。每次修改流程图，新的流程图都会和之前的不一样。而processDefinitionKey是创建图的时候会新建一个，而之后修改都不会变动。
调用这个cmd的方法，有的会把这两个都传过来，有的只会传一个，所以这里会有一些判断。
由于processDefinitionId是唯一的，所以他这里会先判断有没有processDefinitionId，如果有的话用processDefinitionId从缓存中找流程定义。如果没有的话，再用processDefinitionKey从缓存中找。
这里其实有点小坑。如果在多实例的情况下，使用默认的缓存机制及内存缓存。如果更新了定义，不同实例的缓存是不会同步的。如果是用processDefinitionKey为依据去发起流程的话，可能会由于缓存没同步而造成事故。
针对这个坑点，发起实例尽量用processDefinitionId来发起，或者使用中间键作为缓存。

我们继续。这里会尝试从缓存中拿。如果拿不到就从db中拿。代码如下
```java
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
```java
ProcessInstance processInstance = createAndStartProcessInstance(processDefinition, businessKey, processInstanceName, variables, transientVariables);
```
点进去这个，然后向下追踪
```java
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
ProcessInstance（流程实例）、Execution（执行实例)。ProcessInstance是主执行流，继承Execution。当流程中没有分治的时候这两个概念其实是相等的。在activiti中，这种情况下他们的id都会相同。而如果流程中存在分支比如网管，那么在分支口会形成子Execution。
这里我们点进去看他的方法。首先进行数据组装。
```java
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

插入数据库,这里可以看到 流程实例执行的时候会抛两个事件，ENTITY_CREATED、ENTITY_INITIALIZED可以接一下用于定制化需求。
```java
  public void insert(EntityImpl entity, boolean fireCreateEvent) {
    getDataManager().insert(entity);

    ActivitiEventDispatcher eventDispatcher = getEventDispatcher();
    if (fireCreateEvent && eventDispatcher.isEnabled()) {
      eventDispatcher.dispatchEvent(ActivitiEventBuilder.createEntityEvent(ActivitiEventType.ENTITY_CREATED, entity));
      eventDispatcher.dispatchEvent(ActivitiEventBuilder.createEntityEvent(ActivitiEventType.ENTITY_INITIALIZED, entity));
    }
  }
```
这里插入的是ExecutionEntity对象，他对应的表是ACT_RU_EXECUTION。然后返回流程实例id。



