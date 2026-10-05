import { posix, win32 } from 'node:path'

const KINDS = new Set(['global', 'project', 'agent', 'team'])

export function normalizeProjectKey(value) {
  if (typeof value !== 'string') throw new TypeError('请选择项目或提供会话工作目录。')
  const path = value.trim()
  if (!path || path === 'default' || path.length > 512 || /[\x00-\x1f]/.test(path)) {
    throw new TypeError('项目标识必须是有效的绝对目录，不能使用 default。')
  }
  if (/^[a-z]:[\\/]/i.test(path) || /^\\\\/.test(path) || /^\/\/[^/]+\/[^/]+/.test(path)) {
    const normalized = win32.normalize(path).replaceAll('\\', '/').replace(/^[a-z]:/, drive => drive.toUpperCase())
    const root = win32.parse(normalized).root.replaceAll('\\', '/')
    return normalized.length > root.length ? normalized.replace(/\/+$/, '') : normalized
  }
  if (!posix.isAbsolute(path)) throw new TypeError('项目目录必须是绝对路径。')
  const normalized = posix.normalize(path)
  return normalized === '/' ? normalized : normalized.replace(/\/+$/, '')
}

export function needsProjectBinding(scope) {
  if (scope?.kind !== 'project') return false
  try { normalizeProjectKey(scope.key); return false } catch { return true }
}

export function resolveMemoryScope(scope, context = {}) {
  const kind = scope?.kind ?? 'global'
  if (!KINDS.has(kind)) throw new TypeError('Unknown memory scope.')
  if (kind === 'global') return { kind, key: '*' }
  if (kind === 'project') return { kind, key: normalizeProjectKey(scope?.key ?? context.cwd) }
  const key = scope?.key ?? (kind === 'agent' ? context.agentId : undefined) ?? 'default'
  return { kind, key: String(key).trim().slice(0, 512) || 'default' }
}

