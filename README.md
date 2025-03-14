# 2024 年度卒業研究「属性モデルに基づくプログラム表現から Typescript への変換ツールの試作」

これは、中村優希が卒業研究で作成した、DSP コードから TypeScript を生成する変換ツールを組み込んだ実験用 web アプリケーションです。

生成部分については、「[dsp-to-ts-generator](https://github.com/katamine-lab-2024/dsp-to-ts-generator)」を参照してください。

## 🚀 概要

DSP コードを画面左のテキスト入力欄に入力することで、その DSP コードの処理をブラウザ上で実行できます。

## 🔧 開発

### 📌 前提

システムに `Node.js` がインストールされているか確認してください。

研究当時のバージョンは以下のとおりです。

```sh
❯ node -v
  v22.14.0
```

```sh
❯ npm -v
  11.0.0
```

### 📥 インストール

本リポジトリをダウンロードまたは clone 後、ターミナルで以下を実行します。

```sh
cd [本リポジトリ]
npm install
```

### ▶️ 開始

ターミナルで以下を実行します。

```sh
npm run dev
```

次に、ブラウザを開いて[localhost:5173](http://localhost:5173/)にアクセスします。

## ✨ 構成

ファイル構成は以下のとおりです。

```sh
.
├── src/
│   ├── lib/
│   │   ├── browser-bundle/ … ブラウザでTypeScriptをバンドルするためのモジュール
│   │   └── compiler/ … ts生成モジュール(dsp-to-ts-generator)
│   ├── module/ … 生成プログラムに必要な組込モジュール群
│   │   ├── …
│   │   ├── Predicate.ts … 述語の抽象クラス、継続ゴール
│   │   ├── Variable.ts … 変数
│   │   └── VM.ts … 推論エンジン
│   ├── util/ … その他モジュール
│   └── App.tsx … アプリケーション
├── package.json      … インストールしたライブラリ等の情報
└── README.md         … 本ファイル
```

`src/lib/browser-bundle`については、[browser-bundler](https://github.com/steelydylan/browser-bundler/tree/master)から本プロジェクトで利用できるように編集した。

## 📍 その他

このコードは、以下の GitHub に載せています。

https://github.com/katamine-lab-2024/test-run-dsp-in-browser

もしかしたら個人的にリファクタ等しているかもしれないです。
