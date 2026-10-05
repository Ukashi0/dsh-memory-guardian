import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

test('manifest exposes host, store, client, and DSH bundle metadata', async () => {
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  assert.equal(manifest.type, 'module')
  assert.equal(manifest.main, 'lib/index.js')
  assert.equal(manifest.exports['./store'].default, './lib/store.js')
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-settings'))
})

test('bundle patch uses a unique loader and settings slot id', async () => {
  const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8')
  const client = await readFile(join(root, 'src', 'client.js'), 'utf8')
  assert.match(patch, /id: memory-guardian/)
  assert.match(patch, /name: dsh-memory-guardian/)
  assert.match(client, /id: 'memory-guardian'/)
  assert.doesNotMatch(client, /id: 'stats'/)
})

test('client contains accessibility and responsive safeguards', async () => {
  const client = await readFile(join(root, 'src', 'client.js'), 'utf8')
  assert.match(client, /aria-modal/)
  assert.match(client, /:focus-visible/)
  assert.match(client, /prefers-reduced-motion/)
  assert.match(client, /@media\(max-width:760px\)/)
})

