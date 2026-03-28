# Phase 2 Monitoring Runbook

TAISUN v2 Phase 2 Monitoring Stack の運用ガイド。

## Overview

Phase 2 はオブザーバビリティ基盤を提供します：
- Prometheus: メトリクス収集
- Grafana: 可視化
- Loki: ログ集約
- Alertmanager: アラート管理

## Quick Start

```bash
# 1. 監視スタック起動
make monitoring-up

# 2. ヘルスチェック
make monitoring-health

# 3. ダッシュボードアクセス
open http://localhost:3001
# ログイン: admin / taisun2024
```

## Daily Operations

### 起動・停止

```bash
# 監視スタック起動
make monitoring-up

# 監視スタック停止
make monitoring-down

# ログ確認
make monitoring-logs
```

### メトリクス確認

```bash
# 現在のメトリクス表示
make monitoring-metrics

# アラート確認
make monitoring-alerts
```

## Troubleshooting

### Prometheus が起動しない

```bash
# コンテナ状態確認
docker ps -a | grep prometheus

# ログ確認
docker logs taisun-prometheus

# 設定ファイル検証
docker exec taisun-prometheus promtool check config /etc/prometheus/prometheus.yml
```

### Grafana にログインできない

```bash
# デフォルトパスワードリセット
docker exec -it taisun-grafana grafana-cli admin reset-admin-password newpassword

# または .env で設定
GRAFANA_ADMIN_PASSWORD=newpassword
```

### Loki がログを受信しない

```bash
# Promtail ログ確認
docker logs taisun-promtail

# Loki 接続テスト
curl http://localhost:3100/ready

# ログクエリテスト
curl -G -s "http://localhost:3100/loki/api/v1/labels"
```

### アラートが発火しない

```bash
# Prometheus でルール確認
curl http://localhost:9090/api/v1/rules

# Alertmanager 状態確認
curl http://localhost:9093/api/v2/status

# アラート一覧
curl http://localhost:9093/api/v2/alerts
```

## Alert Configuration

### Slack通知設定

`config/monitoring/alertmanager.yml` を編集：

```yaml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

receivers:
  - name: 'slack-critical'
    slack_configs:
      - channel: '#alerts-critical'
        send_resolved: true
        title: '{{ .Status | toUpper }}: {{ .CommonLabels.alertname }}'
        text: '{{ .CommonAnnotations.description }}'
```

### Email通知設定

```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@example.com'
  smtp_auth_username: 'user@gmail.com'
  smtp_auth_password: 'app-password'

receivers:
  - name: 'email-critical'
    email_configs:
      - to: 'oncall@example.com'
        send_resolved: true
```

設定変更後：
```bash
docker-compose -f docker-compose.monitoring.yml restart alertmanager
```

## Custom Dashboards

### ダッシュボード追加

1. Grafanaでダッシュボード作成
2. JSON形式でエクスポート
3. `config/monitoring/grafana/dashboards/` に保存
4. Grafana再起動または30秒待機

### カスタムメトリクス追加

`config/monitoring/prometheus.yml` にスクレイプジョブ追加：

```yaml
scrape_configs:
  - job_name: 'my-app'
    static_configs:
      - targets: ['host.docker.internal:8080']
        labels:
          service: 'my-app'
    metrics_path: /metrics
```

## Maintenance

### データ管理

```bash
# Prometheus データサイズ確認
docker exec taisun-prometheus du -sh /prometheus

# 古いデータ削除（APIで制御）
curl -X POST http://localhost:9090/api/v1/admin/tsdb/clean_tombstones
```

### バックアップ

```bash
# Grafana ダッシュボード/設定バックアップ
docker exec taisun-grafana grafana-cli admin backup

# Prometheus スナップショット
curl -X POST http://localhost:9090/api/v1/admin/tsdb/snapshot
```

### アップグレード

```bash
# イメージ更新
docker-compose -f docker-compose.monitoring.yml pull

# 再起動
make monitoring-down
make monitoring-up
```

## Performance Tuning

### Prometheus

高負荷時の調整：

```yaml
# prometheus.yml
global:
  scrape_interval: 30s  # 15s → 30s
  evaluation_interval: 30s
```

### Loki

ログ量が多い場合：

```yaml
# loki.yml
limits_config:
  ingestion_rate_mb: 32  # 16 → 32
  ingestion_burst_size_mb: 48  # 24 → 48
```

## Security

### アクセス制限

```bash
# Grafana: 匿名アクセス無効化（デフォルト）
GF_AUTH_ANONYMOUS_ENABLED=false

# Prometheus: Basic認証（nginx経由推奨）
```

### シークレット管理

```bash
# .env.monitoring で設定
GRAFANA_ADMIN_PASSWORD=secure-password
```

## Ports Reference

| サービス | ポート | 用途 |
|---------|-------|------|
| Prometheus | 9090 | メトリクスUI/API |
| Grafana | 3001 | ダッシュボード |
| Loki | 3100 | ログAPI |
| Alertmanager | 9093 | アラートUI/API |
| Node Exporter | 9100 | ホストメトリクス |
| cAdvisor | 8081 | コンテナメトリクス |

## Contact

問題が解決しない場合：
1. Issue を作成: https://github.com/taiyousan15/taisun_v2/issues
2. ログを添付
3. 実行したコマンドを記載
