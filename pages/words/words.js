// pages/words/words.js
const { buildStorageAssets, buildStorageStats } = require('./storageUtils')
const WORD_CATALOG = require('./wordCatalog')

const STORY_STORAGE_KEY = 'LOCAL_STORED_AI_STORIES'
const RECORD_STORAGE_KEY = 'LOCAL_STUDY_RECORDS'

Page({
  data: {
    assets: [],
    stats: buildStorageStats([]),
    hasAssets: false,
    expandedWord: ''
  },

  onShow() {
    this.loadStorageLibrary()
  },

  loadStorageLibrary() {
    this.readLocalStorage(STORY_STORAGE_KEY, (stories) => {
      this.readLocalStorage(RECORD_STORAGE_KEY, (records) => {
        const assets = buildStorageAssets(stories, records, WORD_CATALOG)
        this.setData({
          assets,
          stats: buildStorageStats(assets),
          hasAssets: assets.length > 0,
          expandedWord: ''
        })
      })
    })
  },

  readLocalStorage(key, callback) {
    wx.getStorage({
      key,
      success: (res) => callback(res.data || {}),
      fail: () => callback({})
    })
  },

  toggleAsset(e) {
    const word = e.currentTarget.dataset.word
    this.setData({
      expandedWord: this.data.expandedWord === word ? '' : word
    })
  },

  continueLearning(e) {
    const category = e.currentTarget.dataset.category
    const word = e.currentTarget.dataset.word
    wx.navigateTo({
      url: `/pages/learn/learn?type=${category}&word=${encodeURIComponent(word)}`
    })
  },

  deleteAsset(e) {
    const word = e.currentTarget.dataset.word
    const storageKey = e.currentTarget.dataset.storageKey || word
    wx.showModal({
      title: '删除本地故事',
      content: `确认删除 ${word} 的 AI 故事缓存吗？`,
      confirmText: '删除',
      confirmColor: '#D64545',
      success: (result) => {
        if (!result.confirm) {
          return
        }
        this.readLocalStorage(STORY_STORAGE_KEY, (stories) => {
          delete stories[storageKey]
          wx.setStorage({
            key: STORY_STORAGE_KEY,
            data: stories,
            success: () => {
              wx.showToast({
                title: '已删除',
                icon: 'success',
                duration: 1200
              })
              this.loadStorageLibrary()
            },
            fail: () => {
              wx.showToast({
                title: '删除失败',
                icon: 'none',
                duration: 1600
              })
            }
          })
        })
      }
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
