# 英语点读小程序

## 项目简介
这是一个专为3-8岁学龄前儿童设计的英语点读小程序，界面简洁、色彩鲜艳，适合儿童使用。

## 功能特点
- 📚 分类学习：动物、水果、颜色、数字四大类别
- 🔊 点读发音：点击单词或图标即可发音
- 📖 卡片浏览：左右滑动切换单词卡片
- 🎨 儿童友好：大字体、鲜艳色彩、简单交互

## 项目结构
```
english-reading/
├── app.js                 # 小程序入口文件
├── app.json               # 全局配置
├── app.wxss               # 全局样式
├── project.config.json    # 项目配置
├── sitemap.json           # 站点地图
└── pages/
    ├── index/             # 首页（分类选择）
    │   ├── index.wxml
    │   ├── index.wxss
    │   ├── index.js
    │   └── index.json
    ├── learn/             # 学习页面（核心点读功能）
    │   ├── learn.wxml
    │   ├── learn.wxss
    │   ├── learn.js
    │   └── learn.json
    └── words/             # 单词列表页面
        ├── words.wxml
        ├── words.wxss
        ├── words.js
        └── words.json
```

## 技术栈
- WXML（微信标记语言）
- WXSS（微信样式表）
- JavaScript
- 微信小程序API

## 安装使用

### 1. 环境准备
- 下载并安装微信开发者工具
- 注册微信小程序账号（或使用测试号）

### 2. 导入项目
1. 打开微信开发者工具
2. 选择"导入项目"
3. 选择本项目目录
4. AppID可以选择"测试号"

### 3. 运行项目
- 点击"编译"按钮即可在模拟器中预览
- 可以扫码在真机上预览

## 核心功能实现

### 1. 语音播放功能
当前版本使用 `wx.showToast` 显示单词，实际项目中需要接入TTS（文本转语音）服务：

```javascript
// 方法一：使用微信内置TTS插件
const plugin = requirePlugin("WechatSI")
let innerAudioContext = wx.createInnerAudioContext()

// 方法二：使用在线API
fetch(`https://your-tts-api.com/synthesize?text=${word.english}`)
  .then(res => {
    innerAudioContext.src = res.url
    innerAudioContext.play()
  })
```

### 2. 数据扩展
在 `learn.js` 的 `getWords()` 函数中添加更多单词：

```javascript
'animals': [
  { english: 'Dog', chinese: '狗', emoji: '🐶', bgColor: '#FFE5B4' },
  // 添加更多单词...
]
```

## 自定义配置

### 修改主题颜色
在 `app.wxss` 中修改全局样式：

```css
.btn-primary {
  background-color: #FF6B6B; /* 修改为你喜欢的颜色 */
}
```

### 添加新的分类
1. 在 `index.wxml` 中添加新的分类卡片
2. 在 `learn.js` 的 `getWords()` 中添加对应数据
3. 在 `app.json` 中确保页面路径正确

## 注意事项
1. 图片资源：当前使用emoji代替图片，实际项目可以替换为真实图片
2. 语音功能：需要申请相应的API权限
3. 数据来源：可以接入云开发或后端API动态获取单词数据

## 后续优化建议
- [ ] 接入真实的TTS语音服务
- [ ] 添加游戏化元素（得分、奖励）
- [ ] 增加更多分类和单词
- [ ] 添加收藏功能
- [ ] 实现学习进度跟踪
- [ ] 添加家长控制界面

## License
MIT License

## 作者
Valo Zhu
