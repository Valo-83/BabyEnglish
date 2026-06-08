# 🍼 BabyEnglish

> 🎈 专为 3-8 岁学龄前儿童设计的英语启蒙微信小程序，通过点读发音、AI 故事生成和本地学习资产管理，打造沉浸式英语学习体验。

---

## ✨ 功能概览

### 🔊 单词点读
- 🐶 动物、🍎 水果、🌈 颜色、🔢 数字四大分类，涵盖 **80 个基础单词**
- 👆 点击卡片触发 TTS 真人发音，支持长文本分段播放
- 👈👉 左右滑动切换单词，大字体 + 鲜艳色彩适配儿童操作

### 🤖 AI 故事生成
- 🧠 基于 DeepSeek API，围绕当前单词自动生成 1-3 句双语短故事
- 🌐 英文故事搭配中文翻译，打字机动画逐字呈现
- 🔄 支持「换一个」强制重新生成，多次生成的故事本地保留多个版本

### 🎧 故事音频
- 🎙️ 后端通过 Edge TTS 合成故事朗读音频（美式发音 🇺🇸）
- 💾 音频缓存到微信本地文件系统，支持离线播放
- 📱 学习页和故事页均可直接播放已缓存的音频

### 📚 学习存储库
- 📝 所有 AI 故事自动存入本地存储库，按分类/学习状态筛选
- 📊 学习记录追踪：听读次数、复习次数、缓存命中、生成次数
- ⭐ 单词标记为「已熟悉」，支持三种状态：🆕 新保存 → 🔄 复习中 → ✅ 已熟悉

### 📦 学习资料包
- 📤 一键导出：将故事、学习记录和音频打包为 JSON 文件
- 📥 一键导入：解析资料包并智能合并（已有内容不覆盖）
- 🔗 支持微信分享文件消息（真机环境），实现跨设备数据迁移

---

## 📂 项目结构

```
BabyEnglish/
├── app.js                          # 小程序入口
├── app.json                        # 全局配置（页面路由、窗口样式）
├── project.config.json             # 微信开发者工具项目配置
├── sitemap.json                    # 站点地图
├── Englishtest.py                  # FastAPI 后端服务
│
├── pages/
│   ├── index/                      # 🏠 首页 — 分类选择入口
│   │   ├── index.wxml / wxss / js / json
│   │
│   ├── learn/                      # 📖 学习页 — 核心点读 + AI 故事
│   │   ├── learn.wxml / wxss / js / json
│   │   └── learnUtils.js           # 故事缓存、音频、TTS 工具函数
│   │
│   ├── words/                      # 🗂️ 学习存储库 — 本地资产管理
│   │   ├── words.wxml / wxss / js / json
│   │   ├── storageUtils.js         # 存储资产构建、筛选、统计
│   │   ├── packageUtils.js         # 学习资料包导入/导出/合并
│   │   └── wordCatalog.js          # 单词分类目录（用于资产关联）
│   │
│   ├── stories/                    # 📖 我的小故事 — 故事浏览与播放
│   │   ├── stories.wxml / wxss / js / json
│   │
│   └── shared/
│       └── studyRecordUtils.js     # 学习记录状态管理（共享模块）
│
├── story_audio/                    # 后端故事音频缓存目录
├── tests/                          # 🧪 单元测试
│   ├── learnUtils.test.js
│   ├── storageUtils.test.js
│   ├── packageUtils.test.js
│   └── studyRecordUtils.test.js
│
└── .gitignore
```

---

## 🛠️ 技术栈

| 🧩 层 | 🚀 技术 |
|---|---|
| 🎨 前端 | WXML / WXSS / JavaScript（微信小程序原生框架） |
| ⚙️ 后端 | Python FastAPI + uvicorn |
| 🧠 AI | DeepSeek API（deepseek-v4-flash） |
| 🔊 TTS 单词 | 有道词典 TTS 直连 |
| 🎙️ TTS 故事 | Microsoft Edge TTS（edge-tts，en-US-JennyNeural） |
| 💾 音频缓存 | 微信本地文件系统（wx.saveFile / wx.getFileSystemManager） |
| 🗄️ 数据持久化 | wx.Storage（故事、学习记录、音频索引） |

---

## 🚀 快速开始

### 1️⃣ 环境准备

- 📥 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 🔑 注册微信小程序账号（或使用测试号）
- 🐍 Python 3.10+，安装后端依赖：

```bash
pip install fastapi uvicorn edge-tts openai
```

### 2️⃣ 配置环境变量

```bash
export DEEPSEEK_API_KEY="你的 DeepSeek API Key"
```

### 3️⃣ 启动后端服务

```bash
python Englishtest.py
```

服务默认运行在 `http://192.168.31.95:8000`。如需修改地址，编辑 `Englishtest.py` 底部的 `uvicorn.run()` 参数。

同时在 `pages/learn/learn.js` 中更新后端地址（搜索 `192.168.31.95` 替换为你的实际 IP）。

### 4️⃣ 导入小程序项目

1. 打开微信开发者工具
2. 选择「导入项目」，指向本项目目录
3. AppID 可选择「测试号」
4. 在 `project.config.json` 中可修改 `appid` 为你的正式 AppID

### 5️⃣ 运行

点击「编译」在模拟器中预览，或扫码在真机上测试 📲

---

## 🌐 后端 API

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/tts?text=` | 🔊 有道单词 TTS 发音 |
| `POST` | `/api/ai_story` | 🤖 DeepSeek AI 生成双语故事 |
| `GET` | `/api/story_audio?word=&story_id=` | 🎧 获取已缓存的故事音频 |
| `GET` | `/api/story_audio/{key}.mp3` | 🎵 按文件名获取故事音频 |
| `POST` | `/api/story_audio` | 🎙️ 合成并缓存故事音频（Edge TTS） |

---

## 🔄 数据流

```
用户点击单词 👆
    ├── 🔊 TTS 发音（有道直连）
    ├── 🤖 AI 故事生成（DeepSeek API）→ 打字机渲染 → 写入本地存储
    └── 🎙️ 故事音频合成（Edge TTS）→ 缓存到微信文件系统

🏠 首页
    ├── 🗂️ 学习存储库 → 筛选/搜索/标记已熟悉 → 导出资料包 → 跨设备导入
    └── 📖 我的小故事 → 筛选/播放本地音频
```

---

## 📄 License

MIT License

---

## 👨‍💻 作者

Valo Zhu
