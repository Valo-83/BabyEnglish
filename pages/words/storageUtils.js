const {
  buildStoryAudioCacheKey,
  buildStoryDisplayText,
  findStoryAudioCacheEntry,
  normalizeStoredStoryBundle
} = require('../learn/learnUtils')

function normalizeWordKey(word) {
  return String(word || '').trim().toLowerCase()
}

function buildCatalogMap(catalog) {
  return (catalog || []).reduce((map, item) => {
    map[normalizeWordKey(item.english)] = item
    return map
  }, {})
}

function formatTime(timestamp) {
  if (!timestamp) {
    return '未知时间'
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return '未知时间'
  }

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return '更早'
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return '更早'
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000
  const diffDays = Math.floor((todayStart - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000)

  if (date.getTime() >= todayStart) {
    return '今天'
  }
  if (date.getTime() >= yesterdayStart) {
    return '昨天'
  }
  if (diffDays > 0 && diffDays < 30) {
    return `${diffDays} 天前`
  }
  return '更早'
}

function makeSummary(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return '还没有故事摘要'
  }
  return normalized.length > 58 ? `${normalized.slice(0, 58)}...` : normalized
}

function buildStorageAssets(stories, records, catalog) {
  const safeStories = stories || {}
  const safeRecords = records || {}
  const catalogMap = buildCatalogMap(catalog)

  return Object.keys(safeStories)
    .map((rawWord) => {
      const normalizedWord = normalizeWordKey(rawWord)
      const storyBundle = normalizeStoredStoryBundle(safeStories[rawWord], rawWord)
      const story = storyBundle.stories.find(function (item) {
        return item.id === storyBundle.activeStoryId
      }) || storyBundle.stories[0] || {}
      const record = safeRecords[rawWord] || safeRecords[normalizedWord] || {}
      const meta = catalogMap[normalizedWord] || {}
      const displayWord = normalizeWordKey(meta.english || rawWord)
      const full = story.full || story.story || story.ai_story || story.en || ''
      const saveTime = story.saveTime || story.createdAt || 0

      return {
        word: displayWord,
        storageKey: rawWord,
        chinese: meta.chinese || '',
        emoji: meta.emoji || '📘',
        category: meta.category || 'unknown',
        full,
        englishStory: story.en || story.englishStory || '',
        chineseStory: story.cn || story.chineseStory || '',
        storyCount: storyBundle.stories.length || (full ? 1 : 0),
        summary: makeSummary(full),
        saveTime,
        saveTimeText: formatTime(saveTime),
        reviewCount: record.reviewCount || 0,
        listenCount: record.listenCount || 0,
        cacheHitCount: record.cacheHitCount || 0,
        generatedCount: record.generatedCount || 0,
        favorite: !!record.favorite,
        status: record.status || 'new',
        lastReviewedAt: record.lastReviewedAt || 0,
        lastReviewedText: formatTime(record.lastReviewedAt),
        masteredAt: record.masteredAt || null
      }
    })
    .sort((a, b) => (b.saveTime || 0) - (a.saveTime || 0))
}

function buildTodayReviewAssets(assets, maxCount) {
  const limit = maxCount || 3
  const safeAssets = assets || []

  return safeAssets
    .filter(function (item) {
      return item.status !== 'mastered'
    })
    .sort(function (a, b) {
      const reviewDiff = (a.reviewCount || 0) - (b.reviewCount || 0)
      if (reviewDiff !== 0) {
        return reviewDiff
      }
      return (a.lastReviewedAt || 0) - (b.lastReviewedAt || 0)
    })
    .slice(0, limit)
    .map(function (item) {
      return {
        word: item.word,
        chinese: item.chinese,
        emoji: item.emoji,
        category: item.category,
        reviewCount: item.reviewCount,
        lastReviewedAt: item.lastReviewedAt,
        relativeTime: formatRelativeTime(item.lastReviewedAt)
      }
    })
}

