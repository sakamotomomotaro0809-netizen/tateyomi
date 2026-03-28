# AI Agent Guardrails: context-optimization

> AIエージェントの安全な動作を保証するためのガードレール定義。コンテキスト最適化作業における権限境界、リソース制限、承認ゲートを規定。

## 1. 概要

| 項目 | 値 |
|------|-----|
| 対象プロジェクト | context-optimization（Claude Codeコンテキスト最適化） |
| 定義日 | 2026-02-15 |
| バージョン | 1.0 |
| 適用範囲 | スキル/MCP/CLAUDE.md最適化作業全般 |

---

## 2. Permission Boundaries（権限境界）

### 2.1 ファイルシステム

| パス | Read | Write | Delete | 理由 |
|------|------|-------|--------|------|
| `.claude/skills/` | ✅ | ✅ | ❌ | スキル編集（削除は承認必要） |
| `.claude/settings.json` | ✅ | ✅ | ❌ | MCP無効化設定 |
| `.claude/CLAUDE.md` | ✅ | ✅ | ❌ | Progressive Disclosure化 |
| `.claude/rules/` | ✅ | ✅ | ❌ | L2/L3ドキュメント |
| `.kiro/specs/context-optimization/` | ✅ | ✅ | ❌ | 仕様書管理 |
| `scripts/` | ✅ | ✅ | ✅ | 自動化スクリプト |
| `.claude/hooks/data/` | ✅ | ✅ | ❌ | メトリクスログ |
| `.claude/backups/` | ✅ | ✅ | ❌ | バックアップ保存 |
| `.env` | ❌ | ❌ | ❌ | 機密情報（厳格禁止） |
| `.mcp.json` | ✅ | ❌ | ❌ | Read-only（変更は手動） |
| `~/.claude.json` | ❌ | ❌ | ❌ | グローバル設定（厳格禁止） |
| `~/.ssh/` | ❌ | ❌ | ❌ | SSH鍵（厳格禁止） |
| `/` | ❌ | ❌ | ❌ | ルート（危険） |

**禁止パターン:**
- `.env*`（環境変数ファイル）
- `secrets/`（機密情報）
- `node_modules/`（依存関係）
- `~/.*`（ホームディレクトリドットファイル）

### 2.2 コマンド実行

| カテゴリ | 許可 | ブロック | 備考 |
|---------|------|---------|------|
| **メトリクス収集** | `cat .claude/hooks/data/context-metrics.jsonl` | - | 常時許可 |
| **設定検証** | `jq . .claude/settings.json`, `yamllint` | - | 構文チェック |
| **バックアップ** | `cp`, `rsync` (.claude/backups/へ) | - | 自動バックアップ |
| **Git (Read)** | `git status`, `git log`, `git diff` | - | 常時許可 |
| **Git (Write)** | `git add`, `git commit` | `git push --force`, `git reset --hard` | 危険操作はブロック |
| **スキル検証** | `grep -r "disable-model-invocation" .claude/skills/` | - | 設定確認 |
| **JSON/YAML処理** | `jq`, `yq` | - | 設定ファイル編集 |
| **ログ分析** | `grep`, `awk`, `tail` (context-metrics.jsonl) | - | メトリクス解析 |
| **システム** | - | `rm -rf`, `sudo`, `chmod 777`, `chown` | 常時ブロック |

**禁止コマンド（厳格）:**
- `rm -rf /`（システム破壊）
- `sudo`（権限昇格）
- `chmod 777`（権限緩和）
- `curl | sh`（外部スクリプト実行）
- `eval`（コード実行）

### 2.3 API/MCP呼び出し

| MCP/API | 許可 | 制限 | 備考 |
|---------|------|------|------|
| **filesystem** | Read: 許可, Write: 許可 | 2.1のパス制限に従う | |
| **github** | Read: 許可 | Write: 要承認 | PR/Issue作成は承認後 |
| **slack** | 通知: 許可 | - | アラート通知のみ |
| **pexels** | Read: 許可 | - | disabledMcpServersで無効化済み |
| **puppeteer** | - | ブロック | disabledMcpServersで無効化済み |
| **browser-use** | - | ブロック | disabledMcpServersで無効化済み |
| **playwright** | - | ブロック | disabledMcpServersで無効化済み |

