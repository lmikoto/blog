---
title: Activiti7源码分析(五)-部署流程
date: 2020-05-20 10:55:06
tags: ['activiti']
---
activiti的部署的相关操作是由repositoryService来负责的。我们直接从repositoryService里面的deploy方法来往下看。
```java
public Deployment deploy(DeploymentBuilderImpl deploymentBuilder) {
  return commandExecutor.execute(new DeployCmd<Deployment>(deploymentBuilder));
}
```
用命令执行器执行了DeployCmd。关于命令行执行期的调用链路和初始化可以看之前的文章来了解，这里就不展开了。
直接看命令执行的方法。
```java
DeploymentEntity deployment = deploymentBuilder.getDeployment();

deployment.setDeploymentTime(commandContext.getProcessEngineConfiguration().getClock().getCurrentTime());

setProjectReleaseVersion(deployment);
deployment.setVersion(1);
```
这里是组装参数，设置部署的事件和版本。
然后下面有个重复过滤器的开关判断，如果打开了这个开关，那么如果没有修改deployment的内容数据库就不会新增一条记录了。反之，如果没有打开这个开关，每一次deploy都会新生成一条记录。
```java
if (deploymentBuilder.isDuplicateFilterEnabled()) {
    // ...
}
```
继续往下
```java
deployment.setNew(true);

  // Save the data
commandContext.getDeploymentEntityManager().insert(deployment);

if (commandContext.getProcessEngineConfiguration().getEventDispatcher().isEnabled()) {
  commandContext.getProcessEngineConfiguration().getEventDispatcher().dispatchEvent(ActivitiEventBuilder.createEntityEvent(ActivitiEventType.ENTITY_CREATED, deployment));
}
```
这里会把要部署的内容插入到数据库中，并且抛一个ENTITY_CREATED的事件出来。如果有需要定制的需求，可以接一下这个事件处理一下。
继续向下。
```java
// Deployment settings
Map<String, Object> deploymentSettings = new HashMap<String, Object>();
deploymentSettings.put(DeploymentSettings.IS_BPMN20_XSD_VALIDATION_ENABLED, deploymentBuilder.isBpmn20XsdValidationEnabled());
deploymentSettings.put(DeploymentSettings.IS_PROCESS_VALIDATION_ENABLED, deploymentBuilder.isProcessValidationEnabled());
```
这里塞了两个配置进来，这两个配置如果开启就会校验model的，项具用到的地方在后面bpmn解析的地方会提到。

然后会进行真正的部署
```java
// Actually deploy
commandContext.getProcessEngineConfiguration().getDeploymentManager().deploy(deployment, deploymentSettings);
```
然后进入这个deploy方法
```java
public void deploy(DeploymentEntity deployment, Map<String, Object> deploymentSettings) {
  for (Deployer deployer : deployers) {
    deployer.deploy(deployment, deploymentSettings);
  }
}
```
这里会遍历deployers然后调用deploy方法。
这个deploys是在流程引擎初始化的时候初始化的，activiti会出初始化一个BpmnDeployer，当然用户也可以自己定义前置和后置的deploy
```java
if (this.deployers == null) {
  this.deployers = new ArrayList<Deployer>();
  if (customPreDeployers != null) {
    this.deployers.addAll(customPreDeployers);
  }
  this.deployers.addAll(getDefaultDeployers());
  if (customPostDeployers != null) {
    this.deployers.addAll(customPostDeployers);
  }
}
```

```java
public Collection<? extends Deployer> getDefaultDeployers() {
  List<Deployer> defaultDeployers = new ArrayList<Deployer>();

  if (bpmnDeployer == null) {
    bpmnDeployer = new BpmnDeployer();
  }

  initBpmnDeployerDependencies();

  bpmnDeployer.setIdGenerator(idGenerator);
  bpmnDeployer.setParsedDeploymentBuilderFactory(parsedDeploymentBuilderFactory);
  bpmnDeployer.setBpmnDeploymentHelper(bpmnDeploymentHelper);
  bpmnDeployer.setCachingAndArtifactsManager(cachingAndArtifactsManager);

  defaultDeployers.add(bpmnDeployer);
  return defaultDeployers;
}
```
回到之前的方法，来看一下BpmnDeployer的deploy方法是如何实现的。

