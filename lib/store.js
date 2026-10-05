import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { needsProjectBinding, resolveMemoryScope } from './scope.js'
export { normalizeProjectKey, resolveMemoryScope } from './scope.js'

const SCHEMA_VERSION = 1
const CATEGORIES = new Set(['preference', 'fact', 'instruction', 'project', 'relationship', 'experience', 'other'])

function clamp(value, min, max, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
}

function boundedString(value, maximum, fallback = '') {
  if (typeof value !== 'string') return fallback
  const text = value.trim()
  return text.length > maximum ? text.slice(0, maximum) : text
}

function uniqueStrings(values, maximum = 20) {
  if (!Array.isArray(values)) return []
  return [...new Set(values.map(value => boundedString(value, 64).toLowerCase()).filter(Boolean))].slice(0, maximum)
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function normalizeMemoryContent(content) {
  return String(content ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()
}

export function tokenize(content) {
  const normalized = normalizeMemoryContent(content)
  const latin = normalized.match(/[a-z0-9_./-]{2,}/g) ?? []
  const cjkRuns = normalized.match(/[\u3400-\u9fff]+/g) ?? []
  const cjk = []
  for (const run of cjkRuns) {
    for (const char of run) cjk.push(char)
    for (let index = 0; index < run.length - 1; index += 1) cjk.push(run.slice(index, index + 2))
  }
  return [...new Set([...latin, ...cjk])]
}

export function detectSensitiveContent(content) {
  const text = String(content ?? '')
  const blocked = []
  const review = []
  const blockedRules = [
    ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i],
    ['bearer-token', /\bbearer\s+[a-z0-9._~+/-]{16,}=*/i],
    ['api-key', /\b(?:sk|pk|api)[-_][a-z0-9_-]{18,}\b/i],
    ['jwt', /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/],
    ['password', /\b(?:password|passwd|pwd|密码)\s*[:=]\s*\S{4,}/i],
    ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/],
  ]
  const reviewRules = [
    ['email', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
    ['phone', /(?<!\d)(?:\+?86[- ]?)?1[3-9]\d{9}(?!\d)/],
    ['identity-number', /(?<!\d)\d{17}[\dXx](?!\d)/],
  ]
  for (const [name, pattern] of blockedRules) if (pattern.test(text)) blocked.push(name)
  for (const [name, pattern] of reviewRules) if (pattern.test(text)) review.push(name)
  return { blocked, review }
}

function defaultState() {
  return { schemaVersion: SCHEMA_VERSION, revision: 0, memories: [], audit: [] }
}

function sameScope(a, b) {
  return a.kind === b.kind && a.key === b.key
}

function scopeMatches(recordScope, requested) {
  if (needsProjectBinding(recordScope)) return false
  return !requested || recordScope.kind === 'global' || sameScope(recordScope, requested)
}

function topicKey(record) {
  return JSON.stringify([record.scope.kind, record.scope.key, record.key])
}

function activeGroups(records) {
  const groups = new Map()
  for (const record of records) {
    if (record.status !== 'active' || !record.key) continue
    const key = topicKey(record)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(record)
  }
  return groups
}

function activePeers(state, record, groups) {
  if (!record.key) return []
  return (groups ? groups.get(topicKey(record)) ?? [] : state.memories).filter(item => item.id !== record.id && item.key === record.key
    && sameScope(item.scope, record.scope) && item.status === 'active' && item.fingerprint !== record.fingerprint)
}

function reviewToken(state, record, peers = activePeers(state, record)) {
  const identity = item => ({
    id: item.id, fingerprint: item.fingerprint, key: item.key, scope: item.scope,
    status: item.status, risk: item.risk, coexistsWith: item.coexistsWith ?? [],
  })
  return digest(JSON.stringify({
    record: identity(record),
    peers: [...peers].sort((a, b) => a.id.localeCompare(b.id)).map(identity),
  }))
}

function safeRecord(record, state, groups) {
  const peers = activePeers(state, record, groups)
  return {
    id: record.id, content: record.content, ...(record.key ? { key: record.key } : {}),
    category: record.category, tags: [...record.tags], importance: record.importance,
    pinned: record.pinned, status: record.status, scope: { ...record.scope },
    source: { ...record.source }, risk: { level: record.risk.level, reasons: [...record.risk.reasons] },
    conflictsWith: record.status === 'quarantined' ? peers.map(item => item.id) : [],
    coexistsWith: peers.filter(item => record.coexistsWith?.includes(item.id)
      && item.coexistsWith?.includes(record.id)).map(item => item.id),
    needsProjectBinding: needsProjectBinding(record.scope),
    ...(record.status === 'quarantined' ? { reviewToken: reviewToken(state, record, peers) } : {}),
    createdAt: record.createdAt, updatedAt: record.updatedAt,
    ...(record.lastAccessedAt ? { lastAccessedAt: record.lastAccessedAt } : {}),
    ...(record.expiresAt ? { expiresAt: record.expiresAt } : {}),
    recallCount: record.recallCount,
  }
}

function reviewError(message, code = 'review-required') {
  return Object.assign(new Error(message), { statusCode: 409, code })
}

export class MemoryGuardianStore {
  constructor(options = {}) {
    if (!options.storagePath) throw new TypeError('storagePath is required')
    this.storagePath = resolve(options.storagePath)
    this.maxRecords = Math.trunc(clamp(options.maxRecords, 10, 100_000, 10_000))
    this.maxRecallItems = Math.trunc(clamp(options.maxRecallItems, 1, 50, 8))
    this.maxRecallChars = Math.trunc(clamp(options.maxRecallChars, 256, 100_000, 6_000))
    this.auditLimit = Math.trunc(clamp(options.auditLimit, 50, 5_000, 500))
    this.quarantinePersonalData = options.quarantinePersonalData !== false
    this.state = defaultState()
    this.writeQueue = Promise.resolve()
  }

  async init() {
    await mkdir(dirname(this.storagePath), { recursive: true })
    try {
      const parsed = JSON.parse(await readFile(this.storagePath, 'utf8'))
      if (parsed?.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.memories) || !Array.isArray(parsed.audit)) {
        throw new Error('unsupported or malformed store')
      }
      for (const record of parsed.memories) {
        record.coexistsWith ??= []
        record.conflictsWith ??= []
        // Preserve ambiguous legacy project records; never assign them to the current project.
        if (!needsProjectBinding(record.scope)) record.scope = resolveMemoryScope(record.scope)
      }
      this.state = parsed
    } catch (error) {
      if (error?.code !== 'ENOENT') throw new Error('cannot load memory store: ' + error.message, { cause: error })
      await this.#persist(this.state)
    }
    return this
  }

  #audit(state, action, detail = {}) {
    state.audit.push({ id: randomUUID(), action, at: Date.now(), ...detail })
    if (state.audit.length > this.auditLimit) state.audit.splice(0, state.audit.length - this.auditLimit)
  }

  async #persist(state) {
    const target = this.storagePath
    const temporary = target + '.' + process.pid + '.' + randomUUID() + '.tmp'
    try {
      await writeFile(temporary, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 })
      await rename(temporary, target)
    } finally {
      await rm(temporary, { force: true }).catch(() => {})
    }
  }

  #mutate(change) {
    // Serialize the entire read/check/change/commit, not only the physical write.
    const operation = this.writeQueue.then(async () => {
      const draft = structuredClone(this.state)
      const result = change(draft)
      draft.revision += 1
      await this.#persist(draft)
      this.state = draft
      return result
    })
    // A failed operation rejects its caller, but does not poison later operations.
    this.writeQueue = operation.then(() => undefined, () => undefined)
    return operation
  }

  #require(state, id) {
    const record = state.memories.find(item => item.id === id)
    if (!record) throw new Error('memory not found: ' + id)
    return record
  }

  #detachCoexistence(state, id) {
    for (const item of state.memories) {
      item.coexistsWith = item.id === id ? [] : (item.coexistsWith ?? []).filter(other => other !== id)
    }
  }

  #recheck(state, record) {
    record.conflictsWith = activePeers(state, record).map(item => item.id)
    if (record.status !== 'archived' && (record.conflictsWith.length > 0
      || needsProjectBinding(record.scope)
      || (this.quarantinePersonalData && record.risk.level === 'review'))) {
      record.status = 'quarantined'
    }
  }

  remember(input = {}) {
    return this.#mutate(state => {
      const content = boundedString(input.content, 8_000)
      if (!content) throw new TypeError('memory content is required')
      const normalized = normalizeMemoryContent(content)
      const fingerprint = digest(normalized)
      const scope = resolveMemoryScope(input.scope)
      const sensitivity = detectSensitiveContent(content)
      if (sensitivity.blocked.length > 0) {
        this.#audit(state, 'blocked', { fingerprint: fingerprint.slice(0, 12), reasons: sensitivity.blocked })
        return { outcome: 'blocked', id: '', status: 'rejected', reasons: sensitivity.blocked, message: 'Sensitive secret rejected before persistence.' }
      }

      const key = boundedString(input.key, 160)
      const duplicate = state.memories.find(item => item.fingerprint === fingerprint && sameScope(item.scope, scope)
        && item.status !== 'archived' && (!key || !item.key || item.key === key))
      if (duplicate) {
        duplicate.updatedAt = Date.now()
        duplicate.importance = Math.max(duplicate.importance, Math.trunc(clamp(input.importance, 1, 5, duplicate.importance)))
        duplicate.tags = uniqueStrings([...duplicate.tags, ...uniqueStrings(input.tags)])
        if (key && !duplicate.key) {
          duplicate.key = key
          this.#detachCoexistence(state, duplicate.id)
          this.#recheck(state, duplicate)
        }
        this.#audit(state, 'deduplicated', { memoryId: duplicate.id })
        return { outcome: 'duplicate', id: duplicate.id, status: duplicate.status, reasons: [],
          conflictsWith: [...duplicate.conflictsWith], message: 'An equivalent memory already exists.' }
      }

      if (state.memories.length >= this.maxRecords) throw new Error('memory limit reached (' + this.maxRecords + ')')
      const now = Date.now()
      const record = {
        id: randomUUID(), content, normalized, fingerprint, ...(key ? { key } : {}),
        category: CATEGORIES.has(input.category) ? input.category : 'other',
        tags: uniqueStrings(input.tags), importance: Math.trunc(clamp(input.importance, 1, 5, 3)),
        pinned: input.pinned === true, status: 'active', scope,
        source: {
          kind: boundedString(input.source?.kind, 64, 'manual'),
          ...(boundedString(input.source?.sessionId, 256) ? { sessionId: boundedString(input.source.sessionId, 256) } : {}),
          ...(Number.isInteger(input.source?.turn) ? { turn: input.source.turn } : {}),
          ...(Number.isInteger(input.source?.eventSeq) ? { eventSeq: input.source.eventSeq } : {}),
        },
        risk: { level: sensitivity.review.length > 0 ? 'review' : 'none', reasons: sensitivity.review },
        conflictsWith: [], coexistsWith: [], createdAt: now, updatedAt: now,
        ...(Number.isFinite(Number(input.expiresAt)) && Number(input.expiresAt) > now ? { expiresAt: Number(input.expiresAt) } : {}),
        recallCount: 0,
      }
      this.#recheck(state, record)
      state.memories.push(record)
      const conflict = record.conflictsWith.length > 0
      const quarantined = record.status === 'quarantined'
      this.#audit(state, conflict ? 'conflict-quarantined' : quarantined ? 'quarantined' : 'created', { memoryId: record.id })
      return {
        outcome: conflict ? 'conflict' : quarantined ? 'quarantined' : 'created',
        id: record.id, status: record.status, reasons: [...sensitivity.review],
        conflictsWith: [...record.conflictsWith],
        message: conflict ? 'Memory quarantined because its key conflicts with an active memory.'
          : quarantined ? 'Memory is waiting for review.' : 'Memory saved.',
      }
    })
  }

  search(input = {}) {
    return this.#mutate(state => {
      const query = boundedString(input.query, 2_000)
      if (!query) throw new TypeError('search query is required')
      const scope = input.scope ? resolveMemoryScope(input.scope) : undefined
      const limit = Math.trunc(clamp(input.limit, 1, this.maxRecallItems, this.maxRecallItems))
      const budgetChars = Math.trunc(clamp(input.budgetChars, 128, this.maxRecallChars, this.maxRecallChars))
      const now = Date.now()
      const queryTokens = tokenize(query)
      const queryNormalized = normalizeMemoryContent(query)
      const matchingTokens = queryTokens.filter(token => token.length > 1 || queryNormalized.length === 1)
      const eligible = state.memories.filter(item => item.status === 'active'
        && (!item.expiresAt || item.expiresAt > now) && scopeMatches(item.scope, scope))
      const scored = eligible.map(item => {
        const memoryTokens = new Set(tokenize(item.content + ' ' + item.tags.join(' ') + ' ' + (item.key ?? '')))
        const overlap = queryTokens.reduce((count, token) => count + (memoryTokens.has(token) ? 1 : 0), 0)
        const relevance = queryTokens.length === 0 ? 0 : overlap / queryTokens.length
        const exact = item.normalized.includes(queryNormalized) || queryNormalized.includes(item.normalized) ? 0.55 : 0
        const matched = matchingTokens.some(token => memoryTokens.has(token)) || (matchingTokens.length > 0 && exact > 0)
        const recencyDays = Math.max(0, (now - item.updatedAt) / 86_400_000)
        const recency = 1 / (1 + recencyDays / 30)
        const score = Math.min(1, relevance * 0.58 + exact + (item.importance / 5) * 0.19 + recency * 0.13 + (item.pinned ? 0.12 : 0))
        return { item, score, matched }
      })
      const candidates = scored.filter(candidate => candidate.matched && candidate.score >= 0.12)
        .sort((a, b) => b.score - a.score || b.item.importance - a.item.importance || b.item.updatedAt - a.item.updatedAt)
      const byId = new Map(scored.map(candidate => [candidate.item.id, candidate]))
      const recallGroups = activeGroups(eligible)
      const allGroups = activeGroups(state.memories)
      const selected = []
      const visited = new Set()
      const coexistenceGroups = []
      const warnings = []
      let usedChars = 0
      for (const candidate of candidates) {
        if (visited.has(candidate.item.id)) continue
        const group = candidate.item.key
          ? [candidate.item, ...recallGroups.get(topicKey(candidate.item)).filter(item => item.id !== candidate.item.id)]
          : [candidate.item]
        group.forEach(item => visited.add(item.id))
        const cost = group.reduce((sum, item) => sum + item.content.length, 0)
        if (selected.length + group.length > limit || usedChars + cost > budgetChars) {
          if (group.length > 1) warnings.push({
            code: 'coexistence-budget', key: candidate.item.key, memoryIds: group.map(item => item.id),
            message: '同主题记忆无法在本次条数或正文预算内完整返回，请增加预算或明确适用条件。',
          })
          continue
        }
        if (group.length > 1) coexistenceGroups.push({
          key: candidate.item.key, memoryIds: group.map(item => item.id),
          approved: group.every(item => group.every(other => item === other || item.coexistsWith?.includes(other.id))),
        })
        for (const item of group) {
          item.lastAccessedAt = now
          item.recallCount += 1
          const ranking = byId.get(item.id)
          selected.push({ ...safeRecord(item, state, allGroups), score: Number(ranking.score.toFixed(4)),
            includedAsAlternative: !ranking.matched, estimatedTokens: Math.ceil(item.content.length / 4) })
        }
        usedChars += cost
      }
      this.#audit(state, 'recalled', {
        queryFingerprint: digest(queryNormalized).slice(0, 12), resultIds: selected.map(item => item.id),
        usedChars, budgetChars,
      })
      return { items: selected, totalCandidates: candidates.length, usedChars, budgetChars,
        estimatedTokens: Math.ceil(usedChars / 4), coexistenceGroups, warnings }
    })
  }

  update(id, patch = {}) {
    return this.#mutate(state => {
      const record = this.#require(state, id)
      const before = JSON.stringify([record.fingerprint, record.key, record.scope])
      if (patch.content !== undefined) {
        const content = boundedString(patch.content, 8_000)
        if (!content) throw new TypeError('memory content cannot be empty')
        const sensitivity = detectSensitiveContent(content)
        if (sensitivity.blocked.length > 0) throw new Error('sensitive content rejected: ' + sensitivity.blocked.join(', '))
        record.content = content
        record.normalized = normalizeMemoryContent(content)
        record.fingerprint = digest(record.normalized)
        // Rewriting unchanged content does not revoke an existing PII approval.
        if (before !== JSON.stringify([record.fingerprint, record.key, record.scope])) {
          record.risk = { level: sensitivity.review.length > 0 ? 'review' : 'none', reasons: sensitivity.review }
        }
      }
      if (patch.key !== undefined) record.key = boundedString(patch.key, 160) || undefined
      if (patch.category !== undefined && CATEGORIES.has(patch.category)) record.category = patch.category
      if (patch.tags !== undefined) record.tags = uniqueStrings(patch.tags)
      if (patch.importance !== undefined) record.importance = Math.trunc(clamp(patch.importance, 1, 5, record.importance))
      if (patch.pinned !== undefined) record.pinned = patch.pinned === true
      if (patch.scope !== undefined) record.scope = resolveMemoryScope(patch.scope)
      if (before !== JSON.stringify([record.fingerprint, record.key, record.scope])) {
        this.#detachCoexistence(state, id)
        this.#recheck(state, record)
      }
      record.updatedAt = Date.now()
      this.#audit(state, 'updated', { memoryId: record.id })
      return safeRecord(record, state)
    })
  }

  archive(id, reason = 'manual') {
    return this.#mutate(state => {
      const record = this.#require(state, id)
      this.#detachCoexistence(state, id)
      record.status = 'archived'
      record.updatedAt = Date.now()
      this.#audit(state, 'archived', { memoryId: record.id, reason: boundedString(reason, 160, 'manual') })
      return safeRecord(record, state)
    })
  }

  restore(id) {
    return this.#mutate(state => {
      const record = this.#require(state, id)
      if (record.status !== 'archived') throw reviewError('Only archived memories can be restored.')
      this.#detachCoexistence(state, id)
      record.status = 'active'
      this.#recheck(state, record)
      record.updatedAt = Date.now()
      this.#audit(state, 'restored', { memoryId: record.id, status: record.status })
      return safeRecord(record, state)
    })
  }

  approve(id, options = {}) {
    return this.#mutate(state => {
      const record = this.#require(state, id)
      if (record.status !== 'quarantined') throw reviewError('记忆状态已改变，请刷新审核列表。', 'review-stale')
      if (needsProjectBinding(record.scope)) throw new TypeError('请先为这条记忆绑定项目。')
      const peers = activePeers(state, record)
      if (options.expectedToken !== undefined && options.expectedToken !== reviewToken(state, record)) {
        throw reviewError('审核内容或冲突记录已变化，请刷新后重新确认。', 'review-stale')
      }
      if (peers.length > 0 && (!options.expectedToken || !['replace', 'coexist'].includes(options.resolution))) {
        throw reviewError('请查看当前冲突，并选择替代旧记录或同时保留。')
      }
      if (options.resolution !== undefined && !['replace', 'coexist'].includes(options.resolution)) {
        throw new TypeError('Unknown conflict resolution.')
      }
      this.#detachCoexistence(state, id)
      const now = Date.now()
      if (options.resolution === 'replace') {
        for (const peer of peers) {
          this.#detachCoexistence(state, peer.id)
          peer.status = 'archived'
          peer.updatedAt = now
        }
      } else if (options.resolution === 'coexist') {
        const group = [record, ...peers]
        for (const item of group) item.coexistsWith = group.filter(other => other !== item).map(other => other.id)
      }
      record.status = 'active'
      record.risk = { level: 'none', reasons: [] }
      record.conflictsWith = []
      record.updatedAt = now
      this.#audit(state, 'approved', { memoryId: id, resolution: options.resolution ?? 'approve',
        relatedIds: peers.map(item => item.id) })
      return safeRecord(record, state)
    })
  }

  reject(id, reason = 'review-rejected') {
    return this.archive(id, reason)
  }

  snapshot() {
    const now = Date.now()
    const groups = activeGroups(this.state.memories)
    const memories = this.state.memories.map(record => safeRecord(record, this.state, groups))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
    const metrics = {
      total: memories.length, active: memories.filter(item => item.status === 'active').length,
      quarantined: memories.filter(item => item.status === 'quarantined').length,
      archived: memories.filter(item => item.status === 'archived').length,
      pinned: memories.filter(item => item.pinned).length,
      conflicts: memories.filter(item => item.conflictsWith.length > 0).length,
      unboundProjects: memories.filter(item => item.needsProjectBinding).length,
      expired: memories.filter(item => item.expiresAt && item.expiresAt <= now).length,
      blockedAttempts: this.state.audit.filter(item => item.action === 'blocked').length,
      recalls: this.state.audit.filter(item => item.action === 'recalled').length,
    }
    metrics.health = Math.max(0, 100 - metrics.quarantined * 4 - metrics.conflicts * 8 - metrics.expired * 2)
    const projects = [...new Set(memories.filter(item => item.scope.kind === 'project' && !item.needsProjectBinding)
      .map(item => item.scope.key))].sort().map(key => ({ key, label: key }))
    return {
      version: SCHEMA_VERSION, revision: this.state.revision, generatedAt: now,
      storage: { kind: 'local-json', pathExposed: false, encrypted: false },
      privacy: { secretsPersisted: false, networkRequests: false, personalDataQuarantined: this.quarantinePersonalData },
      policy: { maxRecords: this.maxRecords, maxRecallItems: this.maxRecallItems, maxRecallChars: this.maxRecallChars },
      metrics, projects, memories, audit: this.state.audit.slice(-100).reverse(),
    }
  }

  exportData() {
    const snapshot = this.snapshot()
    return { exportedAt: Date.now(), schemaVersion: SCHEMA_VERSION, memories: snapshot.memories, policy: snapshot.policy }
  }
}
