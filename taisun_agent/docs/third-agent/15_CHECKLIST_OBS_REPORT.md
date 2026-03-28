# Checklist: Observability Report Setup

## Pre-requisites

- [ ] `gh` CLI installed and authenticated
- [ ] Repository access confirmed
- [ ] `.taisun/observability/` directory exists

## Initial Setup

### 1. Create Report Issue

```bash
gh issue create --repo owner/repo \
  --title "[Observability] Daily/Weekly Report Thread" \
  --body "自動レポートスレッド" \
  --label "observability,automated"
```

- [ ] Issue created
- [ ] Issue number noted: #____

### 2. Configure Report Settings

```bash
cp config/proxy-mcp/observability-report.example.json \
   config/proxy-mcp/observability-report.json
```

- [ ] Config file created
- [ ] `github.owner` set
- [ ] `github.repo` set
- [ ] `github.issueNumber` set
- [ ] Thresholds adjusted if needed

### 3. Verify Event Logging

```bash
# Check events file exists
ls -la .taisun/observability/events.jsonl

# Check recent events
tail -5 .taisun/observability/events.jsonl | jq .
```

- [ ] Events file exists
- [ ] Events being recorded

### 4. Test Report Generation

```bash
# Generate daily report (no post)
npm run obs:report:daily
```

- [ ] Report generated successfully
- [ ] Metrics look reasonable

### 5. Test GitHub Posting

```bash
# Post daily report
npm run obs:post:daily
```

- [ ] Report posted to Issue
- [ ] Format renders correctly
- [ ] Alert summary visible

## Scheduling (Optional)

### crontab Setup

```bash
crontab -e
```

Add:
```cron
# Daily at 9:00 AM JST (0:00 UTC)
0 0 * * * cd /path/to/project && npm run obs:post:daily >> /tmp/obs-daily.log 2>&1

# Weekly on Monday at 9:00 AM JST
0 0 * * 1 cd /path/to/project && npm run obs:post:weekly >> /tmp/obs-weekly.log 2>&1
```

- [ ] Cron jobs added
- [ ] Test cron execution

### GitHub Actions (Alternative)

```yaml
# .github/workflows/observability-report.yml
name: Observability Report
on:
  schedule:
    - cron: '0 0 * * *'  # Daily
jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run obs:post:daily
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] Workflow file created
- [ ] Workflow enabled

## Verification

### Check Report Quality

- [ ] Success rate calculated correctly
- [ ] MCP metrics populated
- [ ] Top errors listed
- [ ] Recommendations relevant

### Check Alert Levels

| Condition | Expected Alert |
|-----------|----------------|
| Success < 90% | 🔴 CRITICAL |
| Success < 95% | 🟡 WARNING |
| p95 > 5000ms | 🟡 WARNING |
| Circuit Open | 🔴 CRITICAL |
| All OK | ✅ OK |

- [ ] Alert levels verified

## Troubleshooting

### No Events

```bash
# Check if observability is enabled
grep -r "recordEvent" src/proxy-mcp/
```

### gh CLI Auth Failed

```bash
gh auth status
gh auth login
```

### Report Not Posting

```bash
# Check config
cat config/proxy-mcp/observability-report.json | jq .

# Test gh issue comment
gh issue comment <number> --repo owner/repo --body "test"
```
