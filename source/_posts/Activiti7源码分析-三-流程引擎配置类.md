---
title: Activiti7源码分析(三)-流程引擎配置类
date: 2020-05-18 11:57:45
tags: ['java','activiti']
---

activiti的配置类是`org.activiti.engine.ProcessEngines`,本文主要讨论他的默认实现`getDefaultProcessEngine`

```java
public static ProcessEngine getDefaultProcessEngine() {
  return getProcessEngine(NAME_DEFAULT);
}
```
首先，他会传进去一个default的字符串。

```java
public static ProcessEngine getProcessEngine(String processEngineName) {
  if (!isInitialized()) {
    init();
  }
  return processEngines.get(processEngineName);
}
```
- 如果没有初始化，走初始化的逻辑
- 返回processEngines map中的配配置，processEngineName就是上面传过来的default

然后再来看init方法
```java
 public synchronized static void init() {
    // ...
 }
```
这哥方法是个同步方法。

```java
if (!isInitialized()) {
  // ...
}

```
这里又判断了一次是否初始化，可能有的人觉得这步判断有些多余，因为进入这个方法之前已经判断过了，但是在并发场景下并不多余，两个请求都没有初始化过流程引擎，同时走到init方法，然后其中一个先执行，另一个等待。一个执行完毕之后，另一个进来，发现已经初始化完成了，就不需要再执行了。

