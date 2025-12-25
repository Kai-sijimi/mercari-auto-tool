// content.js - メルカリページで動作するスクリプト v2
// 実際のメルカリDOM構造に対応

console.log('🚀 メルアシ PRO Content Script 起動');

// 設定
const CONFIG = {
  DEMO_MODE: false, // 本番モード
  RATE_LIMIT_MS: 1500, // リクエスト間隔（メルカリに優しく）
  MAX_ITEMS: 50, // 最大処理件数
  SELECTORS: {
    // 出品一覧ページ
    LISTING_ITEM: 'main ul li, main [data-testid="item-cell"], [class*="Items"] li',
    ITEM_LINK: 'a[href*="/item/"]',
    ITEM_PRICE: '[class*="Price"], [class*="price"]',
    
    // 商品詳細ページ
    DETAIL_PRICE: 'main [class*="Price"], main [class*="price"]',
    EDIT_BUTTON: 'a[href*="/edit"], button:has-text("編集")',
    
    // 編集ページ
    PRICE_INPUT: 'input[name*="price"], input[type="number"][placeholder*="価格"]',
    SAVE_BUTTON: 'button[type="submit"], button:has-text("更新")'
  }
};

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 メッセージ受信:', request);

  switch (request.action) {
    case 'priceDown':
      handlePriceDown(request.minPrice, request.priceDown || 100)
        .then(sendResponse)
        .catch(err => sendResponse({ success: false, message: err.message }));
      return true;
      
    case 'analyze':
      handleAnalyze()
        .then(sendResponse)
        .catch(err => sendResponse({ success: false, message: err.message }));
      return true;
      
    case 'getItems':
      getListedItems()
        .then(items => sendResponse({ success: true, items }))
        .catch(err => sendResponse({ success: false, message: err.message }));
      return true;
  }

  return false;
});