```java
// The ParsedDeployment represents the deployment, the process definitions, and the BPMN
// resource, parse, and model associated with each process definition.
ParsedDeployment parsedDeployment = parsedDeploymentBuilderFactory
        .getBuilderForDeploymentAndSettings(deployment,
                                            deploymentSettings)
        .build();

```
构建ParsedDeployment，这个对象相当于一个数据转换对象的容器吧，把数据在这里面组装一下，来看下具体的组装流程。
```java
public ParsedDeployment build() {
  List<ProcessDefinitionEntity> processDefinitions = new ArrayList<ProcessDefinitionEntity>();
  Map<ProcessDefinitionEntity, BpmnParse> processDefinitionsToBpmnParseMap 
    = new LinkedHashMap<ProcessDefinitionEntity, BpmnParse>();
  Map<ProcessDefinitionEntity, ResourceEntity> processDefinitionsToResourceMap 
    = new LinkedHashMap<ProcessDefinitionEntity, ResourceEntity>();

  for (ResourceEntity resource : deployment.getResources().values()) {
    if (isBpmnResource(resource.getName())) {
      log.debug("Processing BPMN resource {}", resource.getName());
      BpmnParse parse = createBpmnParseFromResource(resource);
      for (ProcessDefinitionEntity processDefinition : parse.getProcessDefinitions()) {
        processDefinitions.add(processDefinition);
        processDefinitionsToBpmnParseMap.put(processDefinition, parse);
        processDefinitionsToResourceMap.put(processDefinition, resource);
      }
    }
  }

  return new ParsedDeployment(deployment, processDefinitions, 
      processDefinitionsToBpmnParseMap, processDefinitionsToResourceMap);
}
```
这里面会用把xml解析成BpmnParse对象，解析过程这里就不讨论了。然后遍历解析之后的ProcessDefinitions，把他们塞进map里面。
然后设置流程图的名字、version等信息。
```java
setProcessDefinitionDiagramNames(parsedDeployment);
```
如果是新的，还会把所有的processDefinition存储一份。然后在设置授权信息。
```java
protected void persistProcessDefinitionsAndAuthorizations(ParsedDeployment parsedDeployment) {
    CommandContext commandContext = Context.getCommandContext();
    ProcessDefinitionEntityManager processDefinitionManager = commandContext.getProcessDefinitionEntityManager();

    for (ProcessDefinitionEntity processDefinition : parsedDeployment.getAllProcessDefinitions()) {
        processDefinitionManager.insert(processDefinition,
                                        false);
        bpmnDeploymentHelper.addAuthorizationsForNewProcessDefinition(parsedDeployment.getProcessModelForProcessDefinition(processDefinition),
                                                                      processDefinition);
    }
}
```
更新时间和事件。
```java
updateTimersAndEvents(parsedDeployment,
                      mapOfNewProcessDefinitionToPreviousVersion);
dispatchProcessDefinitionEntityInitializedEvent(parsedDeployment);
```
然后更新缓存，这里其实有点小坑。多实例情况下这个缓存如果用默认的内存缓存，会导致别的实例的缓存更新不及时。并且这里如果作死用processDefinitionKey发起流程而不是用processDefinitionId发起流程的话就会因为缓存问题产生事故。


再回到之前
```java
if (deploymentBuilder.getProcessDefinitionsActivationDate() != null) {
  scheduleProcessDefinitionActivation(commandContext, deployment);
}
```
如果设置了激活事件，那么他会把要部署的状态设置为SUSPENDED，也就是先暂停掉。然后在指定的事件把状态调为激活状态ACTIVE。这里是用activiti内部的job实现的状态流转。

然后发出部署完成事件ENTITY_INITIALIZED,完成部署。
```java
if (commandContext.getProcessEngineConfiguration().getEventDispatcher().isEnabled()) {
  commandContext.getProcessEngineConfiguration().getEventDispatcher().dispatchEvent(ActivitiEventBuilder.createEntityEvent(ActivitiEventType.ENTITY_INITIALIZED, deployment));
}
```
