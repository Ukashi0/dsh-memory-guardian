import type { MemoryScope } from './store.js'
export declare function normalizeProjectKey(value: string): string
export declare function needsProjectBinding(scope: MemoryScope): boolean
export declare function resolveMemoryScope(
  scope?: { kind?: MemoryScope['kind']; key?: string },
  context?: { cwd?: string; agentId?: string },
): MemoryScope
