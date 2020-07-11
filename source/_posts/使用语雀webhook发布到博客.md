---
title: 使用语雀webhook发布到博客
date: 2020-01-04 00:00:00
tags: ['tool']
---

整体的部署流程为:
在语雀发布文章 -> 触发语雀 webhook -> server接收到文章推送 -> 请求信息中抽取文章内容和必要信息 -> 调用 GitHub api 更新仓库 -> netlify 自动部署 -> 文章在博客发布
本文主要描述server的实现过程。
### 接收webhook的推送
```Java
@RestController
@Slf4j
public class WebHookController {

    @PostMapping("/yuque/webhook")
    public String webHook(@RequestBody Object req){
        log.info(JacksonUtils.toJson(req));
        return "";
    }
}
```
### 清洗语雀内容
因为语雀会在markdown中添加一些标签，所有需要清洗掉
```Java
private String cleanContent(String content){
    content = content
        .replaceAll("<br \\/>","\n")
        .replaceAll("<a name=\".*\"></a>","");
    log.info("清洗结束 {}",content);
    return content;
}
```
### 图片替换
虽然语雀现在的图床在外部系统也可以引用，但是保险起见还是把图片下载下来自己存储。
使用正则表达式把图片获取出来，然后调用github api把图片上传到指定目录，然后把文章中的图片替换成新的路径。
```Java
public void uploadToGitHub(String title,String originContent){
    String content = cleanContent(originContent);
    GitHubApi gitHubApi = GitHubApi.getInstance(owner,repo,token);
    RefDto refDto = gitHubApi.getRef();
    CommitDto commitDto = gitHubApi.getCommit(refDto.getObject().getSha());

    // 提取图片单独上传
    Pattern pattern = Pattern.compile("!\\[image.png]\\((.*?)\\)");
    Matcher matcher = pattern.matcher(content);
    List<BlobListDto> blobListDtoArrayList = Lists.newArrayList();
    while (matcher.find()) {
        int i = 1;
        try {
            String imageUrl = matcher.group(i);
            URI uri = new URI(imageUrl);
            String path = uri.getPath();
            String imageName = path.substring(path.lastIndexOf('/') + 1);
            String githubPath = "/assets/" + imageName;
            content = content.replace(imageUrl,githubPath);
            CreateBlobResponse createBlobResponse = gitHubApi.createBlob(Base64Utils.getImageStrFromUrl(imageUrl),"base64");
            blobListDtoArrayList.add(new BlobListDto(createBlobResponse.getSha(),githubPath));
        }catch (Exception e){
            log.error("{}", Throwables.getStackTraceAsString(e));
        }
        i++;
    }
    CreateBlobResponse createBlobResponse = gitHubApi.createBlob(content,"utf-8");
    blobListDtoArrayList.add(new BlobListDto(createBlobResponse.getSha(),"content/blog/" + title  + ".md"));
    List<Map<String,Object>> treeMpas = Lists.newArrayList();
    blobListDtoArrayList.forEach(i->{
        treeMpas.add(ImmutableMap.of("path",i.getPath(),"mode","100644","type","blob","sha",i.getSha()));
    });
    CreateTreeResponse createTreeResponse = gitHubApi.createTree(commitDto.getTree().getSha(),treeMpas);
    CreateCommitResponse createCommitResponse = gitHubApi.createCommit(refDto.getObject().getSha(),createTreeResponse.getSha());
    gitHubApi.updataRef(createCommitResponse.getSha());
}
```
[完整代码](https://github.com/lmikoto/yuque-webhook)
