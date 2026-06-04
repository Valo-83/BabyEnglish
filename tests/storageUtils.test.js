const assert = require('assert')

const {
  buildStorageAssets,
  buildStorageStats,
  buildMyStoryAssets,
  buildTodayReviewAssets,
  formatRelativeTime
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
    status: 'reviewing',
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
assert.strictEqual(assets[0].status, 'new')
assert.strictEqual(assets[0].masteredAt, null)
assert.strictEqual(assets[1].word, 'dog')
assert.strictEqual(assets[1].reviewCount, 3)
assert.strictEqual(assets[1].listenCount, 2)
assert.strictEqual(assets[1].cacheHitCount, 1)
assert.strictEqual(assets[1].favorite, true)
assert.strictEqual(assets[1].status, 'reviewing')
assert.ok(assets[1].summary.includes('A dog runs'))

const stats = buildStorageStats(assets)

assert.strictEqual(stats.totalStories, 2)
assert.strictEqual(stats.totalReviews, 3)
assert.strictEqual(stats.totalCacheHits, 1)
assert.strictEqual(stats.savedValueCount, 1)
assert.strictEqual(stats.favoriteCount, 1)
assert.strictEqual(stats.masteredCount, 0)
assert.strictEqual(stats.reviewingCount, 1)
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

// --- buildTodayReviewAssets tests ---

const reviewAssets = [
  { word: 'dog', emoji: '🐶', chinese: '狗', category: 'animals', reviewCount: 0, lastReviewedAt: 0, status: 'new' },
  { word: 'cat', emoji: '🐱', chinese: '猫', category: 'animals', reviewCount: 2, lastReviewedAt: Date.now(), status: 'reviewing' },
  { word: 'bird', emoji: '🐦', chinese: '鸟', category: 'animals', reviewCount: 1, lastReviewedAt: Date.now() - 86400000, status: 'reviewing' },
  { word: 'fish', emoji: '🐟', chinese: '鱼', category: 'animals', reviewCount: 5, lastReviewedAt: Date.now(), status: 'mastered' },
  { word: 'apple', emoji: '🍎', chinese: '苹果', category: 'fruits', reviewCount: 0, lastReviewedAt: 0, status: 'new' }
]

const todayReview = buildTodayReviewAssets(reviewAssets, 3)
assert.strictEqual(todayReview.length, 3)
// 已熟悉的 fish 不应该出现
assert.ok(!todayReview.some(function (r) { return r.word === 'fish' }))
// 前两个应该是 reviewCount 最低的
assert.strictEqual(todayReview[0].reviewCount, 0)
assert.strictEqual(todayReview[1].reviewCount, 0)
assert.strictEqual(todayReview[2].reviewCount, 1)
// todayReview 包含 relativeTime
assert.ok(todayReview[0].relativeTime)

// 空数组
const emptyReview = buildTodayReviewAssets([], 3)
assert.strictEqual(emptyReview.length, 0)

// 全部已熟悉
const allMastered = buildTodayReviewAssets([
  { word: 'dog', reviewCount: 1, lastReviewedAt: 0, status: 'mastered' }
], 3)
assert.strictEqual(allMastered.length, 0)

// --- formatRelativeTime tests ---

const now = Date.now()
const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()

assert.strictEqual(formatRelativeTime(now), '今天')
assert.strictEqual(formatRelativeTime(todayStart), '今天')
assert.strictEqual(formatRelativeTime(todayStart - 1000), '昨天')
assert.strictEqual(formatRelativeTime(todayStart - 86400000 * 2), '2 天前')
assert.strictEqual(formatRelativeTime(0), '更早')
assert.strictEqual(formatRelativeTime(null), '更早')

// --- generatedCount ---
const genAssets = buildStorageAssets(
  { Dog: { full: 'test', saveTime: 1717200000000 } },
  { Dog: { generatedCount: 5 } },
  catalog
)
assert.strictEqual(genAssets[0].generatedCount, 5)

const versionedStories = {
  dog: {
    activeStoryId: 'dog_2',
    stories: [
      { id: 'dog_2', full: 'Second dog story.', en: 'Second dog.', cn: '第二个故事', saveTime: 1717200002000 },
      { id: 'dog_1', full: 'First dog story.', en: 'First dog.', cn: '第一个故事', saveTime: 1717200001000 }
    ]
  }
}
const versionedAssets = buildStorageAssets(versionedStories, {}, catalog)
assert.strictEqual(versionedAssets[0].storyCount, 2)
assert.strictEqual(versionedAssets[0].full, 'Second dog story.')
assert.strictEqual(buildStorageStats(versionedAssets).totalStories, 2)

const myStories = buildMyStoryAssets(
  versionedStories,
  { dog_2: { filePath: 'wxfile://dog-2.mp3', saveTime: 1717200003000 } },
  catalog
)
assert.strictEqual(myStories.length, 2)
assert.strictEqual(myStories[0].id, 'dog_2')
assert.strictEqual(myStories[0].hasAudio, true)
assert.strictEqual(myStories[0].audioFilePath, 'wxfile://dog-2.mp3')
assert.strictEqual(myStories[1].hasAudio, false)
assert.strictEqual(myStories[1].displayStory.includes('First dog.'), true)

console.log('storageUtils tests passed')
