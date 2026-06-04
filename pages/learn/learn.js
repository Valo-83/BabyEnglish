// pages/learn/learn.js
const {
  buildReadableStoryText,
  extractEnglishForAudio,
  findStoredStory,
  findWordIndex,
  parseAIStoryPayload,
  splitReadableTTSChunks
} = require('./learnUtils')
const {
  markStudyRecordMastered,
  updateStudyRecord
} = require('../shared/studyRecordUtils')

const STUDY_RECORD_STORAGE_KEY = 'LOCAL_STUDY_RECORDS'

Page({
  data: {
    title: '',
    type: '',
    currentIndex: 0,
    words: [],
    selectedWord: '',
    // 新字段（供未来 WXML 升级用）
    currentStory: '',
    englishStory: '',
    chineseStory: '',
    isLoading: false,
    // 旧字段（兼容现有 WXML）
    aiStory: '',
    storyLoading: false,
    storyError: '',
    storyCollapsed: false,
    // 故事音频
    storyAudioLoading: false,
    hasStoryAudio: false,
    playingStoryAudio: false
  },

  onLoad(options) {
    const type = options.type || 'animals'
    const words = this.getWords(type)
    const initialIndex = findWordIndex(words, options.word)
    this.isPageActive = true
    this.storyRequestId = 0
    this.storyAudioRequestId = 0
    this.innerAudioContext = null
    this.learnMode = options.mode === 'review' ? 'review' : 'normal'
    this.studyRecordWriteQueue = Promise.resolve()
    this.setData({
      type: type,
      title: this.getTitle(type),
      words: words,
      currentIndex: initialIndex
    }, () => {
      if (words.length > 0) {
        setTimeout(() => {
          const word = words[initialIndex]
          if (word) {
            this.loadAIStory(word)
          }
        }, 150)
      }
    })
  },

  onUnload() {
    this.isPageActive = false
    this._stopStoryTyping()
    this.ttsPlaybackId = (this.ttsPlaybackId || 0) + 1
    this.storyAudioRequestId = (this.storyAudioRequestId || 0) + 1
    try {
      if (this.innerAudioContext) {
        this.innerAudioContext.stop()
        this.innerAudioContext.destroy()
        this.innerAudioContext = null
      }
    } catch (e) {
      this.innerAudioContext = null
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
        { english: 'dog', chinese: '狗', emoji: '🐶', bgColor: '#FFE5B4' },
        { english: 'cat', chinese: '猫', emoji: '🐱', bgColor: '#E8EAF6' },
        { english: 'rabbit', chinese: '兔子', emoji: '🐰', bgColor: '#FCE4EC' },
        { english: 'bird', chinese: '鸟', emoji: '🐦', bgColor: '#E1F5FE' },
        { english: 'fish', chinese: '鱼', emoji: '🐟', bgColor: '#E0F2F1' },
        { english: 'elephant', chinese: '大象', emoji: '🐘', bgColor: '#F5F5F5' },
        { english: 'monkey', chinese: '猴子', emoji: '🐵', bgColor: '#FFF8E1' },
        { english: 'bear', chinese: '熊', emoji: '🐻', bgColor: '#EFEBE9' },
        { english: 'panda', chinese: '熊猫', emoji: '🐼', bgColor: '#FAFAFA' },
        { english: 'lion', chinese: '狮子', emoji: '🦁', bgColor: '#FFF3E0' },
        { english: 'tiger', chinese: '老虎', emoji: '🐯', bgColor: '#FFECB3' },
        { english: 'horse', chinese: '马', emoji: '🐴', bgColor: '#FFEBEE' },
        { english: 'pig', chinese: '猪', emoji: '🐷', bgColor: '#FCE4EC' },
        { english: 'cow', chinese: '牛', emoji: '🐮', bgColor: '#EFEBE9' },
        { english: 'sheep', chinese: '羊', emoji: '🐑', bgColor: '#FAFAFA' },
        { english: 'duck', chinese: '鸭子', emoji: '🦆', bgColor: '#FFF9C4' },
        { english: 'chicken', chinese: '鸡', emoji: '🐔', bgColor: '#FFF8E1' },
        { english: 'frog', chinese: '青蛙', emoji: '🐸', bgColor: '#E8F5E9' },
        { english: 'snake', chinese: '蛇', emoji: '🐍', bgColor: '#E0F2F1' },
        { english: 'butterfly', chinese: '蝴蝶', emoji: '🦋', bgColor: '#F3E5F5' }
      ],
      'fruits': [
        { english: 'apple', chinese: '苹果', emoji: '🍎', bgColor: '#FFE5E5' },
        { english: 'banana', chinese: '香蕉', emoji: '🍌', bgColor: '#FFF9C4' },
        { english: 'orange', chinese: '橙子', emoji: '🍊', bgColor: '#FFF3E0' },
        { english: 'grape', chinese: '葡萄', emoji: '🍇', bgColor: '#F3E5F5' },
        { english: 'strawberry', chinese: '草莓', emoji: '🍓', bgColor: '#FFEBEE' },
        { english: 'watermelon', chinese: '西瓜', emoji: '🍉', bgColor: '#E8F5E9' },
        { english: 'pineapple', chinese: '菠萝', emoji: '🍍', bgColor: '#FFFDE7' },
        { english: 'peach', chinese: '桃子', emoji: '🍑', bgColor: '#FCE4EC' },
        { english: 'mango', chinese: '芒果', emoji: '🥭', bgColor: '#FFF9C4' },
        { english: 'cherry', chinese: '樱桃', emoji: '🍒', bgColor: '#FFCDD2' },
        { english: 'lemon', chinese: '柠檬', emoji: '🍋', bgColor: '#FFF9C4' },
        { english: 'pear', chinese: '梨', emoji: '🍐', bgColor: '#F1F8E9' },
        { english: 'plum', chinese: '李子', emoji: '🫐', bgColor: '#E1BEE7' },
        { english: 'blueberry', chinese: '蓝莓', emoji: '🫐', bgColor: '#E3F2FD' },
        { english: 'kiwi', chinese: '猕猴桃', emoji: '🥝', bgColor: '#E8F5E9' },
        { english: 'coconut', chinese: '椰子', emoji: '🥥', bgColor: '#EFEBE9' },
        { english: 'peanut', chinese: '花生', emoji: '🥜', bgColor: '#FFF8E1' },
        { english: 'melon', chinese: '哈密瓜', emoji: '🍈', bgColor: '#F1F8E9' },
        { english: 'avocado', chinese: '牛油果', emoji: '🥑', bgColor: '#E8F5E9' },
        { english: 'tomato', chinese: '番茄', emoji: '🍅', bgColor: '#FFCDD2' }
      ],
      'colors': [
        { english: 'red', chinese: '红色', emoji: '🔴', bgColor: '#FFEBEE' },
        { english: 'blue', chinese: '蓝色', emoji: '🔵', bgColor: '#E3F2FD' },
        { english: 'green', chinese: '绿色', emoji: '🟢', bgColor: '#E8F5E9' },
        { english: 'yellow', chinese: '黄色', emoji: '🟡', bgColor: '#FFF9C4' },
        { english: 'purple', chinese: '紫色', emoji: '🟣', bgColor: '#F3E5F5' },
        { english: 'orange', chinese: '橙色', emoji: '🟠', bgColor: '#FFF3E0' },
        { english: 'pink', chinese: '粉色', emoji: '💗', bgColor: '#FCE4EC' },
        { english: 'brown', chinese: '棕色', emoji: '🟤', bgColor: '#EFEBE9' },
        { english: 'black', chinese: '黑色', emoji: '⚫', bgColor: '#424242' },
        { english: 'white', chinese: '白色', emoji: '⚪', bgColor: '#FFFFFF' },
        { english: 'gray', chinese: '灰色', emoji: '🩶', bgColor: '#9E9E9E' },
        { english: 'gold', chinese: '金色', emoji: '🪙', bgColor: '#FFD700' },
        { english: 'silver', chinese: '银色', emoji: '🥈', bgColor: '#C0C0C0' },
        { english: 'cyan', chinese: '青色', emoji: '🔵', bgColor: '#E0F7FA' },
        { english: 'navy', chinese: '深蓝', emoji: '🔵', bgColor: '#1A237E' },
        { english: 'coral', chinese: '珊瑚色', emoji: '🩷', bgColor: '#FF7F50' },
        { english: 'lavender', chinese: '薰衣草色', emoji: '💜', bgColor: '#E6E6FA' },
        { english: 'mint', chinese: '薄荷绿', emoji: '🌿', bgColor: '#98FB98' },
        { english: 'peach', chinese: '桃色', emoji: '🍑', bgColor: '#FFDAB9' },
        { english: 'sky blue', chinese: '天蓝色', emoji: '☁️', bgColor: '#87CEEB' }
      ],
      'numbers': [
        { english: 'one', chinese: '一', emoji: '1️⃣', bgColor: '#FFF9C4' },
        { english: 'two', chinese: '二', emoji: '2️⃣', bgColor: '#E1F5FE' },
        { english: 'three', chinese: '三', emoji: '3️⃣', bgColor: '#F3E5F5' },
        { english: 'four', chinese: '四', emoji: '4️⃣', bgColor: '#E8F5E9' },
        { english: 'five', chinese: '五', emoji: '5️⃣', bgColor: '#FFE5B4' },
        { english: 'six', chinese: '六', emoji: '6️⃣', bgColor: '#FCE4EC' },
        { english: 'seven', chinese: '七', emoji: '7️⃣', bgColor: '#E3F2FD' },
        { english: 'eight', chinese: '八', emoji: '8️⃣', bgColor: '#FFF3E0' },
        { english: 'nine', chinese: '九', emoji: '9️⃣', bgColor: '#E1F5FE' },
        { english: 'ten', chinese: '十', emoji: '🔟', bgColor: '#F3E5F5' },
        { english: 'eleven', chinese: '十一', emoji: '1️⃣1️⃣', bgColor: '#FFE5B4' },
        { english: 'twelve', chinese: '十二', emoji: '1️⃣2️⃣', bgColor: '#E8F5E9' },
        { english: 'thirteen', chinese: '十三', emoji: '1️⃣3️⃣', bgColor: '#FCE4EC' },
        { english: 'fourteen', chinese: '十四', emoji: '1️⃣4️⃣', bgColor: '#E3F2FD' },
        { english: 'fifteen', chinese: '十五', emoji: '1️⃣5️⃣', bgColor: '#FFF9C4' },
        { english: 'sixteen', chinese: '十六', emoji: '1️⃣6️⃣', bgColor: '#F3E5F5' },
        { english: 'seventeen', chinese: '十七', emoji: '1️⃣7️⃣', bgColor: '#E8F5E9' },
        { english: 'eighteen', chinese: '十八', emoji: '1️⃣8️⃣', bgColor: '#FFE5B4' },
        { english: 'nineteen', chinese: '十九', emoji: '1️⃣9️⃣', bgColor: '#FCE4EC' },
        { english: 'twenty', chinese: '二十', emoji: '2️⃣0️⃣', bgColor: '#E1F5FE' }
      ]
    }
    return wordData[type]??[]
  },

  playSound(e) {
    const index = e.currentTarget.dataset.index
    const word = this.data.words[index]
    if (!word) {
      return
    }

    wx.showToast({
      title: word.english,
      icon: 'none',
      duration: 1000
    })
    this._trackStudyAction(word.english, { listen: 1 })
    this.playWithMultipleTTS(word.english)
    this.loadAIStory(word)
  },

  async loadAIStory(word) {
    if (!word || !word.english) {
      console.warn('loadAIStory called with invalid word:', word)
      return
    }
    const requestId = (this.storyRequestId || 0) + 1
    this.storyRequestId = requestId
    this._stopStoryTyping()

    this.setData({
      selectedWord: word.english,
      // 新字段
      currentStory: '',
      englishStory: '',
      chineseStory: '',
      isLoading: true,
      // 旧字段（兼容现有 WXML）
      aiStory: '',
      storyLoading: true,
      storyError: '',
      storyCollapsed: false
    })
    if (this.learnMode === 'review') {
      this._trackStudyAction(word.english, { review: 1 })
    }

    // 1. 尝试从本地缓存读取
    try {
      const cachedData = await new Promise((resolve, reject) => {
        wx.getStorage({
          key: 'LOCAL_STORED_AI_STORIES',
          success: (res) => resolve(res.data || {}),
          fail: reject
        })
      })

      const cachedStory = findStoredStory(cachedData, word.english)
      if (cachedStory) {
        console.log(`=== 💾 命中缓存: ${word.english} ===`)
        const parsedStory = parseAIStoryPayload({
          ai_story: cachedStory.full || '',
          en: cachedStory.en || '',
          cn: cachedStory.cn || ''
        })
        this._trackStudyAction(word.english, { cacheHit: 1 })
        if (!this.isPageActive || requestId !== this.storyRequestId) {
          return
        }
        this.setData({
          // 新字段
          currentStory: parsedStory.displayStory,
          englishStory: parsedStory.englishStory,
          chineseStory: parsedStory.chineseStory,
          isLoading: false,
          // 旧字段（兼容现有 WXML）
          aiStory: parsedStory.displayStory,
          storyLoading: false,
          storyError: ''
        })
        this.setData({ hasStoryAudio: false })
        this.checkStoryAudioCache()
        return
      }
    } catch (e) {
      console.log('=== 💾 无缓存或读取失败，将从网络获取 ===', e)
    }

    // 2. 从网络获取
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: `http://127.0.0.1:8000/api/ai_story?word=${encodeURIComponent(word.english)}`,
          method: 'POST',
          header: {
            'content-type': 'application/json'
          },
          success: (res) => {
            if (requestId !== this.storyRequestId) {
              return reject(new Error('STALE'))
            }
            resolve(res)
          },
          fail: reject
        })
      })

      const data = res.data || {}
      const parsedStory = parseAIStoryPayload(data)

      if (parsedStory.rawStory || parsedStory.englishStory || parsedStory.chineseStory) {
        if (!this.isPageActive || requestId !== this.storyRequestId) {
          return
        }
        this.setData({
          // 新字段
          currentStory: parsedStory.displayStory,
          englishStory: parsedStory.englishStory,
          chineseStory: parsedStory.chineseStory,
          isLoading: false,
          // 旧字段（兼容现有 WXML）
          aiStory: '',
          storyLoading: false,
          storyError: '',
          hasStoryAudio: false
        })
        this._cacheStoryAsync(word.english, parsedStory.rawStory, parsedStory.englishStory, parsedStory.chineseStory)
        this._trackStudyAction(word.english, { generated: 1 })
        this._showStoryWithTyping(parsedStory.displayStory, requestId)
        return
      }

      this.setData({
        currentStory: '',
        englishStory: '',
        chineseStory: '',
        isLoading: false,
        aiStory: '',
        storyLoading: false,
        storyError: '没有收到 AI 故事内容'
      })
    } catch (e) {
      if (requestId !== this.storyRequestId) {
        return
      }
      this.setData({
        currentStory: '',
        englishStory: '',
        chineseStory: '',
        isLoading: false,
        aiStory: '',
        storyLoading: false,
        storyError: 'AI 故事获取失败，请确认本地后端已启动'
      })
    }
  },

  _cacheStoryAsync(word, full, en, cn) {
    wx.getStorage({
      key: 'LOCAL_STORED_AI_STORIES',
      success: (res) => {
        const cache = res.data || {}
        cache[word] = { full, en, cn, saveTime: Date.now(), audioGenerated: false }
        wx.setStorage({
          key: 'LOCAL_STORED_AI_STORIES',
          data: cache,
          success: () => console.log(`=== 💾 ${word} 资产成功写入 ===`),
          fail: (e) => console.error(`=== 💾 ${word} 写入失败 ===`, e)
        })
      },
      fail: () => {
        wx.setStorage({
          key: 'LOCAL_STORED_AI_STORIES',
          data: { [word]: { full, en, cn, saveTime: Date.now(), audioGenerated: false } },
          success: () => console.log(`=== 💾 ${word} 资产成功写入 ===`),
          fail: (e) => console.error(`=== 💾 ${word} 写入失败 ===`, e)
        })
      }
    })
  },

  _trackStudyAction(word, action) {
    const previousWrite = this.studyRecordWriteQueue || Promise.resolve()
    this.studyRecordWriteQueue = previousWrite
      .catch(() => {})
      .then(() => this._readStudyRecords())
      .then((records) => {
        updateStudyRecord(records, word, action)
        return this._saveStudyRecords(records)
      })
      .catch((e) => console.error('学习记录写入失败:', e))

    return this.studyRecordWriteQueue
  },

  _readStudyRecords() {
    return new Promise((resolve) => {
      wx.getStorage({
        key: STUDY_RECORD_STORAGE_KEY,
        success: (res) => resolve(res.data || {}),
        fail: () => resolve({})
      })
    })
  },

  _saveStudyRecords(records) {
    return new Promise((resolve, reject) => {
      wx.setStorage({
        key: STUDY_RECORD_STORAGE_KEY,
        data: records,
        success: resolve,
        fail: reject
      })
    })
  },

  loadStoryByIndex(index) {
    const word = this.data.words[index]
    if (word) {
      this.loadAIStory(word)
    }
  },

  toggleStory() {
    this.setData({
      storyCollapsed: !this.data.storyCollapsed
    })
  },

  generateStoryNow() {
    const word = this.data.words[this.data.currentIndex]
    if (word) {
      this.loadAIStory(word)
    }
  },

  _stopStoryTyping() {
    if (this.storyTypingTimer) {
      clearTimeout(this.storyTypingTimer)
      this.storyTypingTimer = null
    }
  },

  _showStoryWithTyping(story, requestId) {
    const text = String(story || '')
    if (!text) {
      return
    }

    let index = 0
    const tick = () => {
      if (requestId !== this.storyRequestId) {
        return
      }

      index = Math.min(index + 2, text.length)
      this.setData({
        aiStory: text.slice(0, index)
      })

      if (index < text.length) {
        this.storyTypingTimer = setTimeout(tick, 50)
      } else {
        this.storyTypingTimer = null
      }
    }

    tick()
  },

  playWithMultipleTTS(text) {
    const readableText = buildReadableStoryText(text)
    const chunks = splitReadableTTSChunks(readableText)
    if (!chunks.length) {
      wx.showToast({
        title: '暂无内容可读',
        icon: 'none',
        duration: 1200
      })
      return
    }

    const playbackId = (this.ttsPlaybackId || 0) + 1
    this.ttsPlaybackId = playbackId
    this._playTTSChunks(chunks, 0, playbackId)
  },

  _playTTSChunks(chunks, chunkIndex, playbackId) {
    if (playbackId !== this.ttsPlaybackId) {
      return
    }

    if (chunkIndex >= chunks.length) {
      return
    }

    const chunk = chunks[chunkIndex]
    const ttsSources = [
      {
        name: 'local-tts',
        url: `http://127.0.0.1:8000/api/tts?text=${encodeURIComponent(chunk)}`,
        download: true
      },
      {
        name: 'youdao-direct',
        url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(chunk)}&type=1`
      }
    ]
    this.tryPlayTTS(ttsSources, 0, () => {
      this._playTTSChunks(chunks, chunkIndex + 1, playbackId)
    }, playbackId)
  },

  _resetAudioContext() {
    try {
      if (this.innerAudioContext) {
        this.innerAudioContext.stop()
        this.innerAudioContext.destroy()
        this.innerAudioContext = null
      }
    } catch (e) {
      this.innerAudioContext = null
    }

    this.innerAudioContext = wx.createInnerAudioContext()
    this.innerAudioContext.obeyMuteSwitch = false
    this.innerAudioContext.volume = 1
    return this.innerAudioContext
  },

  tryPlayTTS(sources, index, onDone, playbackId) {
    if (playbackId !== this.ttsPlaybackId) {
      return
    }

    if (index >= sources.length) {
      wx.showToast({
        title: '发音暂不可用',
        icon: 'none',
        duration: 2000
      })
      return
    }
    const source = sources[index]

    const playAudio = (src) => {
      if (playbackId !== this.ttsPlaybackId) {
        return
      }
      const audio = this._resetAudioContext()
      audio.onEnded(() => {
        console.log(`TTS播放成功: ${source.name}`)
        if (typeof onDone === 'function') {
          onDone()
        }
      })
      audio.onError((err) => {
        console.error(`TTS源 ${source.name} 失败，尝试下一个:`, err)
        this.tryPlayTTS(sources, index + 1, onDone, playbackId)
      })
      audio.src = src
      audio.play()
    }

    if (source.download) {
      wx.downloadFile({
        url: source.url,
        success: (res) => {
          if (playbackId !== this.ttsPlaybackId) {
            return
          }

          if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
            playAudio(res.tempFilePath)
            return
          }

          console.error(`TTS源 ${source.name} 下载失败:`, res)
          this.tryPlayTTS(sources, index + 1, onDone, playbackId)
        },
        fail: (err) => {
          console.error(`TTS源 ${source.name} 下载失败:`, err)
          this.tryPlayTTS(sources, index + 1, onDone, playbackId)
        }
      })
      return
    }

    playAudio(source.url)
  },

  prevWord() {
    if (this.data.currentIndex > 0) {
      const nextIndex = this.data.currentIndex - 1
      this.setData({
        currentIndex: nextIndex
      }, () => {
        this.loadStoryByIndex(nextIndex)
      })
    }
  },

  nextWord() {
    if (this.data.currentIndex < this.data.words.length - 1) {
      const nextIndex = this.data.currentIndex + 1
      this.setData({
        currentIndex: nextIndex
      }, () => {
        this.loadStoryByIndex(nextIndex)
      })
    }
  },

  onSwiperChange(e) {
    const nextIndex = e.detail.current
    if (nextIndex === this.data.currentIndex) {
      return
    }

    this.setData({
      currentIndex: nextIndex
    }, () => {
      this.loadStoryByIndex(nextIndex)
    })
  },

  markAsMastered() {
    const word = this.data.words[this.data.currentIndex]
    if (!word) return

    const previousWrite = this.studyRecordWriteQueue || Promise.resolve()
    this.studyRecordWriteQueue = previousWrite
      .catch(() => {})
      .then(() => this._readStudyRecords())
      .then((records) => {
        const updated = markStudyRecordMastered(records, word.english)
        if (!updated) {
          wx.showToast({ title: '暂无学习记录', icon: 'none', duration: 1600 })
          return null
        }

        return this._saveStudyRecords(records).then(() => {
          wx.showToast({ title: '已标为熟悉', icon: 'success', duration: 1200 })
        })
      })
      .catch(() => {
        wx.showToast({ title: '操作失败', icon: 'none', duration: 1600 })
      })
  },

  checkStoryAudioCache() {
    const word = this.data.selectedWord
    if (!word) return

    wx.request({
      url: `http://127.0.0.1:8000/api/story_audio?word=${encodeURIComponent(word)}`,
      method: 'GET',
      success: (res) => {
        if (!this.isPageActive || word !== this.data.selectedWord) {
          return
        }
        this.setData({ hasStoryAudio: res.statusCode === 200 })
      },
      fail: () => {
        if (!this.isPageActive || word !== this.data.selectedWord) {
          return
        }
        this.setData({ hasStoryAudio: false })
      }
    })
  },

  _isStoryAudioRequestActive(word, requestId) {
    return this.isPageActive &&
      requestId === this.storyAudioRequestId &&
      word === this.data.selectedWord
  },

  playStoryAudio() {
    const word = this.data.selectedWord
    if (!word) {
      wx.showToast({ title: '请先选择单词', icon: 'none', duration: 1200 })
      return
    }

    const englishText = extractEnglishForAudio({
      englishStory: this.data.englishStory,
      aiStory: this.data.aiStory,
      currentStory: this.data.currentStory
    })
    if (!englishText.trim()) {
      wx.showToast({ title: '没有故事内容可播放', icon: 'none', duration: 1200 })
      return
    }

    const requestId = (this.storyAudioRequestId || 0) + 1
    this.storyAudioRequestId = requestId

    if (this.data.hasStoryAudio) {
      this._downloadAndPlayStoryAudio(word, requestId)
      return
    }

    this.setData({ storyAudioLoading: true })
    wx.showLoading({ title: '生成故事音频...' })

    wx.request({
      url: 'http://127.0.0.1:8000/api/story_audio',
      method: 'POST',
      timeout: 30000,
      header: { 'content-type': 'application/json' },
      data: { word: word, text: englishText },
      success: (res) => {
        wx.hideLoading()
        if (!this._isStoryAudioRequestActive(word, requestId)) {
          return
        }
        this.setData({ storyAudioLoading: false })
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.success) {
          this.setData({ hasStoryAudio: true })
          setTimeout(() => {
            if (this._isStoryAudioRequestActive(word, requestId)) {
              this._downloadAndPlayStoryAudio(word, requestId)
            }
          }, 300)
        } else {
          const msg = (res.data && res.data.detail) || '音频生成失败'
          wx.showToast({ title: msg, icon: 'none', duration: 2000 })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        if (!this._isStoryAudioRequestActive(word, requestId)) {
          return
        }
        this.setData({ storyAudioLoading: false })
        console.error('故事音频生成失败:', err)
        wx.showToast({ title: '无法连接后端服务', icon: 'none', duration: 2000 })
      }
    })
  },

  _downloadAndPlayStoryAudio(word, requestId) {
    if (!this._isStoryAudioRequestActive(word, requestId)) {
      return
    }

    this.setData({ playingStoryAudio: true })
    wx.showLoading({ title: '加载音频...' })

    wx.downloadFile({
      url: `http://127.0.0.1:8000/api/story_audio/${encodeURIComponent(word)}.mp3`,
      timeout: 15000,
      success: (res) => {
        wx.hideLoading()
        if (!this._isStoryAudioRequestActive(word, requestId)) {
          return
        }
        if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
          try {
            if (this.innerAudioContext) {
              this.innerAudioContext.stop()
              this.innerAudioContext.destroy()
              this.innerAudioContext = null
            }
            const audio = wx.createInnerAudioContext()
            let hasStarted = false
            const startPlayback = () => {
              if (hasStarted || !this._isStoryAudioRequestActive(word, requestId)) {
                return
              }
              hasStarted = true
              audio.play()
            }
            audio.obeyMuteSwitch = false
            audio.volume = 1
            audio.onCanplay(startPlayback)
            audio.onEnded(() => {
              if (!this._isStoryAudioRequestActive(word, requestId)) {
                return
              }
              this.setData({ playingStoryAudio: false })
            })
            audio.onError((err) => {
              console.error('故事音频播放失败:', err)
              if (!this._isStoryAudioRequestActive(word, requestId)) {
                return
              }
              this.setData({ playingStoryAudio: false })
            })
            this.innerAudioContext = audio
            audio.src = res.tempFilePath
            setTimeout(startPlayback, 500)
          } catch (e) {
            console.error('音频播放异常:', e)
            if (!this._isStoryAudioRequestActive(word, requestId)) {
              return
            }
            this.setData({ playingStoryAudio: false, hasStoryAudio: false })
            wx.showToast({ title: '音频播放失败', icon: 'none', duration: 2000 })
          }
        } else {
          this.setData({ playingStoryAudio: false, hasStoryAudio: false })
          wx.showToast({ title: '音频下载失败', icon: 'none', duration: 2000 })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        if (!this._isStoryAudioRequestActive(word, requestId)) {
          return
        }
        this.setData({ playingStoryAudio: false, hasStoryAudio: false })
        console.error('音频下载失败:', err)
        wx.showToast({ title: '音频下载失败', icon: 'none', duration: 2000 })
      }
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
