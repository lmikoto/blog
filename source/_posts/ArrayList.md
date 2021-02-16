---
title: ArrayList
urlname: iheqgv
date: '2020-12-04 00:05:14 +0800'
tags: []
categories: []
---

ArrayList 是一个动态数组，其容量可以动态增长。

## 简介

ArrayList 继承了 AbstractList，实现了 List。他是一个数组队列，提供了增加、删除、修改、继承、遍历等功能。
ArrayList 实现了 RandmoAccess 接口，提供了随机访问的能力。
ArrayList 实现了 Cloneable 接口，重写了 clone 方法。可以被克隆。
ArrayList 实现了 Serializable，支持序列化。
ArrayList 是线程不安全的，在多线程环境下可以选择 Vector 或者 CopyOnWriteArrayList

## 属性

```java
// 默认初始化容量
private static final int DEFAULT_CAPACITY = 10;

// 一个空的数组对象
private static final Object[] EMPTY_ELEMENTDATA = {};

// 一个空的数组，如果使用无参构造函数，则对象的默认值为该值
private static final Object[] DEFAULTCAPACITY_EMPTY_ELEMENTDATA = {};

// 实际存储对象的数组，不参与序列化
transient Object[] elementData;

// 当前数组长度
private int size;

// 最大数组长度
private static final int MAX_ARRAY_SIZE = Integer.MAX_VALUE - 8;
```

## 构造函数

### 无参构造函数

```java
    public ArrayList() {
        this.elementData = DEFAULTCAPACITY_EMPTY_ELEMENTDATA;
    }
```

此时 elementData 中的长度是 0，list 的 size 为 0。当进行第一次 add 的时候 elementData 的长度会变成默认的长度 10，这个下面会讲到。

### 带 int 的构造函数

```java
    public ArrayList(int initialCapacity) {
        if (initialCapacity > 0) {
            this.elementData = new Object[initialCapacity];
        } else if (initialCapacity == 0) {
            this.elementData = EMPTY_ELEMENTDATA;
        } else {
            throw new IllegalArgumentException("Illegal Capacity: "+
                                               initialCapacity);
        }
    }
```

如果传入参数，参数如果大于 0，使用传入的参数初始化 elementData 的数组长度，如果小于 0 抛出异常。如果等于 0,elementData 就是静态常量 EMPTY_ELEMENTDATA 的地址。

### 带 Collection 对象的构造函数

```java
    public ArrayList(Collection<? extends E> c) {
        elementData = c.toArray();
        if ((size = elementData.length) != 0) {
            // c.toArray might (incorrectly) not return Object[] (see 6260652)
            if (elementData.getClass() != Object[].class)
                elementData = Arrays.copyOf(elementData, size, Object[].class);
        } else {
            // replace with empty array.
            this.elementData = EMPTY_ELEMENTDATA;
        }
    }
```

1. 将 collection 对象转换成数组，并把地址赋给 elementData。
1. 更新 size 为 elementData 的长度。
1. 如果 size 不为 0，并且对象不是 Object 对象，Arrays.copyOf 方法进行拷贝。否则把 elementData 的地址换成 EMPTY_ELEMENTDATA 的地址。

在上述步骤 3 中为什么需要进行额外的一步拷贝操作呢？是因为 Collection 的 toArray 方法的行为和规范不一致。以 Arrays 的内部类 ArrayList 和这篇文章说的 ArrayList 进行对比。

```java
List<String> list1 = new ArrayList<>();
list1.add("list1");
Object[] array1 = list1.toArray();
System.out.println(array1.getClass().getCanonicalName());// 输出结果 java.lang.Object[]
array1[0] = new Object(); // 正常

List<String> list2 = Arrays.asList("list2");
Object[] array2 = list2.toArray();
System.out.println(array2.getClass().getCanonicalName()); // 输出结果 java.lang.String[]
array2[0] = new Object(); // 异常java.lang.ArrayStoreException: java.lang.Object

```

所以如果该构造函数以 Arrays 的内部类 ArrayList 为入参就回把 elementData 的类型给修改了。对于上面例子，会把 elementData 的类型由 Object[]修改为 String[]。对于细节，可以看一下 Arrays 的内部类 ArrayList 的源码，这里就不展开了。所以此时使用了 Arrays.copyOf 重新修改了一下类型。

