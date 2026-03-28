# TAISUN Agent 未使用リソース分析レポート

生成日時: 2026-01-18

## エグゼクティブサマリー

| カテゴリ | 総数 | 未使用 | 使用率 |
|---------|------|--------|--------|
| **Agents** | 82 | 71 | 13.4% |
| **Skills** | 70 | 11 | 84.3% |
| **Commands** | 82 | 33 | 59.8% |
| **合計** | 234 | 115 | 50.9% |

**重要発見**: プロジェクトの約半分（49.1%）のリソースが実際に参照されていません。

---

## 1. 未使用エージェント（71個）

### 1.1 完全未使用のエージェント

以下の71個のエージェントは、プロジェクト内で一切参照されていません:

#### Coordinators & Orchestrators
- `ait42-01-ait42-coordinator-fast` - 高速コーディネーター
- `ait42-initialization-orchestrator` - 初期化オーケストレーター
- `ait42-omega-aware-coordinator` - Ω関数対応コーディネーター
- `ait42-self-healing-coordinator` - 自己修復コーディネーター

#### Diagnostics & Recovery (5個すべて未使用)
- `ait42-dependency-validator`
- `ait42-environment-doctor`
- `ait42-error-recovery-planner`
- `ait42-log-analyzer`
- `ait42-system-diagnostician`

#### Architecture & Design (6個すべて未使用)
- `ait42-api-designer`
- `ait42-cloud-architect`
- `ait42-database-designer`
- `ait42-security-architect`
- `ait42-system-architect`
- `ait42-ui-ux-designer`

#### Development (6個すべて未使用)
- `ait42-api-developer`
- `ait42-backend-developer`
- `ait42-database-developer`
- `ait42-frontend-developer`
- `ait42-integration-developer`
- `ait42-migration-developer`

#### Quality Assurance (8個すべて未使用)
- `ait42-chaos-engineer`
- `ait42-code-reviewer`
- `ait42-integration-tester`
- `ait42-mutation-tester`
- `ait42-performance-tester`
- `ait42-qa-validator`
- `ait42-security-tester`
- `ait42-test-generator`

#### Operations (8個すべて未使用)
- `ait42-backup-manager`
- `ait42-cicd-manager`
- `ait42-config-manager`
- `ait42-container-specialist`
- `ait42-devops-engineer`
- `ait42-incident-responder`
- `ait42-monitoring-specialist`
- `ait42-release-manager`

#### Documentation (3個すべて未使用)
- `ait42-doc-reviewer`
- `ait42-knowledge-manager`
- `ait42-tech-writer`

#### Analysis (4個すべて未使用)
- `ait42-complexity-analyzer`
- `ait42-feedback-analyzer`
- `ait42-innovation-scout`
- `ait42-learning-agent`

#### Specialized (5個すべて未使用)
- `ait42-bug-fixer`
- `ait42-feature-builder`
- `ait42-implementation-assistant`
- `ait42-refactor-specialist`
- `ait42-script-writer`

#### Multi-Agent (4個すべて未使用)
- `ait42-multi-agent-competition`
- `ait42-multi-agent-debate`
- `ait42-multi-agent-ensemble`
- `ait42-reflection-agent`

#### Process (5個すべて未使用)
- `ait42-integration-planner`
- `ait42-metrics-collector`
- `ait42-process-optimizer`
- `ait42-requirements-elicitation`
- `ait42-workflow-coordinator`

#### Specialized Tools
- `ait42-session-summarizer`
- `ait42-tmux-command-executor`
- `ait42-tmux-monitor`
- `ait42-tmux-session-creator`
- `automation-architect`
- `data-analyst`
- `doc-ops`
- `researcher`
- `security-auditor`
- `sub-code-reviewer`
- `sub-code-searcher`
- `sub-implementer`
- `sub-planner`
- `sub-test-engineer`
- `sub-test-runner-fixer`

### 1.2 使用されているエージェント（11個のみ）

- `00-ait42-coordinator` - メインコーディネーター
- `taiyou-codegen-agent`
- `taiyou-coordinator-agent`
- `taiyou-deployment-agent`
- `taiyou-issue-agent`
- `taiyou-pr-agent`
- `taiyou-review-agent`

---

## 2. 未使用スキル（11個）

### 2.1 完全未使用のスキル

