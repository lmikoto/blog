---
title: LinkedHashMap
urlname: chkrx0
date: '2020-12-25 10:40:15 +0800'
tags: []
categories: []
---

## 简介

继承自`HashMap`，实现了`Map<K,V>`接口，和[HashMap](https://www.yuque.com/lmikoto/dweopl/whrnzv)非常相似，主要通过重写`HashMap`中方法的实现。
内部维护一个双向链表，每次插入数据、访问、修改数据时，会增加节点或调整链表节点的顺序。
允许 key 为 null，value 为 null
线程不安全

## 属性

`LinkedHashMap`内部维护一个双向链表。属性中的 head 和 tail 记录头节点和尾节点。
节点是继承`HashMap`的节点，并在其基础上扩充了 before, after，改造成了双向链表的节点。
`accessOrder`为 true 时，迭代顺序是访问顺序(最近访问的会插在链表的后面)，相同 false 的时候遍历顺序为插入顺序。

```java
static class Entry<K,V> extends HashMap.Node<K,V> {
    Entry<K,V> before, after;
    Entry(int hash, K key, V value, Node<K,V> next) {
        super(hash, key, value, next);
    }
}

transient LinkedHashMap.Entry<K,V> head;

transient LinkedHashMap.Entry<K,V> tail;

final boolean accessOrder;
```

## 构造函数

构造函数和`HashMap`基本相同。多了一个 accessOrder 用于控制迭代时的顺序。默认为 false

```java
public LinkedHashMap(int initialCapacity, float loadFactor) {
    super(initialCapacity, loadFactor);
    accessOrder = false;
}

public LinkedHashMap(int initialCapacity) {
    super(initialCapacity);
    accessOrder = false;
}

public LinkedHashMap() {
    super();
    accessOrder = false;
}

public LinkedHashMap(Map<? extends K, ? extends V> m) {
    super();
    accessOrder = false;
    putMapEntries(m, false);
}

public LinkedHashMap(int initialCapacity,
                     float loadFactor,
                     boolean accessOrder) {
    super(initialCapacity, loadFactor);
    this.accessOrder = accessOrder;
}
```

## put 方法

`LinkedHashMap`没有重写 put 方法，但重写了 newNode 方法。通过重写`newNode`方法实现每次新增节点的时候调用`linkNodeLast`将节点放到链表的尾部。

```java
Node<K,V> newNode(int hash, K key, V value, Node<K,V> e) {
    LinkedHashMap.Entry<K,V> p =
        new LinkedHashMap.Entry<K,V>(hash, key, value, e);
    linkNodeLast(p);
    return p;
}

private void linkNodeLast(LinkedHashMap.Entry<K,V> p) {
    LinkedHashMap.Entry<K,V> last = tail;
    tail = p;
    if (last == null)
        head = p;
    else {
        p.before = last;
        last.after = p;
    }
}
```

以及最后调用了钩子函数`afterNodeInsertion`因为这个`LinkedHashMap`的 removeEldestEntry 一定会返回 false。所以这个方法就没啥用。但是其他的子类会重写`removeEldestEntry`方法比如`LruCache`在`LinkedHashMap`中可以忽略它。

```java
void afterNodeInsertion(boolean evict) { // possibly remove eldest
    LinkedHashMap.Entry<K,V> first;
    if (evict && (first = head) != null && removeEldestEntry(first)) {
        K key = first.key;
        removeNode(hash(key), key, null, false, true);
    }
}

protected boolean removeEldestEntry(Map.Entry<K,V> eldest) {
    return false;
}
```

## remove 方法

`LinkedHashMap`也没有直接重写 remove 方法，remove 主逻辑和`HashMap`相同。
但是重写了`afterNodeRemoval`方法来删除链表中的节点。

```java
void afterNodeRemoval(Node<K,V> e) { // unlink
    LinkedHashMap.Entry<K,V> p =
        (LinkedHashMap.Entry<K,V>)e, b = p.before, a = p.after;
    p.before = p.after = null;
    if (b == null)
        head = a;
    else
        b.after = a;
    if (a == null)
        tail = b;
    else
        a.before = b;
}
```

## get 方法

get 方法和`HashMap`中的最主要区别是多了`accessOrder`相关的操作。前面说了如果`accessOrder`为 true 那么遍历的顺序为访问的顺序。
`afterNodeAccess`方法会把访问的节点放到链表的最后。
`afterNodeAccess`会修改 modCount。因此在遍历`LinkedHashMap`的时候如果访问元素也会触发`fail-fast`

```java
public V get(Object key) {
    Node<K,V> e;
    if ((e = getNode(hash(key), key)) == null)
        return null;
    if (accessOrder)
        afterNodeAccess(e);
    return e.value;
}

void afterNodeAccess(Node<K,V> e) { // move node to last
    LinkedHashMap.Entry<K,V> last;
    if (accessOrder && (last = tail) != e) {
        LinkedHashMap.Entry<K,V> p =
            (LinkedHashMap.Entry<K,V>)e, b = p.before, a = p.after;
        p.after = null;
        if (b == null)
            head = a;
        else
            b.after = a;
        if (a != null)
            a.before = b;
        else
            last = b;
        if (last == null)
            head = p;
        else {
            p.before = last;
            last.after = p;
        }
        tail = p;
        ++modCount;
    }
}
```

## containsValue

重写了`containsValue`方法。直接使用链表进行遍历。

```java
public boolean containsValue(Object value) {
    for (LinkedHashMap.Entry<K,V> e = head; e != null; e = e.after) {
        V v = e.value;
        if (v == value || (value != null && value.equals(v)))
            return true;
    }
    return false;
}
```

## entrySet

重写了`entrySet`方法
遍历是直接使用双向链表进行遍历的

## 总结

`LinkedHashMap`相比`HashMap`而言，仅重写了几个方法，以改变它迭代的遍历顺序。每次插入数据，访问数据，修改数据都会增加节点或者调整节点的顺序。已决定迭代输出的顺序。
