---
title: Activity 7 集成 Spring Boot
date: 2020-01-20T06:29:43.000Z
tags: ['java','activity']

---



## 1. 创建Spring-Boot项目

## 2. 引入activity依赖

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.activiti.dependencies</groupId>
      <artifactId>activiti-dependencies</artifactId>
      <version>${activiti-dependencies.version}</version>
      <scope>import</scope>
      <type>pom</type>
    </dependency>
  </dependencies>
</dependencyManagement>

<dependency>
  <groupId>org.activiti</groupId>
  <artifactId>activiti-spring-boot-starter</artifactId>
  <version>${activiti-dependencies.version}</version>
</dependency>
```



## 4. 数据库依赖
因为后面要用这个做一个demo出来，就不用内存数据库了，直接用mysql一步到位

```xml
<dependency>
  <groupId>mysql</groupId>
  <artifactId>mysql-connector-java</artifactId>
  <scope>runtime</scope>
</dependency>

<dependency>
  <groupId>com.alibaba</groupId>
  <artifactId>druid</artifactId>
  <version>1.1.16</version>
</dependency>
```

完整的pom如下

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.1.5.RELEASE</version>
        <relativePath/> <!-- lookup parent from repository -->
    </parent>
    <groupId>io.github.lmikoto</groupId>
    <artifactId>miko-activity</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>miko-activity</name>
    <description>Demo project for Spring Boot</description>

    <properties>
        <java.version>1.8</java.version>
        <activiti-dependencies.version>7.1.30</activiti-dependencies.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.activiti.dependencies</groupId>
                <artifactId>activiti-dependencies</artifactId>
                <version>${activiti-dependencies.version}</version>
                <scope>import</scope>
                <type>pom</type>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <repositories>
        <repository>
            <id>alfresco</id>
            <name>Activiti Releases</name>
            <url>https://artifacts.alfresco.com/nexus/content/repositories/activiti-releases/</url>
            <releases>
                <enabled>true</enabled>
            </releases>
        </repository>
    </repositories>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            <scope>runtime</scope>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>mysql</groupId>
            <artifactId>mysql-connector-java</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>

        <dependency>
            <groupId>org.activiti</groupId>
            <artifactId>activiti-spring-boot-starter</artifactId>
            <version>${activiti-dependencies.version}</version>
        </dependency>

        <dependency>
            <groupId>com.alibaba</groupId>
            <artifactId>druid</artifactId>
            <version>1.1.16</version>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>

</project>

```

## 5. 配置文件

```yaml
spring:
  activiti:
    database-schema-update: true
    history-level: full
    db-history-used: true
  datasource:
    url: jdbc:mysql://localhost:3306/activiti?useUnicode=true&characterEncoding=utf-8&useSSL=true&serverTimezone=UTC&nullCatalogMeansCurrent=true
    username: root
    password: anywhere
    driver-class-name: com.mysql.cj.jdbc.Driver
    type: com.alibaba.druid.pool.DruidDataSource
    initialization-mode: always
```

这样一个简单的activity就可以启动成功了，后面会基于这个项目来扩展和探究一下activity
