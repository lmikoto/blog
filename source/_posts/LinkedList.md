---
title: LinkedList
urlname: oaa1mz
date: '2020-12-13 10:16:40 +0800'
tags: []
categories: []
---

## 简介

Linkedlist 是一个继承自 AbstractSequentialList 的双向链表，因此可以在双端进行操作。可以被用来当作栈和队列。
实现 List 接口可以对列表进行操作
实现 Deque 接口，可以将 Linkedlist 作为双端队列使用
Linkedlist 实现了 Cloneable 接口，重写了 clone 方法。可以被克隆
Linkedlist 实现了 Serializable，支持序列化
Linkedlist 是线程不安全的

## 属性

Linkedlist 只有三个属性
size: 代表当前有多少个节点，不参与序列化
first: 代表第一个节点，不参与序列化
last: 代表最后一个节点，不参与序列化

```java
transient int size = 0;

transient Node<E> first;

transient Node<E> last;
```

## Node

Node 是一个简单的内部类，一个双向连表的节点。
item 代表节点存储的元素，
next 代表下个节点
prev 代表上一个节点

```java
private static class Node<E> {
    E item;
    Node<E> next;
    Node<E> prev;

    Node(Node<E> prev, E element, Node<E> next) {
        this.item = element;
        this.next = next;
        this.prev = prev;
    }
}
```

## 构造函数

### 空构造函数

空构造函数什么也没有做

```java
public LinkedList() {
}
```

### 使用集合作为入参的构造函数

1. 调用空构造函数创建对象
1. 调用 addAll 方法，addAll 方法调用重载方法，把集合和当前的 size(作为 index)传入。

```java
public LinkedList(Collection<? extends E> c) {
    this();
    addAll(c);
}
```

addAll 方法执行步骤

1. 校验是否越界，即传入的 index 不能小于 0，不能大于 size
1. 将集合转换成数组对象 a
1. 如果当前的 size 是 index 即在最后添加元素，那么后续节点是 null，前序节点是 linkedlist 的当前最后一个节点。否则就是在中间插入数据，后续节点为当前 index 的节点。而前序节点为当前 index 节点的前一个节点。即下图，要在 index 1 的位置插入 newNode。那么 newNode 的后续节点为原来 index 位置上的节点 node2，newNode 的前序节点为原来 index 位置上的 node2 的前序节点 node1。这里的 NewNode 代表一个元素，如果代表多个元素同样的道理。

![image.png](/images/1607838514006-8716f8f1-0fd0-4f7c-b4f8-d7133cc2c5fb.png)

4. 遍历数组 a，组装连表
5. size 加上传入集合的数量
6. modCout + 1

```java
public boolean addAll(int index, Collection<? extends E> c) {
    checkPositionIndex(index);

    Object[] a = c.toArray();
    int numNew = a.length;
    if (numNew == 0)
        return false;

    Node<E> pred, succ;
    if (index == size) {
        succ = null;
        pred = last;
    } else {
        succ = node(index);
        pred = succ.prev;
    }

    for (Object o : a) {
        @SuppressWarnings("unchecked") E e = (E) o;
        Node<E> newNode = new Node<>(pred, e, null);
        if (pred == null)
            first = newNode;
        else
            pred.next = newNode;
        pred = newNode;
    }

    if (succ == null) {
        last = pred;
    } else {
        pred.next = succ;
        succ.prev = pred;
    }

    size += numNew;
    modCount++;
    return true;
}
```

## add 方法

### add(E e)方法

1. 直接将元素添加到链表的最后一个节点。如果原来 linkedList 中的 last 是 null，证明链表中还没有元素，所以会把 newNode 放到 first 位置作为第一个元素，此时 first 和 last 都是 newNode
1. size + 1
1. modCount + 1

```java
public boolean add(E e) {
    linkLast(e);
    return true;
}
```

```java
void linkLast(E e) {
    final Node<E> l = last;
    final Node<E> newNode = new Node<>(l, e, null);
    last = newNode;
    if (l == null)
        first = newNode;
    else
        l.next = newNode;
    size++;
    modCount++;
}
```

### add(int index, E element)

1. 校验是否越界。
1. size 和 index 是否相等，如果相等就是在最后新加节点，即和上面的情况一样
1. 否则调用 linkBefore 进行插入。过程和批量操作类似。只不过这里是单个节点。
1. size + 1
1. modCount + 1

```java
public void add(int index, E element) {
    checkPositionIndex(index);

    if (index == size)
        linkLast(element);
    else
        linkBefore(element, node(index));
}

void linkBefore(E e, Node<E> succ) {
    // assert succ != null;
    final Node<E> pred = succ.prev;
    final Node<E> newNode = new Node<>(pred, e, succ);
    succ.prev = newNode;
    if (pred == null)
        first = newNode;
    else
        pred.next = newNode;
    size++;
    modCount++;
}
```

## get 方法

1. 校验是否越界
1. 使用 node 方法获取节点，并返回 item

```java
public E get(int index) {
    checkElementIndex(index);
    return node(index).item;
}
```

因为是双向连表。所以会先判断一下 index 和 size 的一半的关系。从更靠近的一边进行遍历。

```java
Node<E> node(int index) {
    // assert isElementIndex(index);

    if (index < (size >> 1)) {
        Node<E> x = first;
        for (int i = 0; i < index; i++)
            x = x.next;
        return x;
    } else {
        Node<E> x = last;
        for (int i = size - 1; i > index; i--)
            x = x.prev;
        return x;
    }
}
```

