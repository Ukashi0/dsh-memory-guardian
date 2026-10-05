import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { MemoryGuardianStore, normalizeProjectKey } from '../src/store.js'

async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'memory-regression-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const storagePath = join(directory, 'store.json')
  const store = await new MemoryGuardianStore({ storagePath, ...options }).init()
  const record = id => store.snapshot().memories.find(item => item.id === id)
  return { directory, storagePath, store, record }
}

async function conflict(store, key = 'project.package-manager') {
  const old = await store.remember({ content: '使用 pnpm', key })
  const next = await store.remember({ content: '使用 npm', key })
  return { old, next }
}

test('importance, pin and recency cannot admit unrelated or punctuation-only queries', async t => {
  const { store } = await fixture(t)
  await store.remember({ content: '项目统一使用 pnpm 管理依赖', importance: 5, pinned: true })
  for (const query of ['火山喷发', 'volcano eruption', '！！！']) {
    const result = await store.search({ query })
    assert.equal(result.items.length, 0, query)
    assert.equal(result.totalCandidates, 0)
  }
  assert.equal((await store.search({ query: 'pnpm' })).items.length, 1)
  await store.remember({ content: '锅巴很好吃', importance: 5 })
  assert.equal((await store.search({ query: '锅炉' })).items.length, 0, 'one shared Chinese character is insufficient')
})

test('body budget is actually hit, independent of the item limit', async t => {
  const { store } = await fixture(t, { maxRecallChars: 256 })
  await store.remember({ content: 'alpha ' + 'x'.repeat(84) })
  await store.remember({ content: 'alpha ' + 'y'.repeat(84) })
  const result = await store.search({ query: 'alpha', budgetChars: 128 })
  assert.equal(result.items.length, 1)
  assert.equal(result.usedChars, 90)
  assert.equal(result.budgetChars, 128)
})

test('conflict requires a reviewed choice; replacement survives reload and restore rechecks', async t => {
  const { store, record, storagePath } = await fixture(t)
  const { old, next } = await conflict(store)
  const expectedToken = record(next.id).reviewToken
  await assert.rejects(store.approve(next.id), { code: 'review-required' })
  await assert.rejects(store.approve(next.id, { expectedToken }), { code: 'review-required' })
  await store.approve(next.id, { expectedToken, resolution: 'replace' })
  assert.equal(record(old.id).status, 'archived')
  assert.equal(record(next.id).status, 'active')
  const reloaded = await new MemoryGuardianStore({ storagePath }).init()
  assert.equal(reloaded.snapshot().memories.find(item => item.id === old.id).status, 'archived')
  assert.deepEqual((await reloaded.search({ query: '使用' })).items.map(item => item.id), [next.id])
  const restored = await store.restore(old.id)
  assert.equal(restored.status, 'quarantined')
  assert.deepEqual(restored.conflictsWith, [next.id])
  assert.deepEqual((await store.search({ query: '使用' })).items.map(item => item.id), [next.id])
})

test('approved alternatives travel together and cannot be silently split by budget', async t => {
  const { store, record } = await fixture(t)
  const old = await store.remember({ content: 'pnpm ' + 'x'.repeat(65), key: 'manager' })
  const next = await store.remember({ content: 'npm ' + 'y'.repeat(66), key: 'manager' })
  await store.approve(next.id, { resolution: 'coexist', expectedToken: record(next.id).reviewToken })
  assert.deepEqual(record(old.id).coexistsWith, [next.id])
  assert.deepEqual(record(next.id).coexistsWith, [old.id])
  const result = await store.search({ query: 'pnpm' })
  assert.deepEqual(new Set(result.items.map(item => item.id)), new Set([old.id, next.id]))
  assert.equal(result.items.find(item => item.id === next.id).includedAsAlternative, true)
  assert.equal(result.coexistenceGroups[0].approved, true)
  for (const budget of [{ limit: 1 }, { budgetChars: 128 }]) {
    const limited = await store.search({ query: 'pnpm', ...budget })
    assert.equal(limited.items.length, 0)
    assert.equal(limited.warnings[0].code, 'coexistence-budget')
  }
  await store.update(old.id, { pinned: true })
  assert.deepEqual(record(old.id).coexistsWith, [next.id], 'metadata edits preserve coexistence')
  await store.update(old.id, { content: 'bun is preferred' })
  assert.equal(record(old.id).status, 'quarantined')
  assert.deepEqual(record(next.id).coexistsWith, [])
})

test('replacement archives every current alternative; rejection leaves the old record intact', async t => {
  const { store, record } = await fixture(t)
  const { old, next } = await conflict(store)
  await store.approve(next.id, { resolution: 'coexist', expectedToken: record(next.id).reviewToken })
  const third = await store.remember({ content: '使用 bun', key: 'project.package-manager' })
  assert.equal(record(third.id).conflictsWith.length, 2)
  await store.approve(third.id, { resolution: 'replace', expectedToken: record(third.id).reviewToken })
  assert.equal(record(old.id).status, 'archived')
  assert.equal(record(next.id).status, 'archived')
  const rejected = await store.remember({ content: '使用 yarn', key: 'project.package-manager' })
  await store.reject(rejected.id)
  assert.equal(record(rejected.id).status, 'archived')
  assert.deepEqual((await store.search({ query: '使用' })).items.map(item => item.id), [third.id])
})

