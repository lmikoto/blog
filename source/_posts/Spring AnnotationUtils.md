---
title: Spring AnnotationUtils
urlname: gc3glp
date: '2020-10-10 11:33:23 +0800'
tags: []
categories: []
---

`AnnotationUtils`是 spring 中用于处理复杂注解问题的工具类。

在看这类之前先看一下 java 中的一些接口概念

- `Annotation`表示注解
- `AnnotatedElement` 表示被注解的元素，可以是 Class、Method、Filed 等，所有实现了这个接口的元素都可以是被注解的元素

## 常用方法

#### getAnnotation 从指定元素上获取指定注解

只查找本类的

getAnnotation 提供了三个重载接口
![image.png](/images/1602302078443-132c3945-401f-4c36-ac27-aefbdf8e1fa7.png)
获取注解的的方式是通过反射。不过需要注意的是这些方法是**支持注解嵌套**的。比如说`@Service`上面有`@Component`注解。那么实际上 Spring 在用这个方法拿`@Component`的时候，带上`@Service`的也会被拿到。这样就实现了类似继承的效果了。

Spring 中的`@AliasFor`也是在这里`getAnnotation`这里处理的。实现方式是动态代理。

`org.springframework.core.annotation.AnnotationUtils#synthesizeAnnotation(A, java.lang.Object)`

```java
static <A extends Annotation> A synthesizeAnnotation(A annotation, @Nullable Object annotatedElement) {
    // 如果已经被代理过了 或者是注解里面只有java语言的注解或者 org.springframework.lang包下面的扩展注解就直接返回
    if (annotation instanceof SynthesizedAnnotation || hasPlainJavaAnnotationsOnly(annotatedElement)) {
        return annotation;
    }

    Class<? extends Annotation> annotationType = annotation.annotationType();
    // 判断是否需要被代理
    if (!isSynthesizable(annotationType)) {
        return annotation;
    }

    DefaultAnnotationAttributeExtractor attributeExtractor =
        new DefaultAnnotationAttributeExtractor(annotation, annotatedElement);

    // 构造用于创建代理的Handler
    InvocationHandler handler = new SynthesizedAnnotationInvocationHandler(attributeExtractor);

    Class<?>[] exposedInterfaces = new Class<?>[] {annotationType, SynthesizedAnnotation.class};

    // 创建代理
    return (A) Proxy.newProxyInstance(annotation.getClass().getClassLoader(), exposedInterfaces, handler);
}
```

再来看一下判断是否需要被代理的`isSynthesizable`，这里主要判断 method 是否带有`@AliasFor`注解，或者返回值的注解的 method 带不带`@AliasFor`注解
`org.springframework.core.annotation.AnnotationUtils#isSynthesizable`

```java
private static boolean isSynthesizable(Class<? extends Annotation> annotationType) {
    // 注解里面只有java语言的注解或者 org.springframework.lang包下面的扩展注解 不需要代理
    if (hasPlainJavaAnnotationsOnly(annotationType)) {
        return false;
    }

    // 从缓存中拿，如果已经判断过就直接返回了。
    Boolean synthesizable = synthesizableCache.get(annotationType);
    if (synthesizable != null) {
        return synthesizable;
    }

    synthesizable = Boolean.FALSE;
    // 遍历注解里面的所有属性的method
    // 属性的method就是 没有参数，并且返回值不是void的method
    for (Method attribute : getAttributeMethods(annotationType)) {
        // method上有@AliasFor
        if (!getAttributeAliasNames(attribute).isEmpty()) {
            synthesizable = Boolean.TRUE;
            break;
        }
        Class<?> returnType = attribute.getReturnType();
        // 返回值是注解数组
        if (Annotation[].class.isAssignableFrom(returnType)) {
            Class<? extends Annotation> nestedAnnotationType =
                (Class<? extends Annotation>) returnType.getComponentType();
            // 递归判断
            if (isSynthesizable(nestedAnnotationType)) {
                synthesizable = Boolean.TRUE;
                break;
            }
        }
        // 返回值类型是注解
        else if (Annotation.class.isAssignableFrom(returnType)) {
            Class<? extends Annotation> nestedAnnotationType = (Class<? extends Annotation>) returnType;
            // 递归
            if (isSynthesizable(nestedAnnotationType)) {
                synthesizable = Boolean.TRUE;
                break;
            }
        }
    }

    // 结果放进缓存
    synthesizableCache.put(annotationType, synthesizable);
    return synthesizable;
}
```

动态代理实际上是获取了`@AliasFor`的值，放到了对应方法的返回值。
流程代码如下。

```java
public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
    // 处理 Annotation接口里面的自带方法
    if (ReflectionUtils.isEqualsMethod(method)) {
        return annotationEquals(args[0]);
    }
    if (ReflectionUtils.isHashCodeMethod(method)) {
        return annotationHashCode();
    }
    if (ReflectionUtils.isToStringMethod(method)) {
        return annotationToString();
    }
    if (AnnotationUtils.isAnnotationTypeMethod(method)) {
        return annotationType();
    }

    // 正常情况应该走不到这个if ，因为前面有判断
    if (!AnnotationUtils.isAttributeMethod(method)) {
        throw new AnnotationConfigurationException(String.format(
            "Method [%s] is unsupported for synthesized annotation type [%s]", method, annotationType()));
    }

    // 返回属性值
    return getAttributeValue(method);
}

private Object getAttributeValue(Method attributeMethod) {
    String attributeName = attributeMethod.getName();
    Object value = this.valueCache.get(attributeName);
    // 缓存中没有
    if (value == null) {
        // 获取值。 把@AliasFor的值组装起来
        value = this.attributeExtractor.getAttributeValue(attributeMethod);
        if (value == null) {
            String msg = String.format("%s returned null for attribute name [%s] from attribute source [%s]",
                                       this.attributeExtractor.getClass().getName(), attributeName, this.attributeExtractor.getSource());
            throw new IllegalStateException(msg);
        }

        // 注解 递归
        if (value instanceof Annotation) {
            value = AnnotationUtils.synthesizeAnnotation((Annotation) value, this.attributeExtractor.getAnnotatedElement());
        }

        // 注解数组 递归
        else if (value instanceof Annotation[]) {
            value = AnnotationUtils.synthesizeAnnotationArray((Annotation[]) value, this.attributeExtractor.getAnnotatedElement());
        }

        this.valueCache.put(attributeName, value);
    }

    // 克隆结果。防止用户该值导致问题
    if (value.getClass().isArray()) {
        value = cloneArray(value);
    }

    return value;
}
```

#### getAnnotations 获取被注解的元素或者方法上的全部注解

和上面基本一样，循环调用`synthesizeAnnotation`实现的。

#### getRepeatableAnnotations 获取重复的注解

把要查找的注解全部都都查出来，以 Set 的形式返回。
这里的可重复注解包括：

- 注解上的注解
- java 元素上的注解
- 注解里有注解的

#### findAnnotation 查找注解

findAnnotation 查找顺序式本类、本类的注解、父接口、父类、父类的接口。。。
和`getRepeatableAnnotations`不一样的地方是，这个找到一个直接返回

#### getAnnotationAttributes 把注解属性转换成 map 返回

该方法由多个重载。有的直接返回 map，有的返回`AnnoationAttributes`，是 map 的一个子类。
![image.png](/images/1602589998772-5f416745-969b-4b0c-b497-773795f40242.png)
然后就可以通过 get 从 map 中获取属性值了。

## 参考资料

[http://www.code260.com/2020/07/11/spring-01-01.utils-annotation/](http://www.code260.com/2020/07/11/spring-01-01.utils-annotation/)
