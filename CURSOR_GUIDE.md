# Cursorでの開発ガイド

## 🚀 Cursorで続きを作る方法

### ステップ1: プロジェクトをCursorで開く

1. **Cursorを起動**
2. **File → Open Folder**
3. `mercari-auto-tool` フォルダを選択
4. `.cursorrules` が自動で読み込まれます

### ステップ2: UI UX Pro Max Skillをインストール

```bash
# Cursorのターミナルで実行
cd /path/to/your/project
uipro init --ai cursor
```

これで、UI UX Pro Maxのデザインシステムが統合されます。

### ステップ3: 最初のタスク

Cursorのチャットで以下を入力:

```
プロジェクトの構造を理解して、次に実装すべき機能を教えてください。
特に content.js の実装を進めたいです。
```

## 🎯 次に実装すべき機能（優先順）

### 1. メルカリDOM操作の実装（最優先）

**タスク**: `content.js` で実際のメルカリページを操作

**Cursorへの指示例**:
```
content.js を編集して、メルカリの出品一覧ページから
商品リストを取得する関数を実装してください。

要件:
- 商品カードのDOM要素を取得
- 商品ID、価格、タイトルを抽出
- エラーハンドリング付き
- レート制限を考慮（1秒1件）
```

**ファイル**: `content.js`

**期待される成果物**:
```javascript
async function getListedItems() {
  const items = [];
  const itemCards = document.querySelectorAll('[data-testid="item-cell"]');
  
  for (const card of itemCards) {
    const item = {
      id: extractItemId(card),
      price: extractPrice(card),
      title: extractTitle(card)
    };
    items.push(item);
  }
  
  return items;
}
```

### 2. 値下げ機能の実装

**Cursorへの指示例**:
```
content.js に実際の値下げ処理を実装してください。

要件:
- 商品の編集ページに遷移
- 価格入力フィールドを見つける
- 100円値下げした価格を入力
- 保存ボタンをクリック
- 1秒待機してから次の商品へ
```

### 3. レート制限クラスの作成

**新規ファイル**: `utils.js`

**Cursorへの指示例**:
```
utils.js という新しいファイルを作成して、
レート制限を管理するクラスを実装してください。

要件:
- RateLimiter クラス
- キュー機能
- 1秒に1リクエストまで
- Promise ベース
```

### 4. エラーハンドリングの強化

**Cursorへの指示例**:
```
全ファイルのエラーハンドリングを強化してください。

要件:
- try-catch で囲む
- ユーザーフレンドリーなエラーメッセージ
- ログ出力
- トースト通知で表示
```

## 💡 Cursorの便利な使い方

### コマンドパレット（Cmd/Ctrl + Shift + P）

```
> Cursor: Chat
> Cursor: Edit
> Cursor: Terminal
```

### AI Composer機能

複数ファイルを同時編集:
```
Cmd/Ctrl + I を押して、以下を入力:

「popup.js と content.js を同時に編集して、
値下げ実行時の進捗表示を実装してください」
```

### インライン編集

1. コード選択
2. `Cmd/Ctrl + K` を押す
3. 「このコードを改善してください」

## 🔍 デバッグ方法

### Cursorでのデバッグ

1. **ブレークポイント設定**
   - 行番号の左をクリック

2. **Chrome DevTools と連携**
   ```javascript
   debugger; // この行で停止
   ```

3. **Console.log を活用**
   ```javascript
   console.log('デバッグ:', { variable });
   ```

### Chrome拡張機能のリロード

ファイルを編集したら:
1. `chrome://extensions/` を開く
2. 拡張機能の「更新」ボタンをクリック
3. メルカリページをリロード

## 📝 コーディング時の注意点

### メルカリのDOM構造

メルカリは頻繁にDOM構造を変更します。

**良い実装**:
```javascript
// 複数のセレクタを試す
const selectors = [
  '[data-testid="item-cell"]',
  '.item-card',
  '[class*="ItemCard"]'
];

for (const selector of selectors) {
  const elements = document.querySelectorAll(selector);
  if (elements.length > 0) return elements;
}
```

**悪い実装**:
```javascript
// 単一のセレクタに依存（変更で壊れる）
const items = document.querySelectorAll('.mer-item-card');
```

### レート制限の重要性

メルカリのサーバーに負荷をかけないように:

```javascript
// 必ず待機
await sleep(1000); // 1秒待機

// 並列処理は避ける
for (const item of items) {
  await processItem(item); // 順次処理
}
```

### エラーメッセージは親切に

```javascript
// 良い例
throw new Error('商品情報の取得に失敗しました。ページをリロードしてください。');

// 悪い例
throw new Error('Error');
```

## 🎨 UIの変更が必要な場合

`popup.css` を編集する際は、UI UX Pro Max の変数を使用:

```css
/* 既存の変数を使う */
.new-element {
  background: var(--primary);
  color: var(--text-primary);
  border-radius: 12px;
  transition: all 0.2s ease;
}
```

## 🚀 次のマイルストーン

### Week 1: DOM操作実装
- [ ] 商品リスト取得
- [ ] 価格抽出
- [ ] 値下げ処理

### Week 2: 機能拡張
- [ ] レート制限
- [ ] エラーハンドリング
- [ ] 進捗表示

### Week 3: テスト
- [ ] 実際のメルカリで動作確認
- [ ] エッジケースのテスト
- [ ] パフォーマンス最適化

### Week 4: 公開準備
- [ ] Chrome Web Storeの準備
- [ ] スクリーンショット作成
- [ ] プライバシーポリシー

## 💬 Cursorへの質問例

開発中に詰まったら、Cursorに聞いてみましょう:

```
Q: 「このエラーの原因は何ですか？」
Q: 「この関数をもっと効率的にできますか？」
Q: 「この機能のテストコードを書いてください」
Q: 「このコードのセキュリティリスクはありますか？」
Q: 「UI UX Pro Maxの仕様に合っていますか？」
```

## 📦 Git管理（推奨）

```bash
# リポジトリ初期化
git init
git add .
git commit -m "feat: initial prototype"

# GitHub にプッシュ
git remote add origin https://github.com/yourusername/mercari-assistant.git
git push -u origin main
```

## 🎯 目標

**4週間後**:
- 実際にメルカリで動作する
- Chrome Web Storeに公開
- 最初の10ユーザー獲得

**3ヶ月後**:
- 100有料ユーザー
- 月間収益 ¥298,000
- フィードバックに基づく改善

---

**Cursorで開発を楽しんでください！** 🎉

何か困ったら、`.cursorrules` を見返すか、
このガイドを参照してください。

Happy Coding! 🚀
