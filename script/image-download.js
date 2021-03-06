const request = require('request');
const fs = require('fs');

const postsPath = 'source/_posts';
const imagePath = 'source/images';
const ignoreFile = ['.DS_Store'];
const imagePattern = /!\[(.*?)]\((.*?)\)/g;


const getName = (url) =>{
  const start = url.lastIndexOf("\/");
  const end = url.indexOf("#");
  if(end !== -1){
    return url.substring(start + 1,end);
  }else{
    return url.substring(start + 1);
  }

}

const donwload = async () => {
  const imageList = fs.readdirSync(imagePath).filter(i=>!ignoreFile.includes(i));
  const imageUseMap = {};
  imageList.forEach(i=>{
    imageUseMap[i] = false;
  });
  
  const postList = fs.readdirSync(postsPath);
  
  postList.forEach(post => {
    const postPath = postsPath + "/" + post;
    const postContent = fs.readFileSync(postPath,"utf-8");
    let match = postContent.match(imagePattern);
    let newContent = postContent;
    while(match = imagePattern.exec(postContent)){
      const url = match[2];
      const name = getName(url);
      const imageExist = imageUseMap.hasOwnProperty(name);
      if(!imageExist && url.startsWith("http")){
        console.log("dlownload image",name,url);
        request({url}).pipe(
          fs.createWriteStream(`${imagePath}/${name}`)
        )    
      }

      imageUseMap[name] = true;
      console.log('use',name)
      newContent = newContent.replace(url,`/images/${name}`);
      fs.writeFileSync(postPath,newContent);
    }
  });

  const keys = Object.keys(imageUseMap);
  keys.forEach(key=>{
    const use = imageUseMap[key];
    if(!use){
      console.log('delete',key)
      fs.unlinkSync(imagePath + "/" + key)
    }
  })
  
}


donwload();