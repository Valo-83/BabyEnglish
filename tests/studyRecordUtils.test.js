const assert = require('assert')

const {
  buildStudyRecord,
  markStudyRecordMastered,
  normalizeWordKey,
  updateStudyRecord
} = require('../pages/shared/studyRecordUtils')

assert.strictEqual(normalizeWordKey(' Dog '), 'dog')
assert.strictEqual(normalizeWordKey(''), '')

const generated = buildStudyRecord({}, { generated: 1 }, 100)
assert.strictEqual(generated.generatedCount, 1)
assert.strictEqual(generated.reviewCount, 0)
assert.strictEqual(generated.status, 'new')
assert.strictEqual(generated.lastReviewedAt, 100)

const reviewed = buildStudyRecord(generated, { review: 1, cacheHit: 1 }, 200)
assert.strictEqual(reviewed.reviewCount, 1)
assert.strictEqual(reviewed.cacheHitCount, 1)
assert.strictEqual(reviewed.generatedCount, 1)
assert.strictEqual(reviewed.status, 'reviewing')
assert.strictEqual(reviewed.lastReviewedAt, 200)

const masteredReview = buildStudyRecord(
  { status: 'mastered', masteredAt: 300, reviewCount: 1 },
  { review: 1 },
  400
)
assert.strictEqual(masteredReview.status, 'mastered')
assert.strictEqual(masteredReview.masteredAt, 300)
assert.strictEqual(masteredReview.reviewCount, 2)

const records = {}
const updated = updateStudyRecord(records, 'Dog', { listen: 1 }, 500)
assert.strictEqual(updated.listenCount, 1)
assert.strictEqual(records.dog.listenCount, 1)

assert.strictEqual(markStudyRecordMastered({}, 'dog', 600), null)
const mastered = markStudyRecordMastered(records, 'dog', 600)
assert.strictEqual(mastered.status, 'mastered')
assert.strictEqual(mastered.masteredAt, 600)

console.log('studyRecordUtils tests passed')