test('changed review data rejects stale approval, but searches do not invalidate it', async t => {
  const { store, record, storagePath } = await fixture(t)
  const { old, next } = await conflict(store)
  const staleToken = record(next.id).reviewToken
  await store.update(old.id, { content: '使用 yarn' })
  const before = await readFile(storagePath, 'utf8')
  await assert.rejects(store.approve(next.id, { resolution: 'replace', expectedToken: staleToken }), { code: 'review-stale' })
  assert.equal(await readFile(storagePath, 'utf8'), before)
  const expectedToken = record(next.id).reviewToken
  await store.search({ query: 'yarn' })
  await store.approve(next.id, { resolution: 'replace', expectedToken })
  assert.equal(record(next.id).status, 'active')
})

test('concurrent reviews serialize and only one stale view can succeed', async t => {
  const { store, record } = await fixture(t)
  await store.remember({ content: '使用 pnpm', key: 'manager' })
  const a = await store.remember({ content: '使用 npm', key: 'manager' })
  const b = await store.remember({ content: '使用 yarn', key: 'manager' })
  const results = await Promise.allSettled([a, b].map(item => store.approve(item.id, {
    resolution: 'replace', expectedToken: record(item.id).reviewToken,
  })))
  assert.equal(results.filter(item => item.status === 'fulfilled').length, 1)
  assert.equal(results.find(item => item.status === 'rejected').reason.code, 'review-stale')
  assert.equal(store.snapshot().memories.filter(item => item.status === 'active').length, 1)
})

test('failed replacement publishes no partial in-memory state and later writes recover', async t => {
  const { store, record, storagePath, directory } = await fixture(t)
  const { old, next } = await conflict(store)
  const before = await readFile(storagePath, 'utf8')
  const revision = store.snapshot().revision
  const options = { resolution: 'replace', expectedToken: record(next.id).reviewToken }
  store.storagePath = directory // Renaming a file over this existing directory must fail.
  await assert.rejects(store.approve(next.id, options))
  store.storagePath = storagePath
  assert.equal(store.snapshot().revision, revision)
  assert.equal(record(old.id).status, 'active')
  assert.equal(record(next.id).status, 'quarantined')
  assert.equal(await readFile(storagePath, 'utf8'), before)
  await store.approve(next.id, options)
  assert.equal(record(old.id).status, 'archived')
})

test('changing a scope/key or attaching a key during deduplication rechecks conflicts', async t => {
  const { store, record } = await fixture(t)
  const scope = { kind: 'project', key: '/projects/demo' }
  await store.remember({ content: '使用 pnpm', key: 'manager', scope })
  const candidate = await store.remember({ content: '使用 npm', key: 'manager' })
  assert.equal((await store.update(candidate.id, { scope })).status, 'quarantined')
  const unkeyed = await store.remember({ content: '使用 yarn', scope })
  const dedup = await store.remember({ content: '使用 yarn', key: 'manager', scope })
  assert.equal(dedup.id, unkeyed.id)
  assert.equal(record(dedup.id).status, 'quarantined')
  const differentKey = await store.remember({ content: '使用 bun', key: 'other', scope })
  assert.equal((await store.update(differentKey.id, { key: 'manager' })).status, 'quarantined')
})

test('project keys normalize paths without inventing a default project', () => {
  assert.equal(normalizeProjectKey('d:\\work\\demo\\'), 'D:/work/demo')
  assert.equal(normalizeProjectKey('D:/work/./demo/'), 'D:/work/demo')
  assert.equal(normalizeProjectKey('/work/foo/../Demo/'), '/work/Demo')
  assert.notEqual(normalizeProjectKey('/work/Demo'), normalizeProjectKey('/work/demo'))
  assert.equal(normalizeProjectKey('/'), '/')
  assert.equal(normalizeProjectKey('C:\\'), 'C:/')
  for (const value of [undefined, '', 'default', 'project/demo', 'C:demo']) {
    assert.throws(() => normalizeProjectKey(value), TypeError)
  }
})

test('legacy default project records stay unbound until explicitly assigned', async t => {
  const { store, storagePath } = await fixture(t)
  const saved = await store.remember({ content: '项目使用 pnpm', scope: { kind: 'project', key: '/projects/demo' } })
  const disk = JSON.parse(await readFile(storagePath, 'utf8'))
  disk.memories[0].scope.key = 'default'
  delete disk.memories[0].coexistsWith
  await writeFile(storagePath, JSON.stringify(disk))
  const migrated = await new MemoryGuardianStore({ storagePath }).init()
  assert.equal(migrated.snapshot().metrics.unboundProjects, 1)
  assert.equal((await migrated.search({ query: 'pnpm' })).items.length, 0)
  assert.equal((await migrated.search({ query: 'pnpm', scope: { kind: 'project', key: '/projects/demo' } })).items.length, 0)
  await assert.rejects(migrated.remember({ content: '新记忆', scope: { kind: 'project', key: 'default' } }), TypeError)
  await migrated.update(saved.id, { scope: { kind: 'project', key: '/projects/demo/' } })
  assert.equal(migrated.snapshot().metrics.unboundProjects, 0)
  assert.equal((await migrated.search({ query: 'pnpm', scope: { kind: 'project', key: '/projects/demo' } })).items[0].id, saved.id)
})

test('legacy active same-topic records are returned as unresolved alternatives', async t => {
  const { store, storagePath } = await fixture(t)
  await conflict(store)
  const disk = JSON.parse(await readFile(storagePath, 'utf8'))
  for (const item of disk.memories) { item.status = 'active'; delete item.coexistsWith }
  await writeFile(storagePath, JSON.stringify(disk))
  const legacy = await new MemoryGuardianStore({ storagePath }).init()
  const result = await legacy.search({ query: 'pnpm' })
  assert.equal(result.items.length, 2)
  assert.equal(result.coexistenceGroups[0].approved, false)
})
