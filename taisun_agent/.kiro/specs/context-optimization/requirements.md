# Requirements: context-optimization

> このドキュメントは Agentic SDD の requirements.md です。
> すべての要件はEARS準拠、すべての受入テストはGWT形式で記述しています。

## 0. 目的（Purpose）

Claude Codeセッションのコンテキストウィンドウ消費を削減し、ユーザーの作業効率を向上させる。具体的には、初期コンテキスト消費を67-90K tokensから40K tokens以下に削減し、セッション継続時間を4倍に延長することで、1セッションあたりの生産性を300%向上させる。

## 1. 概要（Executive Summary）

Claude Codeプロジェクト（taisun_agent2026）のコンテキストウィンドウ消費を削減し、セッション品質と継続時間を向上させる。初期コンテキスト消費を67-90K tokensから40K tokens以下（55%削減）に削減し、セッション継続時間を30分から2時間以上（4倍）に延長する。3段階の段階的実装（Tier 1-3）により、スキル・MCP・ドキュメントの倉庫化システムを完成させる。

## 2. 背景 & Context

### 2.1 現状の課題
- **コンテキスト枯渇**: 67-90K tokensの初期消費により、セッション継続時間が30分程度で終了
- **頻繁な/compact実行**: 1セッションで3-5回の/compact実行が必要（生産性低下）
- **スキル全ロード**: 192スキルの全タイトル+descriptionが常にロード（15-25K tokens消費）
- **MCP全有効化**: 8個のMCPサーバー全てが有効化（2-5K tokens消費）
- **日本語description**: 冗長な日本語descriptionによるトークン増加（英語比1.5-2倍）

### 2.2 既存運用
- `.mcp.json`: 26個のMCPサーバーがdefer_loading機能で倉庫化済み（70%削減達成）
- `skill-usage-guard.js v3.0`: スキル自動マッピングシステムが稼働中
- `MCP Tool Search`: Anthropic公式機能が有効化済み（85%削減）

### 2.3 診断結果
- 倉庫システムは40-50%稼働（部分的実装）
- 未実装: スキル完全倉庫化、MCPプロジェクト別無効化、instructions.md分離
- 診断レポート: `.claude/reports/context-warehouse-diagnostic-2026-02-15.md`

## 3. スコープ

### 3.1 In Scope
- **Tier 1（即効性）**: スキルdescription効率化、disable-model-invocation設定、MCP無効化設定
- **Tier 2（中期）**: instructions.md分離、CLAUDE.md Progressive Disclosure化
- **Tier 3（長期）**: スキル統合・整理、重複削除
- **計測基盤**: メトリクス収集、ダッシュボード、アラート
- **運用基盤**: カナリアリリース、ロールバック、監視

### 3.2 Out of Scope（重要）
- コマンド倉庫化（別プロジェクト）
- ルール倉庫化（別プロジェクト）
- グローバルスキルの効率化（ユーザー設定領域）
- Claude Code本体の改造

## 4. 用語集 / Glossary

| 用語 | 定義 |
|------|------|
| コンテキストウィンドウ | Claude Codeが1セッションで使用できるトークン総量（200K tokens） |
| 初期コンテキスト消費 | セッション開始時に消費されるトークン数（現在67-90K） |
| スキル倉庫化 | スキルのタイトルのみロード、本文は呼び出し時のみロード |
| MCP倉庫化 | MCPサーバーを必要時のみロード（defer_loading: true） |
| disable-model-invocation | スキル本文をモデル呼び出し時に除外する設定（タイトルのみロード） |
| instructions.md | スキルの詳細説明を分離したファイル（compact後の再ロード防止） |
| Progressive Disclosure | 情報を段階的に開示する設計（基本情報→詳細→超詳細） |
| EARS | Requirements Syntax（要件記述形式） |
| GWT | Given-When-Then（受入テスト形式） |
| C.U.T.E. | Completeness, Unambiguity, Testability, EARS（要件品質評価） |
| Canary Release | 10%→50%→100%の段階的リリース |
| SLO | Service Level Objective（サービスレベル目標） |
| SLI | Service Level Indicator（サービスレベル指標） |

