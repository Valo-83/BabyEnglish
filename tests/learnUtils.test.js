const assert = require('assert')

const {
  buildReadableStoryText,
  findStoredRecord,
  findStoredStory,
  findWordIndex,
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

assert.deepStrictEqual(
  splitReadableTTSChunks(
    'This is a dog. The dog is big. It has a red ball. Let us play!',
    24
  ),
  ['This is a dog.', 'The dog is big.', 'It has a red ball.', 'Let us play!']
)
assert.deepStrictEqual(splitReadableTTSChunks('dog', 24), ['dog'])
assert(splitReadableTTSChunks('abcdefghijklmnopqrstuvwxyz', 8).every((chunk) => chunk.length <= 8))

console.log('learnUtils tests passed')
