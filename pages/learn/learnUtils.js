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

function buildReadableStoryText(story, maxLength = 180) {
  const normalized = String(story || '').replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return ''
  }

  return normalized.length > maxLength
    ? normalized.slice(0, maxLength)
    : normalized
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
  findStoredRecord,
  findWordIndex,
  findStoredStory,
  splitReadableTTSChunks
}