- `customer-support-120` - カスタマーサポート120日プログラム
- `dual-ai-review` - デュアルAIレビュー
- `gpt-sovits-tts` - GPT-SoVITS音声合成
- `phase2-monitoring` - フェーズ2モニタリング
- `taiyo-rewriter` - 太陽スタイルリライター
- `taiyo-style-bullet` - 太陽スタイル箇条書き
- `taiyo-style-headline` - 太陽スタイル見出し
- `taiyo-style-ps` - 太陽スタイル追伸
- `taiyo-style-vsl` - 太陽スタイルVSL
- `video-transcribe` - 動画文字起こし
- `youtube_channel_summary` - YouTubeチャンネル要約

### 2.2 よく使われているスキル

- `video-policy` - ビデオポリシー管理
- `copywriting-helper` - コピーライティング支援
- `youtube-thumbnail` - サムネイル作成
- `lp-generator` - LP生成
- `omnihuman1-video` - AIアバター動画

---

## 3. 未使用コマンド（33個）

### 3.1 完全未使用のコマンド

#### Analysis & Feedback
- `analyze-feedback` - フィードバック分析
- `capture-learning` - 学習キャプチャ
- `scout-innovation` - イノベーションスカウト

#### Design Commands
- `design-cloud-architecture` - クラウドアーキテクチャ設計

#### Development Commands
- `develop-api` - API開発
- `develop-backend` - バックエンド開発
- `develop-database` - データベース開発
- `develop-frontend` - フロントエンド開発
- `develop-integration` - 統合開発
- `develop-migration` - マイグレーション開発

#### Documentation
- `diagram-insert` - 図解挿入
- `generate-docs` - ドキュメント生成
- `manage-knowledge` - ナレッジ管理
- `review-docs` - ドキュメントレビュー
- `write-docs` - ドキュメント作成
- `write-script` - スクリプト作成

#### Operations
- `gather-requirements` - 要件収集
- `manage-backups` - バックアップ管理
- `manage-incidents` - インシデント管理
- `manage-infrastructure` - インフラ管理
- `optimize-containers` - コンテナ最適化
- `optimize-process` - プロセス最適化
- `optimize-workflow` - ワークフロー最適化
- `plan-integration` - 統合計画

#### Testing
- `test-chaos` - カオステスト
- `test-mutation` - ミューテーションテスト
- `test-security` - セキュリティテスト

#### Workflow
- `workflow-next` - 次のワークフロー
- `workflow-start` - ワークフロー開始
- `workflow-status` - ワークフロー状態
- `workflow-verify` - ワークフロー検証

#### Taiyou
- `taiyou-init` - Taiyou初期化

#### OpenCode
- `opencode-setup` - OpenCodeセットアップ

### 3.2 使用されているコマンド

- `/taiyou-auto` - Taiyou自動実行
- `/taiyou-status` - Taiyou状態確認
- `/lp-normal` - 通常LP作成
- `/youtube-thumbnail` - サムネイル作成
- `/security-scan` - セキュリティスキャン

---

## 4. 重複定義の問題

### 4.1 重複ファイル名

以下のファイル名が複数のディレクトリに存在します:

- **CLAUDE.md** (7箇所)
  - `.claude/CLAUDE.md` (メイン設定)
  - `.claude/agents/CLAUDE.md`
  - `.claude/commands/CLAUDE.md`
  - `.claude/hooks/CLAUDE.md`
  - `.claude/includes/CLAUDE.md`
  - `.claude/mcp-servers/CLAUDE.md`
  - `.claude/memory/CLAUDE.md`
  - 各スキルディレクトリ内にも多数存在

- **README.md** (2箇所)
  - `.claude/mcp-tools/README.md`
  - `.claude/memory/README.md`

- **mistakes.md** (2箇所)
  - `.claude/mistakes.md`
  - `.claude/hooks/mistakes.md`

- **skill.md / SKILL.md** (66箇所)
  - 各スキルディレクトリに定義ファイルとして存在

### 4.2 矛盾の可能性

複数のCLAUDE.mdが存在することで、設定の一貫性が失われる可能性があります。

---

## 5. 孤立ファイル

### 5.1 Temp ディレクトリ

`.claude/temp/memory-stats.json` - 一時ファイルが残存

### 5.2 スキルディレクトリの不一致

- スキルディレクトリ数: 71
- skill.md/SKILL.mdファイル数: 66
- 差分: 5個のスキルに定義ファイルが欠落

---

## 6. 整理提案

### 6.1 即座に実行可能なアクション

#### Phase 1: 未使用リソースのアーカイブ（推奨）

