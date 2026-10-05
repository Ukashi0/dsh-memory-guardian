import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import test from 'node:test'
import { apply, EXPORT_PATH, MUTATE_PATH, SEARCH_PATH, SNAPSHOT_PATH } from '../src/index.js'

function response() {
  const headers = new Map()
  return {
    statusCode: 0,
    headers,
    body: '',
    setHeader(name, value) { headers.set(name.toLowerCase(), value) },
    end(value) { this.body = value ?? '' },
  }
}

function request(method, body) {
  const stream = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))])
  stream.method = method
  stream.headers = body === undefined ? {} : { 'content-type': 'application/json' }
  return stream
}

function harness() {
  const routes = new Map()
  const tools = new Map()
  const listeners = new Map()
  const sections = new Map()
  let provided
  const ctx = {
    logger: { info() {}, warn() {} },
    provide(name, value) { if (name === 'memoryGuardian') provided = value; return () => { provided = undefined } },
    tools: { register(definition) { tools.set(definition.name, definition); return () => tools.delete(definition.name) } },
    systemPrompt: { section(definition) { sections.set(definition.name, definition); return () => sections.delete(definition.name) } },
    on(name, callback) { listeners.set(name, callback); return () => listeners.delete(name) },
    inject(_services, callback) { return callback(this) },
    webServer: { register(spec) { routes.set(spec.path, spec.handler); return () => routes.delete(spec.path) } },
  }
  return { ctx, routes, tools, listeners, sections, get store() { return provided } }
}

async function setup(t, config = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-memory-host-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const fake = harness()
  await apply(fake.ctx, { storagePath: join(directory, 'store.json'), ...config })
  return fake
}

test('host provides memory service, policy, three tools, and four routes', async t => {
  const fake = await setup(t)
  assert.ok(fake.store)
  assert.ok(fake.sections.has('memory-guardian:policy'))
  assert.deepEqual([...fake.tools.keys()].sort(), ['memory_forget', 'memory_remember', 'memory_search'])
  assert.deepEqual([...fake.routes.keys()].sort(), [EXPORT_PATH, MUTATE_PATH, SEARCH_PATH, SNAPSHOT_PATH].sort())
})

test('snapshot declares privacy and budget policy', async t => {
  const fake = await setup(t)
  const res = response()
  fake.routes.get(SNAPSHOT_PATH)(request('GET'), res)
  const body = JSON.parse(res.body)
  assert.equal(res.statusCode, 200)
  assert.equal(body.plugin, 'dsh-memory-guardian')
  assert.equal(body.privacy.secretsPersisted, false)
  assert.equal(body.privacy.networkRequests, false)
  assert.equal(body.policy.maxRecallItems, 8)
})

test('dashboard mutation and search endpoints form a complete workflow', async t => {
  const fake = await setup(t)
  const createRes = response()
  await fake.routes.get(MUTATE_PATH)(request('POST', { action: 'remember', memory: { content: '偏好使用 TypeScript', category: 'preference', scope: { kind: 'global', key: '*' } } }), createRes)
  const created = JSON.parse(createRes.body)
  assert.equal(created.outcome, 'created')

  const searchRes = response()
  await fake.routes.get(SEARCH_PATH)(request('POST', { query: 'TypeScript 偏好', scope: { kind: 'global', key: '*' } }), searchRes)
  assert.equal(JSON.parse(searchRes.body).items[0].id, created.id)

  const archiveRes = response()
  await fake.routes.get(MUTATE_PATH)(request('POST', { action: 'archive', id: created.id }), archiveRes)
  assert.equal(JSON.parse(archiveRes.body).status, 'archived')
})

test('model tools save, recall, and forget scoped memory', async t => {
  const fake = await setup(t)
  const agent = { id: 'agent-1', session: { header: { cwd: 'D:/project' } } }
  const saved = await fake.tools.get('memory_remember').execute({ content: '项目使用 pnpm', category: 'project' }, { agent })
  const found = await fake.tools.get('memory_search').execute({ query: 'pnpm 项目' }, { agent })
  assert.equal(found.items[0].id, saved.id)
  const forgotten = await fake.tools.get('memory_forget').execute({ id: saved.id }, { agent })
  assert.equal(forgotten.status, 'archived')
})

test('explicit remember messages are captured without a conversationEvents dependency', async t => {
  const fake = await setup(t)
  fake.listeners.get('session/event')({ id: 'session-1', header: { cwd: 'D:/project' } }, {
    type: 'user/message', seq: 12, data: { source: { kind: 'user' }, content: [{ type: 'text', text: '记住：这个项目使用 pnpm' }] },
  })
  await fake.store.writeQueue
  const memory = fake.store.snapshot().memories[0]
  assert.equal(memory.content, '这个项目使用 pnpm')
  assert.equal(memory.source.eventSeq, 12)
})

test('mutation endpoint rejects unsupported actions and wrong methods', async t => {
  const fake = await setup(t)
  const badAction = response()
  await fake.routes.get(MUTATE_PATH)(request('POST', { action: 'erase-everything' }), badAction)
  assert.equal(badAction.statusCode, 400)
  const wrongMethod = response()
  fake.routes.get(MUTATE_PATH)(request('GET'), wrongMethod)
  assert.equal(wrongMethod.statusCode, 405)
})

