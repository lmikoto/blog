---
title: java 桥接方法
urlname: ahlcyl
date: 2020-10-12 22:11:17 +0800
tags: []
categories: []
---

## 什么是桥接方法

桥接方法是在 JDK1.5 引入泛型之后，为了使 Java 的泛型方法生成的字节码和之前的版本兼容，由编译器自动生成的方法。

可以通过`Method.isBridge()`方法来判断一个方法是否是桥接方法。在生成的字节码文件中，桥接方法会被标记为 ACC_BRIDGE 和 ACC_SYNTHETIC。

## 什么时候会生成桥接方法

[https://docs.oracle.com/javase/specs/jls/se7/html/jls-15.html#jls-15.12.4.5](https://docs.oracle.com/javase/specs/jls/se7/html/jls-15.html#jls-15.12.4.5)
在一个子类在继承或实现一个父类或接口的范型方法时，在子类中明确制定了范型的类型。在编译的时候会生成桥接方法。

```java
interface Parent<T> {

    T getName(T name);
}

class Child implements Parent<String>{

    public String getName(String name) {
        return "name";
    }
}
```

试着用反射抓一下 Child 的方法。
![image.png](/images/1602516922094-b1ffe0e8-87c6-48a8-bf56-8c05be16c703.png)
会发现生成了两个方法。而参数时 Object 的那个就是桥接方法。

## 为什么会生成桥接方法

个人感觉时为了兼容之前的设计。

以上面的例子为例。对应的接口 Parent。在编译之后，实际上 T 会转变成 Object。如果不生成桥接方法，那么子类就没有实现接口中的该方法，导致语法错误（子类必须实现接口中的所有方法）。

## 如何通过桥接方法获取实际方法

我们在通过反射进行方法调用时，如果获取到桥接方法对应的实际的方法呢？可以查看`spring中org.springframework.core.BridgeMethodResolver`类的源码。实际上是通过判断方法名、参数的个数以及泛型类型参数来获取的。

## 参考资料

[https://blog.csdn.net/f641385712/article/details/88767877](https://blog.csdn.net/f641385712/article/details/88767877)
[https://blog.csdn.net/mhmyqn/article/details/47342577](https://blog.csdn.net/mhmyqn/article/details/47342577)