```bash
# アーカイブディレクトリを作成
mkdir -p .claude/archive/{agents,skills,commands}

# 未使用エージェントを移動
mv .claude/agents/ait42-01-ait42-coordinator-fast.md .claude/archive/agents/
mv .claude/agents/ait42-api-developer.md .claude/archive/agents/
# ... (全71個)

# 未使用スキルを移動
mv .claude/skills/customer-support-120 .claude/archive/skills/
mv .claude/skills/dual-ai-review .claude/archive/skills/
# ... (全11個)

# 未使用コマンドを移動
mv .claude/commands/analyze-feedback.md .claude/archive/commands/
mv .claude/commands/capture-learning.md .claude/archive/commands/
# ... (全33個)
```

#### Phase 2: 削除（慎重に）

アーカイブ後、1ヶ月間問題がなければ削除を検討:

```bash
rm -rf .claude/archive/
```

### 6.2 重複定義の統合

#### CLAUDE.mdの統合

1. メインの `.claude/CLAUDE.md` を正とする
2. サブディレクトリの `CLAUDE.md` は削除または `README.md` にリネーム
3. スキル内の `CLAUDE.md` は各スキルの説明として保持（リネーム検討）

#### mistakes.mdの統合

`.claude/hooks/mistakes.md` を削除し、`.claude/mistakes.md` に統合

### 6.3 ディレクトリ構造の最適化

```
.claude/
├── CLAUDE.md                    # メイン設定（保持）
├── settings.json                # システム設定（保持）
│
├── agents/                      # 11個のみ保持
│   ├── 00-ait42-coordinator.md
│   ├── taiyou-*.md (6個)
│   └── ... (使用中のみ)
│
├── skills/                      # 59個保持
│   ├── copywriting-helper/
│   ├── youtube-thumbnail/
│   └── ... (使用中のみ)
│
├── commands/                    # 49個保持
│   ├── taiyou-auto.md
│   ├── lp-normal.md
│   └── ... (使用中のみ)
│
├── archive/                     # 未使用リソース保管
│   ├── agents/ (71個)
│   ├── skills/ (11個)
│   └── commands/ (33個)
│
└── ... (その他は現状維持)
```

### 6.4 メンテナンス戦略

#### 定期的な監査

```bash
# 3ヶ月ごとに未使用リソースチェック
./scripts/audit-unused-resources.sh
```

#### 使用状況トラッキング

各リソースに最終使用日時を記録:

```yaml
# .claude/resource-usage.yaml
agents:
  ait42-coordinator:
    last_used: 2026-01-18
    usage_count: 47
  taiyou-coordinator-agent:
    last_used: 2026-01-17
    usage_count: 23
```

#### ドキュメント更新

`.claude/CLAUDE.md` の統計情報を正確に更新:

```markdown
| Component | Count | Description |
|-----------|-------|-------------|
| **Agents** | 11 | 実際に使用中のエージェント |
| **Skills** | 59 | 実際に使用中のスキル |
| **Commands** | 49 | 実際に使用中のコマンド |
```

---

## 7. リスク評価

### 7.1 削除リスク

| リソース | リスク | 対策 |
|---------|--------|------|
| 未使用エージェント | 低 | アーカイブして1ヶ月監視 |
| 未使用スキル | 中 | 個別レビュー後にアーカイブ |
| 未使用コマンド | 低 | アーカイブして1ヶ月監視 |

### 7.2 統合リスク

| 項目 | リスク | 対策 |
|------|--------|------|
| CLAUDE.md統合 | 高 | バックアップ後に慎重に実施 |
| mistakes.md統合 | 低 | 内容確認後に統合 |

---

## 8. 実行計画

### Week 1: 調査・準備
- [ ] 未使用リソースの最終確認
- [ ] アーカイブディレクトリ作成
- [ ] バックアップ取得

### Week 2: アーカイブ実行
- [ ] 未使用エージェント71個をアーカイブ
- [ ] 未使用スキル11個をアーカイブ
- [ ] 未使用コマンド33個をアーカイブ

### Week 3: 統合作業
- [ ] CLAUDE.mdの統合
- [ ] mistakes.mdの統合
- [ ] ドキュメント更新

### Week 4: 検証
- [ ] システム動作確認
- [ ] 使用統計の再計測
- [ ] ドキュメント最終更新

### Month 2-3: 監視期間
- [ ] アーカイブリソースへの参照がないか監視
- [ ] 問題なければ削除を検討

---

## 9. 期待される効果

### 9.1 メンテナンス性の向上

- **リソース数削減**: 234個 → 119個 (49%削減)
- **検索性向上**: 不要なファイルが減り、必要なリソースが見つけやすくなる
- **認知負荷軽減**: 実際に使うリソースのみに集中できる

