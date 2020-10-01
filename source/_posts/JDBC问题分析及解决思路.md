---
title: JDBC问题分析及解决思路
urlname: rdk29e
date: 2020-09-29 20:59:49 +0800
tags: []
categories: []
---

```java
// 加载数据库驱动
Class.forName("com.mysql.jdbc.Driver");
// 通过驱动管理类获取数据库链接
connection = DriverManager.getConnection("jdbc:mysql://localhost:3306/mybatis? characterEncoding=utf-8", "root", "root");
```

问题

- 数据库配置信息存在硬编码问题，如果需要改动需要修改代码，重新打包部署
- 频繁的去创建和释放数据库链接，浪费资源

解决思路

- 可以采用配置文件解决硬编码的问题。
- 采用连接池解决拼房创建数据库连接的问题

```java
// 定义sql语句?表示占位符
String sql = "select * from user where username = ?";
// 获取预处理statement
preparedStatement = connection.prepareStatement(sql);
// 设置参数，第一个参数为sql语句中参数的序号(从1开始)，第二个参数为设置的参数值
preparedStatement.setString(1, "tom");
// 向数据库发出sql执行查询，查询出结果集
resultSet = preparedStatement.executeQuery();
```

问题

- sql 语句，设置参数存在硬编码

解决思路

- 配置文件解决，把 sql 封装到配置文件中

```java
while (resultSet.next()) {
	int id = resultSet.getInt("id");
	String username = resultSet.getString("username");
	user.setId(id);
	user.setUsername(username);
}
```

问题

- 硬编码，需要手动封装返回结果集，如果这里有很多字段会非常繁琐。

解决思路

- 反射、内省等技术，实现自动映射
