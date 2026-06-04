function normalizeWord(value) {
  return String(value || '').trim().toLowerCase()
}

function findWordIndex(words, targetWord) {
  const normalizedTarget = normalizeWord(targetWord)
  if (!normalizedTarget) {
    return 0
  }

  const index = (words || []).findIndex((word) => {
    return normalizeWord(word.english) === normalizedTarget
  })

  return index >= 0 ? index : 0
}

function findStoredStory(stories, targetWord) {
  const safeStories = stories || {}
  const stored = safeStories[targetWord]
  if (!stored) {
    return null
  }

  const bundle = normalizeStoredStoryBundle(stored, targetWord)
  return bundle.stories.find(function (story) {
    return story.id === bundle.activeStoryId
  }) || bundle.stories[0] || null
}

function findStoredRecord(records, targetWord) {
  const safeRecords = records || {}
  return safeRecords[targetWord] || null
}

function buildLegacyStoryId(word) {
  const key = normalizeWord(word)
  return key ? `${key}_legacy` : ''
}

function buildStoryAudioCacheKey(word, storyId) {
  return normalizeWord(storyId) || normalizeWord(word)
}

function buildStoryAudioCacheEntry(word, filePath, saveTime, storyId) {
  const normalizedPath = String(filePath || '').trim()
  if (!buildStoryAudioCacheKey(word, storyId) || !normalizedPath) {
    return null
  }

  return {
    filePath: normalizedPath,
    saveTime: saveTime || Date.now(),
    storyId: normalizeWord(storyId),
    word: normalizeWord(word)
  }
}

function findStoryAudioCacheEntry(cache, word, storyId) {
  const safeCache = cache || {}
  const key = buildStoryAudioCacheKey(word, storyId)
  const entry = key ? safeCache[key] : null
  if (!entry || !entry.filePath) {
    if (storyId && storyId !== buildLegacyStoryId(word)) {
      return null
    }

    const legacyEntry = safeCache[normalizeWord(word)]
    return legacyEntry && legacyEntry.filePath ? legacyEntry : null
  }

  return entry
}

function buildStoredStoryVersion(word, full, en, cn, saveTime, id) {
  const normalizedWord = normalizeWord(word)
  const createdAt = saveTime || Date.now()
  const storyId = String(id || `${normalizedWord}_${createdAt}`).trim()

  if (!normalizedWord || !storyId) {
    return null
  }

  return {
    id: storyId,
    word: normalizedWord,
    full: normalizeStoryText(full),
    en: normalizeStoryText(en),
    cn: normalizeStoryText(cn),
    saveTime: createdAt,
    audioGenerated: false
  }
}

function normalizeStoredStoryBundle(stored, word) {
  const normalizedWord = normalizeWord(word)
  if (!stored || !normalizedWord) {
    return { activeStoryId: '', stories: [] }
  }

  if (Array.isArray(stored.stories)) {
    const stories = stored.stories
      .map(function (story, index) {
        const saveTime = story.saveTime || story.createdAt || Date.now() + index
        return buildStoredStoryVersion(
          normalizedWord,
          story.full || story.story || story.ai_story || story.en || '',
          story.en || story.englishStory || '',
          story.cn || story.chineseStory || '',
          saveTime,
          story.id || `${normalizedWord}_${saveTime}_${index}`
        )
      })
      .filter(function (story) {
        return story && (story.full || story.en || story.cn)
      })

    const activeStoryId = stories.some(function (story) {
      return story.id === stored.activeStoryId
    })
      ? stored.activeStoryId
      : (stories[0] && stories[0].id) || ''

    return { activeStoryId, stories }
  }

  const full = stored.full || stored.story || stored.ai_story || stored.en || ''
  const en = stored.en || stored.englishStory || ''
  const cn = stored.cn || stored.chineseStory || ''
  const legacyStory = buildStoredStoryVersion(
    normalizedWord,
    full,
    en,
    cn,
    stored.saveTime || stored.createdAt || Date.now(),
    stored.id || buildLegacyStoryId(normalizedWord)
  )

  return {
    activeStoryId: legacyStory ? legacyStory.id : '',
    stories: legacyStory && (legacyStory.full || legacyStory.en || legacyStory.cn)
      ? [legacyStory]
      : []
  }
}

function appendStoredStoryVersion(cache, word, storyVersion) {
  const safeCache = Object.assign({}, cache || {})
  const normalizedWord = normalizeWord(word)
  const story = storyVersion && storyVersion.id
    ? storyVersion
    : null

  if (!normalizedWord || !story) {
    return safeCache
  }

  const bundle = normalizeStoredStoryBundle(safeCache[normalizedWord], normalizedWord)
  const stories = [story].concat(bundle.stories.filter(function (item) {
    return item.id !== story.id
  }))

  safeCache[normalizedWord] = {
    activeStoryId: story.id,
    stories
  }

  return safeCache
}

