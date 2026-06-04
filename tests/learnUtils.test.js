const assert = require('assert')

const {
  buildReadableStoryText,
  buildStoryAudioCacheEntry,
  buildStoryAudioCacheKey,
  buildStoredStoryVersion,
  extractEnglishForAudio,
  appendStoredStoryVersion,
  findStoryAudioCacheEntry,
  findStoredRecord,
  findStoredStory,
  findWordIndex,
  normalizeStoredStoryBundle,
  parseAIStoryPayload,
  splitReadableTTSChunks
} = require('../pages/learn/learnUtils')

const words = [
  { english: 'dog' },
  { english: 'monkey' },
  { english: 'panda' }
]

assert.strictEqual(findWordIndex(words, 'Monkey'), 1)
assert.strictEqual(findWordIndex(words, ' panda '), 2)
assert.strictEqual(findWordIndex(words, 'missing'), 0)
assert.strictEqual(findWordIndex(words, ''), 0)

const exactStoredStory = findStoredStory(
  {
    dog: { full: 'new lowercase dog story' }
  },
  'dog'
)

assert.strictEqual(exactStoredStory.full, 'new lowercase dog story')
assert.strictEqual(
  findStoredStory(
    {
      Dog: { full: 'old uppercase dog story' }
    },
    'dog'
  ),
  null
)
assert.strictEqual(findStoredStory({}, 'dog'), null)

const exactStoredRecord = findStoredRecord(
  {
    dog: { reviewCount: 2 }
  },
  'dog'
)

assert.strictEqual(exactStoredRecord.reviewCount, 2)
assert.strictEqual(
  findStoredRecord(
    {
      Dog: { reviewCount: 2 }
    },
    'dog'
  ),
  null
)

assert.strictEqual(buildReadableStoryText('  hello\nworld  '), 'hello world')
assert.strictEqual(buildReadableStoryText('', 10), '')
assert.strictEqual(buildReadableStoryText('abcdefghijklmnop', 5), 'abcde')

const taggedStory = parseAIStoryPayload({
  ai_story: '[ENGLISH]\nA dog sees a red ball. The dog runs.\n[/ENGLISH]\n[CHINESE]\n一只小狗看见一个红球。小狗跑起来。\n[/CHINESE]'
})
assert.strictEqual(taggedStory.englishStory, 'A dog sees a red ball. The dog runs.')
assert.strictEqual(taggedStory.chineseStory, '一只小狗看见一个红球。小狗跑起来。')
assert.strictEqual(
  taggedStory.displayStory,
  'A dog sees a red ball. The dog runs.\n\n中文翻译：\n一只小狗看见一个红球。小狗跑起来。'
)

const fieldStory = parseAIStoryPayload({
  en: 'The cat is black.',
  cn: '这只猫是黑色的。'
})
assert.strictEqual(fieldStory.displayStory, 'The cat is black.\n\n中文翻译：\n这只猫是黑色的。')

assert.strictEqual(
  extractEnglishForAudio({
    englishStory: 'The cat is black.',
    aiStory: 'The cat is black.\n\n中文翻译：\n这只猫是黑色的。'
  }),
  'The cat is black.'
)
assert.strictEqual(
  extractEnglishForAudio('The dog runs.\n\n中文翻译：\n小狗跑起来。'),
  'The dog runs.'
)

assert.deepStrictEqual(
  splitReadableTTSChunks(
    'This is a dog. The dog is big. It has a red ball. Let us play!',
    24
  ),
  ['This is a dog.', 'The dog is big.', 'It has a red ball.', 'Let us play!']
)
assert.deepStrictEqual(splitReadableTTSChunks('dog', 24), ['dog'])
assert(splitReadableTTSChunks('abcdefghijklmnopqrstuvwxyz', 8).every((chunk) => chunk.length <= 8))

assert.strictEqual(buildStoryAudioCacheKey(' Dog '), 'dog')
assert.strictEqual(buildStoryAudioCacheKey('sky blue'), 'sky blue')
assert.strictEqual(buildStoryAudioCacheKey('dog', 'dog_2000'), 'dog_2000')
assert.deepStrictEqual(
  buildStoryAudioCacheEntry('Dog', 'wxfile://saved-dog.mp3', 1717200000000, 'dog_2000'),
  {
    filePath: 'wxfile://saved-dog.mp3',
    saveTime: 1717200000000,
    storyId: 'dog_2000',
    word: 'dog'
  }
)
assert.strictEqual(
  findStoryAudioCacheEntry(
    {
      dog: { filePath: 'wxfile://saved-dog.mp3', saveTime: 1717200000000 }
    },
    'Dog'
  ).filePath,
  'wxfile://saved-dog.mp3'
)
assert.strictEqual(
  findStoryAudioCacheEntry(
    {
      dog_2000: { filePath: 'wxfile://saved-dog-2.mp3', saveTime: 1717200000001 }
    },
    'Dog',
    'dog_2000'
  ).filePath,
  'wxfile://saved-dog-2.mp3'
)
assert.strictEqual(
  findStoryAudioCacheEntry(
    {
      dog: { filePath: 'wxfile://saved-dog.mp3', saveTime: 1717200000000 }
    },
    'Dog',
    'dog_2000'
  ),
  null
)
assert.strictEqual(
  findStoryAudioCacheEntry(
    {
      dog: { saveTime: 1717200000000 }
    },
    'dog'
  ),
  null
)

const legacyBundle = normalizeStoredStoryBundle(
  { full: 'Old dog story.', en: 'Old dog.', cn: '旧故事', saveTime: 1717200000000 },
  'dog'
)
assert.strictEqual(legacyBundle.activeStoryId, 'dog_legacy')
assert.strictEqual(legacyBundle.stories.length, 1)
assert.strictEqual(legacyBundle.stories[0].full, 'Old dog story.')

const newVersion = buildStoredStoryVersion(
  'dog',
  'New dog story.',
  'New dog.',
  '新故事',
  1717200001000,
  'dog_1717200001000'
)
const versionedCache = appendStoredStoryVersion({ dog: legacyBundle }, 'dog', newVersion)
assert.strictEqual(versionedCache.dog.activeStoryId, 'dog_1717200001000')
assert.strictEqual(versionedCache.dog.stories.length, 2)
assert.strictEqual(findStoredStory(versionedCache, 'dog').full, 'New dog story.')
assert.strictEqual(versionedCache.dog.stories[1].id, 'dog_legacy')

console.log('learnUtils tests passed')
