# Stage 1: 測定基盤整備 - 完全設計書

**実装期間**: 2日（Day 1: 構築、Day 2: テスト）
**優先度**: S（データなき改善は許さない）
**オーナー**: Architecture Team
**依存**: なし

---

## 1. 目的

現在のhookシステムが実際に何を達成しているか、**客観的データを取得する**。

- ✅ False Positive率の測定（目標値: <10%）
- ✅ ブロック頻度の測定（目標値: <5%/day）
- ✅ Hook実行時間の測定（目標値: <2秒/call）
- ✅ Emergency Override需要の測定

**これなしに Stage 2 は実施しない。**

---

## 2. システム構成図

```
┌──────────────────────────────────────────────────┐
│         Claude Code Session              │
├──────────────────────────────────────────────────┤
│                                                  │
│  PreToolUse / PostToolUse / SessionStart Hook   │
│           ↓ (イベント発火)                    │
│                                                  │
│  metrics-collector.js (新規)                     │
│  ├─ hook-event.log に記録                        │
│  ├─ metrics-db.json に集計                       │
│  └─ override.log に緊急対応ログ                  │
│                                                  │
└──────────────────────────────────────────────────┘
       ↓ (1時間ごと)
┌──────────────────────────────────────────────────┐
│    metrics-aggregator.js (日次集計)              │
│    ├─ 1日分のデータを集計                        │
│    ├─ metrics-daily.json に保存                  │
│    └─ alerts.json を生成（異常検知）            │
└──────────────────────────────────────────────────┘
       ↓ (手動実行)
┌──────────────────────────────────────────────────┐
│    generate-metrics-report.js                    │
│    → metrics-dashboard.md（レポート生成）        │
└──────────────────────────────────────────────────┘
```

---

## 3. 作成するファイル

### 3.1 metrics-collector.js
**場所**: `.claude/hooks/metrics-collector.js`
**実行タイミング**: すべてのPreToolUse/PostToolUse hookの最後

**責務**:
- hook実行イベントを捕捉
- イベントデータをhook-event.logに追記
- メモリバッファに一時保存（15分ごとに集計）

**記録する情報**:
```javascript
{
  timestamp: "2026-02-13T10:30:45.123Z",
  hookName: "deviation-approval-guard",
  phase: "PreToolUse",
  toolName: "Write",
  toolParams: { /* パラメータハッシュ */ },
  eventType: "block|warning|allow",
  reason: "SKILL_BYPASS_DETECTED",
  processingTimeMs: 125,
  userOverride: false,
  sessionId: "session-2026-02-13-abc123"
}
```

### 3.2 override.log
**場所**: `.claude/hooks/override.log`
**形式**: JSON Lines（1行 = 1イベント）

**記録内容**:
```javascript
{
  timestamp: "2026-02-13T10:31:00.000Z",
  hookName: "deviation-approval-guard",
  overrideType: "TAISUN_OVERRIDE_ALL | TAISUN_OVERRIDE_SPECIFIC",
  overrideTarget: "newfile:embeddings.ts",
  overrideDuration: "1h | until-session-end",
  reason: "User approved new file creation",
  sessionId: "session-2026-02-13-abc123",
  userId: "matsumototoshihiko"
}
```

### 3.3 metrics-db.json
**場所**: `.claude/hooks/data/metrics-db.json`
**形式**: Streaming JSON（append-only）

**スキーマ**: `metrics-collector.spec.json` 参照

### 3.4 metrics-daily.json
**場所**: `.claude/hooks/data/metrics-daily/metrics-2026-02-13.json`
**生成**: 日次集計（毎日23:59に前日分を生成）

