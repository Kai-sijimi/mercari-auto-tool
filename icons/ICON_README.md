# アイコンファイルについて

このフォルダには以下の3つのPNG画像が必要です：

```
icons/
├── icon16.png   (16×16 px)
├── icon48.png   (48×48 px)
└── icon128.png  (128×128 px)
```

## 🎨 簡単な作成方法

### 方法1: オンラインツールで生成（最も簡単）

**Favicon.io** を使用:
1. https://favicon.io/favicon-generator/ にアクセス
2. 設定:
   - Text: `M`
   - Background: `Rounded`
   - Font Family: `Inter`
   - Font Size: `110`
   - Background Color: `#4ECDC4`
   - Font Color: `#FFFFFF`
3. 「Download」ボタンをクリック
4. ダウンロードしたZIPを解凍
5. 以下をこのフォルダにコピー＆リネーム:
   ```
   favicon-16x16.png → icon16.png
   favicon-32x32.png → icon48.png（48pxにリサイズ必要）
   android-chrome-192x192.png → icon128.png（128pxにリサイズ必要）
   ```

### 方法2: SVGから生成

以下のSVGコードを `icon.svg` として保存:

```svg
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="24" fill="#4ECDC4"/>
  <text x="64" y="90" font-family="Arial, sans-serif" font-size="80" 
        font-weight="bold" text-anchor="middle" fill="white">M</text>
</svg>
```

その後、ImageMagick等で変換:

```bash
# 16x16
convert icon.svg -resize 16x16 icon16.png

# 48x48
convert icon.svg -resize 48x48 icon48.png

# 128x128
convert icon.svg -resize 128x128 icon128.png
```

### 方法3: Canvaで作成

1. Canva (https://www.canva.com/) にアクセス
2. カスタムサイズ: 128×128 px
3. 背景色: `#4ECDC4`
4. テキスト「M」を追加（白色、中央）
5. PNGでダウンロード
6. 以下のサイズにリサイズ:
   - 16×16 px
   - 48×48 px
   - 128×128 px

## 🖼️ デザインガイドライン

### カラー
- **メインカラー**: `#4ECDC4` (ティールブルー)
- **テキスト**: `#FFFFFF` (白)
- **スタイル**: Minimalist, Modern

### シンボル
- 「M」(Mercariの頭文字)
- または パッケージアイコン 📦
- または 価格タグアイコン 🏷️

## ⚠️ 重要な注意

- すべて **PNG形式** である必要があります
- **透過背景ではなく、単色背景** を推奨
- ファイル名は **正確に** 以下の通り:
  - `icon16.png`
  - `icon48.png`
  - `icon128.png`
- 大文字小文字を区別します

## 🚫 よくあるエラー

### エラー: "Could not load icon 'icons/icon16.png'"

**原因**:
- ファイルが存在しない
- ファイル名が間違っている
- ファイル形式がPNGではない

**解決**:
1. このフォルダに3つのファイルが存在するか確認
2. ファイル名を確認（icon16.png, icon48.png, icon128.png）
3. PNG形式であることを確認

## 📦 ダミーアイコンの作成（テスト用）

テスト用に単色のアイコンを作成する場合:

### オンライン（最速）
1. https://placeholder.com/ にアクセス
2. 以下のURLで画像をダウンロード:
   ```
   https://via.placeholder.com/16/4ECDC4/FFFFFF?text=M
   https://via.placeholder.com/48/4ECDC4/FFFFFF?text=M
   https://via.placeholder.com/128/4ECDC4/FFFFFF?text=M
   ```
3. それぞれを `icon16.png`, `icon48.png`, `icon128.png` として保存

### Python（開発者向け）
```python
from PIL import Image, ImageDraw, ImageFont

def create_icon(size):
    img = Image.new('RGB', (size, size), color='#4ECDC4')
    draw = ImageDraw.Draw(img)
    
    # テキスト追加
    font_size = int(size * 0.6)
    try:
        font = ImageFont.truetype("Arial.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    text = "M"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    position = ((size - text_width) // 2, (size - text_height) // 2)
    draw.text(position, text, fill='white', font=font)
    
    img.save(f'icon{size}.png')

# 3つのサイズを生成
for size in [16, 48, 128]:
    create_icon(size)
```

---

アイコンを配置したら、Chrome拡張機能を再読み込みしてください！