function buildReadableStoryText(story, maxLength = 180) {
  const normalized = String(story || '').replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return ''
  }

  return normalized.length > maxLength
    ? normalized.slice(0, maxLength)
    : normalized
}

function normalizeStoryText(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim()
}

function getTaggedSection(text, tag) {
  const pattern = new RegExp(`\\[${tag}\\]\\s*([\\s\\S]+?)\\s*\\[\\/${tag}\\]`, 'i')
  const match = normalizeStoryText(text).match(pattern)
  return match ? normalizeStoryText(match[1]) : ''
}

function stripStoryTags(text) {
  return normalizeStoryText(text)
    .replace(/\[\/?(ENGLISH|CHINESE)\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractRawStory(data) {
  const safeData = data || {}
  const nested = safeData.data || {}
  return normalizeStoryText(
    safeData.story ||
    safeData.ai_story ||
    safeData.aiStory ||
    safeData.content ||
    safeData.text ||
    nested.story ||
    nested.ai_story ||
    nested.aiStory ||
    nested.content ||
    nested.text ||
    ''
  )
}

function pickFirstText() {
  for (let index = 0; index < arguments.length; index += 1) {
    const value = normalizeStoryText(arguments[index])
    if (value) {
      return value
    }
  }
  return ''
}

function buildStoryDisplayText(englishStory, chineseStory, fallbackStory) {
  const english = normalizeStoryText(englishStory)
  const chinese = normalizeStoryText(chineseStory)

  if (english && chinese) {
    return `${english}\n\n中文翻译：\n${chinese}`
  }
  if (english) {
    return english
  }
  if (chinese) {
    return `中文翻译：\n${chinese}`
  }
  return stripStoryTags(fallbackStory)
}

function parseAIStoryPayload(data) {
  const safeData = data || {}
  const nested = safeData.data || {}
  const rawStory = extractRawStory(safeData)

  const englishStory = pickFirstText(
    safeData.en,
    safeData.english,
    safeData.english_story,
    nested.en,
    nested.english,
    nested.english_story,
    getTaggedSection(rawStory, 'ENGLISH')
  )
  const chineseStory = pickFirstText(
    safeData.cn,
    safeData.chinese,
    safeData.chinese_story,
    nested.cn,
    nested.chinese,
    nested.chinese_story,
    getTaggedSection(rawStory, 'CHINESE')
  )

  return {
    rawStory,
    englishStory: englishStory || (chineseStory ? '' : stripStoryTags(rawStory)),
    chineseStory,
    displayStory: buildStoryDisplayText(englishStory || (chineseStory ? '' : stripStoryTags(rawStory)), chineseStory, rawStory)
  }
}

function extractEnglishForAudio(storySource) {
  const source = storySource || {}
  const englishStory = typeof source === 'string'
    ? getTaggedSection(source, 'ENGLISH')
    : source.englishStory || getTaggedSection(source.aiStory || source.currentStory || '', 'ENGLISH')

  if (englishStory) {
    return normalizeStoryText(englishStory)
  }

  const fallback = typeof source === 'string'
    ? source
    : source.aiStory || source.currentStory || ''

  return normalizeStoryText(fallback)
    .split(/\n\s*中文翻译[:：]?\s*\n?/)[0]
    .replace(/\[CHINESE\][\s\S]*$/i, '')
    .replace(/中文翻译[:：]?[\s\S]*$/i, '')
    .replace(/[\u3400-\u9fff]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitReadableTTSChunks(text, maxLength = 70) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return []
  }

  const safeMaxLength = Math.max(8, maxLength || 70)
  const sentences = normalized.match(/[^.!?]+[.!?]?/g) || [normalized]
  const chunks = []

  sentences.forEach((sentence) => {
    const cleanSentence = sentence.trim()
    if (!cleanSentence) {
      return
    }

    if (cleanSentence.length <= safeMaxLength) {
      chunks.push(cleanSentence)
      return
    }

    let current = ''
    cleanSentence.split(' ').forEach((word) => {
      if (!word) {
        return
      }

      if (word.length > safeMaxLength) {
        if (current) {
          chunks.push(current)
          current = ''
        }
        for (let index = 0; index < word.length; index += safeMaxLength) {
          chunks.push(word.slice(index, index + safeMaxLength))
        }
        return
      }

      const candidate = current ? `${current} ${word}` : word
      if (candidate.length <= safeMaxLength) {
        current = candidate
        return
      }

      if (current) {
        chunks.push(current)
      }
      current = word
    })

    if (current) {
      chunks.push(current)
    }
  })

  return chunks
}

module.exports = {
  buildReadableStoryText,
  buildStoryAudioCacheEntry,
  buildStoryAudioCacheKey,
  buildStoredStoryVersion,
  buildStoryDisplayText,
  extractEnglishForAudio,
  appendStoredStoryVersion,
  findStoryAudioCacheEntry,
  findStoredRecord,
  findWordIndex,
  findStoredStory,
  normalizeStoredStoryBundle,
  parseAIStoryPayload,
  splitReadableTTSChunks
}
