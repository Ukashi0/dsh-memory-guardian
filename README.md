# DSH Memory Guardian

面向 DeepSeek Harness 的**可治理长期记忆插件**：自带本地存储、模型工具和高级 Web 面板，让 Agent 不仅能跨会话记住信息，还能解释“记住了什么、为什么召回、是否存在冲突、占用了多少上下文”。

> English: Local-first, governed long-term memory for DeepSeek Harness. It adds provenance, scope isolation, secret rejection, conflict review, bounded recall, model tools, and a polished native Web dashboard.

当前版本：`0.1.1-beta.1`（Beta），已发布到 npm。源码和构建产物已同步；实际兼容性需按使用的 DSH 版本验证。

## 它解决什么问题

普通 Memory 插件通常关注“存进去、搜出来”。Memory Guardian 额外处理更难的四件事：

- **记忆安全**：密码、Token、私钥等在写入磁盘之前直接拒绝；邮箱、手机号等个人信息默认进入隔离区。
- **记忆准确性**：同一语义键出现新旧不同内容时，不静默覆盖，而是建立冲突并等待确认。
- **上下文预算**：每次召回同时限制条数和字符数，避免整库内容被塞入 Prompt。
- **可解释性**：每条记忆保留来源、作用域、重要性、召回次数、风险和生命周期记录。

插件完全独立，不要求先安装 Memmy、ExpMem 或向量数据库，也不会主动访问网络。

## 界面

安装后打开：

```text
Settings → Memory Guardian
```

面板包含：

| 页面 | 用途 |
|---|---|
| Memory Vault | 浏览 Active、Review、Archived 记忆，查看来源与作用域，固定或归档 |
| Recall Lab | 输入查询，模拟真实召回，查看相关性得分和预算消耗 |
| Review Queue | 查看新旧内容，选择替代、同时保留或拒绝；未批准内容不会进入召回 |
| Privacy Ledger | 查看创建、去重、隔离、召回、归档和凭据拦截记录 |

界面跟随 DSH 明暗主题，支持键盘焦点、移动端响应式布局和 `prefers-reduced-motion`。

## 模型工具

插件向 Agent 注册三个原生工具：

| 工具 | 说明 |
|---|---|
| `memory_remember` | 保存一条长期信息；自动去重、敏感检测和冲突隔离 |
| `memory_search` | 先检查词法相关性，再按相关性、重要性、新近度和固定状态排序；并存记录整组执行预算 |
| `memory_forget` | 将指定记忆归档并立即排除出召回结果，可在面板恢复 |

同时加入一段简短 Memory Policy，告诉模型何时搜索、何时保存以及哪些内容禁止保存。

用户在会话中明确使用以下格式时，也能自动保存：

```text
记住：这个项目统一使用 pnpm
请记住发布前必须运行 npm test
remember: I prefer concise answers
```

普通聊天不会被整段自动抓取。

## 安装

已发布的测试版使用 `beta` 标签安装。已安装 `dsh` 命令时：

```bash
dsh plugin --profile web add dsh-memory-guardian@beta
dsh web
```

也可以通过 `npx` 启动 DSH 完成安装：

```powershell
npx @deepseek-ai/dsh plugin --profile web add dsh-memory-guardian@beta
npx @deepseek-ai/dsh web
```

本地开发安装：

```powershell
cd D:\path\to\parent
npx @deepseek-ai/dsh plugin --profile web add ./dsh-memory-guardian
npx @deepseek-ai/dsh web
```

也可安装预先构建的独立压缩包：

```powershell
npx @deepseek-ai/dsh plugin --profile web add ./dsh-memory-guardian-0.1.1-beta.1.tgz
```

这个安装包仅包含 Memory Guardian。它不依赖 Context Sentinel。通过本地目录链接安装时，请保留该目录；安装 tgz 文件则使用包中的构建产物。

## 兼容性

- DeepSeek Harness：`0.1.2-rc.1` 或更高版本
- Node.js：22 或更高版本
- 运行模式：Web Profile（Host 存储和模型工具也可用于其他包含所需服务的 Profile）
- 运行时第三方依赖：无