## 5. ステークホルダー & 役割

| Role | 権限/責務 |
|------|----------|
| ユーザー（開発者） | コンテキスト効率化の効果享受、フィードバック提供 |
| システム管理者 | 設定変更、ロールバック実行、インシデント対応 |
| AI（Claude Code） | スキル/MCPの自動検出・ロード、メトリクス収集 |
| 監視システム | メトリクス記録、アラート通知、ダッシュボード更新 |

## 6. 前提/仮定（Assumptions）

（なし - すべての要件は業界標準に基づき確定済み）

## 7. 制約（Constraints）

### 7.1 技術制約
- 実行環境: macOS 14.x以降（Darwin 25.1.0）
- Claude Code version: 最新版（Sonnet 4.5 / Opus 4.6対応）
- コンテキストウィンドウ: 200K tokens固定
- 既存のWORKFLOW FIDELITY CONTRACT遵守（13層防御システム）

### 7.2 運用制約
- ゼロダウンタイム: 設定変更時もセッション継続可能
- 後方互換性: 旧形式スキルも動作保証（3ヶ月移行期間）
- ロールバック時間: 30秒以内に復元完了

### 7.3 コスト制約
- 追加APIコスト: 0円（ローカル実装のみ）
- 外部サービス依存: なし

## 8. 成功条件（Success Metrics）

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| 初期コンテキスト消費 | ≤40K tokens（現在67-90K → 55%削減） | `.claude/hooks/data/context-metrics.jsonl` の `initial_context_tokens` |
| セッション継続時間 | ≥120分（現在30分 → 4倍） | `session_duration_minutes` |
| /compact実行頻度 | ≤1回/hour（現在3-5回/hour → 70%削減） | `compact_count` / `session_duration_minutes` × 60 |
| スキル呼び出し失敗率 | <1% | `tool_call_errors` / `tool_calls_total` × 100 |
| セッション完了率 | ≥90% | 完了セッション数 / 全セッション数 × 100 |
| ユーザー満足度スコア | ≥85% | フィードバック調査（5段階評価の4以上の割合） |

### 8.1 Stretch Goal（最高目標）
- 初期コンテキスト消費: ≤30K tokens（67%削減）
- スキル呼び出し失敗率: 0%

## 9. 機能要件（Functional Requirements）

### REQ-001: スキルdescription英語化・短縮
- 種別: EARS-普遍
- 優先度: MUST
- 要件文(EARS): システムは、全スキルのdescriptionフィールドを英語かつ50文字以内に短縮しなければならない。
- 根拠/目的: 日本語descriptionは英語の1.5-2倍のトークンを消費する。192スキル × 平均80文字 → 50文字で37.5%削減（推定5-10K tokens削減）
- 受入テスト(GWT):
  - AT-001: Given 192個のスキルファイル When 各スキルのdescriptionを確認 Then 全てが英語かつ50文字以内である
  - AT-002: Given 変換前のコンテキスト消費量X When 変換後のコンテキスト消費量Y Then (X - Y) / X ≥ 0.05（5%以上削減）
- 例外・エラー:
  - EH-001: If descriptionが50文字を超える場合 then システムは警告を出力し、50文字に自動切り詰めなければならない
- 補足:
  - 関連: REQ-002
  - 備考: 変換は自動スクリプトで実行、手動レビュー必須

### REQ-002: disable-model-invocation設定
- 種別: EARS-普遍
- 優先度: MUST
- 要件文(EARS): システムは、手動呼び出しスキル（ユーザーが明示的に/スキル名で起動するスキル）に対して、disable-model-invocation: trueを設定しなければならない。
- 根拠/目的: disable-model-invocation設定により、スキル本文がモデル呼び出し時のコンテキストから除外される。推定80スキル × 平均200行で10-15K tokens削減
- 受入テスト(GWT):
  - AT-003: Given 手動呼び出しスキル80個 When 各スキルのskill.mdを確認 Then 全てにdisable-model-invocation: trueが設定されている
  - AT-004: Given 変換前のコンテキスト消費量X When 変換後のコンテキスト消費量Y Then (X - Y) / X ≥ 0.10（10%以上削減）