## getFirst

会直接返回 linkedlist 的头节点，如果 linkedList 中没有元素会抛错。

```java
public E getFirst() {
    final Node<E> f = first;
    if (f == null)
        throw new NoSuchElementException();
    return f.item;
}
```

## getLast

会直接返回 linkedlist 的尾节点。

```java
public E getLast() {
    final Node<E> l = last;
    if (l == null)
        throw new NoSuchElementException();
    return l.item;
}
```

## remove

### remove()方法

调用 removeFirst 方法，因此 remove 方法删除的是第一个节点

```java
public E remove() {
    return removeFirst();
}
```

### removeFirst()

1. 移除第一个节点。第一个节点清空。把 linkedList 的 first 变成下个节点。如果此时链表中没有节点了，就把 last 也设置成 null，否则新 first 的前置节点变为 null
1. size - 1
1. modCount + 1
1. 返回被删除的元素

```java
public E removeFirst() {
    final Node<E> f = first;
    if (f == null)
        throw new NoSuchElementException();
    return unlinkFirst(f);
}

```

```java
private E unlinkFirst(Node<E> f) {
    // assert f == first && f != null;
    final E element = f.item;
    final Node<E> next = f.next;
    f.item = null;
    f.next = null; // help GC
    first = next;
    if (next == null)
        last = null;
    else
        next.prev = null;
    size--;
    modCount++;
    return element;
}
```

### removeLast()

removeLast 和 removeFirst 的操作基本一致，不过操作对象变成了尾元素，因为本身就是双向链表，本质其实是一样的。

```java
public E removeLast() {
    final Node<E> l = last;
    if (l == null)
        throw new NoSuchElementException();
    return unlinkLast(l);
}
```

```java
private E unlinkLast(Node<E> l) {
    // assert l == last && l != null;
    final E element = l.item;
    final Node<E> prev = l.prev;
    l.item = null;
    l.prev = null; // help GC
    last = prev;
    if (prev == null)
        first = null;
    else
        prev.next = null;
    size--;
    modCount++;
    return element;
}
```

### remove(int index)

1. 校验是否越界
1. 调用 node 方法找到节点
1. 调用 unlink 摘除节点，并返回移除的数据
   1. 如果前序节点为 null 证明删除的是第一个元素，所以需要把链表的头节点换成 next
   1. 如果后序节点为 null 证明删除的是最后一个元素，所以需要把链表的尾节点换成 next
   1. 把元素的属性设置成 null 方便垃圾回收
   1. size - 1
   1. modCount + 1
   1. 返回被删除元素

```java
public E remove(int index) {
    checkElementIndex(index);
    return unlink(node(index));
}
```

```java
E unlink(Node<E> x) {
    // assert x != null;
    final E element = x.item;
    final Node<E> next = x.next;
    final Node<E> prev = x.prev;

    if (prev == null) {
        first = next;
    } else {
        prev.next = next;
        x.prev = null;
    }

    if (next == null) {
        last = prev;
    } else {
        next.prev = prev;
        x.next = null;
    }

    x.item = null;
    size--;
    modCount++;
    return element;
}
```

### remove(Object o)

1. 遍历删除第一个等于 o 的元素
1. 删除成功返回 true 否则返回 false

```java
public boolean remove(Object o) {
    if (o == null) {
        for (Node<E> x = first; x != null; x = x.next) {
            if (x.item == null) {
                unlink(x);
                return true;
            }
        }
    } else {
        for (Node<E> x = first; x != null; x = x.next) {
            if (o.equals(x.item)) {
                unlink(x);
                return true;
            }
        }
    }
    return false;
}
```

## set 方法

1. 校验数组是否越界
1. 把对应位置的元素换成新元素
1. 返回老元素

```java
public E set(int index, E element) {
    checkElementIndex(index);
    Node<E> x = node(index);
    E oldVal = x.item;
    x.item = element;
    return oldVal;
}
```

## clear

1. 遍历删除所有节点（注释中也有写，这一步不是必须的，单有利于垃圾回收）
1. linkList 的头和尾设置成 null
1. size 清 0
1. modCount + 1

```java
public void clear() {
    // Clearing all of the links between nodes is "unnecessary", but:
    // - helps a generational GC if the discarded nodes inhabit
    //   more than one generation
    // - is sure to free memory even if there is a reachable Iterator
    for (Node<E> x = first; x != null; ) {
        Node<E> next = x.next;
        x.item = null;
        x.next = null;
        x.prev = null;
        x = next;
    }
    first = last = null;
    size = 0;
    modCount++;
}

```

## push 和 pop 方法

这两个方法是实现 Deque 接口带来的。
这两个方法是调用 addFirst 和 removeFirst 实现的。

## toArray

创建一个新数组遍历连表把节点设置到 Object 中返回 Object 数组对象

```java
public Object[] toArray() {
    Object[] result = new Object[size];
    int i = 0;
    for (Node<E> x = first; x != null; x = x.next)
        result[i++] = x.item;
    return result;
}
```

## Iterator

生成一个 ListItr 的内部类。内部通过遍历实现的，这里就不展开了。同样是线程不安全的。

## 总结

- LinkedList 基于双向链表实现
- 线程不安全
- get 元素的时候会发生遍历，距离头节点近就从头节点遍历，否则从为节点进行遍历
- 删除元素的时候需要遍历，然后摘除节点
- 可以被当作队列和栈使用