插件直接使用 `ctx.tools`、`ctx.systemPrompt`、`session/event` 和可选的 `ctx.webServer`、`ctx.sessions`，不依赖旧版 `conversationEvents` / `uiConversation` 服务。

## 配置

Bundle 默认配置：

```yaml
- insert:
    - id: memory-guardian
      name: dsh-memory-guardian
      config:
        maxRecords: 10000
        maxRecallItems: 8
        maxRecallChars: 6000
        captureExplicitRequests: true
        quarantinePersonalData: true
```

| 配置项 | 默认值 | 说明 |
|---|---:|---|
| `storagePath` | `~/.dsh/memory-guardian/store.json` | 本地存储文件；API 不暴露真实路径 |
| `maxRecords` | `10000` | 最大记录数，上限 100000 |
| `maxRecallItems` | `8` | 单次召回最大条数，上限 50 |
| `maxRecallChars` | `6000` | 召回正文字符预算，配置下限 256，上限 100000；不包含工具说明和元数据 |
| `captureExplicitRequests` | `true` | 是否识别“记住：……”等明确保存请求 |
| `quarantinePersonalData` | `true` | 邮箱、手机号、身份证号是否必须人工批准 |
| `auditLimit` | `500` | 本地治理记录数量，上限 5000 |

## 记忆数据模型

每条记录包含：

```text
content + semantic key + category + tags + importance
scope(global/project/agent/team) + provenance(session/event)
status(active/quarantined/archived) + risk + conflicts
created/updated/last recalled + recall count + optional expiry
```

`semantic key` 用来描述同一事实的稳定身份，例如 `preference.editor`。如果这个键已经对应“VS Code”，后来又保存“Zed”，新记录会进入 Review Queue，而不是悄悄让两条矛盾记忆同时影响模型。

## 检索与审核行为

- **先判断是否匹配，再排序**：查询须命中正文、标签或 key 中的词元，或满足非空词法查询的子串匹配。多字中文查询不会仅凭一个相同汉字进入候选；重要性、时间和固定状态只能给候选加分。分数不是准确率，词法匹配也不保证语义正确。
- **替代旧记录**：同一 key、同一作用域的现有 Active 记录归档，新记录生效，作为一次持久化操作提交。
- **同时保留**：记录双方的并存关系。查询命中其中一条时，会把同主题、同作用域且可召回的备选一起返回，并提示模型结合适用条件理解。
- **预算不足**：同主题多条记录作为一组；条数或正文预算容不下整组时，整组跳过并返回 `coexistence-budget` 提示。可增加预算、归档不需要的记录，或明确作用域和 key。
- **重新审核**：恢复已归档记录、修改内容/key/作用域、去重时补上 key，都会重新检查冲突。修改固定状态等元数据不会撤销已有并存关系。
- **审核过期**：界面提交所看到记录的 `reviewToken`。新旧内容或冲突集合变化后，服务端返回 HTTP 409，界面刷新后再由用户选择。

## 项目范围与旧数据

项目标识统一使用规范化后的**绝对工作目录**。模型工具和“记住”事件使用 Session 的 `cwd`；面板添加和 Recall Lab 共用项目选择，可从已有会话/记忆目录中选择，也可手输绝对目录。没有 Session 目录时必须显式传入项目路径，或主动选择 Global，不能静默使用 `default`。

例如 `d:\\work\\demo\\` 与 `D:/work/demo/` 会归一为 `D:/work/demo`。这是路径文本规范化，不调用 realpath；符号链接、目录别名和 Windows 目录部分的大小写不会自动合并。

升级会继续读取 schemaVersion 1，不清空已有数据。旧 `project/default` 或相对路径记录标为“待绑定”，在所有查询中排除；请在 Memory Vault 详情中绑定实际目录，绑定后重新检查冲突。旧版本遗留的多条 Active 同 key 记录会以“未确认的同主题备选”提示，不会假定它们已经获准并存；可归档不需要的记录，或归档后恢复以进入新审核流程。

升级前建议备份现有 store.json。不要让多个 DSH 进程同时操作同一个存储文件。

## API

Web Profile 提供四个同源端点：

```text
GET  /memory-guardian/api/snapshot
POST /memory-guardian/api/search
POST /memory-guardian/api/mutate
GET  /memory-guardian/api/export
```