test('export is downloadable and contains no audit search queries', async t => {
  const fake = await setup(t)
  await fake.store.remember({ content: '发布前运行测试' })
  await fake.store.search({ query: '私密搜索词 发布测试' })
  const res = response()
  fake.routes.get(EXPORT_PATH)(request('GET'), res)
  assert.match(res.headers.get('content-disposition'), /dsh-memory-guardian-/)
  assert.doesNotMatch(res.body, /私密搜索词/)
})

test('dashboard, model tools, and explicit capture use the same normalized project directory', async t => {
  const fake = await setup(t)
  const cwd = 'd:\\workspace\\demo\\'
  const agent = { id: 'session-1', session: { header: { cwd } } }
  const savedResponse = response()
  await fake.routes.get(MUTATE_PATH)(request('POST', { action: 'remember', memory: {
    content: '项目使用 pnpm', scope: { kind: 'project', key: 'D:/workspace/demo/' },
  } }), savedResponse)
  const saved = JSON.parse(savedResponse.body)
  const global = await fake.store.remember({ content: 'pnpm global rule' })
  const own = await fake.tools.get('memory_search').execute({ query: 'pnpm' }, { agent })
  assert.deepEqual(new Set(own.items.map(item => item.id)), new Set([saved.id, global.id]))
  const other = await fake.tools.get('memory_search').execute({ query: 'pnpm', scopeKey: 'D:/workspace/other' }, { agent })
  assert.deepEqual(other.items.map(item => item.id), [global.id])
  fake.listeners.get('session/event')({ id: agent.id, header: { cwd } }, {
    type: 'user/message', seq: 9, data: { source: { kind: 'user' }, content: [{ type: 'text', text: '记住：pnpm run test' }] },
  })
  await fake.store.writeQueue
  const captured = fake.store.snapshot().memories.find(item => item.source.eventSeq === 9)
  assert.equal(captured.scope.key, 'D:/workspace/demo')
  assert.equal((await fake.tools.get('memory_search').execute({ query: 'pnpm run test' }, { agent })).items.some(item => item.id === captured.id), true)
  const missing = response()
  await fake.routes.get(MUTATE_PATH)(request('POST', { action: 'remember', memory: { content: 'wrong project', scope: { kind: 'project' } } }), missing)
  assert.equal(missing.statusCode, 400)
  await assert.rejects(fake.tools.get('memory_search').execute({ query: 'pnpm' }, { agent: {} }), TypeError)
})

test('snapshot project picker combines stored projects and optional session directories', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'memory-projects-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const fake = harness()
  fake.ctx.sessions = { list: () => [{ header: { cwd: '/workspace/new/' } }, { header: { cwd: 'default' } }] }
  await apply(fake.ctx, { storagePath: join(directory, 'store.json') })
  await fake.store.remember({ content: 'existing rule', scope: { kind: 'project', key: '/workspace/old/' } })
  const res = response()
  fake.routes.get(SNAPSHOT_PATH)(request('GET'), res)
  assert.deepEqual(JSON.parse(res.body).projects.map(item => item.key), ['/workspace/new', '/workspace/old'])
})

test('HTTP review enforces explicit resolution and stale tokens; model rendering explains alternatives', async t => {
  const fake = await setup(t)
  const old = await fake.store.remember({ content: '使用 pnpm', key: 'manager' })
  const next = await fake.store.remember({ content: '使用 npm', key: 'manager' })
  const review = () => fake.store.snapshot().memories.find(item => item.id === next.id)
  const invalid = response()
  await fake.routes.get(MUTATE_PATH)(request('POST', { action: 'approve', id: next.id }), invalid)
  assert.equal(invalid.statusCode, 409)
  assert.equal(JSON.parse(invalid.body).error, 'review-required')
  const stale = review().reviewToken
  await fake.store.update(old.id, { content: 'legacy pnpm' })
  const staleRes = response()
  await fake.routes.get(MUTATE_PATH)(request('POST', {
    action: 'approve', id: next.id, resolution: 'replace', expectedToken: stale,
  }), staleRes)
  assert.equal(staleRes.statusCode, 409)
  assert.equal(JSON.parse(staleRes.body).error, 'review-stale')
  const approved = response()
  await fake.routes.get(MUTATE_PATH)(request('POST', {
    action: 'approve', id: next.id, resolution: 'coexist', expectedToken: review().reviewToken,
  }), approved)
  assert.equal(approved.statusCode, 200)
  const tool = fake.tools.get('memory_search')
  const result = await tool.execute({ query: 'pnpm', scope: 'global' }, { agent: {} })
  const rendered = tool.output.render({}, result)[0].text
  assert.match(rendered, /User-approved coexisting alternatives/)
  assert.match(rendered, /使用 npm/)
  assert.match(rendered, /ranking score=/)
  const limited = await tool.execute({ query: 'pnpm', scope: 'global', limit: 1 }, { agent: {} })
  assert.equal(limited.items.length, 0)
  assert.match(tool.output.render({}, limited)[0].text, /Recall warning:/)
})
