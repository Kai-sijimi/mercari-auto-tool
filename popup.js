// popup.js - メルアシ PRO v2

const DEMO_MODE = false; // 本番モード

// 状態管理
let state = {
  totalItems: 0,
  totalSales: 0,
  avgViews: 0,
  priceDown: 100, // 値下げ金額（カスタマイズ可能）
  minPrice: 500,
  autoPrice: false,
  scheduleTime: '12:00',
  activities: [],
  chartData: {
    items: [3, 5, 4, 6, 8, 7, 9],
    sales: [40, 55, 45, 70, 85, 75, 90]
  }
};

// DOM要素キャッシュ
const el = {};

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 メルアシ PRO v2 起動');
  
  cacheElements();
  await loadSettings();
  setupEventListeners();
  updateUI();
  renderCharts();
  animateOnLoad();
  
  // デバッグ用: データリセットボタン（Shift+クリックでリセット）
  el.statusChip?.addEventListener('click', async (e) => {
    if (e.shiftKey) {
      if (confirm('データをリセットしますか？')) {
        await chrome.storage.local.clear();
        state = {
          totalItems: 0,
          totalSales: 0,
          avgViews: 0,
          priceDown: 100,
          minPrice: 500,
          autoPrice: false,
          scheduleTime: '12:00',
          activities: [],
          chartData: { items: [0,0,0,0,0,0,0], sales: [0,0,0,0,0,0,0] }
        };
        updateUI();
        renderCharts();
        showToast('🔄 データをリセットしました', 'success');
      }
    }
  });
});

// DOM要素キャッシュ
function cacheElements() {
  el.totalItems = document.getElementById('totalItems');
  el.totalSales = document.getElementById('totalSales');
  el.itemsTrend = document.getElementById('itemsTrend');
  el.salesTrend = document.getElementById('salesTrend');
  el.itemsChart = document.getElementById('itemsChart');
  el.salesChart = document.getElementById('salesChart');
  el.priceDownBtn = document.getElementById('priceDownBtn');
  el.priceDownLabel = document.getElementById('priceDownLabel');
  el.analyzeBtn = document.getElementById('analyzeBtn');
  el.autoPrice = document.getElementById('autoPrice');
  el.scheduleTime = document.getElementById('scheduleTime');
  el.minPrice = document.getElementById('minPrice');
  el.activityList = document.getElementById('activityList');
  el.activityEmpty = document.getElementById('activityEmpty');
  el.statusChip = document.getElementById('statusChip');
  el.toastContainer = document.getElementById('toastContainer');
  el.progressContainer = document.getElementById('progressContainer');
  el.progressFill = document.getElementById('progressFill');
  el.progressText = document.getElementById('progressText');
  el.progressCount = document.getElementById('progressCount');
  el.confirmModal = document.getElementById('confirmModal');
  el.modalDesc = document.getElementById('modalDesc');
  el.modalItemCount = document.getElementById('modalItemCount');
  el.modalMinPrice = document.getElementById('modalMinPrice');
  el.modalCancel = document.getElementById('modalCancel');
  el.modalConfirm = document.getElementById('modalConfirm');
}

// 設定読み込み
async function loadSettings() {
  try {
    const data = await chrome.storage.local.get([
      'priceDown', 'minPrice', 'autoPrice', 'scheduleTime', 'activities', 'stats', 'chartData'
    ]);
    
    if (data.priceDown) state.priceDown = data.priceDown;
    if (data.minPrice) state.minPrice = data.minPrice;
    if (data.autoPrice !== undefined) state.autoPrice = data.autoPrice;
    if (data.scheduleTime) state.scheduleTime = data.scheduleTime;
    if (data.activities) state.activities = data.activities;
    if (data.stats) {
      state.totalItems = data.stats.totalItems || 0;
      state.totalSales = data.stats.totalSales || 0;
    }
    if (data.chartData) state.chartData = data.chartData;
    
    // UIに反映
    el.autoPrice.checked = state.autoPrice;
    el.scheduleTime.value = state.scheduleTime;
    el.minPrice.value = state.minPrice;
    
    // 値下げ金額ボタンをアクティブに
    document.querySelectorAll('.price-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.price) === state.priceDown);
    });
    
    console.log('✅ 設定読み込み完了');
  } catch (error) {
    console.log('📝 初回起動');
  }
}

// 設定保存
async function saveSettings() {
  try {
    await chrome.storage.local.set({
      priceDown: state.priceDown,
      minPrice: state.minPrice,
      autoPrice: state.autoPrice,
      scheduleTime: state.scheduleTime,
      activities: state.activities,
      stats: { totalItems: state.totalItems, totalSales: state.totalSales },
      chartData: state.chartData
    });
  } catch (e) {
    console.log('⚠️ 設定保存スキップ');
  }
}

