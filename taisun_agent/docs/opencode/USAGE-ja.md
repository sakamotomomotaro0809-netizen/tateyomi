# OpenCode/OMO の使いどころ（TAISUN運用例）

## 例1: 難しいバグ修正だけ OpenCode に相談する
- 失敗テストの概要だけを渡す（ログ全文は貼らない）
- OpenCodeの出力はファイルに保存
- そのファイルを memory_add に退避し、Issue/会話には要約とrefIdだけ

## 例2: Ralph Loop を"必要な時だけ"起動する
- 仕様が固まっていて反復（Red-Green-Refactor）を回したい時だけ
- ループ回数上限と完了合図（promise）を必ず指定

## 例3: コストが膨らみそうな調査は分離する
- "普段の開発"と"深い調査/検証"を分ける
- 調査の生ログは memory_add（refId運用）
