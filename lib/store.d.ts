export type MemoryStatus = 'active' | 'quarantined' | 'archived'
export type MemoryScopeKind = 'global' | 'project' | 'agent' | 'team'
export interface MemoryScope { kind: MemoryScopeKind; key: string }
export interface MemorySource { kind: string; sessionId?: string; turn?: number; eventSeq?: number }
export interface MemoryRecord {
  id: string
  content: string
  key?: string
  category: string
  tags: string[]
  importance: number
  pinned: boolean
  status: MemoryStatus
  scope: MemoryScope
  source: MemorySource
  risk: { level: 'none' | 'review'; reasons: string[] }
  conflictsWith: string[]
  coexistsWith: string[]
  needsProjectBinding: boolean
  reviewToken?: string
  createdAt: number
  updatedAt: number
  lastAccessedAt?: number
  expiresAt?: number
  recallCount: number
}
export interface MemoryGuardianOptions {
  storagePath: string
  maxRecords?: number
  maxRecallItems?: number
  maxRecallChars?: number
  quarantinePersonalData?: boolean
  auditLimit?: number
}
export declare class MemoryGuardianStore {
  constructor(options: MemoryGuardianOptions)
  init(): Promise<this>
  remember(input: Record<string, unknown>): Promise<Record<string, unknown>>
  search(input: Record<string, unknown>): Promise<Record<string, unknown>>
  update(id: string, patch: Record<string, unknown>): Promise<MemoryRecord>
  archive(id: string, reason?: string): Promise<MemoryRecord>
  restore(id: string): Promise<MemoryRecord>
  approve(id: string, options?: { resolution?: 'replace' | 'coexist'; expectedToken?: string }): Promise<MemoryRecord>
  reject(id: string, reason?: string): Promise<MemoryRecord>
  snapshot(): Record<string, unknown>
  exportData(): Record<string, unknown>
}
export declare function detectSensitiveContent(content: string): { blocked: string[]; review: string[] }
export declare function normalizeMemoryContent(content: string): string
export declare function tokenize(content: string): string[]
export { normalizeProjectKey, resolveMemoryScope } from './scope.js'