**内容**:
```javascript
{
  date: "2026-02-13",
  summary: {
    totalHookEvents: 1240,
    blockCount: 186,
    blockRate: "15.0%",
    falsePositiveEstimate: "18-22%",
    averageHookTimeMs: 245,
    p50TimeMs: 120,
    p95TimeMs: 680,
    p99TimeMs: 1200
  },
  byHook: {
    "deviation-approval-guard": {
      eventCount: 420,
      blockCount: 84,
      blockRate: "20.0%",
      processingTimeMs: 180
    },
    "skill-usage-guard": {
      eventCount: 380,
      blockCount: 5,
      blockRate: "1.3%",
      processingTimeMs: 95
    },
    // ... 他のhookも同様
  },
  overrides: {
    totalCount: 12,
    emergencyOverrideName: "TAISUN_OVERRIDE_ALL",
    specificOverrides: 5,
    lastOverride: {
      timestamp: "2026-02-13T15:45:00Z",
      hookName: "deviation-approval-guard",
      reason: "New file creation for feature X"
    }
  },
  alerts: [
    {
      level: "warning",
      message: "deviation-approval-guard の blockRate が 20% に達しました",
      threshold: 10,
      actual: 20
    }
  ]
}
```

---

## 4. 実装仕様

### 4.1 metrics-collector.js

**インターフェース**:
```javascript
/**
 * Hook metrics を記録
 * @param {Object} event - hook イベント
 * @param {string} event.hookName - フック名
 * @param {string} event.phase - PreToolUse | PostToolUse | SessionStart | SessionEnd
 * @param {string} event.toolName - ツール名（Write, Read, Bash等）
 * @param {number} event.processingTimeMs - フック処理時間
 * @param {string} event.eventType - 'block' | 'warning' | 'allow'
 * @param {string} event.reason - ブロック理由（block時のみ）
 */
async function recordMetric(event) {
  // 実装詳細は spec を参照
}
```

**実装要件**:
- [ ] hook-event.log への append（最大サイズ: 100MB）
- [ ] ローテーション（超過時は hook-event-2026-02-13.log に移動）
- [ ] メモリバッファ（15分ごとにフラッシュ）
- [ ] エラーハンドリング（ログ記録失敗時も処理を継続）
- [ ] パフォーマンス（記録処理 <10ms）

### 4.2 metrics-aggregator.js

**実行タイミング**: 日次 23:59（または手動呼び出し）

**実装要件**:
- [ ] hook-event.log の読み込み
- [ ] 日付ごとにグループ分け
- [ ] 統計計算（平均、p50、p95、p99）
- [ ] metrics-daily.json に出力
- [ ] 異常検知（blockRate > threshold）
- [ ] alerts.json 生成

### 4.3 generate-metrics-report.js

**実行**: 手動 (`npm run metrics:report`)

**出力**: metrics-dashboard.md

**内容**:
```markdown
# メトリクスダッシュボード

## 概要（過去7日間）
- 総Hook実行数: X
- ブロック率: Y%
- 平均処理時間: Z ms
- 最大処理時間: W ms

## Hook別詳細
| Hook | イベント数 | ブロック率 | 平均処理時間 |
|------|-----------|----------|------------|
| deviation-approval-guard | X | Y% | Z ms |
| skill-usage-guard | X | Y% | Z ms |

## アラート
- [WARNING] deviation-approval-guard ブロック率が20%に

## 改善提案
1. deviation-approval-guard の False Positive 削減
2. Hook統合による処理時間短縮
```

---

## 5. テスト計画（Day 2）

### 5.1 ユニットテスト

```javascript
// test/metrics-collector.test.js
describe('metrics-collector', () => {
  test('should record hook event', async () => {
    const event = { hookName: 'test', eventType: 'allow' };
    await recordMetric(event);
    const logged = readLastLineFromLog();
    expect(logged.hookName).toBe('test');
  });

  test('should handle large logs (rotate)', async () => {
    // 100MB超過時のローテーション確認
  });

  test('should not slow down hook execution', async () => {
    // 記録処理が <10ms であることを確認
  });
});
```

### 5.2 統合テスト