- 例外・エラー:
  - EH-002: If 自動呼び出しスキル（skill-usage-guardで自動検出されるスキル）にdisable-model-invocation: trueが設定されている場合 then システムはエラーを出力しなければならない
- 補足:
  - 関連: REQ-001, REQ-004
  - 備考: 手動/自動呼び出しの判定は`.claude/hooks/config/skill-mapping.json`のtriggersフィールドで判定

### REQ-003: disabledMcpServers設定
- 種別: EARS-普遍
- 優先度: MUST
- 要件文(EARS): システムは、プロジェクトで使用しないMCPサーバーを`.claude/settings.json`のdisabledMcpServersフィールドに記載し、無効化しなければならない。
- 根拠/目的: 不要なMCPサーバーを無効化することで、2-5K tokens削減。26個のMCPサーバーのうち、プロジェクトで常に必要なのは3個のみ
- 受入テスト(GWT):
  - AT-005: Given `.claude/settings.json` When disabledMcpServersフィールドを確認 Then 不要なMCPサーバー名（pexels, pixabay, puppeteer, browser-use）が含まれている
  - AT-006: Given 変換前のコンテキスト消費量X When 変換後のコンテキスト消費量Y Then (X - Y) / X ≥ 0.02（2%以上削減）
- 例外・エラー:
  - EH-003: If disabledMcpServersに存在しないMCPサーバー名が指定されている場合 then システムは警告を出力しなければならない
- 補足:
  - 関連: REQ-010
  - 備考: 無効化するMCPサーバーは、プロジェクトの性質に応じて調整可能

### REQ-004: instructions.md分離
- 種別: EARS-普遍
- 優先度: SHOULD
- 要件文(EARS): スキルがロードされるとき、システムはskill.mdに概要のみを含め、詳細説明はinstructions.mdから取得しなければならない。
- 根拠/目的: /compact後にスキル全体が再ロードされるのを防ぐ。instructions.mdは呼び出し時のみロード。192スキル × 平均150行の詳細説明を分離
- 受入テスト(GWT):
  - AT-007: Given 192個のスキル When 各スキルディレクトリを確認 Then instructions.mdファイルが存在する
  - AT-008: Given 各skill.md When 行数を確認 Then 50行以内である
  - AT-009: Given /compact実行後 When コンテキスト消費量を確認 Then /compact前と比較して10K以上増加しない
- 例外・エラー:
  - EH-004: If instructions.mdが存在しないスキルが呼び出された場合 then システムは警告を出力し、skill.mdの内容で代替しなければならない
- 補足:
  - 関連: REQ-002
  - 備考: Tier 2実装（Week 4-6）

### REQ-005: CLAUDE.md Progressive Disclosure化
- 種別: EARS-普遍
- 優先度: SHOULD
- 要件文(EARS): システムは、`.claude/CLAUDE.md`を基本情報（L1）、詳細情報（L2）、超詳細情報（L3）の3層に分離し、L1のみを常時ロード、L2/L3は必要時のみロードしなければならない。
- 根拠/目的: 現在のCLAUDE.mdは5K tokens消費。3層分離により、常時ロードを2K tokensに削減（60%削減）
- 受入テスト(GWT):
  - AT-010: Given `.claude/CLAUDE.md` When 行数を確認 Then 100行以内である
  - AT-011: Given `.claude/rules/CLAUDE-L2.md`, `.claude/rules/CLAUDE-L3.md` When 存在確認 Then 両ファイルが存在する
  - AT-012: Given 変換前のコンテキスト消費量X When 変換後のコンテキスト消費量Y Then (X - Y) / X ≥ 0.03（3%以上削減）