**MCP無効化ポリシー（REQ-003）:**
- プロジェクトで使用しないMCPサーバーは`.claude/settings.json`のdisabledMcpServersに追加
- 無効化対象: pexels, pixabay, puppeteer, browser-use, playwright（context-optimizationでは不要）

---

## 3. Resource Limits（リソース制限）

| リソース | 制限値 | 理由 | 違反時の動作 |
|---------|--------|------|-------------|
| **最大実行時間** | 5分/スクリプト | 無限ループ防止、Hook実行制約 | タイムアウト、エラーログ出力 |
| **最大ファイルサイズ** | 500KB/スキルファイル | コンテキスト保護 | 警告、分離推奨 |
| **最大出力行数** | 1000行/ログ | コンテキスト保護 | tail -n 1000で切り詰め |
| **最大API呼び出し** | 50回/セッション | レート制限 | エラー、リトライ推奨 |
| **最大同時実行** | 3並列タスク | リソース保護 | キューイング |
| **初期コンテキスト消費** | 40,000 tokens以下（REQ-900） | セッション品質保証 | アラート、ロールバック |
| **スキル本文サイズ** | 200行以下 | instructions.md分離（REQ-004） | 分離推奨 |
| **CLAUDE.md基本層** | 100行以下（REQ-005） | Progressive Disclosure | L2/L3に分離 |

**計測・監視:**
- `.claude/hooks/data/context-metrics.jsonl` に記録
- `initial_context_tokens` フィールドで監視
- 50,000 tokensを超えた場合に即座にアラート（REQ-812）

---

## 4. Human-in-the-Loop Gates（承認ゲート）

### 4.1 必須承認（常に人間の承認が必要）

| アクション | 理由 | 承認者 | 関連要件 |
|-----------|------|--------|---------|
| `.claude/settings.json`の変更 | disabledMcpServersの変更は影響大 | ユーザー | REQ-003 |
| 100スキル以上の一括変更 | 大規模変更リスク | ユーザー | REQ-001, REQ-002 |
| `.claude/CLAUDE.md`の削除 | プロジェクト設定の破壊 | ユーザー | REQ-005 |
| `.mcp.json`の変更 | グローバルMCP設定への影響 | ユーザー | - |
| スキルのアーカイブ（30個以上） | 大量削除リスク | ユーザー | REQ-006 |
| カナリアリリースの全展開（100%） | 品質確認後のみ | ユーザー | REQ-813 |

### 4.2 条件付き承認（特定条件で承認が必要）

| アクション | 条件 | 承認者 | 関連要件 |
|-----------|------|--------|---------|
| スキル削除 | 5ファイル以上 | ユーザー | REQ-006 |
| disabledMcpServersへの追加 | 3個以上のMCP無効化 | ユーザー | REQ-003 |
| CLAUDE.mdのL2/L3分離 | 初回実施時 | ユーザー | REQ-005 |
| instructions.md作成 | 10スキル以上の一括作成 | ユーザー | REQ-004 |
| メトリクス閾値変更 | initial_context_tokens上限の変更 | ユーザー | REQ-812 |
| ロールバック実行 | 自動ロールバック失敗時 | ユーザー | REQ-814 |

### 4.3 自動許可（承認不要）

| アクション | 条件 | 関連要件 |
|-----------|------|---------|
| スキルdescription英語化 | 50文字以内への短縮 | REQ-001 |
| disable-model-invocation設定追加 | 手動呼び出しスキルのみ | REQ-002 |
| メトリクス収集 | context-metrics.jsonlへの追記 | REQ-810 |
| バックアップ作成 | .claude/backups/への保存 | REQ-814 |
| ログ分析 | context-metrics.jsonlのread-only操作 | REQ-811 |
| 設定ファイル検証 | JSON/YAML文法チェック | REQ-800 |

---

## 5. Audit Trail Requirements（監査証跡）

### 5.1 ログ必須項目

| イベント | 記録内容 | 保持期間 | ファイルパス |
|---------|---------|---------|-------------|
| セッション開始/終了 | session_id, initial_context_tokens, session_duration_minutes, compact_count | 90日 | `.claude/hooks/data/context-metrics.jsonl` |
| スキル変更 | スキル名、変更種別（description/disable-model-invocation）、変更前後の値 | 90日 | `.claude/hooks/data/audit.log` |
| MCP設定変更 | disabledMcpServers追加/削除、MCP名 | 90日 | `.claude/hooks/data/audit.log` |
| メトリクス異常 | initial_context_tokens > 50000, tool_call_error_rate > 1% | 30日 | `.claude/hooks/data/alert.log` |
| 承認/却下 | アクション、判定、理由、承認者 | 1年 | `.claude/hooks/data/approval.log` |
| ロールバック | 実行日時、理由、復元先バージョン | 1年 | `.claude/hooks/data/rollback.log` |

