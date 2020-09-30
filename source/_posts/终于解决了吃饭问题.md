---
title: 终于解决了吃饭问题
urlname: aro88f
date: 2020-09-29 21:57:52 +0800
tags: []
categories: []
---

每次到吃 🍚 的点都会纠结到底吃啥，食堂那么多窗口，今天吃哪一个。
终于下定决心写个程序来帮我选择了。
首先分析一下需求

- 选择食堂的哪个窗口吃饭。最好带上权重，比如我更喜欢吃烧腊而不喜欢小笼包。但是偶尔想吃小笼包换换口味。这样可以把小笼包权重设低一点。
- 这个程序最好不是只为吃饭服务。别的其他有选择障碍的东西也可以用这个程序来选择。
- 最好可以带上存储功能，我关掉之后下次打开东西还在。

这些需求一个网页就可以解决掉了。存储功能使用 localStorage 也足够用了。
接下来就是实现。
技术栈采用 react + antd，加权随机采用扩展集合，使每一项出现的次数与其权重正相关，用均匀随机算法来从中选取的算法来解决，虽然这个算法耗费空间，但是对于这个场景来说足够了。
界面
![b3be7661-7877-4957-9fff-9ccf9c94ebbb.png](https://cdn.nlark.com/yuque/0/2020/png/328252/1601387936578-a7085974-d3c6-4d49-ae4d-9d900255595a.png#align=left&display=inline&height=1354&margin=%5Bobject%20Object%5D&name=b3be7661-7877-4957-9fff-9ccf9c94ebbb.png&originHeight=1354&originWidth=1084&size=80328&status=done&style=none&width=1084)
![1562d972-4598-41ee-8a5d-8160a960fe69.png](https://cdn.nlark.com/yuque/0/2020/png/328252/1601387946304-ffcfc369-bc2b-4f6d-af6d-d6a797c63612.png#align=left&display=inline&height=348&margin=%5Bobject%20Object%5D&name=1562d972-4598-41ee-8a5d-8160a960fe69.png&originHeight=348&originWidth=858&size=30403&status=done&style=none&width=858)
[项目访问链接](https://select.lmikoto.com/)
[源代码](https://github.com/lmikoto/select)
