// background.js - Service Worker (Manifest V3)

console.log('メルカリアシスタント Background Service Worker 起動');

// インストール時の処理
chrome.runtime.onInstalled.addListener((details) => {
  console.log('拡張機能がインストールされました', details);
  
  // 初期設定
  chrome.storage.local.set({
    autoPrice: false,
    scheduleTime: '12:00',
    minPrice: 500,
    activities: [],
    stats: {
      totalItems: 0,
      totalSales: 0,
      avgViews: 0
    }
  });
  
  // ウェルカムページを開く（オプション）
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: 'https://github.com/yourusername/mercari-assistant'
    });
  }
});

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('バックグラウンドでメッセージ受信:', request);
  
  if (request.action === 'toggleAutoPrice') {
    handleAutoPrice(request.enabled, request.schedule, request.minPrice);
    sendResponse({ success: true });
  }
  
  return false;
});

// 自動値下げの設定
function handleAutoPrice(enabled, schedule, minPrice) {
  console.log('自動値下げ設定:', { enabled, schedule, minPrice });
  
  if (enabled) {
    // アラームを設定
    const [hour, minute] = schedule.split(':');
    
    chrome.alarms.create('autoPriceDown', {
      when: getNextScheduledTime(parseInt(hour), parseInt(minute)),
      periodInMinutes: 24 * 60 // 24時間ごと
    });
    
    console.log(`自動値下げアラーム設定: ${schedule}`);
  } else {
    // アラームをクリア
    chrome.alarms.clear('autoPriceDown');
    console.log('自動値下げアラームをクリア');
  }
}

// 次のスケジュール時刻を計算
function getNextScheduledTime(hour, minute) {
  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(hour, minute, 0, 0);
  
  // すでに過ぎていたら翌日
  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }
  
  return scheduled.getTime();
}

// アラームリスナー
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('アラーム発火:', alarm.name);
  
  if (alarm.name === 'autoPriceDown') {
    executeAutoPriceDown();
  }
});

// 自動値下げの実行
async function executeAutoPriceDown() {
  console.log('自動値下げを実行');
  
  try {
    // 設定を取得
    const data = await chrome.storage.local.get(['minPrice']);
    const minPrice = data.minPrice || 500;
    
    // メルカリのタブを探す
    const tabs = await chrome.tabs.query({ url: '*://jp.mercari.com/*' });
    
    if (tabs.length === 0) {
      console.log('メルカリのタブが見つかりません');
      // 通知を表示
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'メルカリアシスタント',
        message: '自動値下げを実行するにはメルカリのページを開いてください'
      });
      return;
    }
    
    // 最初のメルカリタブで値下げを実行
    const tab = tabs[0];
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'priceDown',
      minPrice: minPrice
    });
    
    // 結果を通知
    if (response.success) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '自動値下げ完了',
        message: `${response.count}件の商品を値下げしました`
      });
      
      // アクティビティに記録
      addActivityLog('自動値下げ', `${response.count}件の商品を値下げ`);
    }
    
  } catch (error) {
    console.error('自動値下げエラー:', error);
  }
}

// アクティビティログの追加
async function addActivityLog(title, description) {
  const data = await chrome.storage.local.get(['activities']);
  const activities = data.activities || [];
  
  const now = new Date();
  const timeString = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  activities.unshift({
    title,
    description,
    time: timeString,
    timestamp: now.getTime()
  });
  
  // 最大10件まで保存
  if (activities.length > 10) {
    activities.splice(10);
  }
  
  await chrome.storage.local.set({ activities });
}

// 定期的なヘルスチェック（オプション）
chrome.alarms.create('healthCheck', {
  periodInMinutes: 60 // 1時間ごと
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'healthCheck') {
    console.log('ヘルスチェック実行');
    // 必要に応じて状態確認や統計の更新
  }
});

console.log('バックグラウンドサービスワーカー初期化完了');
