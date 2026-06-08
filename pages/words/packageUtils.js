const { normalizeStoredStoryBundle } = require('../learn/learnUtils')

const PACKAGE_VERSION = 1
const PACKAGE_NAME = '儿童英语学习存储包'
const PACKAGE_TYPE = 'child-english-learning-package'

const NUMERIC_RECORD_FIELDS = [
  'reviewCount',
  'listenCount',
  'cacheHitCount',
  'generatedCount'
]

const TIME_RECORD_FIELDS = [
  'createdAt',
  'updatedAt',
  'lastReviewedAt',
  'masteredAt'
]

const STATUS_RANK = {
  new: 0,
  reviewing: 1,
  mastered: 2
}

function normalizeWordKey(value) {
  return String(value || '').trim().toLowerCase()
}

function cloneData(value) {
  if (value === undefined || value === null) {
    return value
  }
  return JSON.parse(JSON.stringify(value))
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function countStoryVersions(stories) {
  return Object.keys(stories || {}).reduce(function (sum, rawWord) {
    return sum + normalizeStoredStoryBundle(stories[rawWord], rawWord).stories.length
  }, 0)
}

function buildAudioManifest(audioCache) {
  return Object.keys(audioCache || {})
    .map(function (audioKey) {
      const entry = audioCache[audioKey] || {}
      return {
        audioKey,
        word: normalizeWordKey(entry.word),
        storyId: String(entry.storyId || audioKey || ''),
        filePath: entry.filePath || '',
        saveTime: entry.saveTime || 0,
        hasAudio: !!entry.filePath
      }
    })
    .filter(function (item) {
      return item.hasAudio
    })
}

function normalizeAudioFiles(audioFiles) {
  return (audioFiles || [])
    .map(function (file) {
      const audioKey = String(file.audioKey || file.storyId || '').trim()
      const data = String(file.data || '').trim()
      if (!audioKey || !data) {
        return null
      }

      return {
        audioKey,
        storyId: String(file.storyId || audioKey),
        word: normalizeWordKey(file.word),
        fileName: String(file.fileName || `${audioKey}.mp3`),
        mimeType: String(file.mimeType || 'audio/mpeg'),
        encoding: String(file.encoding || 'base64'),
        data
      }
    })
    .filter(Boolean)
}

function buildReadableSummary(stats) {
  return {
    title: '儿童英语学习资料包',
    description: '包含 AI 故事、故事音频和学习记录',
    storyText: `${stats.storyCount || 0} 篇 AI 故事`,
    audioText: `${stats.audioCount || 0} 段故事音频`,
    recordText: `${stats.recordCount || 0} 条学习记录`
  }
}

function buildLearningPackage(options) {
  const safeOptions = options || {}
  const stories = cloneData(safeOptions.stories || {})
  const records = cloneData(safeOptions.records || {})
  const audioCache = cloneData(safeOptions.audioCache || {})
  const audioFiles = normalizeAudioFiles(safeOptions.audioFiles || [])
  const audioManifest = buildAudioManifest(audioCache)

  const stats = {
    wordCount: Object.keys(stories).length,
    storyCount: countStoryVersions(stories),
    audioCount: audioFiles.length || audioManifest.length,
    recordCount: Object.keys(records).length
  }

  return {
    packageVersion: PACKAGE_VERSION,
    packageType: PACKAGE_TYPE,
    packageName: PACKAGE_NAME,
    appName: 'BabyEnglish',
    exportedAt: safeOptions.exportedAt || Date.now(),
    stats,
    readableSummary: buildReadableSummary(stats),
    stories,
    studyRecords: records,
    audioCache,
    audioManifest,
    audioFiles,
    catalogSnapshot: cloneData(safeOptions.catalog || [])
  }
}

function parseLearningPackageText(text) {
  let parsed
  try {
    parsed = JSON.parse(String(text || ''))
  } catch (error) {
    throw new Error('无法解析学习资料包文件')
  }

  if (!isObject(parsed) || parsed.packageType !== PACKAGE_TYPE || parsed.packageVersion !== PACKAGE_VERSION) {
    throw new Error('这不是有效的学习资料包')
  }

  return parsed
}

function previewLearningPackage(learningPackage) {
  const pkg = learningPackage || {}
  const stats = pkg.stats || {}
  const readable = pkg.readableSummary || buildReadableSummary(stats)
  const stories = pkg.stories || {}
  const wordKeys = Object.keys(stories)

  return {
    title: readable.title || '儿童英语学习资料包',
    description: readable.description || '',
    storyText: readable.storyText || `${stats.storyCount || 0} 篇 AI 故事`,
    audioText: readable.audioText || `${stats.audioCount || 0} 段故事音频`,
    recordText: readable.recordText || `${stats.recordCount || 0} 条学习记录`,
    wordCount: wordKeys.length,
    storyCount: stats.storyCount || 0,
    audioCount: stats.audioCount || 0,
    recordCount: stats.recordCount || 0,
    exportedAt: pkg.exportedAt || 0,
    words: wordKeys.slice(0, 8)
  }
}

function normalizeStoryList(stored, word) {
  return normalizeStoredStoryBundle(stored, word).stories
    .filter(function (story) {
      return story && story.id && (story.full || story.en || story.cn)
    })
}

function mergeStoryBundle(existingStored, incomingStored, word) {
  const existingBundle = normalizeStoredStoryBundle(existingStored, word)
  const incomingBundle = normalizeStoredStoryBundle(incomingStored, word)
  const storyMap = {}

  normalizeStoryList(existingStored, word).forEach(function (story) {
    storyMap[story.id] = cloneData(story)
  })

  normalizeStoryList(incomingStored, word).forEach(function (story) {
    if (!storyMap[story.id]) {
      storyMap[story.id] = cloneData(story)
    }
  })

  const stories = Object.keys(storyMap)
    .map(function (id) {
      return storyMap[id]
    })
    .sort(function (a, b) {
      return (b.saveTime || 0) - (a.saveTime || 0)
    })

  const activeStoryId = stories.some(function (story) {
    return story.id === existingBundle.activeStoryId
  })
    ? existingBundle.activeStoryId
    : (stories.some(function (story) { return story.id === incomingBundle.activeStoryId })
      ? incomingBundle.activeStoryId
      : ((stories[0] && stories[0].id) || ''))

  return {
    activeStoryId,
    stories
  }
}

function mergeStories(currentStories, importedStories) {
  const result = {}

  function mergeSource(source) {
    Object.keys(source || {}).forEach(function (rawWord) {
      const word = normalizeWordKey(rawWord)
      if (!word) {
        return
      }
      result[word] = mergeStoryBundle(result[word], source[rawWord], word)
    })
  }

  mergeSource(currentStories)
  mergeSource(importedStories)

  return result
}

function chooseStatus(existingStatus, incomingStatus) {
  const existing = existingStatus || 'new'
  const incoming = incomingStatus || 'new'
  return (STATUS_RANK[incoming] || 0) > (STATUS_RANK[existing] || 0)
    ? incoming
    : existing
}

function mergeRecord(existingRecord, incomingRecord) {
  const existing = existingRecord || {}
  const incoming = incomingRecord || {}
  const merged = Object.assign({}, incoming, existing)

  NUMERIC_RECORD_FIELDS.forEach(function (field) {
    merged[field] = Math.max(existing[field] || 0, incoming[field] || 0)
  })

  TIME_RECORD_FIELDS.forEach(function (field) {
    if (existing[field] || incoming[field]) {
      merged[field] = Math.max(existing[field] || 0, incoming[field] || 0)
    }
  })

  merged.favorite = !!(existing.favorite || incoming.favorite)
  merged.status = chooseStatus(existing.status, incoming.status)

  return merged
}

function mergeStudyRecords(currentRecords, importedRecords) {
  const result = {}

  function mergeSource(source) {
    Object.keys(source || {}).forEach(function (rawWord) {
      const word = normalizeWordKey(rawWord)
      if (!word) {
        return
      }
      result[word] = mergeRecord(result[word], source[rawWord])
    })
  }

  mergeSource(currentRecords)
  mergeSource(importedRecords)

  return result
}

function mergeAudioCache(currentAudioCache, importedAudioCache, restoredAudioCache) {
  const result = cloneData(currentAudioCache || {})

  Object.keys(importedAudioCache || {}).forEach(function (audioKey) {
    const entry = importedAudioCache[audioKey]
    if (!entry || !entry.filePath) {
      return
    }
    if (!result[audioKey] || !result[audioKey].filePath) {
      result[audioKey] = cloneData(entry)
    }
  })

  Object.keys(restoredAudioCache || {}).forEach(function (audioKey) {
    const entry = restoredAudioCache[audioKey]
    if (entry && entry.filePath) {
      result[audioKey] = cloneData(entry)
    }
  })

  return result
}

function mergeLearningPackage(options) {
  const safeOptions = options || {}
  const learningPackage = safeOptions.learningPackage || {}

  return {
    stories: mergeStories(safeOptions.stories || {}, learningPackage.stories || {}),
    records: mergeStudyRecords(safeOptions.records || {}, learningPackage.studyRecords || {}),
    audioCache: mergeAudioCache(
      safeOptions.audioCache || {},
      learningPackage.audioCache || {},
      safeOptions.restoredAudioCache || {}
    )
  }
}

module.exports = {
  PACKAGE_NAME,
  PACKAGE_TYPE,
  PACKAGE_VERSION,
  buildLearningPackage,
  buildReadableSummary,
  mergeLearningPackage,
  parseLearningPackageText,
  previewLearningPackage
}