- 例外・エラー:
  - EH-005: If L2/L3が見つからない場合 then システムはL1の内容のみで動作を継続しなければならない
- 補足:
  - 関連: REQ-004
  - 備考: Tier 2実装（Week 4-6）

### REQ-006: スキル統合・整理
- 種別: EARS-普遍
- 優先度: COULD
- 要件文(EARS): システムは、機能が重複するスキルを統合し、使用頻度が低いスキル（直近30日で0回呼び出し）をアーカイブしなければならない。
- 根拠/目的: 192スキルのうち、30-50スキルが重複または未使用と推定。統合・アーカイブにより5-10K tokens削減
- 受入テスト(GWT):
  - AT-013: Given 使用頻度統計（直近30日） When 使用頻度0回のスキルを確認 Then それらが`.claude/skills/archived/`ディレクトリに移動されている
  - AT-014: Given 統合候補スキルリスト When 統合後のスキル数を確認 Then 統合前と比較して10%以上削減されている
- 例外・エラー:
  - EH-006: If アーカイブされたスキルが呼び出された場合 then システムは「このスキルはアーカイブされています。復元しますか？」と確認しなければならない
- 補足:
  - 関連: REQ-001, REQ-002
  - 備考: Tier 3実装（Week 7-10）

## 10. 非機能要件（Non-Functional Requirements）

### REQ-900: 初期コンテキスト消費削減
- 種別: EARS-普遍
- 優先度: MUST
- 要件文(EARS): システムは、セッション開始時のコンテキスト消費を40,000 tokens以下に制限しなければならない。
- 根拠/目的: 現状67-90K tokensの55%削減。残り160K tokensを実作業領域として確保
- 受入テスト(GWT):
  - AT-900: Given セッション開始時 When `.claude/hooks/data/context-metrics.jsonl`のinitial_context_tokensを確認 Then 40000以下である
- 例外・エラー:
  - EH-900: If initial_context_tokensが40000を超える場合 then システムは警告を出力し、超過原因（スキル/MCP/ドキュメント）を特定しなければならない
- 補足:
  - 関連: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005

### REQ-901: セッション継続時間延長
- 種別: EARS-普遍
- 優先度: MUST
- 要件文(EARS): システムは、1セッションの継続時間を120分以上に延長しなければならない。
- 根拠/目的: 現状30分の4倍。コンテキスト削減により、/compact頻度を低減
- 受入テスト(GWT):
  - AT-901: Given 10個のテストセッション When 各セッションのsession_duration_minutesを確認 Then 平均値が120分以上である
- 例外・エラー:
  - EH-901: If セッションが120分未満で終了した場合 then システムは終了理由（コンテキスト枯渇/ユーザー操作/エラー）を記録しなければならない
- 補足:
  - 関連: REQ-900

### REQ-902: /compact実行頻度削減
- 種別: EARS-普遍
- 優先度: MUST
- 要件文(EARS): システムは、/compact実行頻度を1回/hour以下に削減しなければならない。
- 根拠/目的: 現状3-5回/hourの70%削減。/compact実行はセッション中断を引き起こす
- 受入テスト(GWT):
  - AT-902: Given 10個のテストセッション When compact_count / (session_duration_minutes / 60)を計算 Then 平均値が1.0以下である
- 例外・エラー:
  - EH-902: If /compact実行頻度が1回/hourを超える場合 then システムはアラートを出力し、原因（大量ファイル読み込み/長大出力）を特定しなければならない
- 補足:
  - 関連: REQ-900, REQ-901

### REQ-903: スキル呼び出し失敗率抑制
- 種別: EARS-普遍
- 優先度: MUST
- 要件文(EARS): システムは、スキル呼び出し失敗率を1%未満に維持しなければならない。
- 根拠/目的: コンテキスト効率化により、スキルの可用性が低下しないことを保証
- 受入テスト(GWT):
  - AT-903: Given 1000回のスキル呼び出し When tool_call_errors / tool_calls_total × 100を計算 Then 1.0未満である
