import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { MemoryGuardianStore, detectSensitiveContent, tokenize } from '../src/store.js'

async function fixture(options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-memory-guardian-'))
  const storagePath = join(directory, 'store.json')
  const store = await new MemoryGuardianStore({ storagePath, ...options }).init()
  return { directory, storagePath, store, dispose: () => rm(directory, { recursive: true, force: true }) }
}

test('tokenizer supports English words and CJK bigrams', () => {
  const tokens = tokenize('React 项目偏好')
  assert.ok(tokens.includes('react'))
  assert.ok(tokens.includes('项目'))
  assert.ok(tokens.includes('偏好'))
})

test('secret detector blocks credentials and marks personal data for review', () => {
  assert.deepEqual(detectSensitiveContent('password: hunter2').blocked, ['password'])
  assert.deepEqual(detectSensitiveContent('联系 me@example.com').review, ['email'])
})

test('blocked secrets never persist raw content', async t => {
  const fx = await fixture()
  t.after(fx.dispose)
  const result = await fx.store.remember({ content: 'password: hunter2' })
  assert.equal(result.outcome, 'blocked')
  const disk = await readFile(fx.storagePath, 'utf8')
  assert.doesNotMatch(disk, /hunter2/)
  assert.equal(fx.store.snapshot().metrics.blockedAttempts, 1)
})

test('personal data is quarantined and excluded from search until approved', async t => {
  const fx = await fixture()
  t.after(fx.dispose)
  const saved = await fx.store.remember({ content: '联系邮箱是 me@example.com', category: 'fact' })
  assert.equal(saved.outcome, 'quarantined')
  assert.equal((await fx.store.search({ query: '联系邮箱' })).items.length, 0)
  await fx.store.approve(saved.id)
  assert.equal((await fx.store.search({ query: '联系邮箱' })).items.length, 1)
})

test('equivalent memories deduplicate within the same scope', async t => {
  const fx = await fixture()
  t.after(fx.dispose)
  const first = await fx.store.remember({ content: '我偏好使用 VS Code', scope: { kind: 'global', key: '*' }, importance: 2 })
  const second = await fx.store.remember({ content: '  我偏好使用   VS Code  ', scope: { kind: 'global', key: '*' }, importance: 5 })
  assert.equal(second.outcome, 'duplicate')
  assert.equal(second.id, first.id)
  assert.equal(fx.store.snapshot().metrics.total, 1)
  assert.equal(fx.store.snapshot().memories[0].importance, 5)
})

test('same semantic key with a different value creates a reviewable conflict', async t => {
  const fx = await fixture()
  t.after(fx.dispose)
  const oldMemory = await fx.store.remember({ content: '默认编辑器是 VS Code', key: 'preference.editor' })
  const nextMemory = await fx.store.remember({ content: '默认编辑器改成 Zed', key: 'preference.editor' })
  assert.equal(oldMemory.outcome, 'created')
  assert.equal(nextMemory.outcome, 'conflict')
  assert.deepEqual(nextMemory.conflictsWith, [oldMemory.id])
  assert.equal(fx.store.snapshot().metrics.conflicts, 1)
})

test('search ranks relevant memories and enforces item and character budgets', async t => {
  const fx = await fixture({ maxRecallItems: 2, maxRecallChars: 256 })
  t.after(fx.dispose)
  await fx.store.remember({ content: '项目使用 React 和 TypeScript 构建前端', category: 'project', importance: 5, scope: { kind: 'project', key: '/projects/alpha' } })
  await fx.store.remember({ content: '项目测试框架使用 Node test runner', category: 'project', importance: 3, scope: { kind: 'project', key: '/projects/alpha' } })
  await fx.store.remember({ content: '另一个项目使用 Vue', category: 'project', scope: { kind: 'project', key: '/projects/beta' } })
  const result = await fx.store.search({ query: 'React TypeScript 前端项目', scope: { kind: 'project', key: '/projects/alpha' }, limit: 10, budgetChars: 999 })
  assert.equal(result.items[0].content, '项目使用 React 和 TypeScript 构建前端')
  assert.ok(result.items.length <= 2)
  assert.ok(result.usedChars <= 256)
  assert.ok(result.items.every(item => item.scope.key === '/projects/alpha'))
})

test('archive excludes memory from recall and restore makes it active again', async t => {
  const fx = await fixture()
  t.after(fx.dispose)
  const saved = await fx.store.remember({ content: '发布前必须运行 npm test', category: 'instruction' })
  await fx.store.archive(saved.id)
  assert.equal((await fx.store.search({ query: '发布 npm test' })).items.length, 0)
  await fx.store.restore(saved.id)
  assert.equal((await fx.store.search({ query: '发布 npm test' })).items.length, 1)
})

test('records survive a store reload', async t => {
  const fx = await fixture()
  t.after(fx.dispose)
  await fx.store.remember({ content: '跨会话持久化测试', category: 'fact' })
  const reloaded = await new MemoryGuardianStore({ storagePath: fx.storagePath }).init()
  assert.equal(reloaded.snapshot().memories[0].content, '跨会话持久化测试')
})
