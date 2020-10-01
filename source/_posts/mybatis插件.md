---
title: mybatis插件
urlname: du4qup
date: 2020-10-01 11:44:21 +0800
tags: []
categories: []
---

mybatis 的四大核心对象都提供了插件的扩展机制。对于**mybatis**来说插件就是拦截器。本质是通过动态代理实现的。
![](/images/8c39a064cb78695c040da544c8fee785.svg)

## 插件原理

每个创建出来的对象不是直接返回的。而是 ` interceptorChain``.pluginAll ` 处理后返回的。

```java
  public Object pluginAll(Object target) {
    for (Interceptor interceptor : interceptors) {
      target = interceptor.plugin(target);
    }
    return target;
  }
```

调用`interceptor.plugin`返回包装后的对象。

插件机制。使用插件为目标对象创建一个代理对象。代理对象就可以拦截到四大对象的执行。

## 自定义插件

**mybatis**插件需要实现`Intercepter`接口，该接口有三个方法

- `intercep`插件的核心实现逻辑
- `plugin`前面提到过的生成插件代理的方法
- `setProperties`传递插件所需要的参数

```java
package io.github.lmikoto;

import org.apache.ibatis.executor.statement.StatementHandler;
import org.apache.ibatis.plugin.*;

import java.sql.Connection;
import java.util.Properties;

@Intercepts({
       @Signature(type = StatementHandler.class,
               method = "prepare",
               args = {Connection.class,Integer.class}
       )
})
public class MyPlugin implements Interceptor {
    public Object intercept(Invocation invocation) throws Throwable {
        System.out.println("接口增强");
        return invocation.proceed();
    }

    public Object plugin(Object target) {
        System.out.println("要增强的对象");
        return Plugin.wrap(target,this);
    }

    public void setProperties(Properties properties) {
        System.out.println("插件的参数" + properties);
    }
}
```

`sqlMapConfig.xml`

```xml
<plugins>
    <plugin interceptor="io.github.lmikoto.MyPlugin">
        <property name="name" value="Tom"/>
    </plugin>
</plugins>
```

## 源码解析

mybatis 的插件本质上就是动态代理。
`org.apache.ibatis.plugin.Plugin`

```java
  @Override
  public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
    try {
      Set<Method> methods = signatureMap.get(method.getDeclaringClass());
      // 判断刚方法是否有拦截
      if (methods != null && methods.contains(method)) {
        // 执行插件的方法
        return interceptor.intercept(new Invocation(target, method, args));
      }
      // 执行被拦截的方法
      return method.invoke(target, args);
    } catch (Exception e) {
      throw ExceptionUtil.unwrapThrowable(e);
    }
  }
```

`signatureMap`是在调用`org.apache.ibatis.plugin.Plugin#wrap`初始化的。

```java
  public static Object wrap(Object target, Interceptor interceptor) {
    Map<Class<?>, Set<Method>> signatureMap = getSignatureMap(interceptor);
    Class<?> type = target.getClass();
    Class<?>[] interfaces = getAllInterfaces(type, signatureMap);
    if (interfaces.length > 0) {
      return Proxy.newProxyInstance(
          type.getClassLoader(),
          interfaces,
          new Plugin(target, interceptor, signatureMap));
    }
    return target;
  }
```

`org.apache.ibatis.plugin.Plugin#getSignatureMap`

```java
  private static Map<Class<?>, Set<Method>> getSignatureMap(Interceptor interceptor) {
    // 获取拦截器中的Intercepts声明
    Intercepts interceptsAnnotation = interceptor.getClass().getAnnotation(Intercepts.class);
    if (interceptsAnnotation == null) {
      throw new PluginException("No @Intercepts annotation was found in interceptor " + interceptor.getClass().getName());
    }
    // 获取想要拦截的方法
    Signature[] sigs = interceptsAnnotation.value();
    Map<Class<?>, Set<Method>> signatureMap = new HashMap<Class<?>, Set<Method>>();
    for (Signature sig : sigs) {
      Set<Method> methods = signatureMap.get(sig.type());
      // 没有初始化的话初始化
      if (methods == null) {
        methods = new HashSet<Method>();
        signatureMap.put(sig.type(), methods);
      }
      try {
        // 用反射从mybatis的类中获取拦截器上声明的方法
        Method method = sig.type().getMethod(sig.method(), sig.args());
        methods.add(method);
      } catch (NoSuchMethodException e) {
        throw new PluginException("Could not find method on " + sig.type() + " named " + sig.method() + ". Cause: " + e, e);
      }
    }
    return signatureMap;
  }
```