// イベントリスナー設定
function setupEventListeners() {
  // 値下げボタン → 確認モーダル表示
  el.priceDownBtn.addEventListener('click', showConfirmModal);
  
  // モーダルキャンセル
  el.modalCancel.addEventListener('click', hideConfirmModal);
  
  // モーダル確認 → 実行
  el.modalConfirm.addEventListener('click', () => {
    hideConfirmModal();
    executePriceDown();
  });
  
  // モーダル背景クリックで閉じる
  el.confirmModal.addEventListener('click', (e) => {
    if (e.target === el.confirmModal) hideConfirmModal();
  });
  
  // 分析ボタン
  el.analyzeBtn.addEventListener('click', handleAnalyze);
  
  // 値下げ金額選択
  document.querySelectorAll('.price-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.price-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.priceDown = parseInt(btn.dataset.price);
      el.priceDownLabel.textContent = `-¥${state.priceDown}で実行`;
      saveSettings();
    });
  });
  
  // 最低価格
  el.minPrice.addEventListener('input', (e) => {
    state.minPrice = parseInt(e.target.value) || 500;
    saveSettings();
  });
  
  // オートモード
  el.autoPrice.addEventListener('change', (e) => {
    state.autoPrice = e.target.checked;
    saveSettings();
    
    if (e.target.checked) {
      showToast('⚡ オートモード ON！', 'success');
      addActivity('設定変更', 'オートモードを有効化');
    } else {
      showToast('オートモード OFF', 'default');
    }
    
    try {
      chrome.runtime.sendMessage({
        action: 'toggleAutoPrice',
        enabled: e.target.checked,
        schedule: state.scheduleTime,
        minPrice: state.minPrice
      });
    } catch (e) {}
  });
  
  // スケジュール
  el.scheduleTime.addEventListener('change', (e) => {
    state.scheduleTime = e.target.value;
    saveSettings();
  });
  
  // フッター
  document.getElementById('settingsLink')?.addEventListener('click', () => {
    showToast('⚙️ 設定画面は準備中', 'default');
  });
  
  document.getElementById('helpLink')?.addEventListener('click', () => {
    showToast('❓ ヘルプは準備中', 'default');
  });
}

// 確認モーダル表示
function showConfirmModal() {
  const itemCount = state.totalItems || Math.floor(Math.random() * 10) + 5;
  el.modalDesc.innerHTML = `出品中の商品を<strong>¥${state.priceDown}</strong>値下げします`;
  el.modalItemCount.textContent = `${itemCount}件`;
  el.modalMinPrice.textContent = `¥${state.minPrice}`;
  el.confirmModal.classList.add('active');
}

// 確認モーダル非表示
function hideConfirmModal() {
  el.confirmModal.classList.remove('active');
}

// 値下げ実行
async function executePriceDown() {
  el.priceDownBtn.classList.add('loading');
  el.priceDownBtn.disabled = true;
  
  setStatus('処理中...', 'busy');
  showProgress();
  
  try {
    if (DEMO_MODE) {
      await simulatePriceDown();
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('mercari.com')) {
        showToast('🚫 メルカリを開いてね', 'error');
        return;
      }
      
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'priceDown',
        minPrice: state.minPrice,
        priceDown: state.priceDown
      });
      
      if (response.success) {
        showToast(`🔥 ${response.count}件 値下げ完了！`, 'success');
        addActivity('値下げ実行', `${response.count}件を-¥${state.priceDown}`);
        updateChartData();
      } else {
        showToast(response.message || '😢 失敗...', 'error');
      }
    }
  } catch (error) {
    console.error('値下げエラー:', error);
    showToast('😢 エラーが発生...', 'error');
  } finally {
    el.priceDownBtn.classList.remove('loading');
    el.priceDownBtn.disabled = false;
    hideProgress();
    setStatus('Ready', 'ready');
  }
}

// 値下げシミュレーション
async function simulatePriceDown() {
  const totalItems = Math.floor(Math.random() * 8) + 5;
  
  for (let i = 1; i <= totalItems; i++) {
    const progress = (i / totalItems) * 100;
    updateProgress(progress, `商品 ${i}/${totalItems} を処理中...`, `${i}/${totalItems}`);
    await sleep(300 + Math.random() * 200);
  }
  
  showToast(`🔥 ${totalItems}件 値下げ完了！`, 'success');
  addActivity('値下げ実行', `${totalItems}件を-¥${state.priceDown}`);
  
  state.totalItems = totalItems;
  updateStats();
  updateChartData();
  await saveSettings();
}

// 分析実行
async function handleAnalyze() {
  el.analyzeBtn.classList.add('loading');
  setStatus('分析中...', 'busy');
  
  try {
    if (DEMO_MODE) {
      await simulateAnalyze();
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('mercari.com')) {
        showToast('🚫 メルカリを開いてね', 'error');
        return;
      }
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });
      
      if (response.success) {
        state.totalItems = response.data.totalItems;
        state.totalSales = response.data.totalSales;
        await saveSettings();
        updateStats();
        updateChartData();
        showToast('📊 分析完了！', 'success');
        addActivity('出品分析', `${response.data.totalItems}件を分析`);
      }
    }
  } catch (error) {
    console.error('分析エラー:', error);
    showToast('😢 エラー...', 'error');
  } finally {
    el.analyzeBtn.classList.remove('loading');
    setStatus('Ready', 'ready');
  }
}