### 9.2 パフォーマンス改善

- **起動時間短縮**: 読み込むファイル数が減る
- **検索速度向上**: インデックスサイズが小さくなる

### 9.3 品質向上

- **一貫性確保**: 重複定義を排除
- **明確化**: 実際に使われるリソースのみが存在

---

## 10. 結論

TAISUNプロジェクトには**115個（49.1%）の未使用リソース**が存在します。これらは過去の開発過程で作成されたものの、現在は使用されていません。

### 推奨アクション

1. **即座に実行**: 未使用リソースをアーカイブ（削除ではない）
2. **1ヶ月監視**: アーカイブ後に問題がないか確認
3. **3ヶ月後**: 問題なければ永久削除
4. **定期監査**: 3ヶ月ごとに未使用リソースをチェック

### 最優先事項

- **81個のエージェントのうち71個が未使用** - これは最も大きな問題
- **ドキュメントの統計情報が不正確** - CLAUDE.mdの更新が必要
- **重複CLAUDE.mdの統合** - 設定の一貫性確保

---

## 付録A: 未使用リソース完全リスト

### Agents (71個)

```
ait42-01-ait42-coordinator-fast.md
ait42-api-developer.md
ait42-backup-manager.md
ait42-bug-fixer.md
ait42-chaos-engineer.md
ait42-cicd-manager.md
ait42-cloud-architect.md
ait42-code-reviewer.md
ait42-complexity-analyzer.md
ait42-config-manager.md
ait42-container-specialist.md
ait42-database-designer.md
ait42-database-developer.md
ait42-dependency-validator.md
ait42-devops-engineer.md
ait42-doc-reviewer.md
ait42-environment-doctor.md
ait42-error-recovery-planner.md
ait42-feature-builder.md
ait42-feedback-analyzer.md
ait42-frontend-developer.md
ait42-implementation-assistant.md
ait42-incident-responder.md
ait42-initialization-orchestrator.md
ait42-innovation-scout.md
ait42-integration-developer.md
ait42-integration-planner.md
ait42-integration-tester.md
ait42-knowledge-manager.md
ait42-learning-agent.md
ait42-log-analyzer.md
ait42-metrics-collector.md
ait42-migration-developer.md
ait42-monitoring-specialist.md
ait42-multi-agent-competition.md
ait42-multi-agent-debate.md
ait42-multi-agent-ensemble.md
ait42-mutation-tester.md
ait42-omega-aware-coordinator.md
ait42-performance-tester.md
ait42-process-optimizer.md
ait42-qa-validator.md
ait42-refactor-specialist.md
ait42-reflection-agent.md
ait42-release-manager.md
ait42-requirements-elicitation.md
ait42-script-writer.md
ait42-security-architect.md
ait42-security-scanner.md
ait42-security-tester.md
ait42-self-healing-coordinator.md
ait42-session-summarizer.md
ait42-system-architect.md
ait42-system-diagnostician.md
ait42-tech-writer.md
ait42-test-generator.md
ait42-tmux-command-executor.md
ait42-tmux-monitor.md
ait42-tmux-session-creator.md
ait42-ui-ux-designer.md
ait42-workflow-coordinator.md
automation-architect.md
data-analyst.md
doc-ops.md
researcher.md
security-auditor.md
sub-code-reviewer.md
sub-code-searcher.md
sub-implementer.md
sub-planner.md
sub-test-engineer.md
sub-test-runner-fixer.md
```

### Skills (11個)

```
customer-support-120
dual-ai-review
gpt-sovits-tts
phase2-monitoring
taiyo-rewriter
taiyo-style-bullet
taiyo-style-headline
taiyo-style-ps
taiyo-style-vsl
video-transcribe
youtube_channel_summary
```

### Commands (33個)

```
analyze-feedback.md
capture-learning.md
design-cloud-architecture.md
develop-api.md
develop-backend.md
develop-database.md
develop-frontend.md
develop-integration.md
develop-migration.md
diagram-insert.md
gather-requirements.md
generate-docs.md
manage-backups.md
manage-incidents.md
manage-infrastructure.md
manage-knowledge.md
taiyou-init.md
opencode-setup.md
optimize-containers.md
optimize-process.md
optimize-workflow.md
plan-integration.md
review-docs.md
scout-innovation.md
test-chaos.md
test-mutation.md
test-security.md
workflow-next.md
workflow-start.md
workflow-status.md
workflow-verify.md
write-docs.md
write-script.md
```

---

生成ツール: TAISUN Agent リソース監査システム v1.0