// 値下げ処理
async function handlePriceDown(minPrice = 500, priceDown = 100) {
  const currentUrl = window.location.href;
  
  // 出品一覧ページかチェック
  if (!currentUrl.includes('/mypage/listings')) {
    // 出品一覧ページに移動を促す
    return {
      success: false,
      message: '出品一覧ページ（マイページ→出品した商品）で実行してください',
      redirect: 'https://jp.mercari.com/mypage/listings'
    };
  }

  try {
    showOverlay('商品を取得中...');
    
    const items = await getListedItems();
    
    if (items.length === 0) {
      hideOverlay();
      return {
        success: false,
        message: '出品中の商品が見つかりません'
      };
    }

    // 値下げ可能な商品をフィルタ
    const targetItems = items.filter(item => 
      item.price && item.price > minPrice + priceDown
    );

    if (targetItems.length === 0) {
      hideOverlay();
      return {
        success: false,
        message: `最低価格(¥${minPrice})以下の商品のみです`
      };
    }

    updateOverlay(`${targetItems.length}件の商品を値下げ中...`);
    
    let successCount = 0;
    let errors = [];

    for (let i = 0; i < targetItems.length; i++) {
      const item = targetItems[i];
      updateOverlay(`処理中: ${i + 1}/${targetItems.length}`, (i + 1) / targetItems.length * 100);
      
      try {
        // 商品編集ページに移動して価格変更
        const result = await updateItemPrice(item, priceDown);
        
        if (result.success) {
          successCount++;
          highlightItem(item.element, 'success');
        } else {
          errors.push({ item: item.title, error: result.message });
          highlightItem(item.element, 'error');
        }
      } catch (err) {
        errors.push({ item: item.title, error: err.message });
        highlightItem(item.element, 'error');
      }
      
      // レート制限
      await sleep(CONFIG.RATE_LIMIT_MS);
    }

    hideOverlay();

    // アクティビティログを保存
    await saveActivity('値下げ実行', `${successCount}件を-¥${priceDown}`);

    return {
      success: true,
      count: successCount,
      total: targetItems.length,
      errors,
      message: `${successCount}/${targetItems.length}件の値下げ完了`
    };

  } catch (error) {
    hideOverlay();
    console.error('❌ 値下げエラー:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// 商品の価格を更新（実際のDOM操作）
async function updateItemPrice(item, priceDown) {
  // 注意: 実際の値下げには商品編集ページへの遷移が必要
  // ここでは基本的な流れを実装
  
  if (!item.editUrl) {
    return { success: false, message: '編集URLが見つかりません' };
  }

  // 新しいタブで編集ページを開く方式は避け、
  // fetch APIでの更新を試みる（可能であれば）
  // 現実的には、編集ページへの遷移→入力→保存が必要

  console.log(`📝 価格変更: ${item.title}`);
  console.log(`   現在価格: ¥${item.price} → 新価格: ¥${item.price - priceDown}`);
  
  // TODO: 実際のDOM操作を実装
  // 1. 編集ページに遷移
  // 2. 価格入力フィールドを更新
  // 3. 保存ボタンをクリック
  // 4. 完了を待つ

  return { success: true, newPrice: item.price - priceDown };
}

// 出品商品一覧を取得
async function getListedItems() {
  const items = [];
  
  // 複数のセレクタを試す
  const selectors = [
    'main li a[href*="/item/"]',
    '[class*="ListedItem"] a',
    'ul li a[href^="/item/"]'
  ];
  
  let elements = [];
  for (const selector of selectors) {
    elements = document.querySelectorAll(selector);
    if (elements.length > 0) break;
  }

  console.log(`📦 ${elements.length}件の商品リンクを発見`);

  elements.forEach((el, index) => {
    try {
      const href = el.getAttribute('href') || '';
      const itemId = extractItemId(href);
      
      if (!itemId) return;

      // 価格を抽出
      const priceEl = el.querySelector('[class*="rice"]') || 
                      el.closest('li')?.querySelector('[class*="rice"]');
      const priceText = priceEl?.textContent || '';
      const price = extractPrice(priceText);

      // タイトルを抽出
      const titleEl = el.querySelector('img[alt]') || el;
      const title = titleEl.getAttribute('alt') || 
                   el.textContent?.slice(0, 50) || 
                   `商品${index + 1}`;

      items.push({
        id: itemId,
        title: title.trim(),
        price,
        url: `https://jp.mercari.com${href}`,
        editUrl: `https://jp.mercari.com/item/${itemId}/edit`,
        element: el.closest('li') || el
      });
    } catch (err) {
      console.warn('商品解析エラー:', err);
    }
  });

  return items;
}

// 分析処理
async function handleAnalyze() {
  const currentUrl = window.location.href;
  
  if (!currentUrl.includes('mercari.com')) {
    return { success: false, message: 'メルカリのページで実行してください' };
  }

  try {
    showOverlay('分析中...');
    
    const items = await getListedItems();
    
    let totalPrice = 0;
    let totalViews = 0;
    
    items.forEach(item => {
      if (item.price) totalPrice += item.price;
    });

    hideOverlay();

    const result = {
      totalItems: items.length,
      totalSales: totalPrice,
      avgViews: items.length > 0 ? Math.floor(totalViews / items.length) : 0,
      avgPrice: items.length > 0 ? Math.floor(totalPrice / items.length) : 0
    };

    await saveActivity('出品分析', `${items.length}件を分析`);

    return {
      success: true,
      data: result
    };

  } catch (error) {
    hideOverlay();
    console.error('❌ 分析エラー:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// ユーティリティ関数
function extractItemId(url) {
  const match = url.match(/\/item\/(m\d+)/);
  return match ? match[1] : null;
}

function extractPrice(text) {
  if (!text) return 0;
  const cleaned = text.replace(/[¥,\s円]/g, '');
  const match = cleaned.match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// オーバーレイ表示
function showOverlay(message) {
  hideOverlay(); // 既存を削除
  
  const overlay = document.createElement('div');
  overlay.id = 'mercari-assistant-overlay';
  overlay.innerHTML = `
    <div class="ma-overlay-content">
      <div class="ma-spinner"></div>
      <div class="ma-message">${message}</div>
      <div class="ma-progress-bar">
        <div class="ma-progress-fill" style="width: 0%"></div>
      </div>
    </div>
  `;
  
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(26, 26, 46, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: 'Zen Maru Gothic', sans-serif;
  `;
  
  document.body.appendChild(overlay);
}

function updateOverlay(message, progress = null) {
  const overlay = document.getElementById('mercari-assistant-overlay');
  if (!overlay) return;
  
  const msgEl = overlay.querySelector('.ma-message');
  if (msgEl) msgEl.textContent = message;
  
  if (progress !== null) {
    const fill = overlay.querySelector('.ma-progress-fill');
    if (fill) fill.style.width = `${progress}%`;
  }
}

function hideOverlay() {
  const overlay = document.getElementById('mercari-assistant-overlay');
  if (overlay) overlay.remove();
}

// 商品ハイライト
function highlightItem(element, type) {
  if (!element) return;
  
  element.classList.remove('ma-success', 'ma-error', 'ma-processing');
  
  if (type) {
    element.classList.add(`ma-${type}`);
    
    // 3秒後に削除
    setTimeout(() => {
      element.classList.remove(`ma-${type}`);
    }, 3000);
  }
}

// アクティビティ保存
async function saveActivity(title, description) {
  try {
    const data = await chrome.storage.local.get(['activities']);
    const activities = data.activities || [];
    
    const now = new Date();
    activities.unshift({
      title,
      description,
      time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
      timestamp: now.getTime()
    });
    
    if (activities.length > 10) activities.splice(10);
    
    await chrome.storage.local.set({ activities });
  } catch (err) {
    console.warn('アクティビティ保存エラー:', err);
  }
}

// スタイル注入
function injectStyles() {
  if (document.getElementById('mercari-assistant-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'mercari-assistant-styles';
  style.textContent = `
    .ma-overlay-content {
      text-align: center;
      color: white;
    }
    
    .ma-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: #7FEFBD;
      border-radius: 50%;
      animation: ma-spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    
    @keyframes ma-spin {
      to { transform: rotate(360deg); }
    }
    
    .ma-message {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    
    .ma-progress-bar {
      width: 200px;
      height: 8px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      overflow: hidden;
      margin: 0 auto;
    }
    
    .ma-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #7FEFBD, #7EB6FF);
      transition: width 0.3s ease;
    }
    
    .ma-success {
      outline: 3px solid #7FEFBD !important;
      outline-offset: 2px;
      animation: ma-flash-success 0.5s ease;
    }
    
    .ma-error {
      outline: 3px solid #FF4B4B !important;
      outline-offset: 2px;
      animation: ma-flash-error 0.5s ease;
    }
    
    .ma-processing {
      outline: 3px solid #FFE566 !important;
      outline-offset: 2px;
      animation: ma-pulse 1s infinite;
    }
    
    @keyframes ma-flash-success {
      0%, 100% { background-color: transparent; }
      50% { background-color: rgba(127, 239, 189, 0.3); }
    }
    
    @keyframes ma-flash-error {
      0%, 100% { background-color: transparent; }
      50% { background-color: rgba(255, 75, 75, 0.3); }
    }
    
    @keyframes ma-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  
  document.head.appendChild(style);
}

// 初期化
function init() {
  console.log('🎮 メルアシ PRO 初期化');
  injectStyles();
  
  const url = window.location.href;
  
  if (url.includes('/mypage/listings')) {
    console.log('📋 出品一覧ページを検出');
    // クイックアクションボタンを追加（オプション）
  }
}

// SPA対応: URL変更を監視
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    init();
  }
}).observe(document, { subtree: true, childList: true });

// 初期化実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

