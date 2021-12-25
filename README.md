# wayfarer-scripts

## 使い方

[インストール](/raw/master/wayfarer-lifelog.user.js)

// TODO: 操作説明

## 開発者向け

### 環境

[node.js](https://nodejs.org/ja/) が必要。

### ビルド

以下のコマンドを実行する。

```shell
npm install
npm run build
```

### デバッグ

#### 準備

1. Chrome に Tampermonkey をインストールする。
1. 拡張機能 → Tampermonkey → ファイルの URL へのアクセスを許可する に ☑。
1. Tampermonkeyアイコン → 新規ユーザースクリプトを追加する → [デバッグ用スクリプト](/wrapper_script_in_tampermonkey.user.js) の中身をエディターにコピーして保存。

#### 実行

1. 以下のコマンドを実行する。

    ```shell
    npm install
    npm run debug
    ```

1. Chrome で対象ページを開く

- ソースコードを変更したらページを再読み込みする。
- // TODO: オートリロード対応
