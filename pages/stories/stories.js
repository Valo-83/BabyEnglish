// pages/stories/stories.js
const {
  buildMyStoryAssets,
  filterMyStoryAssets
} = require('../words/storageUtils')
const WORD_CATALOG = require('../words/wordCatalog')

const STORY_STORAGE_KEY = 'LOCAL_STORED_AI_STORIES'
const STORY_AUDIO_STORAGE_KEY = 'LOCAL_STORY_AUDIO_FILES'

Page({
  data: {
    allStories: [],
    stories: [],
    hasStories: false,
    hasFilteredStories: false,
    searchKeyword: '',
    categoryFilter: 'all',
    audioFilter: 'all',
    categoryOptions: [
      { value: 'all', label: '全部' },
      { value: 'animals', label: '动物' },
      { value: 'fruits', label: '水果' },
      { value: 'colors', label: '颜色' },
      { value: 'numbers', label: '数字' }
    ],
    audioOptions: [
      { value: 'all', label: '全部音频' },
      { value: 'withAudio', label: '已缓存音频' },
      { value: 'withoutAudio', label: '未缓存音频' }
    ],
    playingStoryId: ''
  },

  onShow() {
    this.loadMyStories()
  },

  onUnload() {
    this._destroyAudio()
  },

  readLocalStorage(key, callback) {
    wx.getStorage({
      key,
      success: (res) => callback(res.data || {}),
      fail: () => callback({})
    })
  },

  loadMyStories() {
    this.readLocalStorage(STORY_STORAGE_KEY, (stories) => {
      this.readLocalStorage(STORY_AUDIO_STORAGE_KEY, (audioCache) => {
        const allStories = buildMyStoryAssets(stories, audioCache, WORD_CATALOG)
        const storyAssets = this.filterStories(allStories)
        this.setData({
          allStories,
          stories: storyAssets,
          hasStories: allStories.length > 0,
          hasFilteredStories: storyAssets.length > 0,
          playingStoryId: ''
        })
      })
    })
  },

  filterStories(stories) {
    return filterMyStoryAssets(stories, {
      keyword: this.data.searchKeyword,
      category: this.data.categoryFilter,
      audioStatus: this.data.audioFilter
    })
  },

  applyFilters() {
    const stories = this.filterStories(this.data.allStories)
    this.setData({
      stories,
      hasFilteredStories: stories.length > 0,
      playingStoryId: ''
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

  selectAudio(e) {
    this.setData({
      audioFilter: e.currentTarget.dataset.value || 'all'
    }, () => this.applyFilters())
  },

  playAudio(e) {
    const storyId = e.currentTarget.dataset.id
    const filePath = e.currentTarget.dataset.file

    if (!filePath) {
      wx.showToast({ title: '暂无本地音频', icon: 'none', duration: 1200 })
      return
    }

    this._destroyAudio()
    const audio = wx.createInnerAudioContext()
    let started = false
    const startPlayback = () => {
      if (started) return
      started = true
      audio.play()
    }

    audio.obeyMuteSwitch = false
    audio.volume = 1
    audio.onCanplay(startPlayback)
    audio.onEnded(() => {
      this.setData({ playingStoryId: '' })
    })
    audio.onError((err) => {
      console.error('本地故事音频播放失败:', err)
      this.setData({ playingStoryId: '' })
      wx.showToast({ title: '音频播放失败', icon: 'none', duration: 1600 })
    })

    this.storyAudioContext = audio
    this.setData({ playingStoryId: storyId })
    audio.src = filePath
    setTimeout(startPlayback, 500)
  },

  _destroyAudio() {
    try {
      if (this.storyAudioContext) {
        this.storyAudioContext.stop()
        this.storyAudioContext.destroy()
      }
    } catch (e) {
      // ignore cleanup errors from stale audio contexts
    }
    this.storyAudioContext = null
  },

  continueLearning(e) {
    const category = e.currentTarget.dataset.category
    const word = e.currentTarget.dataset.word
    wx.navigateTo({
      url: `/pages/learn/learn?type=${category}&word=${encodeURIComponent(word)}`
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