### 5.2 ログフォーマット

**context-metrics.jsonl（JSONL形式、1行1セッション）:**

```json
{
  "timestamp": "2026-02-15T10:30:00Z",
  "session_id": "sess_abc123",
  "initial_context_tokens": 38500,
  "session_duration_minutes": 135,
  "compact_count": 1,
  "tool_calls_total": 48,
  "tool_call_errors": 0,
  "tool_call_error_rate": 0.0,
  "skills_invoked": ["sdd-design", "sdd-tasks", "sdd-threat"],
  "mcp_active_count": 3,
  "disabled_mcps": ["pexels", "pixabay", "puppeteer", "browser-use"]
}
```

**audit.log（Plain text形式）:**

```
2026-02-15 10:30:00 [SKILL_CHANGE] skill=sdd-design field=description before_length=120 after_length=48 by=automation
2026-02-15 10:31:00 [SKILL_CHANGE] skill=sdd-tasks field=disable-model-invocation before=false after=true by=automation
2026-02-15 10:32:00 [MCP_CHANGE] action=disable mcp=pexels by=user approved=true
```

### 5.3 セッションサマリー

各セッション終了時に自動生成（`.claude/hooks/data/session-summary.md`に追記）:

```markdown
## Session Summary: sess_abc123

**Date**: 2026-02-15 10:30:00
**Duration**: 135 minutes
**Initial Context**: 38,500 tokens ✅ (Target: ≤40,000)
**Compact Count**: 1 ✅ (Target: ≤1/hour)

### Changes Made
1. `.claude/skills/sdd-design/skill.md` - Added `disable-model-invocation: true`
2. `.claude/skills/sdd-tasks/skill.md` - Shortened description to 48 chars
3. `.claude/settings.json` - Added `pexels` to disabledMcpServers

### Metrics
- Tool Calls: 48 (0 errors, 0% error rate) ✅
- Skills Invoked: 3 (sdd-design, sdd-tasks, sdd-threat)
- Active MCPs: 3 (filesystem, github, slack)

### Alerts
None

### Status
✅ All targets met
```

---

## 6. Error Handling（エラー処理）

### 6.1 エラー時の動作

| エラー種別 | 動作 | 通知 | 関連要件 |
|-----------|------|------|---------|
| **権限エラー** | 即時停止、ユーザーに報告 | 必須（Slack/Discord） | - |
| **initial_context_tokens > 50,000** | アラート、原因特定、自動ロールバック検討 | 必須（REQ-812） | REQ-900, REQ-812 |
| **tool_call_error_rate > 1%** | 即時ロールバック、インシデントレポート作成 | 必須（REQ-812） | REQ-903, REQ-814 |
| **設定ファイル構文エラー** | バックアップから自動復元 | 必須 | REQ-800 |
| **機密情報検出（.env等）** | コミット拒否、警告出力 | 必須 | REQ-801 |
| **メトリクス記録失敗** | セッション継続、stderr警告 | 任意 | REQ-810 |
| **スキル呼び出し失敗** | リトライ(3回)、失敗時エラーログ | 任意 | REQ-903 |

### 6.2 ロールバック

| 条件 | アクション | タイムアウト | 関連要件 |
|------|-----------|-------------|---------|
| **tool_call_error_rate > 1%** | 前バージョンに自動ロールバック | 30秒以内 | REQ-814 |
| **session_completion_rate < 85%** | 前バージョンに自動ロールバック | 30秒以内 | REQ-814 |
| **initial_context_tokens > 50,000** | カナリアリリース停止、ロールバック検討 | 1分以内 | REQ-813 |
| **バックアップ不在** | 手動ロールバック手順を表示、ユーザー操作待ち | - | REQ-814 |

**ロールバック手順:**
1. `.claude/backups/` から最新バックアップを検出
2. `rsync -a .claude/backups/latest/ .claude/` で復元
3. Git diff で変更差分を確認
4. `git checkout .` で未コミット変更を破棄（オプション）
5. ロールバックログを `.claude/hooks/data/rollback.log` に記録

---

