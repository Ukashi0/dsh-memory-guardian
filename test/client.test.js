import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import test from 'node:test'

// Execute the shipped client entry and its event handlers without a DSH browser.
// This small hook adapter tests request wiring; it does not claim React/visual compatibility.
const source = await readFile(new URL('../src/client.js', import.meta.url), 'utf8')
const walk = function* (node) {
  if (!node || typeof node !== 'object') return
  yield node
  for (const child of node.children ?? []) yield* walk(child)
}
const textOf = node => typeof node === 'string' ? node
  : typeof node === 'number' ? String(node) : (node?.children ?? []).map(textOf).join('')
const find = (tree, predicate) => {
  const result = [...walk(tree)].find(predicate)
  assert.ok(result, 'expected UI element')
  return result
}
const component = (tree, name) => find(tree, node => typeof node.type === 'function' && node.type.name === name)
const button = (tree, label) => find(tree, node => (node.type === 'button' || node.type?.name === 'Button') && textOf(node) === label)

function harness(snapshot, mutateResponse = () => ({ status: 200, body: { outcome: 'created', id: 'new', status: 'active' } })) {
  const requests = []
  const hooks = new Map()
  let current, offset, Dashboard, exported, mounted = false
  const mountEffects = []
  const React = {
    Fragment: 'fragment',
    createElement: (type, props, ...children) => ({ type, props: { ...props, children }, children: children.flat(Infinity) }),
    useState(initial) {
      const state = hooks.get(current)
      const slot = offset++
      if (!(slot in state)) state[slot] = initial
      return [state[slot], value => { state[slot] = typeof value === 'function' ? value(state[slot]) : value }]
    },
    useEffect(effect) { if (current === Dashboard && !mounted) mountEffects.push(effect) },
    useMemo(factory) { return factory() },
  }
  vm.runInNewContext(source, {
    window: { __ModuleLoader__: { load(definition) { exported = definition.factory(name => {
      assert.equal(name, 'react')
      return React
    }) } } },
    fetch: async (path, options = {}) => {
      const body = options.body ? JSON.parse(options.body) : undefined
      requests.push({ path, body })
      const result = path.endsWith('/mutate') ? mutateResponse(body)
        : path.endsWith('/search') ? { status: 200, body: { items: [], usedChars: 0, budgetChars: 6000, estimatedTokens: 0 } }
          : { status: 200, body: snapshot }
      return { ok: result.status === 200, status: result.status, json: async () => result.body }
    },
    setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {},
  })
  exported.apply({ slots: {
    inject(_name, callback) { callback() },
    register(_spec, view) { Dashboard = view },
  } })
  function render(type, props = {}) {
    current = type
    offset = 0
    if (!hooks.has(type)) hooks.set(type, [])
    return type(props)
  }
  const view = node => render(node.type, node.props)
  const dashboard = () => render(Dashboard)
  return { requests, dashboard, view, async init() {
    dashboard()
    mounted = true
    mountEffects.forEach(effect => effect())
    await new Promise(resolve => setImmediate(resolve))
  } }
}

const snapshot = memories => ({
  pluginVersion: '0.1.1-beta.1', revision: 1, generatedAt: Date.now(),
  metrics: { health: 100, total: memories.length }, memories, audit: [], policy: {},
  projects: [{ key: '/work/demo', label: '/work/demo' }],
})