然后，获取activiti的配置文件activiti.cfg，进行初始化,代码如下。
```java
ClassLoader classLoader = ReflectUtil.getClassLoader();
Enumeration<URL> resources = null;
try {
  resources = classLoader.getResources("activiti.cfg.xml");
} catch (IOException e) {
  throw new ActivitiIllegalArgumentException("problem retrieving activiti.cfg.xml resources on the classpath: " + System.getProperty("java.class.path"), e);
}

// Remove duplicated configuration URL's using set. Some
// classloaders may return identical URL's twice, causing duplicate
// startups
Set<URL> configUrls = new HashSet<URL>();
while (resources.hasMoreElements()) {
  configUrls.add(resources.nextElement());
}
for (Iterator<URL> iterator = configUrls.iterator(); iterator.hasNext();) {
  URL resource = iterator.next();
  log.info("Initializing process engine using configuration '{}'", resource.toString());
  initProcessEngineFromResource(resource);
}
```
首先去获取了一个ClassLoader，这个ClassLoader可以使用默认自带的，也可以使用自定制的。都没问题。然后获取一下配置文件的的位置。对这些位置去重。然后遍历这些url，进行初始化资源。

 ```java
  ProcessEngineInfo processEngineInfo = processEngineInfosByResourceUrl.get(resourceUrl.toString());
// if there is an existing process engine info
if (processEngineInfo != null) {
  // remove that process engine from the member fields
  processEngineInfos.remove(processEngineInfo);
  if (processEngineInfo.getException() == null) {
    String processEngineName = processEngineInfo.getName();
    processEngines.remove(processEngineName);
    processEngineInfosByName.remove(processEngineName);
  }
  processEngineInfosByResourceUrl.remove(processEngineInfo.getResourceUrl());
}
 ```
 这里上来也做了个一个类似去重的操作，因为初始化的过程中可能会失败，会走如 retry方法，这里保证每一个url对应的配置信息只有最后加载的那一个。

 再来看一下构建流程引擎的方法
 ```java
   private static ProcessEngine buildProcessEngine(URL resource) {
    InputStream inputStream = null;
    try {
      inputStream = resource.openStream();
      ProcessEngineConfiguration processEngineConfiguration = ProcessEngineConfiguration.createProcessEngineConfigurationFromInputStream(inputStream);
      return processEngineConfiguration.buildProcessEngine();

    } catch (IOException e) {
      throw new ActivitiIllegalArgumentException("couldn't open resource stream: " + e.getMessage(), e);
    } finally {
      IoUtil.closeSilently(inputStream);
    }
  }
 ```
 使用url构建 输入流。然后传入createProcessEngineConfigurationFromInputStream方法。再来看一下这个方法,然后依次往下找。
 ```java
   public static ProcessEngineConfiguration parseProcessEngineConfiguration(Resource springResource, String beanName) {
    DefaultListableBeanFactory beanFactory = new DefaultListableBeanFactory();
    XmlBeanDefinitionReader xmlBeanDefinitionReader = new XmlBeanDefinitionReader(beanFactory);
    xmlBeanDefinitionReader.setValidationMode(XmlBeanDefinitionReader.VALIDATION_XSD);
    xmlBeanDefinitionReader.loadBeanDefinitions(springResource);
    ProcessEngineConfigurationImpl processEngineConfiguration = (ProcessEngineConfigurationImpl) beanFactory.getBean(beanName);
    processEngineConfiguration.setBeans(new SpringBeanFactoryProxyMap(beanFactory));
    return processEngineConfiguration;
  }
 ```
 这里的beanname 是 processEngineConfiguration，这里省略了中间步骤。
 这里是使用了spring的方法，把xml的配置转换成bean。

 然后回到buildProcessEngine
 ```java
  public ProcessEngine buildProcessEngine() {
  init();
  ProcessEngineImpl processEngine = new ProcessEngineImpl(this);
  postProcessEngineInitialisation();

  return processEngine;
}
 ```
 这里也很好懂。
 调用init方法，这个init方法就是上一篇中的那个init。在这里初始化了activiti的资源，包括上篇提到的命令执行器，和职责链，各种service 
 ```java
  initConfigurators();
  configuratorsBeforeInit();
  initHistoryLevel();
  initExpressionManager();

  if (usingRelationalDatabase) {
    initDataSource();
  }

  initAgendaFactory();
  initHelpers();
  initVariableTypes();
  initBeans();
  initScriptingEngines();
  initClock();
  initBusinessCalendarManager();
  initCommandContextFactory();
  initTransactionContextFactory();
  initCommandExecutors();
  initServices();
  initIdGenerator();
  initBehaviorFactory();
  initListenerFactory();
  initBpmnParser();
  initProcessDefinitionCache();
  initProcessDefinitionInfoCache();
  initKnowledgeBaseCache();
  initJobHandlers();
  initJobManager();
  initAsyncExecutor();

  initTransactionFactory();

  if (usingRelationalDatabase) {
    initSqlSessionFactory();
  }

  initSessionFactories();
  initDataManagers();
  initEntityManagers();
  initHistoryManager();
  initJpa();
  initDeployers();
  initDelegateInterceptor();
  initEventHandlers();
  initFailedJobCommandFactory();
  initEventDispatcher();
  initProcessValidator();
  initDatabaseEventLogging();
  configuratorsAfterInit();
 ```
 里面一些比较重要的，后面会进行讨论，这里就不进行展开了。
 
 回到之前方法/
 ```java
  try {
  resources = classLoader.getResources("activiti-context.xml");
} catch (IOException e) {
  throw new ActivitiIllegalArgumentException("problem retrieving activiti-context.xml resources on the classpath: " + System.getProperty("java.class.path"), e);
}
while (resources.hasMoreElements()) {
  URL resource = resources.nextElement();
  log.info("Initializing process engine using Spring configuration '{}'", resource.toString());
  initProcessEngineFromSpringResource(resource);
}

 ```
 activiti也支持Spring风格的初始化。这里获取了activiti-context.xml，然后调用initProcessEngineFromSpringResource初始化资源。
 来看一下initProcessEngineFromSpringResource
 ```java
  try {
    Class<?> springConfigurationHelperClass = ReflectUtil.loadClass("org.activiti.spring.SpringConfigurationHelper");
    Method method = springConfigurationHelperClass.getDeclaredMethod("buildProcessEngine", new Class<?>[] { URL.class });
    ProcessEngine processEngine = (ProcessEngine) method.invoke(null, new Object[] { resource });

    String processEngineName = processEngine.getName();
    ProcessEngineInfo processEngineInfo = new ProcessEngineInfoImpl(processEngineName, resource.toString(), null);
    processEngineInfosByName.put(processEngineName, processEngineInfo);
    processEngineInfosByResourceUrl.put(resource.toString(), processEngineInfo);

  } catch (Exception e) {
    throw new ActivitiException("couldn't initialize process engine from spring configuration resource " + resource.toString() + ": " + e.getMessage(), e);
  }
 ```
 通过反射调用SpringConfigurationHelper的buildProcessEngine方法。来看一下这个方法。
 ```java
  public static ProcessEngine buildProcessEngine(URL resource) {
  log.debug("==== BUILDING SPRING APPLICATION CONTEXT AND PROCESS ENGINE =========================================");

  ApplicationContext applicationContext = new GenericXmlApplicationContext(new UrlResource(resource));
  Map<String, ProcessEngine> beansOfType = applicationContext.getBeansOfType(ProcessEngine.class);
  if ((beansOfType == null) || (beansOfType.isEmpty())) {
    throw new ActivitiException("no " + ProcessEngine.class.getName() + " defined in the application context " + resource.toString());
  }

  ProcessEngine processEngine = beansOfType.values().iterator().next();

  log.debug("==== SPRING PROCESS ENGINE CREATED ==================================================================");
  return processEngine;
  }
 ```
 好的。activiti的配置类分析到此就结束了。
 简单总结一下，activiti配置类主要的工作就是做一些配置的初始化工作，支持activiti风格的配置和spring风格的配置。