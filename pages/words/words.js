// pages/words/words.js
Page({
  data: {
    words: []
  },

  onLoad() {
    this.loadAllWords()
  },

  loadAllWords() {
    const allWords = [
      { english: 'Dog', chinese: '狗', emoji: '🐶' },
      { english: 'Cat', chinese: '猫', emoji: '🐱' },
      { english: 'Rabbit', chinese: '兔子', emoji: '🐰' },
      { english: 'Apple', chinese: '苹果', emoji: '🍎' },
      { english: 'Banana', chinese: '香蕉', emoji: '🍌' },
      { english: 'Red', chinese: '红色', emoji: '🔴' },
      { english: 'Blue', chinese: '蓝色', emoji: '🔵' },
      { english: 'One', chinese: '一', emoji: '1️⃣' },
      { english: 'Two', chinese: '二', emoji: '2️⃣' }
    ]

    this.setData({
      words: allWords
    })
  },

  playWord(e) {
    const index = e.currentTarget.dataset.index
    const word = this.data.words[index]
    
    wx.showToast({
      title: word.english,
      icon: 'none',
      duration: 1500
    })

    wx.vibrateShort({
      type: 'medium'
    })
  }
})
