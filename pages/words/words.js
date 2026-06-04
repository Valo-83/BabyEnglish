// pages/words/words.js
const {
  buildStorageAssets,
  buildStorageStats,
  buildTodayReviewAssets,
  filterStorageAssets
} = require('./storageUtils')
const WORD_CATALOG = require('./wordCatalog')
const { markStudyRecordMastered } = require('../shared/studyRecordUtils')

const STORY_STORAGE_KEY = 'LOCAL_STORED_AI_STORIES'
const RECORD_STORAGE_KEY = 'LOCAL_STUDY_RECORDS'

Page({
  data: {
    allAssets: [],
    assets: [],
    stats: buildStorageStats([]),
    hasAssets: false,
    hasFilteredAssets: false,
    expandedWord: '',
    searchKeyword: '',
    categoryFilter: 'all',
    statusFilter: 'all',
    categoryOptions: [
      { value: 'all', label: '全部' },
      { value: 'animals', label: '动物' },
      { value: 'fruits', label: '水果' },
      { value: 'colors', label: '颜色' },
      { value: 'numbers', label: '数字' }
    ],
    statusOptions: [
      { value: 'all', label: '全部状态' },
      { value: 'new', label: '新保存' },
      { value: 'reviewing', label: '复习中' },
      { value: 'mastered', label: '已熟悉' }
    ],
    todayReview: [],
    statusMap: {
      new: '新保存',
      reviewing: '复习中',
      mastered: '已熟悉'
    }
  },

  onShow() {
    this.loadStorageLibrary()
  },

  loadStorageLibrary() {
    this.readLocalStorage(STORY_STORAGE_KEY, (stories) => {
      this.readLocalStorage(RECORD_STORAGE_KEY, (records) => {
        const allAssets = buildStorageAssets(stories, records, WORD_CATALOG)
        const todayReview = buildTodayReviewAssets(allAssets)
        const filteredAssets = this.filterAssets(allAssets)
        this.setData({
          allAssets,
          assets: filteredAssets,
          stats: buildStorageStats(allAssets),
          hasAssets: allAssets.length > 0,
          hasFilteredAssets: filteredAssets.length > 0,
          expandedWord: '',
          todayReview
        })
      })
    })
  },

  filterAssets(assets) {
    return filterStorageAssets(assets, {
      keyword: this.data.searchKeyword,
      category: this.data.categoryFilter,
      status: this.data.statusFilter
    })
  },

  applyFilters() {
    const filteredAssets = this.filterAssets(this.data.allAssets)
    this.setData({
      assets: filteredAssets,
      hasFilteredAssets: filteredAssets.length > 0,
      expandedWord: ''
    })
  },

  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value || ''
    }, () => this.applyFilters())
  },

  selectCategory(e) {
    this.setData({
      categoryFilter: e.currentTarget.dataset.value || 'all'
    }, () => this.applyFilters())
  },

  selectStatus(e) {
    this.setData({
      statusFilter: e.currentTarget.dataset.value || 'all'
    }, () => this.applyFilters())
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

  startReview(e) {
    const category = e.currentTarget.dataset.category
    const word = e.currentTarget.dataset.word
    wx.navigateTo({
      url: `/pages/learn/learn?type=${category}&word=${encodeURIComponent(word)}&mode=review`
    })
  },

  goToMyStories() {
    wx.navigateTo({
      url: '/pages/stories/stories'
    })
  },

  markAsMastered(e) {
    const word = e.currentTarget.dataset.word
    const that = this

    this.readLocalStorage(RECORD_STORAGE_KEY, (records) => {
      const updated = markStudyRecordMastered(records, word)
      if (!updated) {
        wx.showToast({
          title: '暂无学习记录',
          icon: 'none',
          duration: 1600
        })
        return
      }

      wx.setStorage({
        key: RECORD_STORAGE_KEY,
        data: records,
        success: () => {
          wx.showToast({
            title: '已标为熟悉',
            icon: 'success',
            duration: 1200
          })
          that.loadStorageLibrary()
        },
        fail: () => {
          wx.showToast({
            title: '操作失败',
            icon: 'none',
            duration: 1600
          })
        }
      })
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
