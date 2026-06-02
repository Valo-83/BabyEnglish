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
      const story = safeStories[rawWord] || {}
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
        summary: makeSummary(full),
        saveTime,
        saveTimeText: formatTime(saveTime),
        reviewCount: record.reviewCount || 0,
        listenCount: record.listenCount || 0,
        cacheHitCount: record.cacheHitCount || 0,
        favorite: !!record.favorite,
        lastReviewedAt: record.lastReviewedAt || 0,
        lastReviewedText: formatTime(record.lastReviewedAt)
      }
    })
    .sort((a, b) => (b.saveTime || 0) - (a.saveTime || 0))
}

function buildStorageStats(assets) {
  const safeAssets = assets || []
  const latest = safeAssets[0] || null

  return {
    totalStories: safeAssets.length,
    totalReviews: safeAssets.reduce((sum, item) => sum + (item.reviewCount || 0), 0),
    totalCacheHits: safeAssets.reduce((sum, item) => sum + (item.cacheHitCount || 0), 0),
    favoriteCount: safeAssets.filter((item) => item.favorite).length,
    latestSavedWord: latest ? latest.word : '暂无',
    latestSavedTime: latest ? latest.saveTimeText : '暂无'
  }
}

module.exports = {
  buildStorageAssets,
  buildStorageStats,
  formatTime
}
