function normalizeWordKey(word) {
  return String(word || '').trim().toLowerCase()
}

function buildStudyRecord(current, action, timestamp) {
  const safeCurrent = current || {}
  const safeAction = action || {}
  const now = timestamp || Date.now()

  let status = safeCurrent.status || 'new'
  if (safeAction.review && status === 'new') {
    status = 'reviewing'
  }

  return {
    reviewCount: (safeCurrent.reviewCount || 0) + (safeAction.review || 0),
    listenCount: (safeCurrent.listenCount || 0) + (safeAction.listen || 0),
    cacheHitCount: (safeCurrent.cacheHitCount || 0) + (safeAction.cacheHit || 0),
    generatedCount: (safeCurrent.generatedCount || 0) + (safeAction.generated || 0),
    favorite: !!safeCurrent.favorite,
    status,
    lastReviewedAt: now,
    masteredAt: safeCurrent.masteredAt || null
  }
}

function updateStudyRecord(records, word, action, timestamp) {
  const normalizedWord = normalizeWordKey(word)
  if (!normalizedWord) {
    return null
  }

  const safeRecords = records || {}
  const current = safeRecords[normalizedWord] || {}
  safeRecords[normalizedWord] = buildStudyRecord(current, action, timestamp)
  return safeRecords[normalizedWord]
}

function markStudyRecordMastered(records, word, timestamp) {
  const normalizedWord = normalizeWordKey(word)
  if (!normalizedWord) {
    return null
  }

  const safeRecords = records || {}
  const existing = safeRecords[normalizedWord]
  if (!existing) {
    return null
  }

  safeRecords[normalizedWord] = Object.assign({}, existing, {
    status: 'mastered',
    masteredAt: timestamp || Date.now()
  })
  return safeRecords[normalizedWord]
}

module.exports = {
  buildStudyRecord,
  markStudyRecordMastered,
  normalizeWordKey,
  updateStudyRecord
}