## 7. Workflow Rules（ワークフロールール）

### 7.1 フェーズ制約

| フェーズ | 許可スキル | ブロックスキル | 関連ドキュメント |
|---------|-----------|---------------|-----------------|
| **Phase 0（診断）** | context-warehouse-diagnostic, mcp-health | 実装系スキル | - |
| **Phase 1（要件定義）** | sdd-req100, research | 実装系スキル | requirements.md |
| **Phase 2（設計）** | sdd-design, sdd-threat, sdd-adr | 実装系スキル | design.md, threats.md |
| **Phase 3（実装）** | 全て（スキル編集、設定変更） | - | tasks.md |
| **Phase 4（テスト）** | test系, メトリクス収集 | デプロイ系 | slos.md |
| **Phase 5（カナリアリリース）** | deploy系, モニタリング | 大規模変更 | runbook.md |
| **Phase 6（本番展開）** | deploy系, ロールバック | 開発系（緊急時除く） | runbook.md |

### 7.2 品質ゲート

| ゲート | 条件 | 次フェーズ移行 | 関連要件 |
|--------|------|---------------|---------|
| **要件承認** | C.U.T.E. ≥ 98/100 | 設計フェーズへ | REQ-900, REQ-901, REQ-902 |
| **設計レビュー** | C4モデル完成、STRIDE脅威分析完了 | 実装フェーズへ | design.md, threats.md |
| **実装完了** | 全タスク完了、メトリクス収集確認 | テストフェーズへ | tasks.md, REQ-810 |
| **テスト完了** | tool_call_error_rate < 1%, initial_context_tokens ≤ 40K | カナリアリリースへ | REQ-900, REQ-903 |
| **カナリア成功（10%）** | 24時間監視、品質劣化5%未満 | カナリア50%へ | REQ-813 |
| **カナリア成功（50%）** | 48時間監視、品質劣化5%未満 | 本番展開100%へ | REQ-813 |
| **本番展開** | 全メトリクス目標達成、SLO準拠 | 運用フェーズへ | slos.md, REQ-900-904 |

### 7.3 カナリアリリース制約（REQ-813）

| カナリア率 | 監視期間 | 成功条件 | 失敗時の動作 |
|-----------|---------|---------|-------------|
| **10%** | 24時間 | tool_call_success_rate劣化 < 5%, initial_context_tokens ≤ 40K | 即座にロールバック |
| **50%** | 48時間 | tool_call_success_rate劣化 < 5%, session_completion_rate ≥ 90% | 即座にロールバック |
| **100%** | 7日間 | 全SLO達成、エラーバジェット50%以上残存 | 問題発生時はロールバック |

**カナリア制御ファイル:**
- `.claude/hooks/data/canary-config.json`

```json
{
  "canary_percentage": 10,
  "start_time": "2026-02-20T00:00:00Z",
  "monitoring_window_hours": 24,
  "rollback_on_failure": true,
  "success_criteria": {
    "tool_call_success_rate_degradation_max": 0.05,
    "initial_context_tokens_max": 40000,
    "session_completion_rate_min": 0.90
  }
}
```

---

## 8. Security Guardrails（セキュリティガードレール）

### 8.1 機密情報保護（REQ-801）

**検出パターン:**
```regex
(api[_-]?key|token|password|secret|credential|private[_-]?key|access[_-]?key)
```

**禁止ファイル:**
- `.env*`
- `secrets/`
- `~/.ssh/`
- `~/.aws/`

**検証タイミング:**
- Git commit前（Pre-commit hook）
- スキルファイル編集時
- 設定ファイル変更時

### 8.2 設定ファイル検証（REQ-800）

**検証項目:**
1. JSON/YAML文法チェック（`jq`, `yamllint`）
2. スキーマ検証（JSONSchema）
3. 存在しないスキル/MCP名の検出
4. 循環参照の検出

**検証タイミング:**
- `.claude/settings.json` 変更時
- `.mcp.json` 変更時（Read-onlyだが念のため）
- スキル`skill.md` 変更時

### 8.3 監査ログ保護（REQ-802）

**要件:**
- append-onlyモード（上書き禁止）
- 権限: 644（所有者書き込み、全員読み取り）
- 改ざん検知: SHA256ハッシュチェーン

**ログファイル:**
- `.claude/hooks/data/audit.log`
- `.claude/hooks/data/rollback.log`
- `.claude/hooks/data/approval.log`

---

