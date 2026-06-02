const assert = require('assert')

const {
  buildStorageAssets,
  buildStorageStats
} = require('../pages/words/storageUtils')
const wordCatalog = require('../pages/words/wordCatalog')

const stories = {
  Dog: {
    full: 'A dog runs in the park. The dog is happy.',
    saveTime: 1717200000000
  },
  Apple: {
    full: 'An apple is red. I like apples.',
    saveTime: 1717286400000
  }
}

const records = {
  Dog: {
    reviewCount: 3,
    listenCount: 2,
    cacheHitCount: 1,
    favorite: true,
    lastReviewedAt: 1717290000000
  }
}

const catalog = [
  { english: 'dog', chinese: '狗', emoji: '🐶', category: 'animals' },
  { english: 'apple', chinese: '苹果', emoji: '🍎', category: 'fruits' }
]

const assets = buildStorageAssets(stories, records, catalog)

assert.strictEqual(assets.length, 2)
assert.strictEqual(assets[0].word, 'apple')
assert.strictEqual(assets[0].chinese, '苹果')
assert.strictEqual(assets[0].reviewCount, 0)
assert.strictEqual(assets[1].word, 'dog')
assert.strictEqual(assets[1].reviewCount, 3)
assert.strictEqual(assets[1].listenCount, 2)
assert.strictEqual(assets[1].cacheHitCount, 1)
assert.strictEqual(assets[1].favorite, true)
assert.ok(assets[1].summary.includes('A dog runs'))

const stats = buildStorageStats(assets)

assert.strictEqual(stats.totalStories, 2)
assert.strictEqual(stats.totalReviews, 3)
assert.strictEqual(stats.totalCacheHits, 1)
assert.strictEqual(stats.favoriteCount, 1)
assert.strictEqual(stats.latestSavedWord, 'apple')

const lowercaseAssets = buildStorageAssets(
  {
    dog: {
      full: 'A lowercase dog story.',
      saveTime: 1717200000000
    }
  },
  {},
  catalog
)

assert.strictEqual(lowercaseAssets[0].word, 'dog')
assert.strictEqual(lowercaseAssets[0].emoji, '🐶')
assert.strictEqual(lowercaseAssets[0].chinese, '狗')
assert.strictEqual(lowercaseAssets[0].category, 'animals')

const expandedAnimalAssets = buildStorageAssets(
  {
    Monkey: { full: 'Monkey sees a banana.', saveTime: 1717200000000 },
    Elephant: { full: 'Elephant is big.', saveTime: 1717200000001 },
    Lion: { full: 'Lion says roar.', saveTime: 1717200000002 },
    Panda: { full: 'Panda eats bamboo.', saveTime: 1717200000003 }
  },
  {},
  wordCatalog
)

const emojiByWord = expandedAnimalAssets.reduce((map, item) => {
  map[item.word] = item.emoji
  return map
}, {})

assert.strictEqual(emojiByWord.monkey, '🐵')
assert.strictEqual(emojiByWord.elephant, '🐘')
assert.strictEqual(emojiByWord.lion, '🦁')
assert.strictEqual(emojiByWord.panda, '🐼')

assert.ok(wordCatalog.every((item) => item.english === item.english.toLowerCase()))

console.log('storageUtils tests passed')