// 分析シミュレーション
async function simulateAnalyze() {
  await sleep(800);
  
  const totalItems = Math.floor(Math.random() * 15) + 5;
  const avgPrice = Math.floor(Math.random() * 3000) + 1000;
  
  state.totalItems = totalItems;
  state.totalSales = totalItems * avgPrice;
  
  updateStats();
  updateChartData();
  await saveSettings();
  
  showToast('📊 分析完了！', 'success');
  addActivity('出品分析', `${totalItems}件を分析`);
}

// UI更新
function updateUI() {
  updateStats();
  updateActivityList();
}

// 統計更新
function updateStats() {
  animateNumber(el.totalItems, state.totalItems);
  el.totalSales.textContent = `¥${state.totalSales.toLocaleString()}`;
  
  // トレンド更新（ランダム）
  const itemsTrend = Math.floor(Math.random() * 5) + 1;
  const salesTrend = Math.floor(Math.random() * 20) + 5;
  el.itemsTrend.textContent = `+${itemsTrend}`;
  el.salesTrend.textContent = `+${salesTrend}%`;
}

// 数字アニメーション
function animateNumber(element, target) {
  const current = parseInt(element.textContent) || 0;
  const diff = target - current;
  const duration = 500;
  const steps = 20;
  const increment = diff / steps;
  let step = 0;
  
  const timer = setInterval(() => {
    step++;
    element.textContent = Math.round(current + increment * step);
    if (step >= steps) {
      clearInterval(timer);
      element.textContent = target;
    }
  }, duration / steps);
}

// チャートデータ更新
function updateChartData() {
  // シフトして新しいデータを追加
  state.chartData.items.shift();
  state.chartData.items.push(state.totalItems || Math.floor(Math.random() * 10) + 3);
  
  state.chartData.sales.shift();
  state.chartData.sales.push(Math.floor(Math.random() * 50) + 50);
  
  renderCharts();
}

// ミニグラフ描画
function renderCharts() {
  renderChart(el.itemsChart, state.chartData.items, '--accent-mint');
  renderChart(el.salesChart, state.chartData.sales, '--accent-yellow');
}

function renderChart(container, data, colorVar) {
  if (!container) return;
  
  const max = Math.max(...data);
  container.innerHTML = data.map(value => {
    const height = (value / max) * 100;
    return `<div class="chart-bar" style="height: ${height}%; background: var(${colorVar});"></div>`;
  }).join('');
}

// ステータス更新
function setStatus(text, type = 'ready') {
  const label = el.statusChip.querySelector('.status-label');
  const pulse = el.statusChip.querySelector('.status-pulse');
  
  label.textContent = text;
  el.statusChip.style.background = type === 'busy' ? 'var(--accent-yellow)' : 'var(--accent-mint)';
  pulse.style.animation = type === 'busy' ? 'pulse 0.5s infinite' : 'pulse 2s infinite';
}

// プログレス表示
function showProgress() {
  el.progressContainer.classList.add('active');
  updateProgress(0, '準備中...', '0/0');
}

function updateProgress(percent, text, count) {
  el.progressFill.style.width = `${percent}%`;
  el.progressText.textContent = text;
  el.progressCount.textContent = count;
}

function hideProgress() {
  el.progressContainer.classList.remove('active');
}

// アクティビティ追加
function addActivity(title, description) {
  const now = new Date();
  const timeString = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  state.activities.unshift({
    title,
    description,
    time: timeString,
    timestamp: now.getTime()
  });
  
  if (state.activities.length > 10) {
    state.activities = state.activities.slice(0, 10);
  }
  
  saveSettings();
  updateActivityList();
}

// アクティビティリスト更新
function updateActivityList() {
  if (state.activities.length === 0) {
    el.activityEmpty.style.display = 'flex';
    return;
  }
  
  el.activityEmpty.style.display = 'none';
  
  const iconMap = {
    '値下げ実行': '🔥',
    '出品分析': '📊',
    '設定変更': '⚙️',
    '自動値下げ': '⚡'
  };
  
  const itemsHtml = state.activities.slice(0, 5).map(activity => `
    <div class="activity-item">
      <div class="activity-icon">${iconMap[activity.title] || '📝'}</div>
      <div class="activity-content">
        <div class="activity-title">${activity.title}</div>
        <div class="activity-meta">${activity.description} • ${activity.time}</div>
      </div>
    </div>
  `).join('');
  
  el.activityList.innerHTML = itemsHtml + (el.activityEmpty.outerHTML || '');
}

// トースト表示
function showToast(message, type = 'default') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  el.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 起動アニメーション
function animateOnLoad() {
  const elements = document.querySelectorAll('.header, .main-action, .stats-row, .card');
  elements.forEach((elem, i) => {
    elem.style.opacity = '0';
    elem.style.transform = 'translateY(15px)';
    setTimeout(() => {
      elem.style.transition = 'all 0.3s ease';
      elem.style.opacity = '1';
      elem.style.transform = 'translateY(0)';
    }, i * 60);
  });
}

// ユーティリティ
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
