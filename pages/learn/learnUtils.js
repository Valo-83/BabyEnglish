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
  return safeStories[targetWord] || null
}

function findStoredRecord(records, targetWord) {
  const safeRecords = records || {}
  return safeRecords[targetWord] || null
}

function buildStoryAudioCacheKey(word) {
  return normalizeWord(word)
}

function buildStoryAudioCacheEntry(word, filePath, saveTime) {
  const normalizedPath = String(filePath || '').trim()
  if (!buildStoryAudioCacheKey(word) || !normalizedPath) {
    return null
  }

  return {
    filePath: normalizedPath,
    saveTime: saveTime || Date.now()
  }
}

function findStoryAudioCacheEntry(cache, word) {
  const safeCache = cache || {}
  const key = buildStoryAudioCacheKey(word)
  const entry = key ? safeCache[key] : null
  if (!entry || !entry.filePath) {
    return null
  }

  return entry
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
  buildStoryDisplayText,
  extractEnglishForAudio,
  findStoryAudioCacheEntry,
  findStoredRecord,
  findWordIndex,
  findStoredStory,
  parseAIStoryPayload,
  splitReadableTTSChunks
}
