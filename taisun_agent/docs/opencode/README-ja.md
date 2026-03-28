# OpenCode / Oh My OpenCode(OMO) 任意導入ガイド（TAISUN v2向け）

このドキュメントは、taisun_agent（Claude Code拡張）に **OpenCode / OMO を"必要な時だけ"併用**するためのガイドです。

## 目的（なぜ入れるのか）
- Claude Code + TAISUNで実装しつつ、難しいバグ修正や大規模リファクタ時に **OpenCode/OMOを"セカンドエンジン"として呼び出す**。
- 通常時は一切使わず、必要時のみ起動することで **コスト・コンテキスト肥大を抑える**。

## 安全設計（このリポジトリの方針）
- デフォルトで自動起動しません（導入しても勝手に動きません）。
- 使う時だけ `/opencode-*` コマンド（後続フェーズで追加）を叩きます。
- 長大ログは貼り付け禁止：会話/Issueに全文を貼らず、TAISUNの memory_add に退避して refId 参照にします。

## OMOの設定ファイル階層（参考）
- Project: `.opencode/oh-my-opencode.json`
- User: `~/.config/opencode/oh-my-opencode.json`

※ OMO側は JSONC（コメント付きJSON）も扱えます。

## インストール概略（手動）
1) OpenCode CLI を用意
2) oh-my-opencode を OpenCode の plugin として登録
3) `opencode auth login` 等でプロバイダ認証

※ 実際の導入コマンドは各自の環境に依存します。導入は自己責任で行い、秘密情報（APIキー等）をリポジトリにコミットしないでください。

## Ralph Loop（自動反復ループ）について
- OMOには ralph-loop フック（自動反復）があり、**有効化は opt-in（既定 false）**です。
- TAISUN側では「常時ON」にせず、必要な場面だけ使う前提で設計します。
