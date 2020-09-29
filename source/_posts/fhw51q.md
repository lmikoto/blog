---
title: 使用Notion做博客的后台
urlname: fhw51q
date: 2020-09-29 21:55:58 +0800
tags: []
categories: []
---

我又又又开始折腾博客了。
最近发现了一个很舒服的工具[notion](https://www.notion.so/)。不但可以记笔记其功能还涵盖了项目管理、wiki、文档等。最主要的是极致的 markdown 书写体验，让我爱不释手。

## 博客现状

先说一下我改造前的博客现状。
博客是基于 hexo 搭建的，使用 travis 部署在 github page 上的静态博客。具体可以参考[关于本站](https://lmikoto.com/2020/05/07/%E5%85%B3%E4%BA%8E%E6%9C%AC%E7%AB%99/)。平时写博客的时候需要先`hexo new post`，然后在 vscode 中写，然后 push 到 github 上。由 travis 帮忙构建和发布。
这里的短板算是 vscode 了。因为他并不支持所见即所得编辑。对图片的插入也不是很友好，虽然有插件进行支持。

## 改造点

把写博客的工具由 vscode 迁移到 notion 上来。

## 难点以及解决

- notion 到现在还不支持开放 api。对于这个还算好说，虽然不支持开发 api，但是可以直接访问他自己前端用的 api。对于 notion 中公开的文章，访问 api 甚至不用鉴权。
- 数据结构不一致。虽然 notion 提供了极致的 mardown 书写体验。但他的数据结构并不是 markdown，而是 notion 自己的 block。要做到这一点，就需要建立一个从 block 到 mardown 的映射。好在不是很困难，找了一些资料然后写了一些代码来解决了这个问题。
- 触发构建。原来是 git 提交触发。现在就只能点 travis 的构建按钮进行触发。

完整的代码放到了[这里了](https://github.com/lmikoto/blog/tree/master/notion)，代码组织的有点烂，如果有想参考这个来做的小伙伴，多见谅哈。

## 参考链接

- [https://github.com/sorcererxw/notionblog](https://github.com/sorcererxw/notionblog)