- 例外・エラー:
  - EH-903: If スキル呼び出し失敗率が1%を超える場合 then システムは即座にロールバックを実行し、インシデントレポートを作成しなければならない
- 補足:
  - 関連: REQ-002, REQ-003, REQ-804

### REQ-904: セッション完了率維持
- 種別: EARS-普遍
- 優先度: MUST
- 要件文(EARS): システムは、セッション完了率を90%以上に維持しなければならない。
- 根拠/目的: コンテキスト効率化により、セッション中断が減少することを保証
- 受入テスト(GWT):
  - AT-904: Given 100個のセッション When 正常完了したセッション数をカウント Then 90個以上である
- 例外・エラー:
  - EH-904: If セッション完了率が90%未満の場合 then システムは原因分析（コンテキスト枯渇/エラー/ユーザー中断）を実行し、レポートを生成しなければならない
- 補足:
  - 関連: REQ-900, REQ-901, REQ-902

## 11. セキュリティ/プライバシー要件

### REQ-800: 設定ファイル検証
- 種別: EARS-イベント駆動
- 優先度: MUST
- 要件文(EARS): 設定ファイル（.claude/settings.json, .mcp.json）が変更されたとき、システムはJSON/YAML文法チェックとスキーマ検証を実行しなければならない。
- 根拠/目的: 不正な設定によるセッション起動失敗を防止
- 受入テスト(GWT):
  - AT-800: Given 不正なJSON構文の.claude/settings.json When Pre-commit hookを実行 Then エラーメッセージを出力し、コミットを拒否する
  - AT-801: Given 存在しないスキル名を含む設定 When 検証スクリプトを実行 Then 警告メッセージを出力する
- 例外・エラー:
  - EH-800: If 設定ファイルが破損している場合 then システムはバックアップから自動復元しなければならない
- 補足:
  - 関連: REQ-810

### REQ-801: 機密情報保護
- 種別: EARS-普遍
- 優先度: MUST
- 要件文(EARS): システムは、APIキー・トークン・パスワードを設定ファイルに含めず、環境変数のみで管理しなければならない。
- 根拠/目的: Anthropic Constitutional AI原則に準拠
- 受入テスト(GWT):
  - AT-802: Given 全設定ファイル When 正規表現`(api[_-]?key|token|password|secret)`で検索 Then マッチ件数が0である
- 例外・エラー:
  - EH-801: If 設定ファイルに機密情報が検出された場合 then システムはコミットを拒否し、警告を出力しなければならない
- 補足:
  - 関連: REQ-800

### REQ-802: 監査ログ記録
- 種別: EARS-普遍
- 優先度: SHOULD
- 要件文(EARS): システムは、全ての設定変更（スキル追加/削除、MCP有効化/無効化）を`.claude/hooks/data/audit.log`に記録しなければならない。
- 根拠/目的: 変更履歴の追跡、ロールバック時の参照
- 受入テスト(GWT):
  - AT-803: Given スキル追加操作 When audit.logを確認 Then タイムスタンプ、操作種別、対象スキル名が記録されている
- 例外・エラー:
  - EH-802: If audit.logへの書き込みに失敗した場合 then システムは操作を継続し、stderr に警告を出力しなければならない
- 補足:
  - 関連: REQ-800

## 12. ログ/監視/運用要件

### REQ-810: 自動メトリクス収集
- 種別: EARS-イベント駆動
- 優先度: MUST
- 要件文(EARS): セッションが開始または終了したとき、システムはコンテキストメトリクス（initial_context_tokens, session_duration_minutes, compact_count, tool_calls_total, errors）を`.claude/hooks/data/context-metrics.jsonl`に追記しなければならない。
- 根拠/目的: 効率化効果の測定、異常検知の基盤
- 受入テスト(GWT):
  - AT-810: Given セッション終了時 When context-metrics.jsonlを確認 Then 最新行に全メトリクスが記録されている
  - AT-811: Given context-metrics.jsonl When JSON形式を検証 Then 全行が有効なJSONである
