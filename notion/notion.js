const axios = require('axios');
const moment = require('moment');

const { blogTablePageId, blogTableViewId } =  require('./config');


const propertiesMap = {
  tags: '&Cfp',
  publish: 'iRQ"',
  date: 'rmQ\'',
};

async function post(url, data) {
  return axios.post(`https://www.notion.so/api/v3${url}`, data)
      .then(res => res.data)
}

const queryCollection = (
  collectionId,
  collectionViewId,
  query,
) => {
  const data = {
    collectionId: getFullBlockId(collectionId),
    collectionViewId: getFullBlockId(collectionViewId),
    loader: {
      type: 'table',
    },
    query: undefined,
  };
  if (query !== null) {
    data.query = query
  }
  return post('/queryCollection', data)
};

const loadPageChunk = (
  pageId,
  count,
  cursor = { stack: [] },
) => {
  const data = {
    chunkNumber: 0,
    cursor,
    limit: count,
    pageId: getFullBlockId(pageId),
    verticalColumns: false,
  };
  return post('/loadPageChunk', data)
};

const getFullBlockId = (blockId) => {
  if (blockId.match('^[a-zA-Z0-9]+$')) {
    return [
      blockId.substr(0, 8),
      blockId.substr(8, 4),
      blockId.substr(12, 4),
      blockId.substr(16, 4),
      blockId.substr(20, 32),
    ].join('-')
  }
  return blockId
};

const getDateFromBlockValue = (value) => {
  let mom = moment(value.created_time);
  const properties = value.properties;
  if (properties !== undefined) {
    const dateValue = properties[propertiesMap.date];
    if (dateValue !== undefined) {
      const dateString = dateValue[0][1][0][1].start_date;
      mom = moment(dateString, 'YYYY-MM-DD')
    }
  }
  return mom.unix()
};

const getTagsFromBlockValue = (value) => {
  let result = []
  const properties = value.properties
  if (properties !== undefined) {
    const tagValue = properties[propertiesMap.tags]
    if (tagValue !== undefined && tagValue.length > 0) {
      result = tagValue[0][0].split(',')
    }
  }
  return result
};

const getPublish = (value) => {
  let result = ''
  const properties = value.properties
  if (properties !== undefined) {
    const tagValue = properties[propertiesMap.publish]
    if (tagValue !== undefined && tagValue.length > 0) {
      result = tagValue[0][0]
    }
  }
  return result
};

const blockValueToArticleMeta = (block) => {
  return {
    tags: getTagsFromBlockValue(block),
    date: getDateFromBlockValue(block),
    publish: getPublish(block),
    id: block.id,
    title: block.properties ? block.properties.title[0] : undefined,
    createdDate: moment(block.created_time).unix(),
    lastModifiedDate: moment(block.last_edited_time).unix(),
    cover: block.format,
  }
}


const getArticleMetaList = async (tableId, viewId) => {
  const result = await loadTablePageBlocks(tableId, viewId)
  const blockIds = result.result.blockIds
  const recordMap = result.recordMap
  return blockIds
    .map((it) => recordMap.block[it].value)
    .map((it) => blockValueToArticleMeta(it))
};


const loadTablePageBlocks = async (collectionId, collectionViewId) => {
  const pageChunkValues = await loadPageChunk(collectionId, 100)
  const recordMap = pageChunkValues.recordMap
  const tableView = recordMap.collection_view[getFullBlockId(collectionViewId)]
  const collection = recordMap.collection[Object.keys(recordMap.collection)[0]]
  return queryCollection(collection.value.id, collectionViewId, tableView.value.query)
};


const getPosts = () => {
  return getArticleMetaList(blogTablePageId, blogTableViewId)
};

const getPageRecords = async (pageId) => {
  const limit = 50;
  const result = [];
  let cursor = { stack: [] };
  do {
    const pageChunk = await Promise.resolve(loadPageChunk(pageId, limit, cursor))
    for (const id of Object.keys(pageChunk.recordMap.block)) {
      if (pageChunk.recordMap.block.hasOwnProperty(id)) {
        const item = pageChunk.recordMap.block[id]
        if (item.value.alive) {
          result.push(item)
        }
      }
    }
    cursor = pageChunk.cursor
  } while (cursor.stack.length > 0)
  return result
};


const _convertDicNodeToBlockNode = (dicNode) => {
  const result = []
  dicNode.children.forEach(v => {
    result.push(_convertDicNodeToBlockNode(v))
  });
  return {
    value: dicNode.record.value,
    children: result,
  }
};

const _recordListToDic = (recordList) => {
  const findNode = (dic, id) => {
    if (dic.has(id)) {
      const result = dic.get(id);
      return result ? result : null
    }
    for (const [, v] of dic) {
      const find = findNode(v.children, id)
      if (find !== null) {
        return find
      }
    }
    return null
  }
  const creche = new Map();

  recordList.forEach((item, _) => {
    const itemId = item.value.id
    const itemParentId = item.value.parent_id

    const node = {
          record: item,
          children: new Map(),
        }
    creche.forEach((entryValue, key) => {
      if (entryValue.record.value.parent_id === itemId) {
        node.children.set(key, entryValue)
      }
    })
    node.children.forEach((_, k) => {
      creche.delete(k)
    })
    const parent = findNode(creche, itemParentId)
    if (parent !== null) {
      parent.children.set(itemId, node)
    } else {
      creche.set(itemId, node)
    }
  })
  return creche
};


const recordValueListToBlockNodes = (list) => {
  const dicTree = _recordListToDic(list);
  const result= []
  dicTree.forEach(v => {
    result.push(_convertDicNodeToBlockNode(v))
  });
  return result
};


const getArticle = async (pageId) => {
  const chunk = await getPageRecords(pageId);
  const recordList = Array.from(chunk.values());
  const tree = recordValueListToBlockNodes(recordList);
  const meta = blockValueToArticleMeta(tree[0].value);
  return {
    meta,
    blocks: tree[0].children,
  }
};

module.exports = {
  getArticle,
  getPosts
};



