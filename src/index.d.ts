export declare const name: 'dsh-memory-guardian'
export declare const inject: readonly ['tools', 'systemPrompt']
export declare const PLUGIN_VERSION: string
export declare const SNAPSHOT_PATH: string
export declare const SEARCH_PATH: string
export declare const MUTATE_PATH: string
export declare const EXPORT_PATH: string
export interface MemoryGuardianConfig {
  storagePath?: string
  maxRecords?: number
  maxRecallItems?: number
  maxRecallChars?: number
  captureExplicitRequests?: boolean
  quarantinePersonalData?: boolean
  auditLimit?: number
}
export declare function apply(ctx: unknown, config?: MemoryGuardianConfig): Promise<void | (() => void)>
export { MemoryGuardianStore, detectSensitiveContent, normalizeMemoryContent, tokenize, normalizeProjectKey, resolveMemoryScope } from './store.js'
