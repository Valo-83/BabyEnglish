// pages/learn/learn.js
Page({
  data: {
    title: '',
    type: '',
    currentIndex: 0,
    words: []
  },

  onLoad(options) {
    const type = options.type || 'animals'
    this.innerAudioContext = wx.createInnerAudioContext()
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
    if (this.innerAudioContext) {
      this.innerAudioContext.destroy()
    }
  },

  getTitle(type) {
    const titles = {
      'animals': '动物',
      'fruits': '水果',
      'colors': '颜色',
      'numbers': '数字'
    }
    return titles[type] || 'Learn'
  },

  getWords(type) {
    const wordData = {
      'animals': [
        { english: 'Dog', chinese: '狗', emoji: '🐶', bgColor: '#FFE5B4' },
        { english: 'Cat', chinese: '猫', emoji: '🐱', bgColor: '#E8EAF6' },
        { english: 'Rabbit', chinese: '兔子', emoji: '🐰', bgColor: '#FCE4EC' },
        { english: 'Bird', chinese: '鸟', emoji: '🐦', bgColor: '#E1F5FE' },
        { english: 'Fish', chinese: '鱼', emoji: '🐟', bgColor: '#E0F2F1' },
        { english: 'Elephant', chinese: '大象', emoji: '🐘', bgColor: '#F5F5F5' },
        { english: 'Monkey', chinese: '猴子', emoji: '🐵', bgColor: '#FFF8E1' },
        { english: 'Bear', chinese: '熊', emoji: '🐻', bgColor: '#EFEBE9' },
        { english: 'Panda', chinese: '熊猫', emoji: '🐼', bgColor: '#FAFAFA' },
        { english: 'Lion', chinese: '狮子', emoji: '🦁', bgColor: '#FFF3E0' },
        { english: 'Tiger', chinese: '老虎', emoji: '🐯', bgColor: '#FFECB3' },
        { english: 'Horse', chinese: '马', emoji: '🐴', bgColor: '#FFEBEE' },
        { english: 'Pig', chinese: '猪', emoji: '🐷', bgColor: '#FCE4EC' },
        { english: 'Cow', chinese: '牛', emoji: '🐮', bgColor: '#EFEBE9' },
        { english: 'Sheep', chinese: '羊', emoji: '🐑', bgColor: '#FAFAFA' },
        { english: 'Duck', chinese: '鸭子', emoji: '🦆', bgColor: '#FFF9C4' },
        { english: 'Chicken', chinese: '鸡', emoji: '🐔', bgColor: '#FFF8E1' },
        { english: 'Frog', chinese: '青蛙', emoji: '🐸', bgColor: '#E8F5E9' },
        { english: 'Snake', chinese: '蛇', emoji: '🐍', bgColor: '#E0F2F1' },
        { english: 'Butterfly', chinese: '蝴蝶', emoji: '🦋', bgColor: '#F3E5F5' }
      ],
      'fruits': [
        { english: 'Apple', chinese: '苹果', emoji: '🍎', bgColor: '#FFE5E5' },
        { english: 'Banana', chinese: '香蕉', emoji: '🍌', bgColor: '#FFF9C4' },
        { english: 'Orange', chinese: '橙子', emoji: '🍊', bgColor: '#FFF3E0' },
        { english: 'Grape', chinese: '葡萄', emoji: '🍇', bgColor: '#F3E5F5' },
        { english: 'Strawberry', chinese: '草莓', emoji: '🍓', bgColor: '#FFEBEE' },
        { english: 'Watermelon', chinese: '西瓜', emoji: '🍉', bgColor: '#E8F5E9' },
        { english: 'Pineapple', chinese: '菠萝', emoji: '🍍', bgColor: '#FFFDE7' },
        { english: 'Peach', chinese: '桃子', emoji: '🍑', bgColor: '#FCE4EC' },
        { english: 'Mango', chinese: '芒果', emoji: '🥭', bgColor: '#FFF9C4' },
        { english: 'Cherry', chinese: '樱桃', emoji: '🍒', bgColor: '#FFCDD2' },
        { english: 'Lemon', chinese: '柠檬', emoji: '🍋', bgColor: '#FFF9C4' },
        { english: 'Pear', chinese: '梨', emoji: '🍐', bgColor: '#F1F8E9' },
        { english: 'Plum', chinese: '李子', emoji: '🫐', bgColor: '#E1BEE7' },
        { english: 'Blueberry', chinese: '蓝莓', emoji: '🫐', bgColor: '#E3F2FD' },
        { english: 'Kiwi', chinese: '猕猴桃', emoji: '🥝', bgColor: '#E8F5E9' },
        { english: 'Coconut', chinese: '椰子', emoji: '🥥', bgColor: '#EFEBE9' },
        { english: 'Peanut', chinese: '花生', emoji: '🥜', bgColor: '#FFF8E1' },
        { english: 'Melon', chinese: '哈密瓜', emoji: '🍈', bgColor: '#F1F8E9' },
        { english: 'Avocado', chinese: '牛油果', emoji: '🥑', bgColor: '#E8F5E9' },
        { english: 'Tomato', chinese: '番茄', emoji: '🍅', bgColor: '#FFCDD2' }
      ],
      'colors': [
        { english: 'Red', chinese: '红色', emoji: '🔴', bgColor: '#FFEBEE' },
        { english: 'Blue', chinese: '蓝色', emoji: '🔵', bgColor: '#E3F2FD' },
        { english: 'Green', chinese: '绿色', emoji: '🟢', bgColor: '#E8F5E9' },
        { english: 'Yellow', chinese: '黄色', emoji: '🟡', bgColor: '#FFF9C4' },
        { english: 'Purple', chinese: '紫色', emoji: '🟣', bgColor: '#F3E5F5' },
        { english: 'Orange', chinese: '橙色', emoji: '🟠', bgColor: '#FFF3E0' },
        { english: 'Pink', chinese: '粉色', emoji: '💗', bgColor: '#FCE4EC' },
        { english: 'Brown', chinese: '棕色', emoji: '🟤', bgColor: '#EFEBE9' },
        { english: 'Black', chinese: '黑色', emoji: '⚫', bgColor: '#424242' },
        { english: 'White', chinese: '白色', emoji: '⚪', bgColor: '#FFFFFF' },
        { english: 'Gray', chinese: '灰色', emoji: '🩶', bgColor: '#9E9E9E' },
        { english: 'Gold', chinese: '金色', emoji: '🪙', bgColor: '#FFD700' },
        { english: 'Silver', chinese: '银色', emoji: '🥈', bgColor: '#C0C0C0' },
        { english: 'Cyan', chinese: '青色', emoji: '🔵', bgColor: '#E0F7FA' },
        { english: 'Navy', chinese: '深蓝', emoji: '🔵', bgColor: '#1A237E' },
        { english: 'Coral', chinese: '珊瑚色', emoji: '🩷', bgColor: '#FF7F50' },
        { english: 'Lavender', chinese: '薰衣草色', emoji: '💜', bgColor: '#E6E6FA' },
        { english: 'Mint', chinese: '薄荷绿', emoji: '🌿', bgColor: '#98FB98' },
        { english: 'Peach', chinese: '桃色', emoji: '🍑', bgColor: '#FFDAB9' },
        { english: 'Sky Blue', chinese: '天蓝色', emoji: '☁️', bgColor: '#87CEEB' }
      ],
      'numbers': [
        { english: 'One', chinese: '一', emoji: '1️⃣', bgColor: '#FFF9C4' },
        { english: 'Two', chinese: '二', emoji: '2️⃣', bgColor: '#E1F5FE' },
        { english: 'Three', chinese: '三', emoji: '3️⃣', bgColor: '#F3E5F5' },
        { english: 'Four', chinese: '四', emoji: '4️⃣', bgColor: '#E8F5E9' },
        { english: 'Five', chinese: '五', emoji: '5️⃣', bgColor: '#FFE5B4' },
        { english: 'Six', chinese: '六', emoji: '6️⃣', bgColor: '#FCE4EC' },
        { english: 'Seven', chinese: '七', emoji: '7️⃣', bgColor: '#E3F2FD' },
        { english: 'Eight', chinese: '八', emoji: '8️⃣', bgColor: '#FFF3E0' },
        { english: 'Nine', chinese: '九', emoji: '9️⃣', bgColor: '#E1F5FE' },
        { english: 'Ten', chinese: '十', emoji: '🔟', bgColor: '#F3E5F5' },
        { english: 'Eleven', chinese: '十一', emoji: '1️⃣1️⃣', bgColor: '#FFE5B4' },
        { english: 'Twelve', chinese: '十二', emoji: '1️⃣2️⃣', bgColor: '#E8F5E9' },
        { english: 'Thirteen', chinese: '十三', emoji: '1️⃣3️⃣', bgColor: '#FCE4EC' },
        { english: 'Fourteen', chinese: '十四', emoji: '1️⃣4️⃣', bgColor: '#E3F2FD' },
        { english: 'Fifteen', chinese: '十五', emoji: '1️⃣5️⃣', bgColor: '#FFF9C4' },
        { english: 'Sixteen', chinese: '十六', emoji: '1️⃣6️⃣', bgColor: '#F3E5F5' },
        { english: 'Seventeen', chinese: '十七', emoji: '1️⃣7️⃣', bgColor: '#E8F5E9' },
        { english: 'Eighteen', chinese: '十八', emoji: '1️⃣8️⃣', bgColor: '#FFE5B4' },
        { english: 'Nineteen', chinese: '十九', emoji: '1️⃣9️⃣', bgColor: '#FCE4EC' },
        { english: 'Twenty', chinese: '二十', emoji: '2️⃣0️⃣', bgColor: '#E1F5FE' }
      ]
    }
    return wordData[type]??[]
  },

  playSound(e) {
    const index = e.currentTarget.dataset.index
    const word = this.data.words[index]
    wx.showToast({
      title: word.english,
      icon: 'none',
      duration: 1000
    })
    this.playWithMultipleTTS(word.english)
  },

  playWithMultipleTTS(text) {
    const ttsSources = [
      {
        name: 'youdao',
        url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=1`
      }
    ]
    this.tryPlayTTS(ttsSources, 0, text)
  },

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
      this.tryPlayTTS(sources, index + 1, text)
    }
  },

  prevWord() {
    if (this.data.currentIndex > 0) {
      this.setData({
        currentIndex: this.data.currentIndex - 1
      })
    }
  },

  nextWord() {
    if (this.data.currentIndex < this.data.words.length - 1) {
      this.setData({
        currentIndex: this.data.currentIndex + 1
      })
    }
  },

  onSwiperChange(e) {
    this.setData({
      currentIndex: e.detail.current
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