test('dashboard add and recall forms send the same explicitly selected project', async () => {
  const ui = harness(snapshot([]))
  await ui.init()
  button(ui.dashboard(), '添加记忆').props.onClick()
  let modal = ui.view(component(ui.dashboard(), 'AddModal'))
  find(modal, node => node.type === 'textarea').props.onChange({ target: { value: '项目使用 pnpm' } })
  find(find(modal, node => node.type === 'label' && node.children[0] === 'Scope'), node => node.type === 'select')
    .props.onChange({ target: { value: 'project' } })
  modal = ui.view(component(ui.dashboard(), 'AddModal'))
  assert.equal(button(modal, '安全保存').props.disabled, true)
  const picker = ui.view(component(modal, 'ProjectPicker'))
  find(picker, node => node.type === 'input').props.onChange({ target: { value: '/work/demo/' } })
  modal = ui.view(component(ui.dashboard(), 'AddModal'))
  assert.equal(button(modal, '安全保存').props.disabled, false)
  await find(modal, node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  // onSave runs asynchronously; wait for its request and refresh to settle.
  await new Promise(resolve => setImmediate(resolve))
  const save = ui.requests.find(item => item.body?.action === 'remember')
  assert.deepEqual(save.body.memory.scope, { kind: 'project', key: '/work/demo/' })

  button(ui.dashboard(), '召回实验室').props.onClick()
  let recall = ui.view(component(ui.dashboard(), 'RecallLab'))
  find(recall, node => node.props['aria-label'] === 'Recall query').props.onChange({ target: { value: 'pnpm' } })
  find(recall, node => node.props['aria-label'] === 'Recall scope').props.onChange({ target: { value: 'project' } })
  recall = ui.view(component(ui.dashboard(), 'RecallLab'))
  await find(recall, node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  const search = ui.requests.find(item => item.path.endsWith('/search'))
  assert.deepEqual(search.body.scope, save.body.memory.scope)
})

test('review UI sends resolution/token and refreshes stale review data', async () => {
  const memory = { id: 'candidate', content: '使用 npm', status: 'quarantined', key: 'manager', conflictsWith: ['old'], reviewToken: 'token-1', risk: { reasons: [] } }
  const data = snapshot([memory, { id: 'old', content: '使用 pnpm', status: 'active' }])
  const ui = harness(data, () => ({ status: 409, body: { message: '审核内容已变化' } }))
  await ui.init()
  button(ui.dashboard(), '审核队列').props.onClick()
  const queue = ui.view(component(ui.dashboard(), 'ReviewQueue'))
  const preview = ui.view(component(queue, 'ConflictPreview'))
  assert.match(textOf(preview), /使用 pnpm/)
  const actions = ui.view(component(queue, 'ReviewActions'))
  await button(actions, '替代旧记录').props.onClick()
  await button(actions, '同时保留').props.onClick()
  const mutations = ui.requests.filter(item => item.path.endsWith('/mutate')).map(item => item.body)
  assert.deepEqual(mutations.map(item => item.resolution), ['replace', 'coexist'])
  assert.ok(mutations.every(item => item.expectedToken === 'token-1' && item.id === memory.id))
  assert.equal(ui.requests.filter(item => item.path.endsWith('/snapshot')).length, 3)
  assert.match(textOf(ui.dashboard()), /审核内容已变化/)
})

test('legacy unbound review requires a project binding before approval', async () => {
  const memory = { id: 'legacy', content: '项目使用 pnpm', status: 'quarantined', conflictsWith: [], reviewToken: 't', needsProjectBinding: true, risk: { reasons: [] } }
  const ui = harness(snapshot([memory]))
  await ui.init()
  button(ui.dashboard(), '审核队列').props.onClick()
  const queue = ui.view(component(ui.dashboard(), 'ReviewQueue'))
  const actions = ui.view(component(queue, 'ReviewActions'))
  assert.equal(button(actions, '批准使用').props.disabled, true)
  const bindingNode = component(queue, 'ProjectBinding')
  let binding = ui.view(bindingNode)
  const picker = ui.view(component(binding, 'ProjectPicker'))
  find(picker, node => node.type === 'input').props.onChange({ target: { value: '/work/demo' } })
  binding = ui.view(bindingNode)
  find(binding, node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  await new Promise(resolve => setImmediate(resolve))
  const mutation = ui.requests.find(item => item.body?.action === 'update').body
  assert.deepEqual(mutation.patch.scope, { kind: 'project', key: '/work/demo' })
  assert.equal(mutation.id, 'legacy')
})
