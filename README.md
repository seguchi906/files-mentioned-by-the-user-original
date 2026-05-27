# 業務データ管理アプリ

Netlify + Neon PostgreSQL で、業務データを追加・編集・削除・CSV出力するWebアプリです。

## 初期設定

1. NeonでPostgreSQLデータベースを作成します。
2. NeonのSQL Editorで `database/schema.sql` の内容を実行します。
3. Netlifyにこのフォルダをデプロイします。
4. Netlifyの環境変数に `DATABASE_URL` を設定します。
   - 値はNeonの接続文字列です。
   - ブラウザ側には公開されません。

ローカルの `.env` に `DATABASE_URL` を設定済みの場合は、次のコマンドでNeon側のテーブルを作成できます。

```powershell
npm.cmd run db:init
```

## 使い方

- 初回だけ、画面右上の `CSV取込` から `original-data.csv` を選択します。
- 取り込み後はNeon DBが正データです。
- 一覧画面で検索、年度・分類・発注者の絞り込み、列見出しから並び替えができます。
- `新規追加` または各行の `編集` から業務を保存できます。
- `CSV出力` で現在のDB内容をCSVとしてダウンロードできます。

## ローカル確認

```powershell
npm.cmd run build
```

ローカルでNetlify Functionsまで動かす場合は、Netlify CLIと `DATABASE_URL` が必要です。
