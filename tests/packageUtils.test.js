const assert = require('assert')

const {
  buildLearningPackage,
  mergeLearningPackage,
  parseLearningPackageText,
  previewLearningPackage
} = require('../pages/words/packageUtils')

const stories = {
  dog: {
    activeStoryId: 'dog_2',
    stories: [
      {
        id: 'dog_2',
        word: 'dog',
        full: 'Dog story two.',
        en: 'Dog story two.',
        cn: '小狗故事二。',
        saveTime: 1717200002000
      },
      {
        id: 'dog_1',
        word: 'dog',
        full: 'Dog story one.',
        en: 'Dog story one.',
        cn: '小狗故事一。',
        saveTime: 1717200001000
      }
    ]
  }
}

const records = {
  dog: {
    reviewCount: 2,
    listenCount: 3,
    cacheHitCount: 4,
    status: 'reviewing',
    lastReviewedAt: 1717200003000
  }
}

const audioCache = {
  dog_2: {
    filePath: 'wxfile://dog-2.mp3',
    saveTime: 1717200004000,
    storyId: 'dog_2',
    word: 'dog'
  }
}

const audioFiles = [
  {
    audioKey: 'dog_2',
    storyId: 'dog_2',
    word: 'dog',
    fileName: 'dog_2.mp3',
    mimeType: 'audio/mpeg',
    encoding: 'base64',
    data: 'ZmFrZS1tcDM='
  }
]

const learningPackage = buildLearningPackage({
  stories,
  records,
  audioCache,
  audioFiles,
  exportedAt: 1717200005000
})

assert.strictEqual(learningPackage.packageName, '儿童英语学习存储包')
assert.strictEqual(learningPackage.packageVersion, 1)
assert.strictEqual(learningPackage.exportedAt, 1717200005000)
assert.strictEqual(learningPackage.stats.wordCount, 1)
assert.strictEqual(learningPackage.stats.storyCount, 2)
assert.strictEqual(learningPackage.stats.audioCount, 1)
assert.strictEqual(learningPackage.stats.recordCount, 1)
assert.strictEqual(learningPackage.audioManifest[0].audioKey, 'dog_2')
assert.strictEqual(learningPackage.audioFiles[0].data, 'ZmFrZS1tcDM=')

const parsed = parseLearningPackageText(JSON.stringify(learningPackage))
assert.strictEqual(parsed.packageName, '儿童英语学习存储包')

const merged = mergeLearningPackage({
  stories: {
    dog: {
      activeStoryId: 'dog_old',
      stories: [
        {
          id: 'dog_old',
          word: 'dog',
          full: 'Existing dog story.',
          en: 'Existing dog story.',
          cn: '已有小狗故事。',
          saveTime: 1717190000000
        }
      ]
    },
    cat: {
      activeStoryId: 'cat_1',
      stories: [
        {
          id: 'cat_1',
          word: 'cat',
          full: 'Cat story.',
          en: 'Cat story.',
          cn: '小猫故事。',
          saveTime: 1717180000000
        }
      ]
    }
  },
  records: {
    dog: {
      reviewCount: 1,
      listenCount: 8,
      cacheHitCount: 1,
      status: 'new',
      lastReviewedAt: 1717100000000
    }
  },
  audioCache: {},
  learningPackage
})

assert.strictEqual(merged.stories.dog.stories.length, 3)
assert.strictEqual(merged.stories.dog.activeStoryId, 'dog_old')
assert.strictEqual(merged.stories.cat.stories.length, 1)
assert.strictEqual(merged.records.dog.reviewCount, 2)
assert.strictEqual(merged.records.dog.listenCount, 8)
assert.strictEqual(merged.records.dog.cacheHitCount, 4)
assert.strictEqual(merged.records.dog.status, 'reviewing')
assert.strictEqual(merged.records.dog.lastReviewedAt, 1717200003000)
assert.strictEqual(merged.audioCache.dog_2.filePath, 'wxfile://dog-2.mp3')

assert.throws(() => parseLearningPackageText('{}'), /学习资料包/)
assert.throws(() => parseLearningPackageText('not-json'), /无法解析/)

// 1. 导出资料包包含 readableSummary
assert.ok(learningPackage.readableSummary, '导出包应包含 readableSummary')
assert.strictEqual(learningPackage.readableSummary.title, '儿童英语学习资料包')
assert.strictEqual(learningPackage.readableSummary.description, '包含 AI 故事、故事音频和学习记录')
assert.strictEqual(learningPackage.readableSummary.storyText, '2 篇 AI 故事')
assert.strictEqual(learningPackage.readableSummary.audioText, '1 段故事音频')
assert.strictEqual(learningPackage.readableSummary.recordText, '1 条学习记录')

// 2. 导入预览能读取统计信息
const preview = previewLearningPackage(learningPackage)
assert.strictEqual(preview.title, '儿童英语学习资料包')
assert.strictEqual(preview.storyText, '2 篇 AI 故事')
assert.strictEqual(preview.audioText, '1 段故事音频')
assert.strictEqual(preview.recordText, '1 条学习记录')
assert.strictEqual(preview.wordCount, 1)
assert.strictEqual(preview.storyCount, 2)
assert.strictEqual(preview.audioCount, 1)
assert.strictEqual(preview.recordCount, 1)
assert.strictEqual(preview.words.length, 1)
assert.strictEqual(preview.words[0], 'dog')

// 3. 非资料包 JSON 会被拒绝
assert.throws(() => parseLearningPackageText('{"foo":"bar"}'), /学习资料包/)
assert.throws(() => parseLearningPackageText('{"packageType":"other"}'), /学习资料包/)

// 4. 导入时不会覆盖已有故事，只合并新内容
// 验证 merge 后已有故事保留
assert.strictEqual(merged.stories.dog.stories.length, 3,
  '合并后 dog 应有 3 篇故事（已有 1 篇 + 导入 2 篇，不覆盖）')
// 验证已有故事仍在
const existingStory = merged.stories.dog.stories.find(s => s.id === 'dog_old')
assert.ok(existingStory, '已有故事 dog_old 不应被覆盖')
assert.strictEqual(existingStory.full, 'Existing dog story.')
// 验证导入的新故事也已合并
const importedStory = merged.stories.dog.stories.find(s => s.id === 'dog_2')
assert.ok(importedStory, '导入的故事 dog_2 应已合并')
assert.strictEqual(importedStory.full, 'Dog story two.')
// cat 的已有故事不应受影响
assert.strictEqual(merged.stories.cat.stories.length, 1)
// 已有记录的值（更大的）应保留
assert.strictEqual(merged.records.dog.listenCount, 8, '已有记录的 listenCount 8 应保留（比导入的 3 大）')
assert.strictEqual(merged.records.dog.cacheHitCount, 4, '已有记录的 cacheHitCount 4 应保留（比导入的 1 大）')

console.log('packageUtils tests passed')
