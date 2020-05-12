---
title: dubbo实现分布式按需调用指定服务
date: 2020-05-12 11:48:52
tags: ['java']
---
分布式部署了很多的服务提供者，dubbo默认会调用到一个提供者，现在要调用到指定的其中一个，或者多个提供者。
可以通过实现`AbstractClusterInvoker`来解决这个问题
```java
public class MyClusterInvoker<T> extends AbstractClusterInvoker<T> {

    @Override
    protected Result doInvoke(Invocation invocation, List<Invoker<T>> invokers, LoadBalance loadbalance)
            throws RpcException {
        checkInvokers(invokers, invocation);

        // 外部传入需要调用的ip
        List<String> ips = (List<String>) RpcContext.getContext().get("ips");

        // 根据ip找到对应的提供者。
        List<Invoker<T>> toInvokers = invokers.stream().filter(invoker -> ips.contains(invoker.getUrl().getHost())).collect(Collectors.toList());
        
        try {
            Result result = null;
            for (Invoker invoker: toInvokers){
                result = invoker.invoke(invocation);
            }
            
            return result;
        } catch (Throwable e) {
            throw new RpcException("invoke fail");
        }
    }
}
```
