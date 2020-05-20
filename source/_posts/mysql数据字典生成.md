---
title: mysql数据字典生成
date: 2020-05-18 09:48:23
tags: ['tool']
---
## 背景
项目文档中经常需要列出数据库的字典结构。
## 实现原理
mysql中的information_schema.tables记录了表的元信息。information_schema.columns记录了字段的元信息。
## 实现
为了方便使用python进行实现。
```python
import sys
import pymysql


host = sys.argv[1]
user = sys.argv[2]
password = sys.argv[3]
schema = sys.argv[4]

output = schema + '_dict.md'
connection = pymysql.connect(host=host,
                             user=user,
                             password=password,
                             port=3306,
                             db='information_schema',
                             charset='utf8')
cursor = connection.cursor()

sql = "select table_schema,table_name,table_comment from information_schema.tables where table_schema = '" + schema + "'"
cursor.execute(sql)

schemaTableInfoList = cursor.fetchall()

if len(schemaTableInfoList) == 0:
    print('no tables')
    sys.exit(0)

schemaTableInfoDict = {}

with open(output,'w') as f:
    for item in schemaTableInfoList:
        schemaTableInfoDict.setdefault(item[0], []).append(item)

    for schema, tableInfoList in schemaTableInfoDict.items():
        for tableInfo in tableInfoList:
            tableName = tableInfo[1]
            tableComment = tableInfo[2]

            tableInfoSql = "select c.column_name as '字段名'," \
                           "c.column_type as '数据类型'," \
                           "c.is_nullable as '允许为空'," \
                           "c.column_comment as '字段说明' FROM information_schema.columns c " \
                           "inner JOIN information_schema.tables t ON c.table_schema = t.table_schema" \
                           " AND c.table_name = t.table_name" \
                           " WHERE t.table_schema = '"+str(schema)+"' and t.table_name='"+str(tableName)+"'"
            cursor.execute(tableInfoSql)
            tableColumnInfoList = cursor.fetchall()

            f.write('### ' + tableName + '(' + tableComment + ')\n')
            f.write('| 字段名 | 数据类型 | 允许为空 | 字段说明 | \n')
            f.write('| ---- | ---- | ---- | ---- | \n')
            for tableColumn in tableColumnInfoList:
                f.write('|' + tableColumn[0] + '|' + tableColumn[1] + '|' + tableColumn[2] + '|' + tableColumn[3] + '|\n')
            f.write("\n")
```

使用
```bash
python3 db_dict.py 127.0.0.1 root 123456 test
```