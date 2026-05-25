Page({
  data: {
    title: '',
    type: '',
    currentIndex: 0,
    words: []
  },

  onLoad(options) {
    const type = options.type || 'animals'
    
    // 初始化音频上下文
    this.innerAudioContext = wx.createInnerAudioContext()
    
    // 监听音频播放错误
    this.innerAudioContext.onError((err) => {
      console.error('音频播放错误:', err)
    })
    
    this.setData({
      type: type,
      title: this.getTitle(type),
      words: this.getWords(type)
    })
  },

  onUnload() {
    // 页面卸载时销毁音频实例
    if (this.innerAudioContext) {
      this.innerAudioContext.destroy()
    }
  },

  // 获取标题
  getTitle(type) {
    const titles = {
      'animals': '动物',
      'fruits': '水果',
      'colors': '颜色',
      'numbers': '数字'
    }
    return titles[type] || '学习'
  },

  // 获取单词数据
  getWords(type) {
    const wordData = {
      'animals': [
        { english: 'Dog', chinese: '狗', emoji: '🐶', bgColor: '#FFE5B4' },
        { english: 'Cat', chinese: '猫', emoji: '🐱', bgColor: '#E8EAF6' },
        { english: 'Rabbit', chinese: '兔子', emoji: '🐰', bgColor: '#FCE4EC' },
        { english: 'Bird', chinese: '鸟', emoji: '🐦', bgColor: '#E1F5FE' },
        { english: 'Fish', chinese: '鱼', emoji: '🐟', bgColor: '#E0F2F1' }
      ],
      'fruits': [
        { english: 'Apple', chinese: '苹果', emoji: '🍎', bgColor: '#FFE5E5' },
        { english: 'Banana', chinese: '香蕉', emoji: '🍌', bgColor: '#FFF9C4' },
        { english: 'Orange', chinese: '橙子', emoji: '🍊', bgColor: '#FFF3E0' },
        { english: 'Grape', chinese: '葡萄', emoji: '🍇', bgColor: '#F3E5F5' },
        { english: 'Strawberry', chinese: '草莓', emoji: '🍓', bgColor: '#FFEBEE' }
      ],
      'colors': [
        { english: 'Red', chinese: '红色', emoji: '🔴', bgColor: '#FFEBEE' },
        { english: 'Blue', chinese: '蓝色', emoji: '🔵', bgColor: '#E3F2FD' },
        { english: 'Green', chinese: '绿色', emoji: '🟢', bgColor: '#E8F5E9' },
        { english: 'Yellow', chinese: '黄色', emoji: '🟡', bgColor: '#FFF9C4' },
        { english: 'Purple', chinese: '紫色', emoji: '🟣', bgColor: '#F3E5F5' }
      ],
      'numbers': [
        { english: 'One', chinese: '一', emoji: '1️⃣', bgColor: '#FFF9C4' },
        { english: 'Two', chinese: '二', emoji: '2️⃣', bgColor: '#E1F5FE' },
        { english: 'Three', chinese: '三', emoji: '3️⃣', bgColor: '#F3E5F5' },
        { english: 'Four', chinese: '四', emoji: '4️⃣', bgColor: '#E8F5E9' },
        { english: 'Five', chinese: '五', emoji: '5️⃣', bgColor: '#FFE5B4' }
      ]
    }
    return wordData[type] || []
  },

  // 播放发音
  playSound(e) {
    const index = e.currentTarget.dataset.index
    const word = this.data.words[index]
    
    // 显示当前单词
    wx.showToast({
      title: word.english,
      icon: 'none',
      duration: 1000
    })

    // 使用多个TTS源，提高成功率
    this.playWithMultipleTTS(word.english)
    
    // 添加触觉反馈
    wx.vibrateShort({
      type: 'medium'
    })
  },

  // 使用多个TTS源播放
  playWithMultipleTTS(text) {
    // TTS源列表（按优先级排序）
    const ttsSources = [
      // 源1: 有道词典TTS（免费，无需API密钥）
      {
        name: 'youdao',
        url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=1`
      },
      // 源2: Google TTS（需要通过代理或后端）
      // {
      //   name: 'google',
      //   url: `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text)}`
      // },
      // 源3: 百度TTS（需要API密钥，这里仅作示例）
      // {
      //   name: 'baidu',
      //   url: `你的百度TTS接口地址`
      // }
    ]

    this.tryPlayTTS(ttsSources, 0, text)
  },

  // 尝试播放TTS（带降级处理）
  tryPlayTTS(sources, index, text) {
    if (index >= sources.length) {
      wx.showToast({
        title: '发音暂不可用',
        icon: 'none',
        duration: 2000
      })
      return
    }

    const source = sources[index]
    
    if (!this.innerAudioContext) {
      this.innerAudioContext = wx.createInnerAudioContext()
    }

    this.innerAudioContext.src = source.url
    this.innerAudioContext.play()

    this.innerAudioContext.onEnded = () => {
      console.log(`TTS播放成功: ${source.name}`)
    }

    this.innerAudioContext.onError = (err) => {
      console.error(`TTS源 ${source.name} 失败，尝试下一个:`, err)
      // 尝试下一个TTS源
      this.tryPlayTTS(sources, index + 1, text)
    }
  },

  // 上一个单词
  prevWord() {
    if (this.data.currentIndex > 0) {
      this.setData({
        currentIndex: this.data.currentIndex - 1
      })
    }
  },

  // 下一个单词
  nextWord() {
    if (this.data.currentIndex < this.data.words.length - 1) {
      this.setData({
        currentIndex: this.data.currentIndex + 1
      })
    }
  },

  // 滑动切换
  onSwiperChange(e) {
    this.setData({
      currentIndex: e.detail.current
    })
  },

  // 返回首页
  goBack() {
    wx.navigateBack()
  }
})