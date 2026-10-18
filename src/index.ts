import type { PicGo, IPicGo, IImgInfo  } from 'picgo'


const postOptions = (fileName: string, options: any, image: string): any => {
  // 1. 提取小写后缀（去除点号，例如 'png', 'jpg'）
  const ext = fileName.split('.').pop()?.toLowerCase() || 'png';

  // 2. 简易映射表（支持所有常用图片格式）
  const mimeMap: Record<string, string> = {
    jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif', 
    webp: 'webp', svg: 'svg+xml', bmp: 'bmp', ico: 'x-icon'
  };

  // 3. 获取对应的 mime 类型，如果是不常见的格式则直接用后缀本身拼入
  const mimeType = mimeMap[ext] || ext;

  // 4. 组装最终的 Base64 字符串
  const finalBase64 = image.startsWith('data:') 
    ? image 
    : `data:image/${mimeType};base64,${image}`;

  return {
    method: 'POST',
    url: options.serverHost + options.uploadAPI,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'PicGo',
      'Authorization': "Bearer " + options.token
    },
    body: JSON.stringify({
      base64_img: finalBase64
    })
  };
}


const handle = async (ctx: IPicGo): Promise<IPicGo> => {
  const customOptions: any = ctx.getConfig('picBed.rustImg')
  if (!customOptions) {
    throw new Error('imgYun 图床配置文件')
  }
  try {
    const imgList: IImgInfo[] = ctx.output
    for (const img of imgList) {
      if (!img.fileName || !img.buffer) {
        ctx.log.error("not found filename or buffer")
        continue
      }

      let image = img.base64Image
      if (!image) {
        image = img.buffer.toString('base64')
      }
      
      if (!image) {
        ctx.log.error("image is empty")
        continue
      }

      const options = postOptions(img.fileName,customOptions,image);
      ctx.log.debug(options)
      let body = await ctx.Request.request(options)
      const res = JSON.parse(body as string) as any
      delete img.base64Image
      delete img.buffer
      img.imgUrl = customOptions.serverHost + res.uri
      ctx.log.info(img.imgUrl + "")
    }
    return ctx
  } catch (err) {
    throw err
  }
}



export = (ctx: PicGo) => {
  const register = (): void => {

    ctx.helper.uploader.register("rustImg", {
      handle,
      config(ctx) {
        return [
          {
          name: 'serverHost', // 配置名
          type: 'input', // 配置类型，input 展示为一个输入框
          default: '', // 默认值
          required: true, // 是否必填
          message: '服务器host' // 占位符
          },
          {
          name: 'uploadAPI', // 配置名
          type: 'input', // 配置类型，input 展示为一个输入框
          default: '', // 默认值
          required: true, // 是否必填
          message: '上传接口' // 占位符
          },  
          {
          name: 'token', // 配置名
          type: 'input', // 配置类型，input 展示为一个输入框
          default: '', // 默认值
          required: true, // 是否必填
          message: 'token' // 占位符
          },         
        ];
      }
    })
 
  }
  return {
    register
  }
}
