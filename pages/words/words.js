// pages/words/words.js
const {
  buildStorageAssets,
  buildStorageStats,
  buildTodayReviewAssets,
  filterStorageAssets
} = require('./storageUtils')
const {
  buildLearningPackage,
  mergeLearningPackage,
  parseLearningPackageText,
  previewLearningPackage
} = require('./packageUtils')
const WORD_CATALOG = require('./wordCatalog')
const { markStudyRecordMastered } = require('../shared/studyRecordUtils')

const STORY_STORAGE_KEY = 'LOCAL_STORED_AI_STORIES'
const RECORD_STORAGE_KEY = 'LOCAL_STUDY_RECORDS'
const STORY_AUDIO_STORAGE_KEY = 'LOCAL_STORY_AUDIO_FILES'
const PACKAGE_FILE_PREFIX = 'child-english-learning-pack'

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
    },
    // 导入预览弹窗
    showImportPreview: false,
    importPreview: null,
    importFilePath: ''
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

  readLocalStoragePromise(key) {
    return new Promise((resolve) => {
      this.readLocalStorage(key, resolve)
    })
  },

  writeLocalStoragePromise(key, data) {
    return new Promise((resolve, reject) => {
      wx.setStorage({
        key,
        data: data || {},
        success: resolve,
        fail: reject
      })
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

  exportLearningPackage() {
    wx.showLoading({ title: '打包中...' })

    Promise.all([
      this.readLocalStoragePromise(STORY_STORAGE_KEY),
      this.readLocalStoragePromise(RECORD_STORAGE_KEY),
      this.readLocalStoragePromise(STORY_AUDIO_STORAGE_KEY)
    ])
      .then(([stories, records, audioCache]) => {
        return this.readAudioFilesForPackage(audioCache)
          .then((audioFiles) => {
            return buildLearningPackage({
              stories,
              records,
              audioCache,
              audioFiles,
              catalog: WORD_CATALOG
            })
          })
      })
      .then((learningPackage) => {
        this._lastExportStats = learningPackage.stats || {}
        return this.writePackageFile(learningPackage)
      })
      .then((fileInfo) => {
        wx.hideLoading()
        this.sharePackageFile(fileInfo)
      })
      .catch((err) => {
        wx.hideLoading()
        console.error('学习资料包导出失败:', err)
        wx.showToast({
          title: '导出失败',
          icon: 'none',
          duration: 1800
        })
      })
  },

  importLearningPackage() {
    if (!wx.chooseMessageFile) {
      wx.showToast({
        title: '当前微信版本不支持导入文件',
        icon: 'none',
        duration: 1800
      })
      return
    }

    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        const filePath = file && (file.path || file.tempFilePath)
        if (!filePath) {
          wx.showToast({
            title: '未选择文件',
            icon: 'none',
            duration: 1200
          })
          return
        }

        wx.showLoading({ title: '解析中...' })
        this.readTextFile(filePath)
          .then((text) => parseLearningPackageText(text))
          .then((learningPackage) => {
            wx.hideLoading()
            const preview = previewLearningPackage(learningPackage)
            this.setData({
              showImportPreview: true,
              importPreview: preview,
              importFilePath: filePath
            })
          })
          .catch((err) => {
            wx.hideLoading()
            console.error('学习资料包解析失败:', err)
            wx.showToast({
              title: err && err.message ? err.message : '文件无效',
              icon: 'none',
              duration: 2000
            })
          })
      }
    })
  },

  confirmImport() {
    const filePath = this.data.importFilePath
    if (!filePath) {
      return
    }

    this.setData({ showImportPreview: false })

    wx.showLoading({ title: '导入中...' })
    this.readTextFile(filePath)
      .then((text) => parseLearningPackageText(text))
      .then((learningPackage) => {
        return this.restoreAudioFilesFromPackage(learningPackage)
          .then((restoredAudioCache) => ({ learningPackage, restoredAudioCache }))
      })
      .then(({ learningPackage, restoredAudioCache }) => {
        return Promise.all([
          this.readLocalStoragePromise(STORY_STORAGE_KEY),
          this.readLocalStoragePromise(RECORD_STORAGE_KEY),
          this.readLocalStoragePromise(STORY_AUDIO_STORAGE_KEY)
        ])
          .then(([stories, records, audioCache]) => {
            const merged = mergeLearningPackage({
              stories,
              records,
              audioCache,
              learningPackage,
              restoredAudioCache
            })
            return Promise.all([
              this.writeLocalStoragePromise(STORY_STORAGE_KEY, merged.stories),
              this.writeLocalStoragePromise(RECORD_STORAGE_KEY, merged.records),
              this.writeLocalStoragePromise(STORY_AUDIO_STORAGE_KEY, merged.audioCache)
            ]).then(() => learningPackage)
          })
      })
      .then((learningPackage) => {
        wx.hideLoading()
        const stats = learningPackage.stats || {}
        wx.showModal({
          title: '导入完成',
          content: `已合并 ${stats.storyCount || 0} 篇故事、${stats.audioCount || 0} 段音频、${stats.recordCount || 0} 条学习记录。\n\n不会覆盖已有故事，仅合并新内容。`,
          showCancel: false
        })
        this.loadStorageLibrary()
      })
      .catch((err) => {
        wx.hideLoading()
        console.error('学习资料包导入失败:', err)
        wx.showToast({
          title: err && err.message ? err.message : '导入失败',
          icon: 'none',
          duration: 2000
        })
      })
  },

  cancelImport() {
    this.setData({
      showImportPreview: false,
      importPreview: null,
      importFilePath: ''
    })
  },

  readAudioFilesForPackage(audioCache) {
    const fs = this.getFileSystemManager()
    if (!fs) {
      return Promise.resolve([])
    }

    const jobs = Object.keys(audioCache || {}).map((audioKey) => {
      const entry = audioCache[audioKey] || {}
      if (!entry.filePath) {
        return Promise.resolve(null)
      }

      return new Promise((resolve) => {
        fs.readFile({
          filePath: entry.filePath,
          encoding: 'base64',
          success: (res) => {
            resolve({
              audioKey,
              storyId: entry.storyId || audioKey,
              word: entry.word || '',
              fileName: `${this.safeFileName(audioKey)}.mp3`,
              mimeType: 'audio/mpeg',
              encoding: 'base64',
              data: res.data || ''
            })
          },
          fail: () => resolve(null)
        })
      })
    })

    return Promise.all(jobs).then((files) => files.filter(Boolean))
  },

  restoreAudioFilesFromPackage(learningPackage) {
    const fs = this.getFileSystemManager()
    const audioFiles = learningPackage.audioFiles || []
    if (!fs || !audioFiles.length || !wx.env || !wx.env.USER_DATA_PATH) {
      return Promise.resolve({})
    }

    const jobs = audioFiles.map((file) => {
      const audioKey = String(file.audioKey || file.storyId || '').trim()
      if (!audioKey || file.encoding !== 'base64' || !file.data) {
        return Promise.resolve(null)
      }

      const filePath = `${wx.env.USER_DATA_PATH}/${PACKAGE_FILE_PREFIX}-audio-${this.safeFileName(audioKey)}.mp3`
      return new Promise((resolve) => {
        fs.writeFile({
          filePath,
          data: file.data,
          encoding: 'base64',
          success: () => {
            resolve({
              audioKey,
              entry: {
                filePath,
                saveTime: Date.now(),
                storyId: file.storyId || audioKey,
                word: file.word || ''
              }
            })
          },
          fail: () => resolve(null)
        })
      })
    })

    return Promise.all(jobs).then((items) => {
      return items.filter(Boolean).reduce((cache, item) => {
        cache[item.audioKey] = item.entry
        return cache
      }, {})
    })
  },

  writePackageFile(learningPackage) {
    const fs = this.getFileSystemManager()
    if (!fs || !wx.env || !wx.env.USER_DATA_PATH) {
      return Promise.reject(new Error('当前环境不支持写入资料包'))
    }

    const fileName = `${PACKAGE_FILE_PREFIX}-${Date.now()}.json`
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`
    return new Promise((resolve, reject) => {
      fs.writeFile({
        filePath,
        data: JSON.stringify(learningPackage, null, 2),
        encoding: 'utf8',
        success: () => resolve({ filePath, fileName }),
        fail: reject
      })
    })
  },

  readTextFile(filePath) {
    const fs = this.getFileSystemManager()
    if (!fs) {
      return Promise.reject(new Error('当前环境不支持读取文件'))
    }

    return new Promise((resolve, reject) => {
      fs.readFile({
        filePath,
        encoding: 'utf8',
        success: (res) => resolve(res.data || ''),
        fail: reject
      })
    })
  },

  sharePackageFile(fileInfo) {
    const stats = this._lastExportStats || {}
    const storyCount = stats.storyCount || 0
    const audioCount = stats.audioCount || 0
    const recordCount = stats.recordCount || 0
    const content = `资料包内容：\n📖 ${storyCount} 篇 AI 故事\n🔊 ${audioCount} 段故事音频\n📝 ${recordCount} 条学习记录`

    if (wx.shareFileMessage) {
      wx.shareFileMessage({
        filePath: fileInfo.filePath,
        fileName: fileInfo.fileName,
        fail: () => {
          wx.showModal({
            title: '导出完成',
            content: `${content}\n\n分享功能在当前环境不可用\n开发者工具可能不支持，请真机测试`,
            showCancel: false
          })
        }
      })
      return
    }

    wx.showModal({
      title: '导出完成',
      content: `${content}\n\n分享功能在当前环境不可用\n开发者工具可能不支持，请真机测试`,
      showCancel: false
    })
  },

  getFileSystemManager() {
    return wx.getFileSystemManager ? wx.getFileSystemManager() : null
  },

  safeFileName(value) {
    const safeName = String(value || 'audio')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 80)
    return safeName || 'audio'
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