`mutate` 支持 `remember`、`update`、`archive`、`restore`、`approve`、`reject`。POST 请求必须使用 `application/json`，请求体限制为 32 KiB。

冲突批准请求示例（`expectedToken` 从 snapshot 中对应记录的 `reviewToken` 获取）：

```json
{
  "action": "approve",
  "id": "<待审核记录 ID>",
  "resolution": "replace",
  "expectedToken": "<当前 reviewToken>"
}
```

`resolution` 可为 `replace` 或 `coexist`；拒绝新记录使用 `action: "reject"`。冲突批准缺少选择/令牌返回 409 `review-required`，过期令牌返回 409 `review-stale`。普通个人信息审核仍可直接 approve，界面也会携带令牌。

snapshot 新增 `projects`、`metrics.unboundProjects`；记录新增 `coexistsWith`、`needsProjectBinding` 和待审核时的 `reviewToken`。search 新增 `coexistenceGroups`、`warnings` 和结果项的 `includedAsAlternative`。

不要在没有额外访问控制的情况下把 DSH Web 直接暴露到不可信网络。

## 隐私与安全边界

- 凭据规则在持久化之前运行；被拒绝内容只留下短指纹和规则名，不保存原文。
- 召回只读取 `active`、未过期且作用域可见的记录；尚未绑定的旧项目记录也会排除。
- 搜索审计只保存查询短指纹，不保存原始搜索词。
- 插件不会主动发起网络请求，也不依赖云端 Embedding。
- JSON 文件默认以仅当前用户可读写的权限创建；Windows 上的最终访问控制仍由用户账户和目录 ACL 决定。
- 本地存储目前**没有额外加密**。若设备或用户账户不可信，应结合磁盘加密或将 `storagePath` 放入受保护目录。

完整威胁模型见 [docs/privacy-and-security.md](./docs/privacy-and-security.md)。

## 开发与测试

```powershell
npm run check
npm test
npm run pack:check
```

自动化测试覆盖：

- 中英文检索分词和排序；
- 密码、Token、私钥写盘前拦截；
- 邮箱等个人信息隔离和批准；
- 精确去重与语义键冲突；
- 界面、API、模型工具与事件捕获的项目路径一致性，以及旧项目记忆绑定；
- 无关查询门槛、替代/并存、整组预算、过期审核与写入失败回滚；
- 归档、恢复重新检查冲突和文件重新加载；
- 三项模型工具、System Prompt Policy、Host API；
- 明确“记住”消息的 `session/event` 捕获；
- Web Settings 插槽与响应式/无障碍标记，以及前端表单和审核按钮的请求行为。

Host 测试使用模拟 DSH 服务；前端行为测试使用轻量 Hook 适配器执行真实入口的事件处理函数。这些测试不替代真实 React/DSH 页面验收，也不证明检索质量或隐私检测的完备性。

## 项目结构

```text
dsh-memory-guardian/
├─ src/
│  ├─ scope.js          # 各入口共用的作用域和项目目录规范化
│  ├─ store.js          # 本地存储、风险、去重、冲突与检索引擎
│  ├─ index.js          # Cordis Host、模型工具、事件捕获与 HTTP API
│  └─ client.js         # DSH 原生高级治理面板
├─ test/                # 单元、Host 集成和包结构测试
├─ docs/                # 架构、安全与发布说明
├─ cordis.patch.yml     # DSH Bundle Patch
└─ package.json
```

## 当前限制

- v0.1 使用可审计的本地词法检索，不包含 Embedding；这样零依赖、离线且结果可解释。
- 冲突检测依赖稳定 `semantic key`，不会假装通过简单文本规则理解所有语义矛盾。
- `project` 从 Agent Session 的 `cwd` 推导；面板需选择实际绝对目录，不使用默认项目占位符。
- JSON 事务队列只协调一个 Store 实例内的操作；没有跨进程文件锁或 fsync 断电持久性保证。
- 字符预算只计算记忆正文长度，元数据/提示文本和真实模型 Token 数需另行计入。
- 适配 Memmy、ExpMem 等外部 Provider 的接口已保留为后续方向，v0.1 不接管第三方数据库。

## License

[MIT](./LICENSE)