```javascript
// test/metrics-integration.test.js
describe('metrics system', () => {
  test('should aggregate daily metrics', async () => {
    // 複数イベントを記録
    // aggregator を実行
    // metrics-daily.json の内容を検証
  });

  test('should detect anomalies', async () => {
    // blockRate > 10% を検出確認
  });

  test('should generate report', async () => {
    // generate-report を実行
    // metrics-dashboard.md の生成確認
  });
});
```

### 5.3 手動テスト

**Day 2のテスト手順**:
1. システムデプロイ
2. 通常業務で使用（4時間）
3. hook-event.log 確認
4. metrics-daily.json 確認
5. metrics-dashboard.md 生成確認

---

## 6. データ収集期間

### Week 1: ベースライン測定

**目的**: 現状把握

- **Day 1-2**: システムセットアップ + テスト
- **Day 3-7**: 通常業務でデータ収集
- **Day 7**: 初期レポート生成（BASELINE_REPORT.md）

### Week 2: 追加検証

- **Day 8-14**: 継続データ収集
- **Day 14**: 1週間レポート生成
- **評価**: False Positive率 < 10% か？

### 判断基準

```
IF False Positive率 < 10% AND ブロック率 < 5%
  → Stage 2 開始 ✅
ELSE
  → hookシステムの詳細分析継続
```

---

## 7. 次セッション（Session B）への引き継ぎ

### 実装開始の前提条件

- [ ] STAGE1_DESIGN.md がこのファイル（完全レビュー済み）
- [ ] metrics-collector.spec.json が確定
- [ ] override.log.schema.json が確定
- [ ] テスト計画が決定（test/metrics-*.test.js のスケルトン作成）

### Session B の作業内容

**Day 3-4の作業**:
1. metrics-collector.js 実装（120行）
2. metrics-aggregator.js 実装（80行）
3. generate-metrics-report.js 実装（60行）
4. テスト実装 + 実行
5. システムデプロイ + 初期テスト

**出力物**:
- ✅ metrics-collector.js（本体）
- ✅ metrics-aggregator.js（集計）
- ✅ generate-metrics-report.js（レポート生成）
- ✅ test/metrics-*.test.js（テストスイート）
- ✅ npm scripts 追加（package.json）

---

## 8. 成功基準

### 実装完了の定義

- [ ] 仕様書通りに実装完了
- [ ] テスト 100% パス
- [ ] hook-event.log に1日分のデータ蓄積
- [ ] metrics-daily.json が毎日自動生成される
- [ ] 処理時間 <10ms（hookの負荷 <1%）

### 品質ゲート

- [ ] テストカバレッジ ≥ 80%
- [ ] エラーハンドリング完全
- [ ] パフォーマンス測定完了

---

## 9. 注意事項

### セキュリティ

- ⚠️ override.log にはユーザー情報を記録（個人情報に注意）
- ⚠️ hook-event.log にはツールパラメータが含まれる（センシティブ情報フィルタリング必須）

### パフォーマンス

- ⚠️ ログファイル書き込みは非同期で（hookをブロックしない）
- ⚠️ メモリバッファ 15分はテスト値（要調整）

### メンテナンス

- 定期的にログをアーカイブ（30日以上は圧縮）
- 古いメトリクスは自動削除（180日）

---

## 10. 附録: ファイル一覧

| ファイル | 優先度 | 行数 | 説明 |
|---------|--------|------|------|
| metrics-collector.js | S | 120 | メイン実装 |
| metrics-aggregator.js | S | 80 | 日次集計 |
| generate-metrics-report.js | A | 60 | レポート生成 |
| metrics-collector.spec.json | S | - | 仕様書 |
| override.log.schema.json | S | - | スキーマ |
| test/metrics-collector.test.js | S | 80 | ユニットテスト |
| test/metrics-integration.test.js | A | 60 | 統合テスト |
| metrics-dashboard.md.template | B | - | テンプレート |

---

**次ステップ**: Session B で実装開始
**見積もり**: 2日間（Day 3-4）