## add 方法

### add(E e)方法

add 主要执行逻辑如下

1. 确保 size + 1 之后能够存的下下一个数据
1. modCount + 1 如果 size + 1 > 数组长度，调用 grow 方法，增长数组长度为当前的 1.5 倍
1. 新元素存储到 size 的位置上，并且把 size + 1
1. 返回成功

入口

```java
    public boolean add(E e) {
        ensureCapacityInternal(size + 1);  // Increments modCount!!
        elementData[size++] = e;
        return true;
    }
```

计算容量
当第一次添加元素的时候 minCapacity 为 size + 1 = 1，此时容量变为 DEFAULT_CAPACITY，即 10。

```java
    private static int calculateCapacity(Object[] elementData, int minCapacity) {
        if (elementData == DEFAULTCAPACITY_EMPTY_ELEMENTDATA) {
            return Math.max(DEFAULT_CAPACITY, minCapacity);
        }
        return minCapacity;
    }
```

modCount + 1
如果本次添加需要的最小长度大于当前 elementData 的长度进行扩容

```java
    private void ensureExplicitCapacity(int minCapacity) {
        modCount++;

        // overflow-conscious code
        if (minCapacity - elementData.length > 0)
            grow(minCapacity);
    }
```

数组扩容 1.5 倍。
如果 1.5 倍还不够则使用 minCapacity 作为数组的长度,注意这里还有溢出的情况，整数位运算扩大 1.5 倍，如果 integer 长度不够 newCapacity 会变成负数。负数减去 minCapacity 也是负数。因此 newCapacity 为负数。会在 hugeCapacity 函数中抛出异常。

如果扩大 1.5 倍，大于 MAX_ARRAY_SIZE，并且小于 Integer.MAX_VALUE，即 oldCapacity + (oldCapacity >> 1) 没有发生溢出的情况下，会把容量扩大到 Integer.MAX_VALUE。

```java
    private void grow(int minCapacity) {
        // overflow-conscious code
        int oldCapacity = elementData.length;
        int newCapacity = oldCapacity + (oldCapacity >> 1);
        if (newCapacity - minCapacity < 0)
            newCapacity = minCapacity;
        if (newCapacity - MAX_ARRAY_SIZE > 0)
            newCapacity = hugeCapacity(minCapacity);
        // minCapacity is usually close to size, so this is a win:
        elementData = Arrays.copyOf(elementData, newCapacity);
    }
```

### add(int index, E element)

这个方法和上面的 add 方法是非常类似的。

1. 校验是否越界
1. 确保 size + 1 之后能够存的下下一个数据。内部过程和上面过程一样，这里就不展开讨论了。
1. 使用 System.arraycopy 把 index 后面的元素全部移动一位。
1. 把添加的元素放到 index 的位置上。

```java
    public void add(int index, E element) {
        rangeCheckForAdd(index);

        ensureCapacityInternal(size + 1);  // Increments modCount!!
        System.arraycopy(elementData, index, elementData, index + 1,
                         size - index);
        elementData[index] = element;
        size++;
    }

```

## get 方法

1. 校验是否越界
1. 返回 elementData 对应位置的元素

```java
    public E get(int index) {
        rangeCheck(index);

        return elementData(index);
    }
```

## set 方法

1. 校验是否越界
1. 把新元素放到对应的位置上
1. 返回老元素

```java
    public E set(int index, E element) {
        rangeCheck(index);

        E oldValue = elementData(index);
        elementData[index] = element;
        return oldValue;
    }
```

## contain 方法

直接遍历实现

```java
    public boolean contains(Object o) {
        return indexOf(o) >= 0;
    }

    public int indexOf(Object o) {
        if (o == null) {
            for (int i = 0; i < size; i++)
                if (elementData[i]==null)
                    return i;
        } else {
            for (int i = 0; i < size; i++)
                if (o.equals(elementData[i]))
                    return i;
        }
        return -1;
    }

```

## remove

### remove(int index)

1. 校验数组是否越界
1. modCount + 1
1. 将 index 之后的元素都向前挪一位
1. 最后一个元素的引用变为 null，方便垃圾回收器回收
1. 返回被移除的值