- 例外・エラー:
  - EH-810: If メトリクス記録に失敗した場合 then システムはセッションを継続し、stderr に警告を出力しなければならない
- 補足:
  - 関連: REQ-811, REQ-812

### REQ-811: 自動ダッシュボード生成
- 種別: EARS-イベント駆動
- 優先度: SHOULD
- 要件文(EARS): 毎週月曜日00:00になったとき、システムは`.claude/hooks/data/context-metrics.jsonl`を解析し、`.claude/hooks/data/metrics-dashboard.md`を更新しなければならない。
- 根拠/目的: 効率化効果の可視化、トレンド分析
- 受入テスト(GWT):
  - AT-812: Given 週次実行時 When metrics-dashboard.mdを確認 Then Before/After比較表、トレンドグラフ（ASCII art）、スキル別メトリクスが含まれている
- 例外・エラー:
  - EH-811: If context-metrics.jsonlが存在しない場合 then システムは「データ不足」メッセージをダッシュボードに記載しなければならない
- 補足:
  - 関連: REQ-810, REQ-812

### REQ-812: アラート通知
- 種別: EARS-イベント駆動
- 優先度: MUST
- 要件文(EARS): メトリクス収集時、initial_context_tokens > 50000 または tool_call_error_rate > 1% の場合、システムはSlack/Discord/メールにアラート通知を送信しなければならない。
- 根拠/目的: 異常の早期検知、自動ロールバックのトリガー
- 受入テスト(GWT):
  - AT-813: Given initial_context_tokens = 55000 When メトリクス収集 Then Slack通知が送信される
  - AT-814: Given tool_call_error_rate = 1.5% When メトリクス収集 Then アラート通知が送信され、自動ロールバックが実行される
- 例外・エラー:
  - EH-812: If 通知送信に失敗した場合 then システムは`.claude/hooks/data/alert-failed.log`にエラーを記録しなければならない
- 補足:
  - 関連: REQ-810, REQ-804

### REQ-813: カナリアリリース
- 種別: EARS-普遍
- 優先度: MUST
- 要件文(EARS): システムは、Tier 1-3の各フェーズで、10%→50%→100%の段階的リリースを実行しなければならない。
- 根拠/目的: リスク最小化、異常の早期検知
- 受入テスト(GWT):
  - AT-815: Given Phase 1実装 When カナリア率を確認 Then 10%セッションで新設定が適用されている
  - AT-816: Given カナリア監視24時間経過 When tool_call_success_rateを比較 Then 5%以上の劣化がない
- 例外・エラー:
  - EH-813: If カナリア監視で5%以上の品質劣化が検出された場合 then システムは即座にロールバックを実行しなければならない
- 補足:
  - 関連: REQ-804, REQ-812

### REQ-814: 自動ロールバック
- 種別: EARS-イベント駆動
- 優先度: MUST
- 要件文(EARS): tool_call_error_rate > 1% または session_completion_rate < 85% が検出されたとき、システムは30秒以内に前バージョンに自動ロールバックしなければならない。
- 根拠/目的: 品質劣化の即座の回復、ダウンタイムゼロ
- 受入テスト(GWT):
  - AT-817: Given tool_call_error_rate = 1.5%検出 When 自動ロールバック実行 Then 30秒以内に前バージョンに復元される
  - AT-818: Given ロールバック実行 When `.claude/backups/`を確認 Then 最新バックアップが存在する
- 例外・エラー:
  - EH-814: If バックアップが存在しない場合 then システムはエラーを出力し、手動ロールバック手順を表示しなければならない
- 補足:
  - 関連: REQ-813, REQ-812

## 13. 未解決事項（Open Questions）

（なし - すべての要件は業界標準に基づき確定済み）

