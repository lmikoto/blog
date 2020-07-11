const { getArticle, getPosts } = require('./notion');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function downloadFile(url, filepath, name) {
    if (!fs.existsSync(filepath)) {
        fs.mkdirSync(filepath);
    }
    if(!fs.existsSync(filepath + '/' +name)){
        console.log('img ' + url + 'download')
        const mypath = path.resolve(filepath, name);
        const writer = fs.createWriteStream(mypath);
        const response = await axios({
            url,
            method: "GET",
            responseType: "stream",
        });
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });
    }
}

const build = async () => {
    const posts = await getPosts();
    if(posts !== null && posts.length > 0){
        for(let i =0; i<posts.length; i++){
            await buildArticle(posts[i].id);
        }
    }
};

const getTags = (tags) => {
    if(tags !== undefined){
        return tags.map(t => `'${t}'`)
    }
    return '';
};

const textBlock = (block) => {
    const properties = block.value.properties;
    if (properties === undefined || properties.title === undefined) {
        return '\n'
    }
    const result = properties.title.map(i => {
        let text =  i[0];
        const style = i[1];
        if(style !== undefined){
            const s = style[0][0];
            if(s === 'a'){
                return `[${text}](${style[0][1]})`
            }
        }
        return text;
    });
    return result.join('') + '\n';
};

const codeBlock = (properties) => {
    let result = '';
    if (properties === undefined) {
        return ''
    }
    const language = properties.language[0][0];
    const codeText = properties.title[0][0];
    result += '```' + language + '\n';
    result += codeText + '\n';
    result += '```\n';
    return result;
};

const imgBlock = (value) => {
    const { id, format, properties } = value;
    const base = "https://www.notion.so/image/";
    if (format !== undefined) {
        const url = format.display_source;
        const image = base + encodeURIComponent(url);
        downloadFile(image,'./source/images',id + '.png')
        return `<img width="${format.block_width}" src="${image}">\n`;
    } else if (properties !== undefined) {
        const url = properties.source[0][0];
        return `![${id}](${base + encodeURIComponent(url)})\n`
    }
};

const listBlock = (block,length) => {
    let blank = '';
    for(let i = 0; i <length; i++){
        blank += '  '
    }
    const self =  `${blank}- ${textBlock(block)}`;
    let child = '';
    if(block.children.length !== 0){
        for(let i = 0; i< block.children.length; i++){
            child += listBlock(block.children[i],length + 1);
        }
    }
    return self + child;
};

const numListBlock = (block,sameTypeCnt,length) => {
    let blank = '';
    for(let i = 0; i <length; i++){
        blank += '  '
    }
    const self =  `${blank}${sameTypeCnt}. ${textBlock(block)}`;
    let child = '';
    if(block.children.length !== 0){
        for(let i = 0; i< block.children.length; i++){
            child += numListBlock(block.children[i],i + 1,length + 1);
        }
    }
    return self + child;
};

const buildBlock  = (block,sameTypeCnt) => {
    const type = block.value.type;
    const properties = block.value.properties;
    if (type === 'text') {
        return textBlock(block);
    }
    if (type === 'quote') {
        return '> ' + textBlock(block);
    }
    if (type === 'header') {
        return '# ' + textBlock(block);
    }
    if (type === 'sub_header') {
        return '## ' + textBlock(block);
    }
    if (type === 'sub_sub_header') {
        return '### ' + textBlock(block);
    }
    if (type === 'image') {
        return imgBlock(block.value);
    }
    if (type === 'code') {
        return codeBlock(properties);
    }
    if(type === 'bulleted_list'){
        return listBlock(block,0);
    }
    if(type === 'numbered_list'){
        return numListBlock(block,sameTypeCnt,0);
    }
    return '';
};

const buildBlocks = (blocks) => {
    let result = '';
    let lastType = '';
    let sameTypeCnt = 0;
    for(let i = 0; i < blocks.length ; i++ ){
        const block = blocks[i];
        if (block.value.type === lastType) {
            sameTypeCnt += 1
        } else {
            sameTypeCnt = 1;
            lastType = block.value.type
        }
        result += buildBlock(block,sameTypeCnt);
    }
    return result;
};

const buildArticle = async (id) => {
    let result = '';
    const article =  await getArticle(id);
    const { meta, blocks } = article;
    const { tags, title, publish, date } = meta;
    const fileName = './source/_posts/' + title + '.md';
    if(publish === 'published'){
        // header
        result += '---\n';
        result += `title: ${title[0]}\n`;
        result += `date: ${moment(date * 1000).format('YYYY-MM-DD HH:mm:ss')}\n`;
        result += `tags: [${getTags(tags)}]\n`;
        result += '---\n';
        // content
        result += buildBlocks(blocks);
        fs.writeFileSync(fileName,result);
        console.log('build ' + title)
    }else {
        if(fs.existsSync(fileName)){
            fs.unlinkSync(fileName);
        }
    }
};

module.exports = {
    build
};