function buildMyStoryAssets(stories, audioCache, catalog) {
  const safeStories = stories || {}
  const safeAudioCache = audioCache || {}
  const catalogMap = buildCatalogMap(catalog)

  return Object.keys(safeStories)
    .reduce(function (list, rawWord) {
      const normalizedWord = normalizeWordKey(rawWord)
      const meta = catalogMap[normalizedWord] || {}
      const bundle = normalizeStoredStoryBundle(safeStories[rawWord], rawWord)

      bundle.stories.forEach(function (story, index) {
        const audioEntry = findStoryAudioCacheEntry(safeAudioCache, normalizedWord, story.id)
        list.push({
          id: story.id,
          word: normalizedWord,
          chinese: meta.chinese || '',
          emoji: meta.emoji || '📘',
          category: meta.category || 'unknown',
          full: story.full || '',
          englishStory: story.en || '',
          chineseStory: story.cn || '',
          displayStory: buildStoryDisplayText(story.en || '', story.cn || '', story.full || ''),
          saveTime: story.saveTime || 0,
          saveTimeText: formatTime(story.saveTime || 0),
          storyIndex: bundle.stories.length - index,
          audioKey: buildStoryAudioCacheKey(normalizedWord, story.id),
          hasAudio: !!audioEntry,
          audioFilePath: audioEntry ? audioEntry.filePath : ''
        })
      })

      return list
    }, [])
    .sort(function (a, b) {
      return (b.saveTime || 0) - (a.saveTime || 0)
    })
}

function matchesKeyword(item, keyword, fields) {
  const normalizedKeyword = String(keyword || '').trim().toLowerCase()
  if (!normalizedKeyword) {
    return true
  }

  return fields.some(function (field) {
    return String(item[field] || '').toLowerCase().indexOf(normalizedKeyword) >= 0
  })
}

function filterStorageAssets(assets, filters) {
  const safeAssets = assets || []
  const safeFilters = filters || {}
  const category = safeFilters.category || 'all'
  const status = safeFilters.status || 'all'

  return safeAssets.filter(function (item) {
    if (category !== 'all' && item.category !== category) {
      return false
    }
    if (status !== 'all' && item.status !== status) {
      return false
    }
    return matchesKeyword(item, safeFilters.keyword, [
      'word',
      'chinese',
      'full',
      'summary',
      'englishStory',
      'chineseStory'
    ])
  })
}

function filterMyStoryAssets(stories, filters) {
  const safeStories = stories || []
  const safeFilters = filters || {}
  const category = safeFilters.category || 'all'
  const audioStatus = safeFilters.audioStatus || 'all'

  return safeStories.filter(function (item) {
    if (category !== 'all' && item.category !== category) {
      return false
    }
    if (audioStatus === 'withAudio' && !item.hasAudio) {
      return false
    }
    if (audioStatus === 'withoutAudio' && item.hasAudio) {
      return false
    }
    return matchesKeyword(item, safeFilters.keyword, [
      'word',
      'chinese',
      'full',
      'displayStory',
      'englishStory',
      'chineseStory'
    ])
  })
}

function buildStorageStats(assets) {
  const safeAssets = assets || []
  const latest = safeAssets[0] || null

  return {
    totalStories: safeAssets.reduce(function (sum, item) { return sum + (item.storyCount || 1) }, 0),
    totalReviews: safeAssets.reduce(function (sum, item) { return sum + (item.reviewCount || 0) }, 0),
    totalCacheHits: safeAssets.reduce(function (sum, item) { return sum + (item.cacheHitCount || 0) }, 0),
    savedValueCount: safeAssets.reduce(function (sum, item) { return sum + (item.cacheHitCount || 0) }, 0),
    favoriteCount: safeAssets.filter(function (item) { return item.favorite }).length,
    masteredCount: safeAssets.filter(function (item) { return item.status === 'mastered' }).length,
    reviewingCount: safeAssets.filter(function (item) { return item.status === 'reviewing' }).length,
    latestSavedWord: latest ? latest.word : '暂无',
    latestSavedTime: latest ? latest.saveTimeText : '暂无'
  }
}

module.exports = {
  buildMyStoryAssets,
  buildStorageAssets,
  buildStorageStats,
  buildTodayReviewAssets,
  filterMyStoryAssets,
  filterStorageAssets,
  formatTime,
  formatRelativeTime
}