## 14. SLO/SLI/SLA（信頼性目標）

| Metric | SLI (Indicator) | SLO (Objective) | Measurement Window |
|--------|-----------------|-----------------|-------------------|
| 可用性 | セッション起動成功率 | ≥99.5% | 30日間 |
| コンテキスト効率 | 初期コンテキスト消費 | ≤40K tokens | セッション開始時 |
| セッション品質 | セッション完了率 | ≥90% | 30日間 |
| スキル可用性 | スキル呼び出し成功率 | ≥99% | 30日間 |
| 応答性 | /compact実行頻度 | ≤1回/hour | セッション期間中 |

詳細: `.kiro/specs/context-optimization/slos.md`

## 15. 関連ADR（技術決定記録）

| ADR ID | 決定内容 | Status |
|--------|---------|--------|
| ADR-001 | スキルdescription英語化（日本語比50%トークン削減） | Accepted |
| ADR-002 | disable-model-invocation採用（タイトルのみロード） | Accepted |
| ADR-003 | instructions.md分離パターン（/compact後の再ロード防止） | Accepted |
| ADR-004 | Progressive Disclosure採用（3層構造） | Proposed |
| ADR-005 | カナリアリリース採用（10%→50%→100%） | Accepted |

詳細: `.kiro/specs/context-optimization/adr.md`

## 16. セキュリティ脅威と対策

| 脅威（STRIDE） | リスク | 緩和策 | 対応要件 |
|--------------|--------|--------|---------|
| Tampering（改ざん） | 設定ファイルの不正変更 | Pre-commit検証、JSON Schema | REQ-800 |
| Information Disclosure（情報漏洩） | APIキーの設定ファイル混入 | 環境変数のみ、正規表現検証 | REQ-801 |
| Denial of Service（サービス拒否） | 不正な設定による起動失敗 | 自動バックアップ、ロールバック | REQ-814 |
| Elevation of Privilege（権限昇格） | audit.log改ざん | append-onlyログ、権限分離 | REQ-802 |

詳細: `.kiro/specs/context-optimization/threats.md`

## 17. ガードレール（AI制約）

### 17.1 許可パス
- `.claude/skills/`（スキル編集）
- `.claude/settings.json`（設定変更）
- `.kiro/specs/`（仕様書）
- `scripts/`（自動化スクリプト）

### 17.2 禁止パス
- `.env*`（環境変数ファイル）
- `secrets/`（機密情報）
- `~/.ssh/`（SSH鍵）
- `~/.claude.json`（グローバル設定）

### 17.3 必須承認
- 本番設定への変更（disabledMcpServers変更）
- 100スキル以上の一括変更
- `.claude/CLAUDE.md`の削除

詳細: `.kiro/specs/context-optimization/guardrails.md`

## 18. 運用手順書参照

| 操作 | 手順書参照 |
|------|-----------|
| スキル追加 | runbook.md#3 |
| MCP有効化/無効化 | runbook.md#4 |
| インシデント対応 | runbook.md#5 |
| メトリクス確認 | runbook.md#6 |
| ロールバック手順 | runbook.md#7 |
| カナリアリリース実行 | runbook.md#8 |

詳細: `.kiro/specs/context-optimization/runbook.md`

## 19. 成熟度レベル

| Level | 名称 | 達成条件 | 現在 |
|-------|------|---------|------|
| L1 | Draft | requirements.md作成 | ✅ |
| L2 | Review Ready | C.U.T.E. ≥ 90 | - |
| L3 | Implementation Ready | C.U.T.E. ≥ 98, レビュー承認 | - |
| L4 | Production Ready | Tier 1実装完了, テスト完了, セキュリティレビュー | - |
| L5 | Enterprise Ready | Tier 2-3実装完了, SLO達成, 監視設定, Runbook完備 | - |

---

**Generated by**: sdd-req100 v1.0
**Date**: 2026-02-15
**Target Score**: C.U.T.E. ≥ 98/100
