// pages/index/index.js
Page({
  data: {
    categories: ['animals', 'fruits', 'colors', 'numbers']
  },

  onLoad() {
    console.log('首页加载')
  },

  goToLearn(e) {
    const type = e.currentTarget.dataset.type
    wx.navigateTo({
      url: `/pages/learn/learn?type=${type}`
    })
  },

  goToStorage() {
    wx.navigateTo({
      url: '/pages/words/words'
    })
  }
})
