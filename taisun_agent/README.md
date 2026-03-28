# TAISUN v2

**Unified Development & Marketing Platform** - AIエージェント、MCPツール、マーケティングスキルを統合した次世代開発プラットフォーム

[![CI](https://github.com/taiyousan15/taisun_agent/actions/workflows/ci.yml/badge.svg)](https://github.com/taiyousan15/taisun_agent/actions/workflows/ci.yml)
[![Security Scan](https://github.com/taiyousan15/taisun_agent/actions/workflows/security.yml/badge.svg)](https://github.com/taiyousan15/taisun_agent/actions/workflows/security.yml)
[![Node.js](https://img.shields.io/badge/Node.js-18.x%20%7C%2020.x-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-775%20passing-brightgreen)](https://github.com/taiyousan15/taisun_agent/actions)
[![Research Sources](https://img.shields.io/badge/Research%20Sources-133-blueviolet)](https://github.com/taiyousan15/taisun_agent/blob/main/.claude/skills/world-research/SKILL.md)

---

> **2026-02-16: v2.24.0 Bootstrap Safe Mode + インストール/アップデート手順整備**
>
> ### Bootstrap Safe Mode（Hook安全起動）
>
> | 変更 | 内容 |
> |------|------|
> | Bootstrap Safe Mode | `.workflow_state.json` 未作成時、ワークフロー系Hookを全スキップ |
> | 対象Hook | unified-guard / deviation-approval-guard / agent-enforcement-guard / workflow-fidelity-guard |
> | 効果 | 新規インストール・他プロジェクトでのセットアップ時にHookがブロックしなくなった |
> | 安全性 | `rm -rf` 等の危険コマンド検出は常に有効（スキップされない） |
>
> ### Mac / Windows インストール・アップデート手順
>
> #### 新規インストール（Mac）
>
> ```bash
> # 1. リポジトリをクローン
> git clone https://github.com/taiyousan15/taisun_agent.git ~/taisun_agent
> cd ~/taisun_agent
>
> # 2. セットアップ（依存関係 + Hook + スキル + エージェント一括）
> npm run taisun:setup
>
> # 3. 動作確認（100点であればOK）
> npm run taisun:diagnose
>
> # 4. 他プロジェクトで使う場合（シンボリックリンク）
> cd ~/your-project
> ln -s ~/taisun_agent/.claude .claude
> ln -s ~/taisun_agent/.mcp.json .mcp.json
> ```
>
> #### 新規インストール（Windows - PowerShell）
>
> ```powershell
> # 1. リポジトリをクローン
> git clone https://github.com/taiyousan15/taisun_agent.git $HOME\taisun_agent
> cd $HOME\taisun_agent
>
> # 2. セットアップ
> npm run taisun:setup
>
> # 3. 動作確認
> npm run taisun:diagnose
>
> # 4. 他プロジェクトで使う場合（シンボリックリンク、管理者権限で実行）
> cd $HOME\your-project
> New-Item -ItemType SymbolicLink -Path .claude -Target $HOME\taisun_agent\.claude
> New-Item -ItemType SymbolicLink -Path .mcp.json -Target $HOME\taisun_agent\.mcp.json
> ```
>
> #### アップデート（Mac）
>
> ```bash
> cd ~/taisun_agent
> git pull origin main
> npm run taisun:setup
> npm run taisun:diagnose   # 100点を確認
> ```
>
> #### アップデート（Windows - PowerShell）
>
> ```powershell
> cd $HOME\taisun_agent
> git pull origin main
> npm run taisun:setup
> npm run taisun:diagnose   # 100点を確認
> ```
>
> #### シンボリックリンクで引き継がれるもの
>
> | カテゴリ | パス | 引き継ぎ |
> |---------|------|---------|
> | スキル（101個） | `.claude/skills/` | 自動 |
> | エージェント（96個） | `.claude/agents/` | 自動 |
> | コマンド（82個） | `.claude/commands/` | 自動 |
> | Hook（13層防御） | `.claude/hooks/` | 自動 |
> | ルール | `.claude/rules/` | 自動 |
> | CLAUDE.md | `.claude/CLAUDE.md` | 自動 |
> | MCP設定 | `.mcp.json` | 自動 |
> | 環境変数 `.env` | プロジェクトルート | **手動コピー必要** |
> | `node_modules` | プロジェクトルート | **各プロジェクトで `npm install`** |
> | `.workflow_state.json` | プロジェクトルート | **プロジェクト固有**（`/workflow-start`で生成） |
>
> **注意**: Windowsのシンボリックリンク作成には管理者権限が必要です。PowerShellを「管理者として実行」してください。

> **2026-02-16: v2.23.0 world-research スキル公開**
>
> | 変更 | 内容 |
> |------|------|
> | world-research 公開 | `disable-model-invocation: true` を削除し、他ユーザーも利用可能に |
> | 対象機能 | API不要の6層リサーチ（学術論文・キュレーション・テックブログ・実装エコシステム・SNS・コミュニティ） |
> | 必要ツール | WebSearch / WebFetch のみ（Claude Code標準搭載） |
> | オプションAPI | Tavily / SerpAPI / Brave Search / NewsAPI / Perplexity（設定すれば精度向上） |
>
> ```bash
> # 更新方法
> npm run taisun:setup
> ```

> **2026-02-15: v2.22.0 診断100点達成 + Windows完全対応 + コンテキスト最適化全フェーズ完了**
>
> ### taisun:diagnose 100/100点
>
> | 項目 | スコア |
> |------|--------|
> | 13層防御システム | **13/13** |
> | Hooks設定 | **4/4** |
> | スキル | **101個** |
> | エージェント | **96個** |
> | MCPツール | **248個** |
> | メモリシステム | **5/5** |
> | **総合スコア** | **100/100点** |
>
> ### 修正内容（2026-02-15）
>
> | # | 修正 | 効果 |
> |---|------|------|
> | 1 | `deviation-approval-guard.js` (Layer 6) をgit追跡に追加 | 13層防御 11/13→13/13 |
> | 2 | `skill-mapping.json` (Layer 10) をgit追跡に追加 | Skill Auto-Select復旧 |
> | 3 | `taisun:setup` の chmod をクロスプラットフォーム化 | Windowsエラー解消 |
> | 4 | `taisun-diagnose.js` 修復コマンドを `npm run taisun:setup` に統一 | Windows対応 |
> | 5 | README全体のアップデート手順を統一 | Mac/Windows共通1コマンド |
>
> ### コンテキスト最適化 最終結果（75K → 30.2K tokens, -59.7%）
>
> SDD（Spec-Driven Development）に基づく4フェーズのコンテキスト最適化を完了。
> 初期コンテキスト消費量を **75K → 30.2K tokens** に削減（44.8K削減、59.7%）。
> セッション持続時間を 30分 → 182分（平均）に延長。
>
> ### 最終検証結果（2026-02-15）
>
> | 要件ID | 要件 | 目標 | 実績 | 判定 |
> |--------|------|------|------|------|
> | REQ-900 | トークン消費量 | ≤40K | **30.2K** | PASS |
> | REQ-901 | セッション持続時間 | ≥120分 | **182分** | PASS |
> | REQ-902 | 削減率 | ≥55% | **59.7%** | PASS |
> | REQ-903 | エラー率 | <1% | **0%** | PASS |
>
> ### フェーズ別達成状況
>
> | Phase | バージョン | 内容 | 削減量 | 判定 |
> |-------|-----------|------|--------|------|
> | Tier 1 | v2.17.0 | スキル最適化・MCP無効化・CLAUDE.md 3層化 | **35.0K** | PASS |
> | Tier 2 | v2.18.0 | Hook最適化・compact効率化・Progressive Disclosure | **3.0K** | PASS |
> | Tier 3 | v2.19.0 | コンテキスト圧縮・動的圧縮・履歴最適化 | **6.8K** | PASS |
> | Phase 4 | v2.20.0-v2.21.0 | メトリクス・ダッシュボード・異常検知・Canary・ロールバック・最終検証 | 品質保証 | PASS |
> | **合計** | **v2.21.0** | **全26タスク完了** | **44.8K** | **ALL PASS** |
>
> ### 品質保証システム（Phase 4）
>
> | コンポーネント | ファイル | 機能 |
> |---------------|---------|------|
> | セッションメトリクス | `.claude/hooks/session-metrics-collector.js` | セッション開始/終了/日次集計 |
> | ダッシュボード | `.claude/hooks/dashboard-generator.js` | 週次レポート・トレンド分析 |
> | 異常検知 | `.claude/hooks/anomaly-detector.js` | 6カテゴリ閾値ベース検知 |
> | Canaryリリース | `.claude/hooks/canary-controller.js` | 段階的展開（10%→50%→100%） |
> | ロールバック | `scripts/rollback-manager.sh` | 自動/手動ロールバック |
> | 最終検証 | `scripts/validate-final.sh` | REQ-900~903 総合検証 |
>
> ### 別プロジェクトへの適用ガイド（2026-02-15更新）
>
> #### Step 1: Tier 1 — 構造的最適化（-28〜43K tokens）
> ```bash
> # 1-1. スキル説明文の最適化（英語38文字以内に統一）
> python3 scripts/optimize-skills.py
> bash scripts/verify-skill-warehouse.sh
>
> # 1-2. 低頻度スキルのコンテキスト除外
> # → 各スキルのSKILL.mdに disable_model_invocation: true を追加
>
> # 1-3. 不要なMCPサーバーの無効化
> bash scripts/apply-mcp-preset.sh development  # or marketing / research
>
> # 1-4. CLAUDE.md 3層分割
> # L1: .claude/CLAUDE.md（≤100行、コアルールのみ）
> # L2: .claude/references/CLAUDE-L2.md（防御層、マッピング）
> # L3: .claude/references/CLAUDE-L3.md（専門ワークフロー）
> python3 scripts/doc-optimizer.py
> ```
>
> #### Step 2: Tier 2 — 運用最適化（-2.5〜3.5K tokens）
> ```bash
> # 2-1. Hook統合（複数hookを1つのunified-guardに統合）
> # → .claude/hooks/unified-guard.js 参照
>
> # 2-2. compact効率化
> # → .claude/hooks/compact-optimizer.js を配置
>
> # 2-3. Progressive Disclosure（段階的情報開示）
> # → .claude/hooks/progressive-loader.js を配置
> ```
>
> #### Step 3: Tier 3 — 長期最適化（-5〜10K tokens）
> ```bash
> # 3-1. 履歴最適化（JSONLファイルの自動トランケーション）
> # → .claude/hooks/history-optimizer.js を配置
>
> # 3-2. 動的圧縮（使用状況に応じた圧縮）
> # → .claude/hooks/dynamic-compressor.js を配置
>
> # 3-3. 重要度スコアリング
> # → .claude/hooks/importance-scorer.js を配置
> ```
>
> #### Step 4: Phase 4 — 品質保証（監視・ロールバック）
> ```bash
> # 4-1. メトリクス収集・ダッシュボード
> node .claude/hooks/session-metrics-collector.js status
> node .claude/hooks/dashboard-generator.js generate
>
> # 4-2. 異常検知
> node .claude/hooks/anomaly-detector.js scan
>
> # 4-3. バックアップ & ロールバック
> bash scripts/rollback-manager.sh backup
> bash scripts/rollback-manager.sh list
>
> # 4-4. 最終検証
> bash scripts/validate-final.sh
> bash scripts/generate-release-approval.sh
> ```
>
> ### アップデート（2026-02-15）
>
> **Mac / Linux:**
> ```bash
> cd ~/taisun_agent && git pull origin main && npm run taisun:setup
> ```
>
> **Windows (PowerShell):**
> ```powershell
> cd $HOME\taisun_agent; git pull origin main; npm run taisun:setup
> ```
>
> > **Note**: `npm run taisun:setup` は `npm install` → `build:all` → `chmod`（Mac/Linuxのみ自動スキップ）→ `taisun:diagnose` を一括実行します。
> > Windows環境では `chmod` は自動的にスキップされます。

---

> **2026-02-15: v2.17.0 コンテキスト最適化 Tier 1 完了（-28〜43K tokens）**
>
> コンテキストウィンドウの初期消費量を **67-90K → 40K以下** に削減。セッション持続時間を30分→120分+に延長。
>
> ### 実装内容
> | # | タスク | 内容 | 効果 |
> |---|--------|------|------|
> | T1.1 | スキル説明文最適化 | 99スキルを英語38文字以内に統一 | ~8-12K token削減 |
> | T1.2 | disable-model-invocation | 60+低頻度スキルにコンテキスト除外設定 | ~5-10K token削減 |
> | T1.3 | MCP選択的無効化 | 11サーバーを無効化 | ~5-8K token削減 |
> | T1.4 | CLAUDE.md 3層分割 | 213行→55行（L1/L2/L3構成） | ~10-13K token削減 |
> | T1.5 | 検証スクリプト | スキル品質チェック自動化 | 品質保証 |
> | T1.6 | MCPプリセット | development/marketing/research 3プロファイル | 運用効率化 |
> | T1.7 | Doc Optimizer | CLAUDE.md 3層構造バリデーション | 継続検証 |
> | T1.8 | 統合バリデーション | 全タスクの総合検証 | 品質確認 |
>
> ### 他プロジェクトへの適用手順
>
> **1. スキル最適化（T1.1 + T1.2）:**
> ```bash
> # DESCRIPTION_MAP を対象プロジェクトに合わせて編集後:
> python3 scripts/optimize-skills.py
> bash scripts/verify-skill-warehouse.sh  # 検証
> ```
>
> **2. MCP無効化（T1.3）:**
> ```bash
> # プリセット適用（development / marketing / research）:
> bash scripts/apply-mcp-preset.sh development
> # またはsettings.jsonに手動でdisabledMcpServersを追加
> ```
>
> **3. CLAUDE.md 3層分割（T1.4）:**
> - L1: `.claude/CLAUDE.md`（≤100行、コアルールのみ）
> - L2: `.claude/rules/CLAUDE-L2.md`（防御層、マッピング）
> - L3: `.claude/rules/CLAUDE-L3.md`（専門ワークフロー）
> ```bash
> python3 scripts/doc-optimizer.py  # 構造検証
> ```
>
> ### アップデート
>
> **Mac:**
> ```bash
> cd ~/taisun_agent && git pull origin main && npm run taisun:setup
> ```
>
> **Windows (PowerShell):**
> ```powershell
> cd $HOME\taisun_agent; git pull origin main; npm run taisun:setup
> ```

---

> **2026-02-14: v2.15.0 リポジトリリファクタリング & 軽量化（-807MB / -11,163行）**
>
> リポジトリの大規模リファクタリングを実施。壊れたサブモジュール（807MB）の削除、未使用パッケージ43個の整理、
> Hookシステムの共通化・分割を行い、コードベースを大幅に軽量化しました。
>
> ### Phase 1: リポジトリクリーンアップ
> | # | 実施内容 | 効果 |
> |---|---------|------|
> | 1 | 壊れたサブモジュール `taisun_agent/` 削除 | **-807MB** |
> | 2 | 未使用npmパッケージ3個削除（@anthropic-ai/sdk, @langchain/core, @langchain/langgraph） | package.json軽量化 |
> | 3 | `google-auth-system/` を.gitignore追加 | 959MBの追跡防止 |
> | 4 | `hooks.disabled.local/`（旧ガードコピー38ファイル）削除 | 混乱防止 |
> | 5 | `deviation-approval-guard.js` 完全削除 | ファイル新規作成ブロック解消 |
>
> ### Phase 2: readStdin() 共通化
> | # | 実施内容 | 効果 |
> |---|---------|------|
> | 1 | 7つのHookから重複関数を抽出 | `utils/read-stdin.js` に統合 |
> | 2 | 対象: unified-guard, definition-lint-gate, skill-usage-guard, workflow-sessionstart-injector, agent-enforcement-guard, session-handoff-generator, model-auto-switch | DRY原則適用 |
>
> ### Phase 3: workflow-state-manager.js 分割
> | # | 実施内容 | 効果 |
> |---|---------|------|
> | 1 | 1,019行のモノリスをFacadeパターンで4モジュールに分割 | 保守性向上 |
> | 2 | `utils/state-core.js`（188行）: 状態管理コア | 単一責任 |
> | 3 | `utils/baseline-manager.js`（144行）: ベースライン・Read履歴 | 単一責任 |
> | 4 | `utils/evidence-capture.js`（153行）: 証跡キャプチャ | 単一責任 |
> | 5 | `utils/skill-lifecycle.js`（520行）: スキルライフサイクル | 単一責任 |
> | 6 | 40個のexport全て後方互換維持 | 既存コード変更不要 |
>
> ### アップデート
>
> **Mac:**
> ```bash
> cd ~/taisun_agent && git pull origin main && npm run taisun:setup
> ```
>
> **Windows (PowerShell):**
> ```powershell
> cd $HOME\taisun_agent; git pull origin main; npm run taisun:setup
> ```

---

> **2026-02-13: v2.14.0 LLM Auto-Switch & Intent Parser統合 & メトリクスシステム**
>
> タスク複雑度に応じたモデル自動切替、Intent ParserとModelRouterの統合、
> Stage 1メトリクス収集システム、自動バックアップのlaunchd統合を実装しました。
>
> ### 主要機能
> | # | 機能 | 説明 |
> |---|------|------|
> | 1 | LLM Auto-Switch v2.0 | タスク複雑度ベースのモデル自動切替（Haiku/Sonnet/Opus） |
> | 2 | Intent Parser統合 | ユーザー意図の自動解析とModelRouterとのセッション統合 |
> | 3 | Stage 1 メトリクスシステム | 収集・集計・レポート生成の完全実装 |
> | 4 | 自動バックアップ launchd統合 | 5分ごと自動バックアップ + ログイン時復旧チェック |
> | 5 | 開発コマンド過剰ブロック解消 | npm install/test/build を自動許可に修正 |
> | 6 | URL Learning Pipeline | URL分析結果の学習・蓄積パイプライン |
>
> ### 新規追加ファイル
> | 種類 | 内容 |
> |------|------|
> | src/intent-parser/ | Intent Parser本体 + 分類器 + ストレージ |
> | src/unified-hooks/ | 統合Hookシステム |
> | cli/ | CLIジェネレーター |
> | scripts/launchd/ | macOS launchd自動バックアップ設定 |
> | tests/ | Intent Parser + Unified Hooksのテスト群 |
>
> ### アップデート
>
> **Mac:**
> ```bash
> cd ~/taisun_agent && git pull origin main && npm run taisun:setup
> ```
>
> **Windows (PowerShell):**
> ```powershell
> cd $HOME\taisun_agent; git pull origin main; npm run taisun:setup
> ```

---

> **2026-02-11: v2.13.0 セキュリティ監査 & スキルハードニング**
>
> Progent論文（arXiv:2504.11703）に基づくスキル権限分離とセキュリティ強化を実施しました。
> 72スキル全てにallowed-tools制限を適用し、攻撃成功率を理論上41.2%→2.2%に低減。
> 新規8スキル・4エージェント・6MCPサーバーも追加。
>
> ### セキュリティ監査（4項目完了）
> | # | 修正内容 | 対象 | リスク低減 |
> |---|---------|------|-----------|
> | 1 | YAML frontmatter欠落修正 | 6スキル | スキルディスカバリー復旧 |
> | 2 | allowed-tools権限分離 | 全72スキル | 攻撃成功率41.2%→2.2% |
> | 3 | APIキー集中管理 | .env統合+バリデーション | キー漏洩防止 |
> | 4 | MCPヘルスチェックv2 | 21サーバー自動検出 | 設定不備の即座検出 |
>
> ### allowed-toolsカテゴリ分類
> | カテゴリ | allowed-tools | スキル数 | Bash実行 |
> |---------|--------------|---------|---------|
> | Content Writing | Read,Write,Edit,Grep,Glob | 28 | 無し |
> | Research+Writing | Read,Write,Edit,Grep,Glob,WebFetch,WebSearch | 6 | 無し |
> | Execution | Read,Write,Edit,Bash,Grep,Glob | 38 | 有り |
>
> ### 新規追加
> | 種類 | 名前 | 説明 |
> |------|------|------|
> | スキル | ai-sdr | 自律営業パイプライン |
> | スキル | voice-ai | 電話+会話AI（Twilio+OpenAI Realtime） |
> | スキル | lead-scoring | リード評価・4次元スコアリング |
> | スキル | outreach-composer | マルチチャネルメッセージ作成 |
> | スキル | shorts-create | Instagram/YouTube Shorts自動生成 |
> | スキル | url-deep-analysis | URL完全解析（5層分析） |
> | スキル | keyword-to-gem | キーワード→NotebookLM Gem自動化 |
> | スキル | udemy-download | Udemyコース一括ダウンロード |
> | エージェント | sdr-coordinator | SDRパイプライン統合制御 |
> | エージェント | lead-qualifier | リード評価自動化 |
> | エージェント | outreach-agent | アウトリーチ実行 |
> | エージェント | voice-ai-agent | 音声AI制御 |
> | MCP | line-bot | LINE Bot メッセージ送信 |
> | MCP | voice-ai | Twilio+OpenAI音声通話 |
> | MCP | ai-sdr | 営業パイプライン |
> | MCP | twitter-client | X/Twitter Cookie認証 |
> | MCP | meta-ads | Meta広告管理・分析 |
> | MCP | facebook-ads-library | 競合広告分析 |
>
> ### 新規スクリプト
> ```bash
> bash scripts/validate-env.sh          # APIキー一括検証
> bash scripts/validate-env.sh --strict # 必須キー不足時にエラー終了
> bash scripts/mcp-health-check.sh      # MCPサーバー状態チェック（v2: 自動検出）
> ```
>
> ### アップデート
>
> **Mac:**
> ```bash
> cd ~/taisun_agent && git pull origin main && npm run taisun:setup
> ```
>
> **Windows (PowerShell):**
> ```powershell
> cd $HOME\taisun_agent; git pull origin main; npm run taisun:setup
> ```

---

> **2026-02-09: v1.1.0 Google Auth System - 5-Layer Fallback Google認証自動化**
>
> Playwright ベースの Google 認証を **5段階のフォールバック** で自動化するシステムを追加しました。
> 1回だけ手動ログインすれば、以降は Cookie や Chrome プロファイルを活用して全自動で認証済みブラウザを取得できます。
> 全4レベル × 7サイト = **140/140 (100%)** のテストに合格済みです。
>
> ### 5-Layer アーキテクチャ
>
> | Level | 戦略 | 速度 | 説明 |
> |:-----:|------|:----:|------|
> | 1 | StorageState | ~1秒 | 保存済み Cookie JSON から最速復元 |
> | 2 | PersistentContext | ~3秒 | Chrome プロファイルディレクトリを再利用 |
> | 3 | Patchright+Stealth | ~3秒 | ステルスブラウザ＋フィンガープリント偽装 |
> | 4 | CDP Connection | ~4秒 | Chrome DevTools Protocol 経由＋Cookie注入 |
> | 5 | Manual Login | 初回のみ | ブラウザが開き、手動でGoogleにログイン |
>
> ### 受け取り方法（3つの方法から選べます）
>
> | 方法 | こんな人向け | やること |
> |:----:|------------|---------|
> | **tarball** | ファイルを直接もらって使いたい人 | `.tgz` を受け取って `npm install` するだけ |
> | **GitHub Packages** | チームで npm レジストリ管理したい人 | `npm install @your-org/google-auth-system` |
> | **git URL** | GitHubから直接取り込みたい人 | `npm install git+ssh://git@github.com:...` |
>
> #### 方法1: tarball（ファイル直接渡し）- 最もシンプル
>
> `.tgz` ファイルを Slack や Google Drive で渡すだけ。レジストリもGitHubアカウントも不要です。
>
> ```bash
> # 配布する側: tarball を作成
> cd google-auth-system && npm pack
> # → google-auth-system-1.1.0.tgz が生成される。このファイルを相手に渡す
>
> # 受け取った側: インストール → 初回セットアップ
> npm install ./google-auth-system-1.1.0.tgz
> npx google-auth-setup    # Chrome が開くので Google アカウントでログイン（1回だけ）
> ```
>
> #### 方法2: GitHub Packages（プライベート npm レジストリ）
>
> チーム開発でバージョン管理とアクセス制御を行いたい場合に最適です。
>
> ```bash
> # .npmrc にレジストリを設定（1回だけ）
> echo "@your-org:registry=https://npm.pkg.github.com" >> .npmrc
>
> # インストール → 初回セットアップ
> npm install @your-org/google-auth-system
> npx google-auth-setup
> ```
>
> #### 方法3: git URL 直接インストール
>
> GitHub のリポジトリから直接インストール。レジストリ不要で始められます。
>
> ```bash
> npm install git+ssh://git@github.com:taiyousan15/jsystem2026.git
> npx google-auth-setup
> ```
>
> ### 使い方
>
> ```typescript
> import { GoogleAuthManager } from 'google-auth-system';
>
> // 認証（L1→L2→L3→L4→L5 の順で自動試行）
> const auth = new GoogleAuthManager();
> const result = await auth.authenticate();
>
> if (result.success) {
>   await result.page.goto('https://docs.google.com');  // 認証済みで操作可能
> }
>
> await auth.clearSession();  // セッション全クリア（Cookie + プロファイル）
> await auth.cleanup();       // ブラウザを閉じる
> ```
>
> ### CLI コマンド（ターミナルから直接実行）
>
> ```bash
> npx google-auth-setup                  # 初回セットアップ（Chromeが開いてログイン）
> npx google-auth-clear                  # 全セッションクリア
> npx google-auth-clear --storage-state  # Cookie JSONのみクリア
> npx google-auth-clear --profile        # Chromeプロファイルのみクリア
> ```

---

> **2026-02-09: v2.12.2 World Research v2.0 - 6層133ソース総合リサーチシステム**
>
> world-researchスキルを v1.0（SNS特化20+ソース）から v2.0（論文〜SNS完全網羅133ソース）に大幅拡張しました。
> Integration Testsのスキル名不一致も修正し、775テスト全パスを確認済みです。
>
> ### world-research v2.0 の6層アーキテクチャ
> | Layer | カテゴリ | ソース数 | 主要ソース |
> |-------|---------|---------|-----------|
> | 1 | 学術論文 | 9 | Arxiv, Papers with Code, OpenReview, Google Scholar, Semantic Scholar, Connected Papers, DBLP, ACL Anthology |
> | 2 | キュレーション | 19 | HF Daily Papers, @_akhaliq, Alpha Signal, The Batch, Import AI, Yannic Kilcher等 |
> | 3 | テックブログ | 18 | Lil'Log, Distill, Jay Alammar, Karpathy, Raschka, Chip Huyen, 企業研究ブログ10社 |
> | 4 | 実装エコシステム | 51 | HF Hub, awesome-*リポ13個, エージェントFW17個, MLOps12個, 教育9個 |
> | 5 | SNS | 22 | X, Reddit, YouTube, note, Bilibili, 知乎, 小红書, Medium, Qiita, Zenn等 |
> | 6 | コミュニティ | 14 | Discord 8サーバー, Slack 3, GitHub Discussions, Stack Overflow |
>
> ### 検索モード
> ```bash
> /world-research キーワード=Claude Code                              # 全層横断検索
> /world-research キーワード=ReAct Agent モード=academic               # 学術論文検索
> /world-research キーワード=multi-agent LLM モード=survey トラック=agent  # 論文サーベイ
> /world-research キーワード=RAG pipeline モード=ecosystem              # 実装エコシステム調査
> /world-research キーワード=MCP Server モード=deep                    # 深層調査（gpt-researcher統合）
> /world-research キーワード=生成AI 地域=日本,中国,米国                  # 地域別比較
> ```
>
> ### インストール・アップデート
>
> #### 通常アップデート（taisun_agentフォルダで作業中の場合）
>
> **Mac:**
> ```bash
> cd ~/taisun_agent && git pull origin main && npm run taisun:setup
> ```
>
> **Windows (PowerShell):**
> ```powershell
> cd $HOME\taisun_agent; git pull origin main; npm run taisun:setup
> ```
>
> #### 別フォルダからのアップデート / 他人への配布時
>
> **重要**: Claude Code内から別フォルダのtaisun_agentを更新すると、13層防御システム（Layer 6: Deviation Approval Guard）が`npm install`をブロックします。
> 以下の手順で**新しいターミナルウィンドウ**を開いて実行してください。
>
> **Mac（別ターミナルで実行）:**
> ```bash
> # ターミナル.app を新しく開いて以下を実行（Claude Code内ではなく通常のターミナル）
> cd ~/taisun_agent && git pull origin main && npm run taisun:setup
> ```
>
> **Mac（任意のパスにインストールした場合）:**
> ```bash
> # /path/to/taisun_agent を実際のパスに置き換え
> cd /path/to/taisun_agent && git pull origin main && npm run taisun:setup
> ```
>
> **Windows（別PowerShellで実行）:**
> ```powershell
> # 新しいPowerShellウィンドウを開いて以下を実行
> cd $HOME\taisun_agent; git pull origin main; npm run taisun:setup
> ```
>
> **Windows（任意のパスにインストールした場合）:**
> ```powershell
> # C:\path\to\taisun_agent を実際のパスに置き換え
> cd C:\path\to\taisun_agent; git pull origin main; npm run taisun:setup
> ```
>
> #### 初回インストール（Mac / Windows 共通）
> ```
> npx github:taiyousan15/jsystem2026
> ```
>
> #### トラブルシューティング
> | 症状 | 原因 | 解決策 |
> |------|------|--------|
> | `npm install`がブロックされる | Claude Code内から別プロジェクトフォルダを操作 | 新しいターミナルウィンドウで実行 |
> | `permission denied` | 権限不足 | Mac: `chmod -R u+w ~/taisun_agent` / Windows: 管理者PowerShellで実行 |
> | `git pull`で競合 | ローカル変更あり | `git stash && git pull origin main && git stash pop` |

---

> **2026-02-08: v2.12.1 World Research & 13層防御完全化**
>
> 全世界SNS横断リサーチスキル（v1.0）と、Layer 5/6/7フック登録による13層防御完全化を実施しました。
>
> | 機能 | 説明 |
> |------|------|
> | world-research v1.0 | 20+プラットフォーム横断リサーチ |
> | Layer 5 登録 | skill-usage-guard（スキル自動検出・マッピング） |
> | Layer 6 登録 | deviation-approval-guard（危険操作の検出・ブロック） |
> | Layer 7 登録 | agent-enforcement-guard（複雑タスクでTask tool強制） |

---

> **2026-02-08: v2.12.0 Context Guard統合 - コンテキスト枯渇防止システム 🛡️**
>
> Claude Code の `Conversation too long` エラーを防止するシステムを統合しました。
>
> ### インストール・アップデート（Mac / Windows 共通）
>
> **Step 1:** ターミナルを開く（Mac: ターミナル.app / Windows: PowerShell）
>
> **Step 2:** 以下をコピーして貼り付け → Enter
> ```
> npx github:taiyousan15/jsystem2026
> ```
>
> **Step 3:** ターミナルと Claude Code を再起動
>
> ### 何がインストールされるか
> | # | 内容 | 効果 |
> |---|------|------|
> | 1 | 監視スクリプト 3つ | ツールコール・エージェント数・CLAUDE.mdサイズを監視 |
> | 2 | 自動コンパクション 70% | デフォルト95%→70%で早期発動 |
> | 3 | Praetorian MCP | トークン90%+圧縮 |
> | 4 | Claude Historian MCP | 過去セッション検索 |
> | 5 | リサーチ委譲ルール | 並列Webリクエストの連鎖失敗を防止 |
>
> 詳細: [Context Guard リポジトリ](https://github.com/taiyousan15/jsystem2026)

---

> **2026-02-04: v2.11.0 Agent Trace統合 - AI生成コード帰属追跡 🔍**
>
> [Agent Trace仕様](https://agent-trace.dev/)に準拠したAI生成コードの帰属追跡システムを導入しました。
>
> ### 新機能
> | 機能 | 説明 |
> |------|------|
> | 🔍 **自動トレース記録** | 全Edit/Write操作を自動追跡 |
> | 📊 **貢献率可視化** | AI/人間の貢献を明確に区別 |
> | 📋 **コンプライアンス対応** | 監査用レポート自動生成 |
> | 🗄️ **アーカイブ機能** | 古いトレースの自動整理 |
>
> ### 使用方法
> ```bash
> /agent-trace stats    # 統計表示
> /agent-trace list     # トレース一覧
> /agent-trace find     # ファイル別検索
> ```
>
> ### 期待効果
> - デバッグ時間短縮: 30-50%
> - コードレビュー効率化: 20-30%
> - 監査対応工数削減: 40-60%
>
> 詳細: [Agent Trace統合提案書](./docs/AGENT_TRACE_INTEGRATION_PROPOSAL.md)

---

> **2026-02-03: v2.10.0 defer_loading最適化 & システム強化 🚀**
>
> Context消費を70%削減する`defer_loading`最適化と、研究ツール・パイプラインスキルを大幅に強化しました。
>
> ### 新機能
> | 機能 | 説明 |
> |------|------|
> | ⚡ **defer_loading統合** | MCPを必要時のみロード（コンテキスト70%削減） |
> | 🔍 **Apify MCP追加** | SNS/EC/検索エンジンスクレイピング対応 |
> | 💰 **コスト警告システム** | API消費MCPの事前警告フック |
> | 🎯 **スキルマッピング拡張** | 10→19マッピング（自動スキル選択強化） |
> | 📋 **MCPプリセット** | marketing/video/research/developmentなど6プリセット |
>
> ### 新規スキル・コマンド
> | スキル/コマンド | 説明 |
> |----------------|------|
> | `/marketing-full` | マーケティング統合パイプライン（要件定義→LP→セールスレター→画像） |
> | `/video-course` | 動画コース作成パイプライン |
> | `/sdd-full-pipeline` | SDD完全パイプライン（8フェーズ） |
> | `apify-research` | ApifyによるSNS/検索/ECスクレイピング |
>
> ### MCPプリセット切り替え
> ```bash
> ./scripts/switch-mcp.sh marketing     # マーケティング向け
> ./scripts/switch-mcp.sh video         # 動画制作向け
> ./scripts/switch-mcp.sh research      # リサーチ向け
> ./scripts/switch-mcp.sh full-optimized # フル構成（defer_loading最適化）
> ```
>
> ### アップグレード
> ```bash
> cd ~/taisun_agent && git pull origin main && npm install && npm run build:all && npm run taisun:diagnose
> ```

---

> **2026-02-02: v2.9.3 Mac/Windows両対応 & SDD完全版 🖥️**
>
> Mac/Windows両方で確実に動作するセットアップガイドと、Spec-Driven Development (SDD) の完全版を追加しました。
>
> ### 新機能
> | 機能 | 説明 |
> |------|------|
> | 🪟 **Windows完全対応** | 開発者モード/管理者権限/コピー方式の3つの方法を提供 |
> | 🍎 **Mac/Windows統一ガイド** | 両OS向けの明確なインストール・アップデート手順 |
> | 📋 **SDD完全版** | 8つの新スキル（design/tasks/threat/slo/runbook/adr/guardrails/full） |
> | 🎯 **成熟度レベル** | L1-L5の5段階で仕様の完成度を管理 |
>
> ### 新規SDDスキル（8個）
> | スキル | コマンド | 説明 |
> |--------|---------|------|
> | sdd-design | `/sdd-design <slug>` | C4モデル設計書 |
> | sdd-tasks | `/sdd-tasks <slug>` | Kiro形式タスク分解 |
> | sdd-threat | `/sdd-threat <slug>` | STRIDE脅威モデル |
> | sdd-slo | `/sdd-slo <slug>` | SLO/SLI/SLA定義 |
> | sdd-runbook | `/sdd-runbook <slug>` | インシデント対応 |
> | sdd-adr | `/sdd-adr "<title>" <slug>` | 技術決定記録(ADR) |
> | sdd-guardrails | `/sdd-guardrails <slug>` | AIガードレール |
> | sdd-full | `/sdd-full <slug>` | 全成果物一括生成 |
>
> ### アップグレード
> ```bash
> cd ~/taisun_agent && git pull origin main && npm install && npm run build:all && npm run taisun:diagnose
> ```

---

> **2026-02-01: v2.9.2 企業向けプレゼン資料 & インストールガイド改善 📊**
>
> Deep Researchを活用した企業向けプレゼン資料の自動生成機能と、正しいインストール方法のガイドを追加しました。
>
> ### 新機能
> | 機能 | 説明 |
> |------|------|
> | 📊 **プレゼン資料自動生成** | 業界別活用事例・専門用語解説付きのPDFスライド生成 |
> | 🔍 **Deep Research統合** | 競合調査・市場分析を自動化してプレゼンに反映 |
> | 📖 **できること/できないこと明確化** | システムの限界を正直に文書化 |
>
> ### 重要：正しいインストール方法
>
> **taisun_agentは1つだけ**インストール。プロジェクトごとにコピーする必要はありません。
>
> #### 方法1: Plugin形式（推奨・最も簡単）
> ```bash
> /plugin marketplace add taiyousan15/taisun_agent
> /plugin install taisun-agent@taisun-agent
> ```
> アップデート: `/plugin update taisun-agent`
>
> #### 方法2: 自然言語でインストール
> Claude Codeで以下をコピペ：
> ```
> taisun_agentをインストールまたはアップデートして
> ```
>
> #### 他のプロジェクトで使う場合
> ```bash
> ln -s ~/taisun_agent/.claude .claude
> ln -s ~/taisun_agent/.mcp.json .mcp.json
> ```
> **重要**: 両方のリンクが必要です（MCPサーバーを使うため）
>
> これで68スキル・85エージェント・227 MCPツールが全て使えます。
>
> ### TAISUNでできないこと（限界）
> - 単独では動作しない（Claude Code必須）
> - 24時間自律稼働（人間の監視が必要）
> - 100%正確な情報（ハルシネーションの可能性あり）
> - 専門資格が必要な判断（医療診断、法的助言等）
> - 物理的な作業、電話対応、契約締結
>
> 詳細は[プレゼン資料](docs/TAISUN_PRESENTATION.md)を参照

---

> **2026-02-01: v2.9.1 ドキュメント整合性修正 🔧**
>
> 第三者配布時の信頼性向上のため、ドキュメントと実際のスキル構成を完全に同期しました。
>
> ### 修正内容
> | 項目 | 説明 |
> |------|------|
> | 📝 **削除済みスキル参照修正** | sales-letter, step-mail, vsl等の参照を正しいスキル名に更新 |
> | 🎬 **Video Agent統合反映** | 12個の個別スキル → `video-agent` 統合をドキュメントに反映 |
> | 📊 **スキル数修正** | 83 → 66（実際のアクティブスキル数） |
> | 🌐 **フォルダ名英語化** | `テロップ` → `telop`（クロスプラットフォーム対応） |
>
> ### アップグレード（既存ユーザー）
> ```bash
> cd taisun_agent
> git pull origin main
> npm install && npm run build:all
> npm run taisun:diagnose        # 98/100点以上で成功
> ```
>
> ### 新規インストール（5分）
> ```bash
> git clone https://github.com/taiyousan15/taisun_agent.git
> cd taisun_agent && npm install && npm run build:all
> npm run perf:fast              # 推奨: 高速モード
> npm run taisun:diagnose        # 98/100点以上で成功
> ```

---

> **2026-02-01: v2.9.0 Kindle Content Empire & Video Agent統合 📚🎬**
>
> Kindle本→note記事→YouTube動画のマルチプラットフォーム自動展開を支援する要件定義システムを追加しました。
>
> ### 新機能
> | 機能 | 説明 |
> |------|------|
> | 📚 **Kindle Content Empire** | Kindle本取得→オリジナル本生成→KDP出品→note記事→YouTube動画の自動化要件定義 |
> | 🎬 **Video Agent統合** | video-download, video-transcribe等12スキルを1つの`video-agent`に統合 |
> | 🔍 **VLM画像OCR** | 画像9割のKindle本もQwen-VLで正確に読み取り（要約なし転写） |
> | 🔐 **Amazon認証自動化** | Cookie-based認証（1年有効）+ TOTP自動化 |
>
> ### Kindle Content Empire 100点要件定義
> `.kiro/specs/kindle-content-empire/requirements.md` に25の機能要件を定義:
> - REQ-001〜016: Kindle抽出・オリジナル本生成・ePub変換・note記事・YouTube動画
> - REQ-900〜903: 処理速度30分以内・可用性99%・90日データ保持
> - REQ-950〜951: APIキー管理・ログマスキング
> - REQ-960〜962: 構造化ログ・進捗監視・エラーアラート
>
> ### 使い方
> ```bash
> # 要件定義100点を達成
> /sdd-req100 kindle-content-empire
> /score-req100 .kiro/specs/kindle-content-empire/requirements.md
>
> # Video Agent統合スキル
> /video-agent                   # 動画パイプライン全体
> ```
>
> ### アップグレード（既存ユーザー）
> ```bash
> cd taisun_agent
> git pull origin main
> npm install && npm run build:all
> npm run perf:fast
> npm run taisun:diagnose
> ```
>
> ### 新規インストール
> ```bash
> git clone https://github.com/taiyousan15/taisun_agent.git
> cd taisun_agent && npm install && npm run build:all
> npm run perf:fast              # 推奨: 高速モード
> npm run taisun:diagnose        # 100/100点で成功
> ```

---

> **2026-01-31: v2.8.0 Deep Research & 要件定義スキル追加 🔬📋**
>
> 「〇〇をリサーチして」で深層調査、「要件定義を作って」でEARS準拠の要件定義が作れるようになりました。
>
> ### 新スキル（7個）
> | スキル | 説明 |
> |--------|------|
> | 🔬 **research** | ワンコマンド深層調査（`/research AIエージェントの最新動向`） |
> | 🔍 **dr-explore** | 探索・収集フェーズ（evidence.jsonl生成） |
> | 📊 **dr-synthesize** | 検証・統合→レポート生成 |
> | 🛠️ **dr-build** | 実装計画をPoC/MVP/Productionに落とし込む |
> | ⚙️ **dr-mcp-setup** | MCPサーバーのセットアップ支援 |
> | 📋 **sdd-req100** | EARS準拠の要件定義生成＋C.U.T.E.自動採点（目標98点） |
>
> ### 新コマンド（2個）
> | コマンド | 説明 |
> |----------|------|
> | `/req100` | spec-slugを自動推論してコマンドを提示 |
> | `/score-req100` | 既存requirements.mdを再採点 |
>
> ### 使い方
> ```bash
> # 深層調査
> /research AIエージェントの最新動向
>
> # 要件定義（EARS準拠 + 自動採点）
> /sdd-req100 my-feature
> /req100                    # spec-slug推論ヘルパー
> /score-req100 .kiro/specs/my-feature/requirements.md
> ```
>
> ### アップグレード（既存ユーザー）
> ```bash
> cd taisun_agent
> git pull origin main
> npm install && npm run build:all
> npm run taisun:diagnose
> ```
>
> ### 新規インストール
> ```bash
> git clone https://github.com/taiyousan15/taisun_agent.git
> cd taisun_agent && npm install && npm run build:all
> npm run perf:fast              # 推奨: 高速モード
> npm run taisun:diagnose        # 100/100点で成功
> ```
>
> 詳細: [research/README.md](research/README.md) | [.kiro/specs/README.md](.kiro/specs/README.md)

---

> **2026-01-30: v2.7.2 メモリ最適化・安定性向上 🚀**
>
> 長時間セッションでのメモリ不足クラッシュ（heap out of memory）を解決しました。
>
> ### 新機能
> | 機能 | 説明 |
> |------|------|
> | 🧠 **メモリ最適化** | Node.jsヒープサイズ8GB対応 |
> | ⚡ **高速モード** | `npm run perf:fast` でフック81%削減 |
> | 🔧 **安定起動** | `claude-stable` エイリアス追加 |
>
> ### アップグレード（既存ユーザー）
> ```bash
> cd taisun_agent
> git pull origin main
> npm install && npm run build:all
> npm run perf:fast              # 高速モード有効化
> echo 'export NODE_OPTIONS="--max-old-space-size=8192"' >> ~/.zshrc
> source ~/.zshrc
> npm run taisun:diagnose        # 100/100点で成功
> ```
>
> ### 新規インストール（5分）
> ```bash
> git clone https://github.com/taiyousan15/taisun_agent.git
> cd taisun_agent && npm install && npm run build:all
> npm run perf:fast              # 推奨: 高速モード
> npm run taisun:diagnose        # 100/100点で成功
> ```
>
> 詳細: [docs/PERFORMANCE_MODE.md](docs/PERFORMANCE_MODE.md) | [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

> **2026-01-30: v2.7.1 テスト安定化・配布品質向上 🔧**
>
> 他の環境でもテストが確実に通過するよう**権限問題を修正**しました。
>
> ### 修正内容
> - ワークフローテストをOS一時ディレクトリで実行（権限問題を回避）
> - 並列テスト実行時の分離を強化
> - 全775テストが新規インストール環境で通過

---

> **2026-01-29: v2.7.0 GitHub配布対応・診断システム追加 🚀**
>
> 世界中の誰でも5分でインストールできる**GitHub配布対応**を完了しました。
>
> ### 新機能
> | 機能 | 説明 |
> |------|------|
> | 🔧 **自動診断** | `npm run taisun:diagnose` で13層防御・82エージェント・77スキルを一括検証 |
> | 📖 **5分インストール** | [INSTALL.md](INSTALL.md) でクイックスタート |
> | 🏗️ **アーキテクチャ文書** | [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) で.mdファイル参照順序を解説 |
> | 🎯 **セットアッププロンプト** | [TAISUN_SETUP_PROMPTS.md](TAISUN_SETUP_PROMPTS.md) で初期設定を支援 |
>
> 詳細: [INSTALL.md](INSTALL.md) | [DISTRIBUTION_GUIDE.md](DISTRIBUTION_GUIDE.md)

---

> **2026-01-21: v2.6.0 13層防御システム完成・新スキル追加 🛡️**
>
> AIの暴走を完全に防止する**13層防御システム**を完成させ、新しいスキルとMCP統合を追加しました。
>
> ### 13層防御システム
> | Layer | Guard | 機能 |
> |-------|-------|------|
> | 0 | CLAUDE.md | 絶対遵守ルール |
> | 1-7 | Core Guards | 状態注入・権限・編集・スキル制御 |
> | 8-9 | Safety Guards | 文字化け防止・インジェクション検出 |
> | 10-12 | Quality Guards | スキル自動選択・定義検証・品質ガイド |
>
> ### 新スキル・MCP統合
> - **diagram-illustration**: 図解・インフォグラフィック作成
> - **taiyo-analyzer**: 176パターンコピーライティング品質分析
> - **context7-docs**: 最新ドキュメント取得（ハルシネーション防止）
> - **gpt-researcher**: 自律型深層リサーチ
> - **hierarchical-memory**: Mem0ベース3層メモリアーキテクチャ

---


> **2026-01-18: v2.5.1 システム総合検証・安定化リリース 🎯**
>
> システム全体の動作検証と安定化を行い、**本番環境対応**の品質を達成しました。
>
> ### 検証済みコンポーネント
> - **82 Agents**: 全エージェント動作確認済み
> - **70 Skills**: 全スキル定義検証済み
> - **13 Hooks**: 構文・実行テスト通過
> - **227 MCP Tools**: 統合テスト完了
>
> ### 修正内容
> - **Auto-save閾値最適化**: 50KB→15KB（より積極的なコンテキスト節約）
> - **MCP Proxy cold start対応**: 初期状態での誤検知を修正
> - **Agent Enforcement Guard**: 複雑タスク検出・Task tool強制機能
>
> ### インストール・アップデート
> ```bash
> git clone https://github.com/taiyousan15/taisun_agent.git
> cd taisun_agent && npm install && npm run build:all
> ./scripts/test-agents.sh  # 動作確認
> ```
>
> 詳細: [DISTRIBUTION_GUIDE.md](DISTRIBUTION_GUIDE.md)

---

> **2026-01-15: v2.4.0 Workflow Guardian Phase 3 - 並列実行・条件分岐 🚀**
>
> ワークフローシステムに**Phase 3機能**を追加し、より複雑なワークフローをサポートします。
>
> ### 新機能
> - **並列実行**: 複数フェーズの同時実行をサポート
> - **条件分岐**: 動的なワークフロー制御
> - **高度なロールバック**: フェーズ単位での安全な巻き戻し
>
> ### ドキュメント
> - [docs/WORKFLOW_PHASE3_QUICKSTART.md](docs/WORKFLOW_PHASE3_QUICKSTART.md) - クイックスタート
> - [CHANGELOG.md](CHANGELOG.md) - 詳細な変更履歴

---

> **2026-01-12: Workflow Guardian Phase 2 - AIの暴走を防ぐ厳格モード 🛡️**
>
> AIが勝手にワークフローのフェーズをスキップしたり、危険な操作を実行するのを**完全に防止**する
> Workflow Guardian Phase 2を実装しました。
>
> ### 主要機能
> - **Strict Mode**: `--strict`フラグで厳格な強制モードを有効化
> - **Skill Guard**: 許可されていないスキルの実行を自動ブロック
> - **Hooks System**: 危険なBashコマンド・ファイル操作を事前防止
> - **状態管理**: セッション跨ぎでワークフロー進捗を永続化
>
> ### セキュリティ保護
> **ブロック対象**:
> - `rm -rf`, `git push --force`, `DROP TABLE`等の危険コマンド
> - `.env`, `secrets/`, `.git/`等の重要ファイル編集
> - 現在フェーズで許可されていないスキル実行
>
> ### 2つのモード
> ```bash
> # Phase 1 (デフォルト): Advisory - 警告のみ
> npm run workflow:start -- video_generation_v1
>
> # Phase 2: Strict - 完全強制
> npm run workflow:start -- video_generation_v1 --strict
> ```
>
> ### ドキュメント
> - [docs/WORKFLOW_STATE_MANAGEMENT.md](docs/WORKFLOW_STATE_MANAGEMENT.md) - 完全ガイド
> - [docs/WORKFLOW_PHASE2_DESIGN.md](docs/WORKFLOW_PHASE2_DESIGN.md) - 設計書
>
> **推奨**: 本番環境・重要なワークフローではstrict modeを使用してください。

---

> **2026-01-11: OpenCode/OMO統合 - 任意で使えるセカンドエンジン 🤖**
>
> 難しいバグ修正やTDD自動化を支援する**OpenCode/OMO統合**を追加しました。
> 完全opt-in設計で、使いたい時だけ明示的に有効化できます。
>
> ### 新機能
> - **memory_add(content_path)**: 大量ログをファイルから直接保存（コンテキスト節約99%）
> - **/opencode-setup**: セットアップ確認と導入ガイド
> - **/opencode-fix**: バグ修正支援（mistakes.md統合 + セッション回収）
> - **/opencode-ralph-loop**: TDD自動反復開発（デフォルト無効）
> - **環境診断拡張**: `npm run doctor`でOpenCode状態を確認
>
> ### セキュリティ
> - **Path Traversal防止**: プロジェクト外ファイル読み込み不可
> - **Size Limit**: 10MB制限でDoS防止
> - **UTF-8 Validation**: 文字化けファイル自動検出
>
> ### ドキュメント
> - [docs/opencode/README-ja.md](docs/opencode/README-ja.md) - OpenCode/OMO導入ガイド
> - [docs/opencode/USAGE-ja.md](docs/opencode/USAGE-ja.md) - 使用例・ベストプラクティス
>
> ### 使用例
> ```bash
> # 環境確認
> npm run doctor
>
> # バグ修正相談
> /opencode-fix "DBコネクションプールが枯渇するバグ"
>
> # ログは自動的にmemory_addに保存（会話に含めない）
> # → コンテキスト消費: 100KB → 50トークン（99.8%削減）
> ```
>
> **重要**: OpenCodeは完全オプショナルです。インストールしなくてもTAISUNは100%動作します。

---

> **2026-01-09: コンテキスト最適化システム強化 🚀**
>
> 書き込み操作の最適化により、コンテキスト使用量を**70%削減**できるようになりました。
>
> ### 新機能
> - **自動監視**: ファイルサイズ・コンテキスト使用率の自動チェック
> - **Agent委託ガイド**: 5KB/20KB/50KB閾値による最適化提案
> - **バッチ処理**: 3-5ファイルごとに/compact推奨
> - **警告システム**: 60%/75%/85%で段階的警告
>
> ### ドキュメント
> - [CONTEXT_MANAGEMENT.md](docs/CONTEXT_MANAGEMENT.md) - 読み取り最適化（99%削減）
> - [CONTEXT_WRITE_OPTIMIZATION.md](docs/CONTEXT_WRITE_OPTIMIZATION.md) - 書き込み最適化（70%削減）
> - [context-monitor.js](.claude/hooks/context-monitor.js) - 自動監視フック
>
> ### 効果
> ```
> Before: 113KB生成 → 83k tokens (41%)
> After:  113KB生成 → 15-25k tokens (8-12%)
> 削減:   約60k tokens (70%削減)
> ```

---

> **2026-01-08: Windows完全対応リリース 🎉**
>
> Windows環境で100%動作することを保証するアップデートをリリースしました。
>
> ### アップデート方法
> ```powershell
> cd taisun_agent
> git pull origin main
> npm install
> ```
>
> ### 新機能
> - **自動環境診断**: `npm run setup:windows` で環境をチェック
> - **改行コード統一**: .gitattributes による自動統一（CRLF/LF問題を解決）
> - **Node.js版スクリプト**: シェルスクリプト不要
> - **詳細ガイド**: 475行の [Windows専用セットアップガイド](docs/WINDOWS_SETUP.md)
>
> ### Windows環境での使い方
> ```powershell
> npm run setup:windows  # 環境診断
> npm install
> npm test               # 775テスト全通過を確認
> npm run mcp:health     # MCP設定チェック
> ```
>
> 詳細: [docs/WINDOWS_SETUP.md](docs/WINDOWS_SETUP.md)

---

> **2026-01-07: セキュリティ強化アップデート**
>
> MCPツールの入力検証とインジェクション防止機能を追加しました。
>
> ### アップデート方法
> ```bash
> cd taisun_agent
> git pull origin main
> npm install
> ```
>
> ### セキュリティ修正内容
> - **Chrome パス検証**: コマンドインジェクション防止（ホワイトリスト検証）
> - **JSON プロトタイプ汚染対策**: `__proto__`等の危険キー自動除去
> - **スキル名検証**: パストラバーサル攻撃防止（CWE-22）
> - **メモリ入力検証**: DoS防止（サイズ制限・サニタイズ）
>
> ### 新規ユーティリティ
> - `src/utils/safe-json.ts` - 安全なJSONパーサー

---

> **2026-01-07: UTF-8安全対策をリリースしました**
>
> 日本語/マルチバイト文字を含むファイルの編集時にクラッシュ・文字化けが発生する問題への対策を追加しました。
>
> ### 新機能
> - **safe-replace**: Unicode安全な置換ツール
> - **utf8-guard**: 文字化け自動検知
> - **品質ゲート強化**: CIでエンコーディングチェック
>
> 詳細: [docs/operations/text-safety-ja.md](docs/operations/text-safety-ja.md)

---

## はじめての方へ

> **重要**: TAISUN v2は **Claude Code の拡張機能** です。
> インストール後、68のスキルと85のエージェントが自動的に使えるようになります。

---

## 🚀 セットアップガイド（Mac / Windows 両対応）

```
┌─────────────────────────────────────────────────────────────────────┐
│  全ての操作は「Claude Codeのチャットにコピペ」するだけ！             │
│  ターミナル操作は不要です                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🍎 Mac ユーザー

### 📦 Step 1: インストール（初回のみ）

Claude Codeのチャットに**以下を丸ごとコピペ**：

```
以下のコマンドを順番に実行して：
cd ~
git clone https://github.com/taiyousan15/taisun_agent.git
cd taisun_agent
npm install
npm run build:all
npm run taisun:diagnose
```

**完了の目安**: 「98/100点」以上が表示されれば成功

> **自動スキルインストール**: インストール時にスキル（sdd-req100等）が `~/.claude/skills/` に自動コピーされます。
> これにより、**どのプロジェクトでも** `/sdd-req100` などのスキルがすぐに使えます。

### 🔄 アップデート（Macユーザー）

```
以下のコマンドを実行して：
cd ~/taisun_agent && git pull origin main && npm run taisun:setup
```

> **スキル自動更新**: `world-research`、`anime-slide-generator`、`nanobanana-pro`、`agentic-vision`などのグローバルスキルは `npm run setup` で自動的に最新版に更新されます。

### 📁 プロジェクトで使えるようにする（Mac）

使いたいプロジェクトのフォルダでClaude Codeを起動し、**以下を丸ごとコピペ**：

```
以下のコマンドを実行して：
ln -s ~/taisun_agent/.claude .claude && ln -s ~/taisun_agent/.mcp.json .mcp.json && echo "✅ 完了"
```

**完了の目安**: 「✅ 完了」と表示され、フォルダに`.claude`と`.mcp.json`が見える

---

## 🪟 Windows ユーザー

### 📦 Step 1: インストール（初回のみ）

Claude Codeのチャットに**以下を丸ごとコピペ**：

```
以下のコマンドを順番に実行して：
cd ~
git clone https://github.com/taiyousan15/taisun_agent.git
cd taisun_agent
npm install
npm run build:all
npm run taisun:diagnose
```

**完了の目安**: 「98/100点」以上が表示されれば成功

> **自動スキルインストール**: インストール時にスキル（sdd-req100等）が `~/.claude/skills/` に自動コピーされます。
> これにより、**どのプロジェクトでも** `/sdd-req100` などのスキルがすぐに使えます。

### 🔄 アップデート（Windowsユーザー）

```
以下のコマンドを実行して：
cd ~/taisun_agent && git pull origin main && npm run taisun:setup
```

> **スキル自動更新**: `world-research`、`anime-slide-generator`、`nanobanana-pro`、`agentic-vision`などのグローバルスキルは `npm run setup` で自動的に最新版に更新されます。

### 📁 プロジェクトで使えるようにする（Windows）

**⚠️ 重要: Windowsではシンボリックリンクの設定が必要です**

#### 方法A: 開発者モード有効化（推奨）

1. **Windowsの設定を開く**
   - 設定 → 更新とセキュリティ → 開発者向け → **開発者モード ON**

2. Claude Codeで以下をコピペ：
```
以下のコマンドを実行して：
export MSYS=winsymlinks:nativestrict && ln -s ~/taisun_agent/.claude .claude && ln -s ~/taisun_agent/.mcp.json .mcp.json && echo "✅ 完了"
```

#### 方法B: 管理者コマンドプロンプト使用

1. **管理者としてコマンドプロンプトを開く**
   - スタートメニュー → 「cmd」を検索 → 右クリック → **管理者として実行**

2. 以下を実行（`your-project`は実際のパスに置き換え）：
```cmd
cd C:\Users\YourName\your-project
mklink /D .claude C:\Users\YourName\taisun_agent\.claude
mklink .mcp.json C:\Users\YourName\taisun_agent\.mcp.json
```

#### 方法C: フォルダをコピー（最も確実）

シンボリックリンクがうまくいかない場合：

```
以下のコマンドを実行して：
cp -r ~/taisun_agent/.claude .claude && cp ~/taisun_agent/.mcp.json .mcp.json && echo "✅ 完了"
```

> **注意**: この方法ではアップデート時に再度コピーが必要です

---

## ✅ 動作確認（Mac / Windows 共通）

```
taisun:diagnose もう一回実行して
```

**完了の目安**: 「98/100点」以上で全項目正常

---

## 🎉 これで完了！

**68スキル・85エージェント・227 MCPツール** が使えるようになりました。

普通に日本語で話しかけるだけで全機能が使えます：
- 「セールスレターを書いて」
- 「LP分析して」
- 「YouTubeサムネイルを作って」

---

## 🌐 グローバルスキル（どのプロジェクトでも使用可能）

`npm run setup` 実行時に、以下のスキルが `~/.claude/skills/` に自動インストールされます。

### 自動インストールされるスキル

| スキル | コマンド | 説明 |
|--------|---------|------|
| **sdd-req100** | `/sdd-req100` | 100点満点の要件定義を作成（EARS準拠） |
| **sdd-full** | `/sdd-full` | 完全なSDD（設計書一式）を一括生成 |
| **sdd-design** | `/sdd-design` | C4モデル設計書 |
| **sdd-adr** | `/sdd-adr` | アーキテクチャ決定記録 |
| **sdd-threat** | `/sdd-threat` | STRIDE脅威モデル |
| **sdd-slo** | `/sdd-slo` | SLO/SLI/SLA定義 |
| **sdd-runbook** | `/sdd-runbook` | 運用手順書 |
| **sdd-guardrails** | `/sdd-guardrails` | AIガードレール |
| **sdd-tasks** | `/sdd-tasks` | Kiro形式タスク分解 |
| **gpt-researcher** | `/gpt-researcher` | 自律型深層リサーチ |
| **research** | `/research` | ワンコマンド調査 |
| **dual-ai-review** | `/dual-ai-review` | AI二重レビュー |
| **taiyo-analyzer** | `/taiyo-analyzer` | 太陽スタイル品質分析 |
| **lp-analysis** | `/lp-analysis` | LP成約率改善分析 |
| **nanobanana-pro** | `/nanobanana-pro` | AI画像生成（無料・ブラウザ自動化） |
| **agentic-vision** | `/agentic-vision` | 画像・動画分析（無料・Gemini 3 Flash） |
| **anime-slide-generator** | `/anime-slide-generator` | アニメ風スライド生成（Mac/Win/Linux対応） |
| **world-research** | `/world-research` | 6層133ソース総合リサーチ（論文/キュレーション/ブログ/実装/SNS/コミュニティ・日英中3言語） |

### 別プロジェクトでの使用

一度インストールすれば、**taisun_agentをリンクしていないプロジェクトでも**スキルが使えます：

```bash
cd ~/任意のプロジェクト
claude

# スキルが使える！
> /sdd-req100 my-feature
> /research AIエージェントの最新動向
```

### 手動でスキルを再インストール

```bash
cd ~/taisun_agent
npm run setup
```

---

## 🔌 上級者向け: Plugin形式

Claude Code v2.1.0以降で使用可能（Mac / Windows 共通）：

```bash
/plugin marketplace add taiyousan15/taisun_agent
/plugin install taisun-agent@taisun-agent
```

**アップデート：** `/plugin update taisun-agent`


---

### ❓ よくある質問・トラブルシューティング

#### 共通の問題

| 状況 | 解決方法 |
|------|---------|
| 「already exists」エラー | 正常です！アップデートコマンドを実行してください |
| 「heap out of memory」エラー | `メモリ設定を最適化して（NODE_OPTIONS 8GB）` |
| ビルドエラー | `taisun_agentをクリーンインストールして` |
| 「command not found: claude」 | まずClaude Code CLIをインストール: https://claude.ai/code |
| スキルが使えない | `このフォルダでtaisun_agentを使えるようにして` |

#### 🪟 Windows特有の問題

| 状況 | 解決方法 |
|------|---------|
| `.claude`フォルダが見えない | 方法B（管理者コマンドプロンプト）または方法C（コピー）を試す |
| 「シンボリックリンクの作成に失敗」 | 開発者モードを有効にするか、管理者権限で実行 |
| `ln -s`が動かない | `export MSYS=winsymlinks:nativestrict`を先に実行 |
| パスに日本語が含まれる | 英語のみのパスにtaisun_agentをインストール |
| 改行コードエラー | `git config core.autocrlf false`を実行してから再clone |

#### 🍎 Mac特有の問題

| 状況 | 解決方法 |
|------|---------|
| 権限エラー | Mac: `chmod -R 755 ~/taisun_agent` / Windows: 管理者PowerShellで再実行 |
| Xcode要求 | `xcode-select --install` を実行 |

#### 「Invalid API key - Please run /login」エラー

**原因**: MCPサーバーが環境変数を読み込めていない

**解決策**: `~/.zshrc`に以下を追加して`source ~/.zshrc`を実行:

```bash
export OPENAI_API_KEY="sk-xxxxxxxxxxxx"
export TAVILY_API_KEY="tvly-xxxxxxxxxxxx"
export FIGMA_API_KEY="figd_xxxxxxxxxxxx"
```

または`~/.claude/settings.json`に追加:
```json
{
  "env": {
    "OPENAI_API_KEY": "sk-xxxxxxxxxxxx",
    "TAVILY_API_KEY": "tvly-xxxxxxxxxxxx"
  }
}
```

詳細: [docs/API_KEY_TROUBLESHOOTING.md](docs/API_KEY_TROUBLESHOOTING.md)

---

詳細: [INSTALL.md](INSTALL.md) | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

### 🏆 検定後のスコアを100点にする方法

TAISUN v2には自動診断システムがあり、スキル・MCP・エージェントの動作状況を100点満点で採点します。

#### 現在のスコアを確認

```bash
npm run taisun:diagnose
```

#### スコア採点基準

| 項目 | 配点 | 内容 |
|------|------|------|
| 13層防御システム | 30点 | 全21フック正常動作 |
| MCPサーバー接続 | 25点 | 36サーバー中の接続率 |
| スキル定義検証 | 20点 | 66スキルのYAML構文・必須フィールド |
| エージェント定義 | 15点 | 82エージェントの定義検証 |
| ビルド状態 | 10点 | TypeScriptコンパイル成功 |

#### 100点達成チェックリスト

```bash
# ステップ1: クリーンビルド（最重要）
rm -rf node_modules dist
npm install
npm run build:all

# ステップ2: 高速モード有効化
npm run perf:fast

# ステップ3: メモリ最適化
echo 'export NODE_OPTIONS="--max-old-space-size=8192"' >> ~/.zshrc
source ~/.zshrc

# ステップ4: 診断実行
npm run taisun:diagnose
```

#### よくある減点原因と対処法

| 減点 | 原因 | 対処法 |
|------|------|--------|
| -10〜20点 | ビルド未実行 | `npm run build:all` |
| -5〜15点 | node_modules破損 | `rm -rf node_modules && npm install` |
| -5点 | 高速モード未有効 | `npm run perf:fast` |
| -5点 | MCPサーバー未起動 | `.env`のAPI KEYs確認 |
| -3点 | 古いキャッシュ | `rm -rf dist && npm run build:all` |

#### MCP個別のスコアを確認

```bash
# MCPサーバーの接続状態を詳細確認
npm run mcp:health

# 特定MCPのデバッグ
MCP_DEBUG=true npm run proxy:smoke
```

#### スキル定義の修正

```bash
# スキル定義の構文チェック
npm run skills:validate

# エラーがある場合は該当スキルを修正
# .claude/skills/[スキル名]/skill.yml を編集
```

#### 98点以上で合格

| スコア | 状態 |
|--------|------|
| **100点** | 完璧 🎉 全機能正常動作 |
| **98-99点** | 合格 ✅ 本番利用可能 |
| **90-97点** | 要確認 ⚠️ 一部機能に問題 |
| **90点未満** | 要修正 ❌ クリーンインストール推奨 |

#### 詳細診断

```bash
# 詳細モードで原因を特定
npm run taisun:diagnose:full

# 個別コンポーネント診断
npm run taisun:diagnose -- --hooks    # フックのみ
npm run taisun:diagnose -- --mcps     # MCPのみ
npm run taisun:diagnose -- --skills   # スキルのみ
```

---

### 📋 要件定義スキル（sdd-req100）で100点を取る方法

EARS準拠の要件定義を作成し、C.U.T.E.（Completeness/Unambiguity/Testability/EARS）で自動採点します。

#### 基本の使い方

```bash
# 要件定義を自動生成（目標98点以上）
/sdd-req100 my-feature

# 既存の要件定義を再採点
/score-req100 .kiro/specs/my-feature/requirements.md
```

#### C.U.T.E.採点基準（100点満点）

| 項目 | 配点 | 内容 |
|------|------|------|
| **C: Completeness** | 25点 | 必須セクション・フィールドの網羅性 |
| **U: Unambiguity** | 25点 | 曖昧語の排除（「適切」「最適」等NG） |
| **T: Testability** | 25点 | GWT形式の受入テスト記載 |
| **E: EARS** | 25点 | EARSパターン準拠の要件文 |

#### 100点達成の必須条件

```
✅ 必須セクションがすべて存在
   - 目的/スコープ/用語集/前提/機能要件/非機能要件/セキュリティ/運用/未解決事項

✅ 全REQに必須フィールドが存在
   - 種別/優先度/要件文(EARS)/受入テスト(GWT)/例外処理

✅ 全REQの要件文がEARSパターンに一致

✅ 全REQに受入テスト(GWT形式)が存在

✅ 曖昧語が0個

✅ 未解決事項が0件
```

#### EARSパターン（必須）

| パターン | 構文 | 例 |
|----------|------|-----|
| 普遍 | システムは...しなければならない。 | システムは入力を5秒以内に処理しなければならない。 |
| イベント駆動 | ...とき、システムは...しなければならない。 | ユーザーがログインボタンを押したとき、システムは認証を開始しなければならない。 |
| 状態駆動 | ...の間、システムは...しなければならない。 | ファイルアップロード中の間、システムは進捗バーを表示しなければならない。 |
| 望ましくない挙動 | ...場合、システムは...しなければならない。 | APIが503を返した場合、システムは3回まで再試行しなければならない。 |
| オプション | ...が有効な場合、システムは...しなければならない。 | 2段階認証が有効な場合、システムはSMSコードを要求しなければならない。 |

#### GWT形式の受入テスト（必須）

```markdown
**受入テスト:**
- Given: ユーザーがログインフォームを表示している
- When: 正しいメールアドレスとパスワードを入力してログインボタンを押す
- Then: ダッシュボード画面に遷移し、「ようこそ」メッセージが表示される
```

#### よくある減点と対処法

| 減点 | 原因 | 対処法 |
|------|------|--------|
| -1〜25点 | 曖昧語の使用 | 「適切」→「5秒以内」、「高速」→「100ms以下」に具体化 |
| -3点/REQ | 受入テストなし | 全REQにGWT形式で追加 |
| -2点/REQ | EARS非準拠 | 上記パターンに書き換え |
| -3点/セクション | 必須セクション欠落 | テンプレートに沿って追加 |
| -2点/件 | 未解決事項あり | 質問を解決するか、仮置きで前提に明記 |

#### 禁止語リスト（一部）

以下の曖昧語は使用禁止（1出現につき-1点）:

```
適切、最適、よしなに、できるだけ、可能な限り、高速、
適宜、ユーザーフレンドリー、十分な、必要に応じて、
柔軟に、スムーズに、シームレスに、直感的に
```

#### 改善ループ

```bash
# 1. 初回生成
/sdd-req100 my-feature

# 2. スコアを確認（score.jsonに出力）
cat .kiro/specs/my-feature/score.json

# 3. 改善点を確認（critique.mdに出力）
cat .kiro/specs/my-feature/critique.md

# 4. requirements.mdを修正後、再採点
/score-req100 .kiro/specs/my-feature/requirements.md
```

#### 合格基準

| スコア | 状態 |
|--------|------|
| **100点** | 完璧 🎉 未解決事項なし・曖昧さゼロ |
| **98-99点** | 合格 ✅ 実装可能な品質 |
| **90-97点** | 要改善 ⚠️ 改善ループ継続 |
| **90点未満** | 不十分 ❌ 大幅な見直し必要 |

---

### 使い方（超簡単）

```bash
cd ~/taisun_agent
claude  # Claude Code を起動
```

**あとは普通に会話するだけ:**

```
あなた: 「セールスレターを書いて」
Claude: /taiyo-style-sales-letter スキルで作成します...

あなた: 「このコードをレビューして」
Claude: code-reviewer エージェントで分析します...
```

### 3. 詳細ガイド

| ドキュメント | 内容 |
|-------------|------|
| [INSTALL.md](INSTALL.md) | **5分クイックインストール** ⭐ |
| [TAISUN_SETUP_PROMPTS.md](TAISUN_SETUP_PROMPTS.md) | 初期設定・検証プロンプト集 |
| [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) | システムアーキテクチャ・.md参照順序 |
| [QUICK_START.md](docs/QUICK_START.md) | 詳細セットアップ手順 |
| [WINDOWS_SETUP.md](docs/WINDOWS_SETUP.md) | **Windows 専用**セットアップガイド（100%動作保証） |
| [CONTEXT_MANAGEMENT.md](docs/CONTEXT_MANAGEMENT.md) | コンテキスト管理システム完全ガイド（99%削減の仕組み） |
| [opencode/README-ja.md](docs/opencode/README-ja.md) | OpenCode/OMO 任意導入ガイド（opt-in セカンドエンジン） |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | エラー解決 |
| [CONFIG.md](docs/CONFIG.md) | 設定カスタマイズ |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | 開発参加方法 |

---

## Overview

TAISUN v2は、Claude Codeと連携し、設計から実装、テスト、デプロイ、マーケティングまでを一貫して支援する**統合開発・マーケティングプラットフォーム**です。

```
┌─────────────────────────────────────────────────────────────┐
│                    TAISUN v2 Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │   Claude    │◄──│  Proxy MCP  │──►│  36 External │       │
│  │    Code     │   │   Server    │   │  MCP Servers │       │
│  └─────────────┘   └──────┬──────┘   └─────────────┘       │
│                           │                                 │
│         ┌─────────────────┼─────────────────┐              │
│         ▼                 ▼                 ▼              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │ 82 Agents   │   │  82 Skills  │   │ 82 Commands │       │
│  └─────────────┘   └─────────────┘   └─────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### System Statistics

| Component | Count | Description |
|-----------|-------|-------------|
| **AI Agents** | 82 | 専門家エージェント (AIT42 + Taiyou + Diagnostics) |
| **Skills** | 66 | マーケティング・インフラ自動化スキル |
| **Hooks** | 21 | 13層防御システム（21ファイル） |
| **Commands** | 84 | ショートカットコマンド（OpenCode統合含む） |
| **MCP Servers** | 36 | 外部サービス連携 |
| **MCP Tools** | 227 | 統合ツール群 |
| **Source Lines** | 11,167 | TypeScript (proxy-mcp) |
| **Tests** | 775 | ユニット・統合テスト（全Pass） |

## Key Features

### 1. Single MCP Entrypoint (Proxy MCP)

5つのツールで32+の外部MCPサーバーを統合管理:

```typescript
// 5 Public Tools
system_health   // ヘルスチェック
skill_search    // スキル検索
skill_run       // スキル実行
memory_add      // コンテンツ保存
memory_search   // コンテンツ検索
```

### 2. Hybrid Router

- **ルールベース安全性**: 危険操作の自動検出・ブロック
- **セマンティック検索**: 類似度ベースのMCP選択
- **人間承認フロー**: 高リスク操作のエスカレーション

### 3. Multi-Agent System (82 Agents)

| Category | Count | Examples |
|----------|-------|----------|
| **Coordinators** | 5 | ait42-coordinator, omega-aware-coordinator, initialization-orchestrator |
| **Diagnostics & Recovery** | 5 | system-diagnostician, error-recovery-planner, environment-doctor 🆕 |
| **Architecture** | 6 | system-architect, api-designer, security-architect |
| **Development** | 6 | backend-developer, frontend-developer, api-developer |
| **Quality Assurance** | 8 | code-reviewer, test-generator, security-tester |
| **Operations** | 8 | devops-engineer, incident-responder, cicd-manager |
| **Documentation** | 3 | tech-writer, doc-reviewer, knowledge-manager |
| **Analysis** | 4 | complexity-analyzer, feedback-analyzer |
| **Specialized** | 5 | bug-fixer, refactor-specialist, feature-builder |
| **Multi-Agent** | 4 | competition, debate, ensemble, reflection |
| **Process** | 5 | workflow-coordinator, requirements-elicitation |
| **Taiyou** | 6 | taiyou-codegen-agent, taiyou-pr-agent |

### 4. Skill Library (82 Skills)

#### Marketing & Sales (12)
- `copywriting-helper` - コピーライティング支援
- `taiyo-style-sales-letter` - セールスレター作成（太陽スタイル）
- `taiyo-style-step-mail` - ステップメール作成（太陽スタイル）
- `taiyo-style-vsl` - ビデオセールスレター（太陽スタイル）
- `launch-video` - ローンチ動画スクリプト
- `lp-analysis` / `mendan-lp` - LP分析・面談LP
- `funnel-builder` - ファネル構築
- `customer-support-120` - カスタマーサポート（120%対応）
- `taiyo-style` - 太陽スタイル適用

#### Content Creation (10)
- `kindle-publishing` - Kindle本出版
- `youtube-content` / `youtube-thumbnail` - YouTube企画・サムネイル
- `ai-manga-generator` / `anime-production` - AI漫画・アニメ制作
- `diagram-illustration` - 図解作成
- `sns-marketing` - SNSマーケティング

#### AI Image & Video (4)
- `nanobanana-pro` / `nanobanana-prompts` - NanoBanana統合
- `omnihuman1-video` - AIアバター動画
- `japanese-tts-reading` - 日本語TTS

#### Infrastructure (11)
- `workflow-automation-n8n` - n8nワークフロー
- `docker-mcp-ops` - Docker操作
- `security-scan-trivy` - セキュリティスキャン
- `pdf-automation-gotenberg` - PDF自動化
- `doc-convert-pandoc` - ドキュメント変換
- `postgres-mcp-analyst` - PostgreSQL分析
- `notion-knowledge-mcp` - Notionナレッジ
- `unified-notifications-apprise` - 通知統合

### 5. Production-Grade Operations

- **Circuit Breaker**: 障害耐性・自動復旧
- **Incident Lifecycle (P17)**: インシデント相関・ノイズ削減・週次ダイジェスト
- **Scheduled Jobs (P18)**: 日次/週次レポート自動生成
- **Observability**: Prometheus/Grafana/Loki統合

---

## MCPツール完全リファレンス

TAISUN v2では、**3つのMCPサーバー**と**11のMCPツール**を提供しています。

### MCPアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code CLI                          │
├─────────────────────────────────────────────────────────────┤
│  MCPサーバー                                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  taisun-proxy (メイン統合エントリーポイント)              ││
│  │  ├── Router (ルール/セマンティックルーティング)          ││
│  │  ├── Memory (短期/長期記憶)                              ││
│  │  ├── Skillize (66スキル実行)                             ││
│  │  ├── Supervisor (ワークフロー制御)                       ││
│  │  └── 内部MCP (github/notion/postgres/filesystem)        ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ claude-mem-search│  │     ide          │                 │
│  │ (履歴/学習検索)   │  │ (VS Code連携)    │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### MCPサーバー詳細

#### 1. TAISUN Proxy MCP（メインサーバー）

統合エントリーポイント。すべての機能を5つのツールで提供。

| ツール | 説明 | 使用例 |
|-------|------|-------|
| `system_health` | システム稼働状況確認、ヘルスチェック | `mcp__taisun-proxy__system_health()` |
| `skill_search` | 66スキルの検索（キーワードまたは全件） | `skill_search(query="taiyo")` |
| `skill_run` | スキルのロード・実行 | `skill_run(name="youtube-thumbnail")` |
| `memory_add` | 大規模コンテンツの保存、参照ID発行<br>- `content`: 直接テキスト保存<br>- `content_path`: ファイルを読み込んで保存（巨大ログ向け） | `memory_add(content="データ", type="long-term")`<br>`memory_add(content_path="logs/output.log", type="short-term")` |
| `memory_search` | 参照IDまたはキーワードでメモリ検索 | `memory_search(query="LP作成")` |

**内部MCP（Rollout管理）:**
- `github` - GitHub Issue/PR連携
- `notion` - Notionナレッジベース
- `postgres` - PostgreSQLデータ分析
- `filesystem` - ファイルシステム操作

#### 2. Claude Memory Search MCP

過去のセッション記録・学習履歴を効率的に検索。**3層ワークフロー**で10倍のトークン節約。

| ツール | 説明 | パラメータ |
|-------|------|-----------|
| `search` | メモリ検索（インデックス取得） | query, limit, project, type, dateStart, dateEnd |
| `timeline` | 結果周辺のコンテキスト取得 | anchor, depth_before, depth_after |
| `get_observations` | フィルタ済みIDの詳細取得 | ids (配列), orderBy, limit |

**推奨ワークフロー:**
```javascript
// 1. 検索でIDを取得（〜50-100トークン/件）
search(query="LP作成") → IDs

// 2. 興味のあるIDの周辺コンテキスト取得
timeline(anchor=123)

// 3. 必要なIDのみ詳細取得
get_observations(ids=[123, 124])
```

#### 3. IDE MCP

VS Code連携による開発支援。

| ツール | 説明 |
|-------|------|
| `getDiagnostics` | 言語診断情報取得（型エラー、警告等） |
| `executeCode` | Jupyterカーネルでコード実行 |

---

## スキル完全リファレンス（66スキル）

### マーケティング・セールス（12スキル）

| スキル | 説明 | コマンド |
|-------|------|---------|
| `copywriting-helper` | コピーライティング支援、訴求力のある文章作成 | `/copywriting-helper` |
| `launch-video` | ローンチ動画スクリプト（3話/4話構成） | `/launch-video` |
| `lp-design` | LP設計・ワイヤーフレーム | `/lp-design` |
| `lp-analysis` | LP分析・改善提案（成約率4.3倍達成） | `/lp-analysis` |
| `mendan-lp` | 面談LP作成（申込率50%目標、4つの型対応） | `/mendan-lp` |
| `funnel-builder` | セールスファネル構築 | `/funnel-builder` |
| `customer-support-120` | 顧客期待120%超え対応 | `/customer-support-120` |
| `education-framework` | 6つの教育要素フレームワーク | `/education-framework` |
| `line-marketing` | LINEマーケティング戦略 | `/line-marketing` |
| `sales-systems` | セールスシステム構築 | `/sales-systems` |
| `lp-json-generator` | LP画像のテキスト差し替え生成 | `/lp-json-generator` |
| `taiyo-analyzer` | 太陽スタイル176パターン品質分析 | `/taiyo-analyzer` |

### 太陽スタイル（10スキル）

日給5000万円を生み出した太陽スタイルのコピーライティング技術。

| スキル | 説明 | コマンド |
|-------|------|---------|
| `taiyo-style` | 太陽スタイル基本（176パターン適用） | `/taiyo-style` |
| `taiyo-rewriter` | 既存コンテンツを太陽スタイルに変換 | `/taiyo-rewriter` |
| `taiyo-style-headline` | 衝撃的なヘッドライン・キャッチコピー生成 | `/taiyo-style-headline` |
| `taiyo-style-bullet` | ブレット・ベネフィットリスト生成 | `/taiyo-style-bullet` |
| `taiyo-style-ps` | 追伸（P.S.）パターン生成 | `/taiyo-style-ps` |
| `taiyo-style-lp` | 太陽スタイルLP作成・最適化 | `/taiyo-style-lp` |
| `taiyo-style-sales-letter` | 太陽スタイルセールスレター | `/taiyo-style-sales-letter` |
| `taiyo-style-step-mail` | 太陽スタイルステップメール | `/taiyo-style-step-mail` |
| `taiyo-style-vsl` | 太陽スタイルVSL台本（15章構成） | `/taiyo-style-vsl` |

### コンテンツ制作（10スキル）

| スキル | 説明 | コマンド |
|-------|------|---------|
| `kindle-publishing` | Kindle本出版（企画〜出版） | `/kindle-publishing` |
| `note-marketing` | note記事戦略 | `/note-marketing` |
| `youtube-content` | YouTube動画企画 | `/youtube-content` |
| `youtube-thumbnail` | サムネイル作成（CTR最適化） | `/youtube-thumbnail` |
| `youtube_channel_summary` | YouTubeチャンネル分析・まとめ | `/youtube_channel_summary` |
| `ai-manga-generator` | AI漫画制作（マーケティング漫画） | `/ai-manga-generator` |
| `anime-production` | アニメ制作 | `/anime-production` |
| `diagram-illustration` | 図解・解説画像作成 | `/diagram-illustration` |
| `custom-character` | キャラクター設定 | `/custom-character` |
| `sns-marketing` | SNSマーケティング（マルチプラットフォーム） | `/sns-marketing` |

### AI画像・動画（5スキル）

| スキル | 説明 | コマンド |
|-------|------|---------|
| `nanobanana-pro` | NanoBanana Pro画像生成（参照画像対応） | `/nanobanana-pro` |
| `nanobanana-prompts` | NanoBanana向けプロンプト最適化 | `/nanobanana-prompts` |
| `omnihuman1-video` | OmniHuman1 AIアバター動画作成 | `/omnihuman1-video` |
| `japanese-tts-reading` | 日本語TTS（Whisper対応） | `/japanese-tts-reading` |
| `gpt-sovits-tts` | GPT-SoVITS音声合成 | `/gpt-sovits-tts` |

### Video Agent統合スキル（1スキル）

動画制作・管理の自動化システム。12個の個別スキルを1つに統合。

| スキル | 説明 | コマンド |
|-------|------|---------|
| `video-agent` | 動画パイプライン統合（ダウンロード、文字起こし、制作、品質管理、CI/CD、通知） | `/video-agent` |

**統合された機能**: video-download, video-transcribe, video-production, video-policy, video-eval, video-ci-scheduling, video-metrics, video-notify, video-anomaly, video-dispatch, video-validate, video-guard

### Deep Research & 要件定義（6スキル）🆕

AIによる深層調査・レポート生成・要件定義システム。

| スキル | 説明 | コマンド |
|-------|------|---------|
| `research` | ワンコマンド深層調査（探索→検証→レポート自動生成） | `/research [トピック]` |
| `dr-explore` | 探索・収集フェーズ（evidence.jsonl生成） | `/dr-explore [topic]` |
| `dr-synthesize` | 検証・統合→レポート・実装計画生成 | `/dr-synthesize [run_path]` |
| `dr-build` | 実装計画をPoC/MVP/Productionに落とし込む | `/dr-build [plan_path]` |
| `dr-mcp-setup` | MCPサーバーのセットアップ支援 | `/dr-mcp-setup` |
| `sdd-req100` | EARS準拠の要件定義生成＋C.U.T.E.自動採点（目標98点） | `/sdd-req100 [spec-slug]` |

**使用例:**
```bash
/research AIエージェントの最新動向
/research 2026年のSaaS市場トレンド
/dr-explore Claude MCP | depth=deep | lang=ja,en
```

### 📊 リサーチ・キーワード抽出スキル 🆕

**APIキー不要版**と**API版（高精度）**の2種類を用意。他人にシステムを渡すときは、APIキー不要版をすぐに使えます。

#### すぐに使えるスキル（APIキー設定不要）

| スキル | 説明 | コマンド |
|-------|------|---------|
| `research-free` | WebSearch/WebFetchのみでリサーチ | `/research-free [トピック]` |
| `keyword-free` | WebSearchのみでキーワード抽出 | `/keyword-free [キーワード]` |

```bash
# 例
/research-free AIエージェントの最新動向
/research-free Next.js 15 新機能 --depth=quick

/keyword-free 投資信託
/keyword-free プログラミング --type=longtail
```

> **ポイント**: Claude Codeをインストールすれば**すぐ使えます**。APIキーの設定は不要です。

#### 高精度版（APIキー設定が必要）

| スキル | 説明 | コマンド |
|-------|------|---------|
| `mega-research` | 6つのAPIを統合した深層リサーチ | `/mega-research [トピック]` |
| `keyword-mega-extractor` | 検索ボリューム・競合度付きキーワード分析 | `/keyword-mega-extractor [キーワード]` |

```bash
# 例
/mega-research AIエージェント市場の最新動向 --mode=deep
/keyword-mega-extractor 転職 --type=buying
```

> **必要なAPIキー**: 使用するには以下のAPIキーを`~/.zshrc`または`.env`に設定してください。
> - Tavily: https://tavily.com/
> - SerpAPI: https://serpapi.com/
> - Brave Search: https://brave.com/search/api/
> - NewsAPI: https://newsapi.org/
> - Perplexity: https://perplexity.ai/settings/api

#### 比較表

| 機能 | APIキー不要版 | API版（高精度） |
|------|-------------|----------------|
| **配布** | そのまま動作 ✅ | APIキー設定必要 |
| **検索精度** | 良好 | 高精度 |
| **検索速度** | 標準 | 高速（並列） |
| **検索ボリューム** | 推定のみ | 正確なデータ |
| **必要なもの** | Claude Codeのみ | 各種APIキー |

### 🔍 追加MCP（無料）

APIキー不要で使える追加のMCPサーバー。

| MCP | 費用 | 用途 | 状態 |
|-----|------|------|------|
| `open-websearch` | 無料 | DuckDuckGo/Bing/Brave検索 | ✅ 有効（設定不要） |
| `twitter-client` | 無料 | Twitter/Xツイート取得・検索 | ⚠️ 要設定（下記参照） |
| `playwright` | 無料 | ブラウザ自動化 | ✅ 有効（設定不要） |

#### 🐦 Twitter/X MCP の設定方法

Twitter機能を使うにはCookie認証が必要です（APIキー不要・無料）。

**Step 1: Cookieを取得**

1. **Chrome/Edgeで X.com にログイン**
2. **F12キーでDevToolsを開く**
3. **「Application」タブ → 「Cookies」→ 「https://x.com」をクリック**
4. **以下の3つの値をコピー**:

| Name | 説明 |
|------|------|
| `auth_token` | 認証トークン（約40文字） |
| `ct0` | CSRFトークン（約100文字） |
| `twid` | ユーザーID（`u%3D数字`形式） |

**Step 2: .envに設定**

プロジェクトの`.env`ファイルに以下を追加（値は自分のものに置き換え）:

```bash
TWITTER_COOKIES=["auth_token=あなたのauth_token; Domain=.twitter.com", "ct0=あなたのct0; Domain=.twitter.com", "twid=あなたのtwid; Domain=.twitter.com"]
```

**Step 3: MCPを有効化**

`.mcp.json`の`twitter-client`セクションで`"disabled": false`に変更:

```json
"twitter-client": {
  ...
  "disabled": false,  // ← trueからfalseに変更
  ...
}
```

**Step 4: Claude Codeを再起動**

```bash
# Ctrl+C で終了後、再度起動
claude
```

**使用例:**
```
「このツイートの内容を教えて: https://x.com/username/status/123456789」
「"AI Agent" に関する最新ツイートを10件検索して」
「DuckDuckGoで "Claude Code MCP" を検索して」
```

> **⚠️ 注意**: Cookie情報は**絶対に他人と共有しないでください**。GitHubにプッシュされる`.env.example`にはプレースホルダーのみ含まれ、実際の値は含まれません。

### インフラ・自動化（11スキル）

| スキル | 説明 | コマンド |
|-------|------|---------|
| `workflow-automation-n8n` | n8nワークフロー設計・実装 | `/workflow-automation-n8n` |
| `docker-mcp-ops` | Docker操作（コンテナ起動/停止/ログ） | `/docker-mcp-ops` |
| `security-scan-trivy` | Trivyセキュリティスキャン | `/security-scan-trivy` |
| `pdf-automation-gotenberg` | PDF変換・帳票出力自動化 | `/pdf-automation-gotenberg` |
| `doc-convert-pandoc` | ドキュメント変換（md→docx/pptx等） | `/doc-convert-pandoc` |
| `unified-notifications-apprise` | 通知チャネル統合（Slack/Discord/Email等） | `/unified-notifications-apprise` |
| `postgres-mcp-analyst` | PostgreSQL分析（read-only） | `/postgres-mcp-analyst` |
| `notion-knowledge-mcp` | Notionナレッジ検索・整理 | `/notion-knowledge-mcp` |
| `nlq-bi-wrenai` | 自然言語BI/可視化（WrenAI） | `/nlq-bi-wrenai` |
| `research-cited-report` | 出典付きリサーチレポート | `/research-cited-report` |
| `sns-patterns` | SNS投稿パターン | `/sns-patterns` |

### 開発フェーズ（2スキル）

| スキル | 説明 | コマンド |
|-------|------|---------|
| `phase1-tools` | Phase 1ツール群 | - |
| `phase2-monitoring` | Phase 2モニタリング | - |

---

## MCPツール使用例

### スキル検索・実行

```javascript
// 全スキル一覧
mcp__taisun-proxy__skill_search()

// キーワード検索
mcp__taisun-proxy__skill_search(query="taiyo")

// スキル実行
mcp__taisun-proxy__skill_run(name="youtube-thumbnail")
```

### メモリ操作

```javascript
// 長期メモリに保存（直接テキスト）
mcp__taisun-proxy__memory_add(
  content="重要な調査結果...",
  type="long-term",
  metadata={ project: "LP改善" }
)
// → refId: "mem_abc123" を返す

// ファイルから保存（大量ログ向け）
mcp__taisun-proxy__memory_add(
  content_path="logs/test-failure.log",
  type="short-term",
  metadata={ type: "test-log", issue: "DB接続エラー" }
)
// → コンテキスト節約: 100KB → 50トークン（99.8%削減）

// 検索
mcp__taisun-proxy__memory_search(query="mem_abc123")
```

### 履歴検索（3層ワークフロー）

```javascript
// Step 1: インデックス検索
mcp__claude-mem-search__search(
  query="LP作成",
  limit=10,
  dateStart="2026-01-01"
)

// Step 2: コンテキスト取得
mcp__claude-mem-search__timeline(
  anchor=123,
  depth_before=2,
  depth_after=2
)

// Step 3: 詳細取得（必要なIDのみ）
mcp__claude-mem-search__get_observations(
  ids=[123, 124, 125]
)
```

### システムヘルスチェック

```javascript
mcp__taisun-proxy__system_health()
// → { status, uptime, mcps, circuits, metrics }
```

## Quick Start

> **日本語ユーザー向け**: 詳細なセットアップガイドは [docs/getting-started-ja.md](docs/getting-started-ja.md) をご覧ください。

### Prerequisites

- Node.js 18.x+
- npm 9.x+
- Claude Code CLI
- Docker (optional, for monitoring stack)

### Installation

```bash
# Clone repository
git clone https://github.com/taiyousan15/taisun_agent.git ~/taisun_agent
cd ~/taisun_agent

# Setup (dependencies + hooks + skills + agents)
npm run taisun:setup

# Verify (should be 100/100)
npm run taisun:diagnose
```

> **Windows (PowerShell)**:
> ```powershell
> git clone https://github.com/taiyousan15/taisun_agent.git $HOME\taisun_agent
> cd $HOME\taisun_agent
> npm run taisun:setup
> npm run taisun:diagnose
> ```

#### Use in Other Projects (Symlink)

```bash
# Mac/Linux
cd ~/your-project
ln -s ~/taisun_agent/.claude .claude
ln -s ~/taisun_agent/.mcp.json .mcp.json
```

```powershell
# Windows (Administrator PowerShell)
cd $HOME\your-project
New-Item -ItemType SymbolicLink -Path .claude -Target $HOME\taisun_agent\.claude
New-Item -ItemType SymbolicLink -Path .mcp.json -Target $HOME\taisun_agent\.mcp.json
```

### Verification

```bash
# Run tests (775 tests)
npm test

# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build:all
```

## Usage

### Using Agents

```javascript
// Architecture design
Task(subagent_type="system-architect", prompt="ECサイトのアーキテクチャを設計して")

// Backend implementation
Task(subagent_type="backend-developer", prompt="ユーザー認証APIを実装して")

// Code review (0-100 scoring)
Task(subagent_type="code-reviewer", prompt="このPRをレビューして")

// Auto-select optimal agent
Task(subagent_type="ait42-coordinator", prompt="ユーザー認証機能を設計・実装して")
```

### Using Skills

```bash
# Sales letter
/sales-letter --product "オンライン講座"

# LP analysis
/lp-analysis https://example.com

# Security scan
/security-scan-trivy

# Daily observability report
npm run obs:report:daily
```

### Monitoring Stack

```bash
# Start monitoring (Prometheus, Grafana, Loki)
make monitoring-up

# Start ops tools (Gotenberg, PDF)
make tools-up

# Start scheduled jobs daemon
docker compose -f docker-compose.ops.yml --profile ops-scheduler up -d
```

## Project Structure

```
taisun_agent/
├── src/
│   └── proxy-mcp/              # Proxy MCP Server (11.2K LOC)
│       ├── server.ts           # MCP server entry
│       ├── tools/              # Public tools (system, skill, memory)
│       ├── memory/             # Memory service & storage
│       ├── router/             # Hybrid router engine
│       ├── internal/           # Circuit breaker, resilience
│       ├── browser/            # Chrome/CDP integration
│       ├── skillize/           # URL→Skill generation
│       ├── supervisor/         # GitHub workflow integration
│       ├── ops/                # Schedule, incidents, digest
│       └── observability/      # Event tracking & metrics
│
├── .claude/                    # Agent system
│   ├── agents/                 # 82 agent definitions
│   ├── skills/                 # 77 skill definitions
│   ├── commands/               # 82 command shortcuts
│   ├── mcp-servers/            # 4 custom MCP servers
│   ├── mcp-tools/              # 227 MCP tools
│   └── memory/                 # Learning & statistics
│
├── config/
│   └── proxy-mcp/              # MCP configuration
│       ├── internal-mcps.json  # MCP registry
│       ├── ops-schedule.json   # Scheduled jobs
│       └── incidents.json      # Incident tracking
│
├── docs/                       # Documentation (30+ files)
│   ├── ARCHITECTURE.md
│   ├── DEVELOPER_GUIDE.md
│   ├── API_REFERENCE.md
│   ├── OPERATIONS.md
│   └── third-agent/            # Advanced docs
│
├── tests/
│   ├── unit/                   # 22 unit test files
│   └── integration/            # 5 integration suites
│
├── docker-compose.monitoring.yml  # Prometheus/Grafana/Loki
├── docker-compose.tools.yml       # Document processing
└── docker-compose.ops.yml         # Operations environment
```

## Quality Gates

| Metric | Requirement | Current |
|--------|-------------|---------|
| Test Coverage | 80%+ | 80%+ |
| Code Review Score | 80+ | 80+ |
| Security Scan | Zero Critical/High | Zero |
| P0/P1 Bugs | Zero | Zero |

## NPM Scripts

```bash
# TAISUN Diagnostics (推奨)
npm run taisun:diagnose       # 13層防御・全コンポーネント診断
npm run taisun:diagnose:full  # 詳細診断
npm run taisun:setup          # セットアップガイド表示

# Development
npm run dev                    # Watch mode
npm test                       # Run all tests
npm run lint                   # ESLint
npm run typecheck              # TypeScript check

# Building
npm run proxy:build           # Build proxy MCP
npm run scripts:build         # Build scripts
npm run build:all             # Full build

# Operations
npm run obs:report:daily      # Daily observability report
npm run obs:report:weekly     # Weekly report
npm run ops:schedule:status   # Check scheduled jobs

# Utilities
npm run agents:list           # List available agents
npm run skills:list           # List available skills
npm run proxy:smoke           # MCP smoke test
```

## Documentation

### Getting Started

| Document | Description |
|----------|-------------|
| [QUICK_START.md](docs/QUICK_START.md) | 5分クイックスタート |
| [BEGINNERS_PROMPT_GUIDE.md](docs/BEGINNERS_PROMPT_GUIDE.md) | 初心者向けフレーズ集 ⭐ |
| [CONFIG.md](docs/CONFIG.md) | 設定ガイド |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | トラブルシューティング |
| [getting-started-ja.md](docs/getting-started-ja.md) | 日本語セットアップガイド |

### Development

| Document | Description |
|----------|-------------|
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | コントリビューションガイド |
| [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) | 開発者ガイド |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | システムアーキテクチャ |
| [API_REFERENCE.md](docs/API_REFERENCE.md) | API リファレンス |

### Operations

| Document | Description |
|----------|-------------|
| [OPERATIONS.md](docs/OPERATIONS.md) | 運用ガイド |
| [RUNBOOK.md](docs/RUNBOOK.md) | ランブック |
| [SECURITY.md](docs/SECURITY.md) | セキュリティポリシー |
| [CHANGELOG.md](docs/CHANGELOG.md) | 変更履歴 |

## Technology Stack

| Category | Technologies |
|----------|--------------|
| **Runtime** | Node.js 18+, TypeScript 5.3+ |
| **Testing** | Jest 29.7 |
| **MCP** | @modelcontextprotocol/sdk 1.0 |
| **AI** | Anthropic SDK, LangChain |
| **Browser** | Playwright Core 1.57 |
| **Monitoring** | Prometheus, Grafana, Loki |
| **Infrastructure** | Docker, n8n |

## Contributing

詳細は [CONTRIBUTING.md](docs/CONTRIBUTING.md) を参照してください。

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - See [LICENSE](LICENSE) for details.

## Support

- Issues: [GitHub Issues](https://github.com/taiyousan15/taisun_agent/issues)
- Documentation: [docs/](docs/)

---

Built with [Claude Code](https://claude.ai/code)
