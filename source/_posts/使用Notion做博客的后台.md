---
title: 使用Notion做博客的后台
date: 2020-07-12 00:00:00
tags: ['tool']
---
我又又又开始折腾博客了。
最近发现了一个很舒服的工具[notion](https://www.notion.so/)。不但可以记笔记其功能还涵盖了项目管理、wiki、文档等。最主要的是极致的markdown书写体验，让我爱不释手。
## 博客现状
先说一下我改造前的博客现状。
博客是基于hexo搭建的，使用travis部署在github page上的静态博客。具体可以参考这个[关于本站](https://lmikoto.com/2020/05/07/%E5%85%B3%E4%BA%8E%E6%9C%AC%E7%AB%99/)。平时写博客的时候需要先`hexo new post`，然后在vscode中写，然后push到github上。由travis帮忙构建和发布。
这里的短板算是vscode了。因为他并不支持所见即所得编辑。对图片的插入也不是很友好，虽然有插件进行支持。
## 改造点
把写博客的工具由vscode 迁移到notion上来。
## 难点以及解决
- notion到现在还不支持开放api。对于这个还算好说，虽然不支持开发api，但是可以直接访问他自己前端用的api。对于notion中公开的文章，访问api甚至不用鉴权。
- 数据结构不一致。虽然notion提供了极致的mardown书写体验。但他的数据结构并不是markdown，而是notion自己的block。要做到这一点，就需要建立一个从block到mardown的映射。好在不是很困难，找了一些资料然后写了一些代码来解决了这个问题。
- 触发构建。原来是git提交触发。现在就只能点travis的构建按钮进行触发。


完整的代码放到了[这里了](https://github.com/lmikoto/blog/tree/master/notion)，代码组织的有点烂，如果有想参考这个来做的小伙伴，多见谅哈。
## 参考链接
- [https://github.com/sorcererxw/notionblog](https://github.com/sorcererxw/notionblog)


