# 第三エージェント統合ドキュメント（ガバナンス）

このフォルダは、MCPツールが **100個以上** に増える前提で、
「会話（コンテキスト）の圧迫」を避けながら、ブラウザ操作・Web解析・RAG/DB操作を **安全に自動化** するための
**運用ルール（ガバナンス）** をまとめた場所です。

## ドキュメント一覧

### Runbooks (00-)
| File | Description |
|------|-------------|
| [00_RUNBOOK_0-12.md](./00_RUNBOOK_0-12.md) | 0〜12の「やること」を一本化した手順書 |

### Checklists (10-)
| File | Description |
|------|-------------|
| [10_CHECKLIST_ADD_MCP.md](./10_CHECKLIST_ADD_MCP.md) | 新しいMCPサーバー/ツールを追加するときのチェックリスト |
| [11_CHECKLIST_ADD_SKILL.md](./11_CHECKLIST_ADD_SKILL.md) | 新しいスキルを追加するときのチェックリスト |
| [12_CHECKLIST_ADD_INTERNAL_MCP.md](./12_CHECKLIST_ADD_INTERNAL_MCP.md) | 内部MCP追加チェックリスト |
| [13_CHECKLIST_ENABLE_INTERNAL_MCP_PROD.md](./13_CHECKLIST_ENABLE_INTERNAL_MCP_PROD.md) | 本番環境での内部MCP有効化チェックリスト |
| [14_CHECKLIST_ROLLBACK_INTERNAL_MCP.md](./14_CHECKLIST_ROLLBACK_INTERNAL_MCP.md) | 内部MCPロールバックチェックリスト |
| [15_CHECKLIST_OBS_REPORT.md](./15_CHECKLIST_OBS_REPORT.md) | 観測レポート運用チェックリスト |
| [16_CHECKLIST_CHROME_EXTENSIONS.md](./16_CHECKLIST_CHROME_EXTENSIONS.md) | Chrome拡張（専用プロファイル）運用チェックリスト |
| [17_CHECKLIST_PLAYWRIGHT_CDP.md](./17_CHECKLIST_PLAYWRIGHT_CDP.md) | Playwright CDP Session Reuseチェックリスト |
| [18_CHECKLIST_URL_BUNDLE_PIPELINE.md](./18_CHECKLIST_URL_BUNDLE_PIPELINE.md) | URL Bundle Pipelineチェックリスト |
| [19_CHECKLIST_ONE_COMMAND_PIPELINE.md](./19_CHECKLIST_ONE_COMMAND_PIPELINE.md) | One-Command Pipelineチェックリスト |
| [30_CHECKLIST_SCHEDULED_OPS_JOBS.md](./30_CHECKLIST_SCHEDULED_OPS_JOBS.md) | Scheduled Ops Jobs有効化チェックリスト (P18) |

### Technical Docs (20-)
| File | Description |
|------|-------------|
| [20_PROXY_MCP_MVP.md](./20_PROXY_MCP_MVP.md) | Proxy MCP MVP設計 |
| [21_HYBRID_ROUTER.md](./21_HYBRID_ROUTER.md) | ハイブリッドルーター設計 |
| [22_MEMORY_SYSTEM.md](./22_MEMORY_SYSTEM.md) | メモリシステム設計 |
| [23_CHROME_INTEGRATION.md](./23_CHROME_INTEGRATION.md) | Chrome統合設計 |
| [24_SKILLIZE.md](./24_SKILLIZE.md) | Skillize（URL→Skill変換）設計 |
| [25_SUPERVISOR.md](./25_SUPERVISOR.md) | Supervisor設計 |
| [26_PROXY_SINGLE_ENTRYPOINT.md](./26_PROXY_SINGLE_ENTRYPOINT.md) | Proxy 1本化設計 |
| [27_INTERNAL_MCP_ADD_STANDARD.md](./27_INTERNAL_MCP_ADD_STANDARD.md) | 内部MCP追加標準 |
| [28_PROD_ENABLEMENT_ROLLBACK.md](./28_PROD_ENABLEMENT_ROLLBACK.md) | 本番有効化・ロールバック手順 |
| [29_OBSERVABILITY_REPORTS.md](./29_OBSERVABILITY_REPORTS.md) | 観測レポート設計 |

### Ops & Automation (40-)
| File | Description |
|------|-------------|
| [45_SCHEDULED_OPS_JOBS.md](./45_SCHEDULED_OPS_JOBS.md) | Scheduled Ops Jobs設計 (P18) |

### Operations (30-)
| File | Description |
|------|-------------|
| [30_CHROME_EXTENSIONS_OPS.md](./30_CHROME_EXTENSIONS_OPS.md) | Chrome拡張（専用プロファイル）運用手順 |
| [31_PLAYWRIGHT_CDP_SESSION_REUSE.md](./31_PLAYWRIGHT_CDP_SESSION_REUSE.md) | Playwright CDP Session Reuse運用手順 |
| [32_URL_BUNDLE_PIPELINE.md](./32_URL_BUNDLE_PIPELINE.md) | URL Bundle Pipeline設計 |
| [33_ONE_COMMAND_PIPELINE.md](./33_ONE_COMMAND_PIPELINE.md) | One-Command Pipeline設計 |

## 最低限のルール（毎回これだけは守る）

1. 作業開始前に **GitHub Issue** を作る（Issueテンプレを使う）
2. **壊れない** が最優先。作業は小さく分け、必ず `npm test / lint / typecheck` を通す
3. MCPツールはむやみにClaude側へ増やさない
   → **Proxy（受付）で隠し、必要なときだけ使う**（会話が重くならない）
4. **通常は `.mcp.json` は proxy-only** を維持する（[26_PROXY_SINGLE_ENTRYPOINT.md](./26_PROXY_SINGLE_ENTRYPOINT.md) 参照）
5. **大量URL/データはチャットに貼らない** → `memory_add → refId` を使う

## 関連

- Issueテンプレ: `.github/ISSUE_TEMPLATE/agent-run-log.yml`