## 9. Monitoring & Alerting（監視とアラート）

### 9.1 リアルタイム監視（REQ-810, REQ-812）

| メトリクス | 閾値 | アラート条件 | 通知先 |
|-----------|------|-------------|--------|
| **initial_context_tokens** | 40,000 | > 50,000 | Slack, Discord, Email |
| **tool_call_error_rate** | 1% | > 1% | Slack, Discord, Email |
| **session_completion_rate** | 90% | < 85% | Slack, Discord |
| **compact_count / session_duration_minutes × 60** | 1.0 | > 1.5 | Slack |

### 9.2 ダッシュボード（REQ-811）

**生成タイミング:**
- 毎週月曜日 00:00（自動）
- 手動実行: `scripts/generate-dashboard.sh`

**ダッシュボード内容:**
- Before/After比較表（初期コンテキスト、セッション継続時間）
- トレンドグラフ（ASCII art）
- スキル別メトリクス
- MCP別メトリクス

**ファイルパス:**
- `.claude/hooks/data/metrics-dashboard.md`

---

## 10. 関連ドキュメント

| ドキュメント | 説明 | パス |
|-------------|------|------|
| **CLAUDE.md** | グローバルルール、WORKFLOW FIDELITY CONTRACT | `.claude/CLAUDE.md` |
| **requirements.md** | 要件定義（C.U.T.E. 100/100） | `.kiro/specs/context-optimization/requirements.md` |
| **design.md** | C4アーキテクチャ設計 | `.kiro/specs/context-optimization/design.md` |
| **tasks.md** | Kiroタスク分解（26タスク、10週間） | `.kiro/specs/context-optimization/tasks.md` |
| **threats.md** | STRIDE脅威分析（26脅威） | `.kiro/specs/context-optimization/threats.md` |
| **slos.md** | SLO/SLI定義（19 SLI, 17 SLO） | `.kiro/specs/context-optimization/slos.md` |
| **runbook.md** | 運用手順書（インシデント対応、デプロイ、ロールバック） | `.kiro/specs/context-optimization/runbook.md` |
| **adr.md** | アーキテクチャ決定記録（10 ADR） | `.kiro/specs/context-optimization/adr.md` |

---

## 11. Compliance & Governance（コンプライアンス・ガバナンス）

### 11.1 Anthropic Constitutional AI原則準拠

| 原則 | 実装 |
|------|------|
| **Safety** | 機密情報保護（REQ-801）、設定ファイル検証（REQ-800） |
| **Transparency** | 監査ログ（REQ-802）、セッションサマリー自動生成 |
| **Beneficial** | コンテキスト効率化によるユーザー生産性向上（REQ-900-904） |
| **Honest** | メトリクス改ざん防止、append-onlyログ |

### 11.2 変更管理ポリシー

| 変更種別 | 承認レベル | 文書化 | テスト要件 |
|---------|-----------|--------|-----------|
| **スキルdescription変更** | 自動許可 | audit.log | 文法チェック |
| **disable-model-invocation追加** | 自動許可 | audit.log | スキル呼び出しテスト |
| **disabledMcpServers追加** | 条件付き承認 | audit.log, approval.log | セッション起動テスト |
| **CLAUDE.md分離** | 必須承認 | audit.log, approval.log, ADR | 全メトリクス回帰テスト |
| **カナリアリリース展開** | 必須承認 | canary-config.json | 24-48時間監視 |

### 11.3 ロールバックポリシー

**自動ロールバック条件（REQ-814）:**
1. tool_call_error_rate > 1%
2. session_completion_rate < 85%
3. initial_context_tokens > 50,000（カナリア時）

**手動ロールバック条件:**
1. ユーザーからの明示的な要求
2. セキュリティインシデント検出
3. データ整合性異常

**ロールバック時間目標:**
- 30秒以内（自動）
- 5分以内（手動）

---

## 12. Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-15 | 初版作成（context-optimization向け完全定義） | AI Agent |

---

**Generated by**: sdd-guardrails (SDD Full Pipeline Phase 8)
**Date**: 2026-02-15
**Total Sections**: 12
**Related ADRs**: ADR-001, ADR-002, ADR-003, ADR-005, ADR-008, ADR-009
**Related Requirements**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-800, REQ-801, REQ-802, REQ-810, REQ-812, REQ-813, REQ-814, REQ-900, REQ-901, REQ-902, REQ-903, REQ-904
