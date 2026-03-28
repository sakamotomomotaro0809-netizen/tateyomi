# YouTube MCP Server セットアップ

## 概要

YouTube MCPサーバーは、YouTube動画から字幕（サブタイトル）をダウンロードし、動画の内容を分析・要約するためのMCPサーバーです。

## 機能

- YouTube動画のURLから字幕を自動ダウンロード
- 複数言語の字幕に対応
- Claude と連携して動画内容の要約・分析が可能

## インストール済み環境

### 必要なツール

1. **yt-dlp** (インストール済み)
   - Location: `/opt/homebrew/bin/yt-dlp`
   - YouTube動画のダウンロードに使用

2. **mcp-youtube** (インストール済み)
   - Location: `/Users/matsumototoshihiko/mcp-youtube`
   - Version: 0.6.0
   - Built with: bun

### MCP設定

以下のファイルに設定を追加済み:

#### `.mcp.json`
```json
{
  "mcpServers": {
    "youtube": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/matsumototoshihiko/mcp-youtube/dist/index.js"],
      "disabled": false,
      "description": "YouTube downloader - download subtitles from YouTube videos",
      "category": "media"
    }
  }
}
```

#### `.mcp.full.json`
```json
{
  "mcpServers": {
    "youtube": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/matsumototoshihiko/mcp-youtube/dist/index.js"],
      "disabled": false,
      "description": "YouTube subtitle downloader using yt-dlp",
      "category": "media"
    }
  }
}
```

## 使用方法

### Claude Code で使用

YouTube動画を要約・分析するには、以下のようにClaudeに依頼します:

```
Summarize the YouTube video https://www.youtube.com/watch?v=VIDEO_ID
```

または

```
この動画の内容を日本語で要約して: https://www.youtube.com/watch?v=VIDEO_ID
```

### サポートされる機能

- ✅ 動画URLから字幕をダウンロード
- ✅ 自動言語検出
- ✅ 複数言語の字幕対応
- ✅ タイムスタンプ付き字幕

## トラブルシューティング

### yt-dlpが見つからない場合

```bash
# Homebrewでインストール
brew install yt-dlp

# または pip でインストール
pip install yt-dlp
```

### MCPサーバーが起動しない場合

1. **Node.js のバージョンを確認**
   ```bash
   node --version  # v20.x 以上推奨
   ```

2. **ビルドファイルの存在を確認**
   ```bash
   ls -la ~/mcp-youtube/dist/index.js
   ```

3. **依存関係を再インストール**
   ```bash
   cd ~/mcp-youtube
   bun install
   bun run prepublish
   ```

### 字幕がダウンロードできない場合

- 動画に字幕が存在するか確認
- 動画が公開されているか確認
- yt-dlpを最新版に更新:
  ```bash
  brew upgrade yt-dlp
  ```

## メンテナンス

### yt-dlp の更新

```bash
brew upgrade yt-dlp
```

### mcp-youtube の更新

```bash
cd ~/mcp-youtube
git pull
bun install
bun run prepublish
```

## 参考リンク

- [mcp-youtube GitHub](https://github.com/anaisbetts/mcp-youtube)
- [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## インストール日時

- 2026-01-09
- インストーラー: Claude Sonnet 4.5