```java
    public E remove(int index) {
        rangeCheck(index);

        modCount++;
        E oldValue = elementData(index);

        int numMoved = size - index - 1;
        if (numMoved > 0)
            System.arraycopy(elementData, index+1, elementData, index,
                             numMoved);
        elementData[--size] = null; // clear to let GC do its work

        return oldValue;
    }
```

### remove(Object o)

遍历所有元素通过 fastRemove 删除和传入对象相同的值，这里只会移除第一个相同的元素

```java
    public boolean remove(Object o) {
        if (o == null) {
            for (int index = 0; index < size; index++)
                if (elementData[index] == null) {
                    fastRemove(index);
                    return true;
                }
        } else {
            for (int index = 0; index < size; index++)
                if (o.equals(elementData[index])) {
                    fastRemove(index);
                    return true;
                }
        }
        return false;
    }
```

fastRemove 和上面的 remove(int index)很相似，只是不需要进行越界校验和记录移除的值

```java
    private void fastRemove(int index) {
        modCount++;
        int numMoved = size - index - 1;
        if (numMoved > 0)
            System.arraycopy(elementData, index+1, elementData, index,
                             numMoved);
        elementData[--size] = null; // clear to let GC do its work
    }
```

## clear

1. modCount + 1
1. 遍历 elementData，把引用变成 null。这里没有调整 elementData 的 length
1. 修改 size 为 0。

```java
    public void clear() {
        modCount++;

        // clear to let GC do its work
        for (int i = 0; i < size; i++)
            elementData[i] = null;

        size = 0;
    }
```

## sublist

1. 校验是否越界。
1. 创建并返回 SubList 这个内部类的对象。这里传入当前 list 的 this 作为如参数。如果修改 sublist 中的值，原来 list 值也会变

```java
    public List<E> subList(int fromIndex, int toIndex) {
        subListRangeCheck(fromIndex, toIndex, size);
        return new SubList(this, 0, fromIndex, toIndex);
    }
```

## trimToSize

1. modCount + 1 这里注意不管最后是否修改都会+1
1. 如果 size 是 0 返回空数组否则把 elementData 的 length 大于 size 的部分移除（实际是通过创建新数组实现的）

```java
    public void trimToSize() {
        modCount++;
        if (size < elementData.length) {
            elementData = (size == 0)
              ? EMPTY_ELEMENTDATA
              : Arrays.copyOf(elementData, size);
        }
    }
```

## toArray

直接拷贝一个 elementData 返回

```java
public Object[] toArray() {
    return Arrays.copyOf(elementData, size);
}
```

## iterator

创建内部类的 Itr 对象这个内部类 Itr 实现了迭代器 Iterator 接口

```java
    public Iterator<E> iterator() {
        return new Itr();
    }
```

1. 校验期待修改的次数，也就是说迭代器对象创建之后，修改数组，再进行遍历就会抛出 ConcurrentModificationException 异常。
1. 校验游标不能大于等于 size。
1. 校验游标不能大于等于 elementData 数组的长度。这一步校验大概是为了防并发操作吧。上面校验 size 通过，另一个线程删减了 list 的数组并且 trim 之后会发生这个问题。个人感觉这个操作有点多余，因为 arraylist 本身是线程不安全的，并不会因为这个操作变成线程安全的。
1. 返回当前游标的元素。

```java
public E next() {
    checkForComodification();
    int i = cursor;
    if (i >= size)
        throw new NoSuchElementException();
    Object[] elementData = ArrayList.this.elementData;
    if (i >= elementData.length)
        throw new ConcurrentModificationException();
    cursor = i + 1;
    return (E) elementData[lastRet = i];
}
```

# 总结

- ArrayList 基于数组实现，可以自动扩容。
- 线程不安全。
- add(int index, E element)添加元素会讲 index 后面的元素全部向后移动一位。
- get 直接获取
- remove(Object)需要遍历数组，并且只会删除第一个匹配的元素，删除之后后面的元素都会向前移动一位
- remove(int index)不需要遍历数组，直接删除元素，删除之后 index 后的元素都会向前移动一位
- contains 通过遍历数组实现
