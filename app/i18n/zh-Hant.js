// 繁體中文 interface text. Generated from zh-Hans.js by tools/make-zh-hant.mjs: don't edit by hand.
// Keys are the English text exactly as shown. {0} keeps the matched text; {t0} translates it too.
(function () {
  const FD = (window.FD = window.FD || {});
  FD.I18N = FD.I18N || {};

  const strings = {
    // ---------- top bar & layout ----------
    'Saved': '已儲存',
    'Saving…': '正在儲存…',
    'Not saved: {0}': '未儲存：{0}',
    '♥ Support': '♥ 支援',
    '♥ Supporter': '♥ 支持者',
    'Guides': '使用指南',
    'Settings': '設定',
    'Show on a display ▾': '在螢幕上顯示 ▾',
    'Undo (⌘Z)': '撤銷 (⌘Z)',
    'Undo': '撤銷',
    'Redo (⇧⌘Z)': '重做 (⇧⌘Z)',
    'Redo': '重做',
    'Screens': '螢幕',
    '+ Add': '+ 新增',
    'Pages': '頁面',
    'Widgets': '小元件',
    'click or drag · ✎ edits code': '點選或拖動 · ✎ 編輯程式碼',
    'My widgets': '我的小元件',
    'Import': '匯入',
    '+ New': '+ 新建',
    'Write your own in HTML, CSS and JavaScript. Click + New.': '用 HTML、CSS 和 JavaScript 自己寫一個。點選「+ 新建」。',
    'Grid': '網格',
    'Live data': '實時資料',
    'This page is empty. Click a widget on the left to add it.': '這個頁面是空的。點選左側的小元件即可新增。',
    'Add a screen to start': '先新增一個螢幕',
    '{0} · round': '{0} · 圓形',
    '{0} grid': '{0} 網格',
    'E-ink · 6 colors': '墨水屏 · 6 色',
    'E-ink · black & white': '墨水屏 · 黑白',
    '{t0} · {1}': '{0} · {1}',
    '{t0} — partly outside the round screen': '{0} — 部分超出圓形螢幕',
    'Edit code': '編輯程式碼',
    'Edit {t0} code': '編輯「{0}」的程式碼',
    'Supporter theme': '支持者主題',
    'Copied': '已複製',
    'Link copied': '連結已複製',

    // ---------- inspector: page & screen ----------
    'Page': '頁面',
    'Name': '名稱',
    'Show for': '顯示時長',
    '5 seconds': '5 秒', '10 seconds': '10 秒', '15 seconds': '15 秒', '20 seconds': '20 秒', '30 seconds': '30 秒', '45 seconds': '45 秒',
    '1 minute': '1 分鐘', '2 minutes': '2 分鐘', '5 minutes': '5 分鐘', '10 minutes': '10 分鐘', '15 minutes': '15 分鐘', '30 minutes': '30 分鐘',
    '1 hour': '1 小時', 'Hour': '每小時',
    'Save as preset…': '另存為預設…',
    'From preset': '來自預設',
    'Save to preset': '儲存到預設',
    'Save as new preset…': '另存為新預設…',
    'Duplicate': '複製',
    'Copy to screen…': '複製到螢幕…',
    'Delete': '刪除',
    'Screen': '螢幕',
    'Size': '尺寸',
    'Change size…': '更改尺寸…',
    'Match {0} ({1})': '匹配 {0}（{1}）',
    'Width px': '寬度 px',
    'Height px': '高度 px',
    'Shape': '形狀',
    'Rectangle': '矩形',
    'Round': '圓形',
    'Colors': '顏色',
    'Full color': '全綵',
    'E-ink 6-color': '墨水屏 6 色',
    'Black & white': '黑白',
    'Block size': '格子大小',
    'Custom ({0})': '自定義（{0}）',
    'Large blocks ({0})': '大格子（{0}）',
    'Medium blocks ({0})': '中格子（{0}）',
    'Small blocks ({0})': '小格子（{0}）',
    'Tiny blocks ({0})': '極小格子（{0}）',
    'Grid columns': '網格列數',
    'Grid rows': '網格行數',
    'Widgets are placed on the grid, so changing the size or grid stretches the layout instead of breaking it.': '小元件按網格擺放，所以更改尺寸或網格時，佈局會自動拉伸而不會錯亂。',
    'Rotate through pages': '輪流顯示頁面',
    'Look': '外觀',
    'Midnight': '午夜', 'Paper': '紙張', 'Black glass': '黑玻璃', 'Terminal': '終端', 'Sunset': '日落', 'E-ink color': '墨水屏彩色', 'E-ink mono': '墨水屏黑白',
    'Aurora': '極光', 'Neon': '霓虹', 'Sakura': '櫻花', 'Retro amber': '復古琥珀', 'Ocean': '海洋', 'Forest': '森林',
    'Back': '背景', 'Text': '文字', 'Muted': '次要', 'Accent': '強調色', 'Card': '卡片',
    'This screen can only show {0} colors, so choices are limited to what the panel can display.': '這個螢幕只能顯示 {0} 種顏色，所以只能選擇面板能顯示的顏色。',
    'Font': '字型', 'System': '系統', 'Rounded': '圓體', 'Serif': '襯線', 'Monospace': '等寬', 'Condensed': '窄體',
    'Widget background': '小元件背景', 'Cards': '卡片', 'Outlines': '描邊', 'None': '無',
    'Corner roundness': '圓角大小',
    'Spacing between widgets': '小元件間距',
    'Share & back up': '分享與備份',
    'Export layout': '匯出佈局',
    'Import layout': '匯入佈局',
    'Duplicate screen': '複製螢幕',
    'Delete screen': '刪除螢幕',

    // ---------- inspector: widget ----------
    'Missing widget': '小元件不存在',
    "This widget's code was deleted.": '這個小元件的程式碼已被刪除。',
    'Position & size': '位置與大小',
    'Column': '列', 'Row': '行', 'Width': '寬度', 'Height': '高度',
    'corners fall outside the round screen': '四角超出圓形螢幕',
    'very small for this screen': '對這個螢幕來說太小了',
    'Background': '背景',
    'Theme default': '跟隨主題',
    'Outline': '描邊',
    'Arrange': '排列',
    '✎ Edit code': '✎ 編輯程式碼',
    'Bring to front': '移到最前',
    'Move to page': '移到頁面',
    'Choose…': '選擇…',
    'Choose picture or video…': '選擇圖片或影片…',
    'Remove': '移除',
    'or paste a link to a picture, GIF or video': '或貼上圖片、GIF 或影片的連結',
    'GIFs animate. Videos play muted on a loop, up to {0} seconds.': 'GIF 會動起來。影片會靜音迴圈播放，最長 {0} 秒。',
    'No city set': '未設定城市',
    'Search for a city': '搜尋城市',
    'Find': '查詢',
    'Videos can be up to 150 MB': '影片最大 150 MB',
    'Uploading…': '正在上傳…',
    'Upload failed: {0}': '上傳失敗：{0}',
    'Use a PNG, JPG, GIF or WebP image, or an MP4, MOV or WebM video': '請使用 PNG、JPG、GIF、WebP 圖片，或 MP4、MOV、WebM 影片',

    // ---------- widgets: names & descriptions ----------
    'Clock': '時鐘', 'Digital or analog time, any time zone': '數字或指標時鐘，任意時區',
    'Date': '日期', 'Weekday and date, in your language': '星期和日期，使用你的語言',
    'Month calendar': '月曆', 'This month with today marked': '本月日曆，標出今天',
    'Weather': '天氣', 'Now and the week ahead, no API key needed': '當前和未來一週的天氣，無需 API 金鑰',
    'Countdown': '倒計時', 'Days until a date': '距離某個日期還有幾天',
    'Progress': '進度', 'How far through the year, month, week or day': '今年、本月、本週或今天已過去多少',
    'This computer': '這臺電腦', 'CPU, memory and uptime': 'CPU、記憶體和執行時間',
    'Any text: a note, quote or heading': '任意文字：便籤、名言或標題',
    'Image & video': '圖片與影片', 'A photo, GIF or short looping video': '照片、GIF 或迴圈短影片',
    'Hacker News': 'Hacker News', 'Top stories right now; tap one to read': '當前熱門文章；點一下即可閱讀', 'Top stories right now': '當前熱門文章',
    'Web page': '網頁', 'Embed a page (some sites block this)': '嵌入一個網頁（有些網站不允許）',
    'World clocks': '世界時鐘', 'Several cities at a glance': '一眼看到多個城市的時間',
    'Calendar events': '日曆事件', 'Upcoming events from a calendar link (iCal)': '來自日曆連結（iCal）的近期事件',
    'News feed': '新聞訂閱', 'Headlines from any RSS or Atom feed; tap one to read': '來自任意 RSS 或 Atom 訂閱的頭條；點一下即可閱讀',
    'Sports scores': '體育比分', 'Live and recent games (NBA, NFL, MLB, soccer, esports…)': '直播和近期比賽（NBA、NFL、MLB、足球、電競…）',
    'Crypto prices': '加密貨幣價格', 'Prices and 24h change from CoinGecko': '來自 CoinGecko 的價格和 24 小時漲跌',
    'Air quality': '空氣質量', 'US AQI and PM2.5 from Open-Meteo': '來自 Open-Meteo 的美國 AQI 和 PM2.5',
    'Sun & moon': '日月', 'Moon phase, plus sunrise and sunset for a city': '月相，以及某個城市的日出日落',
    'Now playing': '正在播放', 'Spotify or Apple Music (Mac only)': 'Spotify 或 Apple Music（僅限 Mac）',
    'Rotating text': '輪播文字', 'Cycles through quotes, reminders or facts': '輪流顯示名言、提醒或小知識',
    'Kraken stats': 'Kraken 狀態', 'Liquid, CPU and GPU temperature when shown on an NZXT Kraken': '在 NZXT Kraken 上顯示時，展示水溫、CPU 和 GPU 溫度',

    // ---------- widgets: settings ----------
    'Style': '樣式', 'Digital': '數字', 'Analog': '指標',
    '24-hour time': '24 小時制', 'Show seconds': '顯示秒', 'Time zone': '時區', 'Label (optional)': '標籤（可選）',
    'Format': '格式', 'Weekday + date': '星期 + 日期', 'Short': '簡短', 'Numbers': '數字',
    'Language': '語言', 'Week starts on': '每週開始於', 'Sunday': '星期日', 'Monday': '星期一',
    'City': '城市', 'Units': '單位', '°F, mph': '°F，mph', '°C, km/h': '°C，km/h', 'Days of forecast': '預報天數', 'Fit to size': '按大小自動調整',
    'Show': '顯示', 'CPU + memory': 'CPU + 記憶體', 'CPU only': '僅 CPU', 'Memory only': '僅記憶體',
    'Title': '標題', 'Date and time': '日期和時間', 'Show hours and minutes': '顯示小時和分鐘',
    'Alignment': '對齊', 'Left': '左', 'Center': '居中', 'Right': '右',
    'Weight': '粗細', 'Regular': '常規', 'Medium': '中等', 'Bold': '粗體', 'Color': '顏色',
    'Picture or video': '圖片或影片', 'Fit': '填充方式', 'Fill the box': '填滿方框', 'Show all of it': '完整顯示', 'Caption': '說明文字',
    'Track': '統計', 'Year': '年', 'Month': '月', 'Week': '周', 'Day': '日',
    'Stories per page': '每頁文章數', 'Turn the page every': '翻頁間隔', 'Never': '從不',
    'Address': '地址', 'Zoom': '縮放', 'Reload every': '重新整理間隔',
    'Cities (Name = time zone, one per line)': '城市（名稱 = 時區，每行一個）',
    'Coins (CoinGecko ids, comma separated)': '幣種（CoinGecko ID，用逗號分隔）',
    'Currency': '貨幣',
    'Feed': '訂閱源', 'Custom link…': '自定義連結…',
    'BBC News · World': 'BBC 新聞 · 國際', 'BBC News · Business': 'BBC 新聞 · 商業', 'BBC News · Technology': 'BBC 新聞 · 科技',
    'The Guardian · World': '衛報 · 國際', 'The New York Times': '紐約時報', 'Al Jazeera': '半島電視臺',
    'CNBC · Top news': 'CNBC · 頭條', 'The Economist · The world this week': '經濟學人 · 本週世界',
    'Feed address (RSS or Atom link)': '訂閱地址（RSS 或 Atom 連結）',
    'Title (blank uses the feed name)': '標題（留空則使用訂閱名稱）',
    'Headlines per page': '每頁標題數',
    'Calendar link (.ics or webcal://)': '日曆連結（.ics 或 webcal://）',
    'Look ahead': '顯示範圍', 'Today': '今天', '3 days': '3 天', '1 week': '1 周', '2 weeks': '2 周', '1 month': '1 個月',
    'League': '聯賽', 'College football': '大學橄欖球', 'College basketball': '大學籃球', 'Premier League': '英超', 'La Liga': '西甲',
    'Serie A': '意甲', 'Bundesliga': '德甲', 'Ligue 1': '法甲', 'Champions League': '歐冠',
    'Esports · Dota 2': '電競 · Dota 2', 'Esports · League of Legends': '電競 · 英雄聯盟', 'Esports · Counter-Strike 2': '電競 · 反恐精英 2',
    'Esports · Valorant': '電競 · 無畏契約', 'Esports · Overwatch': '電競 · 守望先鋒', 'Esports · Rainbow Six Siege': '電競 · 彩虹六號：圍攻', 'Esports · Rocket League': '電競 · 火箭聯盟',
    'Your own PandaScore token (optional; free at pandascore.co)': '你自己的 PandaScore 令牌（可選；可在 pandascore.co 免費獲取）',
    'Only this team (abbreviation or name, optional)': '只看這支隊伍（縮寫或名稱，可選）',
    'Show team logos': '顯示隊伍標誌',
    'City (for sunrise and sunset)': '城市（用於日出日落）',
    'Show album art': '顯示專輯封面',
    'Lines (one per line)': '內容（每行一條）', 'Change every': '切換間隔',
    'Quote': '名言', 'Plain': '普通', 'Big number': '大數字',
    'Liquid temperature': '水溫', 'CPU temperature': 'CPU 溫度', 'GPU temperature': 'GPU 溫度',

    // ---------- health widgets ----------
    'Pomodoro timer': '番茄鍾', 'Focus sessions with short and long breaks': '專注時段，搭配短休息和長休息',
    'Water tracker': '喝水記錄', 'Tap to log a glass; resets every day': '點一下記錄一杯水；每天重置',
    'Habit tracker': '習慣打卡', 'Tick off daily habits and keep your streaks': '每天打卡，保持連續記錄',
    'Move breaks': '活動提醒', 'Reminds you to stand up, stretch and rest your eyes': '提醒你站起來、伸展一下、讓眼睛休息',
    'Focus length': '專注時長', 'Short break': '短休息', 'Long break': '長休息', 'Long break after': '長休息間隔',
    '{0} focus sessions': '{0} 個專注時段', '{0} minutes': '{0} 分鐘', '{0} hours': '{0} 小時',
    'Start the next session by itself': '自動開始下一個時段', 'Chime when a session ends': '時段結束時響鈴',
    'Glasses a day': '每天幾杯', 'Glass size': '每杯容量', 'Show amounts in': '顯示單位', 'ml / liters': '毫升 / 升', 'fluid ounces': '液量盎司',
    'Remind me after': '多久提醒一次',
    'Habits (one per line)': '習慣（每行一個）', 'Show the last 7 days': '顯示最近 7 天', 'Show streaks': '顯示連續天數',
    'A break every': '休息間隔', 'Break ideas (one per line)': '休息建議（每行一條）',
    'Focus': '專注', 'Start': '開始', 'Pause': '暫停', 'Skip': '跳過',
    'Glass': '一杯', 'Goal reached!': '目標達成！', 'Time for some water': '該喝水了',
    "Add habits in this widget's settings.": '在這個小元件的設定中新增習慣。',
    'Time for a break': '該休息了', 'Tap Done after a break to start the timer.': '休息後點「完成」開始計時。',
    'Break time!': '休息時間！', 'Next break in': '距離下次休息', 'Done': '完成',
    'Drink water': '喝水',

    // ---------- add a screen ----------
    'Add a screen': '新增螢幕',
    "Pick what you'll show it on. You can change the size later and the layout stretches to fit.": '選擇要顯示在哪種螢幕上。之後可以更改尺寸，佈局會自動拉伸適應。',
    'Monitors & laptops': '顯示器和筆記本', 'Small & bar screens': '小屏和條形屏', 'Round screens (cooler LCDs)': '圓形屏（散熱器液晶屏）', 'E-ink': '墨水屏', 'Other': '其他',
    'Match a connected display': '匹配已連線的顯示器', 'Custom size…': '自定義尺寸…',
    'Monitor {0}': '顯示器 {0}', 'Portrait monitor {0}': '豎屏顯示器 {0}', 'Ultrawide {0}': '帶魚屏 {0}', 'Tablet {0}': '平板 {0}', 'Bar display {0}': '條形屏 {0}',
    '{0} USB screen {1}': '{0} USB 小屏 {1}',
    'Round {0} (Kraken Elite size)': '圓形 {0}（Kraken Elite 尺寸）', 'Round {0} (Kraken Z size)': '圓形 {0}（Kraken Z 尺寸）', 'Round {0} (Kraken size)': '圓形 {0}（Kraken 尺寸）',
    'E-ink {0}, 6-color': '墨水屏 {0}，6 色', 'E-ink {0}, black & white': '墨水屏 {0}，黑白',
    'Cancel': '取消', 'Add screen': '新增螢幕', 'My screen': '我的螢幕', 'Custom screen': '自定義螢幕', 'New screen': '新螢幕',
    'Pick a screen type first': '請先選擇一種螢幕型別',

    // ---------- add a page & presets ----------
    'Add a page': '新增頁面', 'Preset': '預設', 'Custom': '自定義',
    "Presets are laid out for this screen's size. Pick one, then change anything you like.": '預設已按這個螢幕的尺寸排好。選一個，然後隨意修改。',
    'Import a preset…': '匯入預設…', 'Page name': '頁面名稱', 'New page': '新頁面',
    '<b>Blank page</b><small>Start empty and add widgets from the left.</small>': '<b>空白頁面</b><small>從空白開始，再從左側新增小元件。</small>',
    'Blank page': '空白頁面', 'Start empty and add widgets from the left.': '從空白開始，再從左側新增小元件。',
    'Copy of the current page': '複製當前頁面', '"{0}" with all its widgets': '「{0}」及其所有小元件',
    'Add page': '新增頁面', 'Add this preset': '新增這個預設',
    '🕒 Clock & date': '🕒 時鐘和日期', 'A big clock with the date under it': '大時鐘，下方顯示日期',
    '☀️ Today': '☀️ 今天', "Date, weather, calendar and what's coming up": '日期、天氣、日曆和接下來的安排',
    '⛅ Weather focus': '⛅ 天氣', 'Forecast, air quality, sun and moon': '天氣預報、空氣質量、日月',
    '🗞️ News desk': '🗞️ 新聞', 'World headlines and Hacker News, tap to read': '國際頭條和 Hacker News，點一下即可閱讀',
    '🪙 Markets': '🪙 行情', 'Crypto prices, world clocks and business news': '加密貨幣價格、世界時鐘和商業新聞',
    '🏀 Game day': '🏀 比賽日', 'Scores from two leagues and the time': '兩個聯賽的比分和時間',
    '🎵 Now playing': '🎵 正在播放', 'What Spotify or Music is playing': 'Spotify 或「音樂」正在播放的內容',
    '📈 System monitor': '📈 系統監視', 'CPU, memory and the time': 'CPU、記憶體和時間',
    '🖼️ Photo frame': '🖼️ 相框', 'A picture with a small clock on top': '一張圖片，上面有個小時鐘',
    '🎯 Focus': '🎯 專注', 'A countdown with rotating reminders': '倒計時加輪播提醒',
    '🌍 World clocks': '🌍 世界時鐘', "Times around the world and today's date": '世界各地的時間和今天的日期',
    'Clock & date': '時鐘和日期', 'Weather focus': '天氣', 'News desk': '新聞', 'Markets': '行情', 'Game day': '比賽日',
    'System monitor': '系統監視', 'Photo frame': '相框', 'Focus': '專注',
    'Edited preset': '已修改的預設', 'Your preset': '你的預設', 'Reset': '還原', 'Export': '匯出',
    'Pick a preset first, or switch to Custom': '請先選擇一個預設，或切換到「自定義」',
    'Not a FrameDeck page preset': '這不是 FrameDeck 頁面預設檔案',
    'Imported preset': '匯入的預設',
    'Save page as a preset': '把頁面另存為預設',
    'You can pick it under Pages → + Add → Preset on any screen, and export it to share.': '之後可以在任意螢幕的「頁面 → + 新增 → 預設」中選用，也可以匯出分享。',
    'Added "{0}". Change it, then use Save to preset on the right to update the preset.': '已新增「{0}」。修改後，用右側的「儲存到預設」來更新這個預設。',
    'Saved preset "{0}"': '已儲存預設「{0}」',
    'Updated the "{0}" preset': '已更新預設「{0}」',
    'Imported "{0}"': '已匯入「{0}」',
    'Imported {0}': '已匯入 {0}',
    'Copied "{0}" to {1}': '已把「{0}」複製到 {1}',
    'Go back to the original "{0}" preset?': '把預設「{0}」還原為原始版本？',
    'Delete the preset "{0}"? Pages already made from it stay.': '刪除預設「{0}」？已經用它建立的頁面會保留。',

    // ---------- prompts & messages ----------
    'OK': '確定',
    'Import failed: {0}': '匯入失敗：{0}',
    'Not a FrameDeck layout file': '這不是 FrameDeck 佈局檔案',
    'Delete the page "{0}"?': '刪除頁面「{0}」？',
    'Delete the screen "{0}" and all its pages?': '刪除螢幕「{0}」及其所有頁面？',
    'Delete this widget?': '刪除這個小元件？',
    'Delete this widget and remove it from {0} place{1} in your layouts?': '刪除這個小元件，並從佈局中的 {0} 個位置移除？',
    'This file contains {0} custom widget{1} with code. Widgets run in a sandbox and can only load data from the public internet, but only import files from people you trust. Import it?':
      '這個檔案包含 {0} 個帶程式碼的自定義小元件。小元件在沙盒中執行，只能讀取公共網際網路上的資料，但請只匯入你信任的人發來的檔案。\n\n要匯入嗎？',
    'That widget no longer exists': '這個小元件已經不存在了',
    'Made a screen for {0}': '已為 {0} 建立螢幕',
    'Made "{0}". Continue with step 2.': '已建立「{0}」。請繼續第 2 步。',
    'Saved as {0}': '已另存為 {0}',

    // ---------- show on a display ----------
    'Show "{0}"': '顯示「{0}」',
    '{0} · main': '{0} · 主顯示器',
    '{0} · same shape': '{0} · 比例相同',
    '{0} · will letterbox': '{0} · 會有黑邊',
    '{0} · looks like {1}': '{0} · 顯示效果相當於 {1}',
    'Stop': '停止', 'Fullscreen': '全屏', 'Open in a window': '在視窗中開啟', 'Stop all ({0})': '全部停止（{0}）',
    'Connected displays show up here when FrameDeck runs as the app.': '以應用方式執行 FrameDeck 時，已連線的顯示器會顯示在這裡。',
    'Link for a browser on this computer': '在這臺電腦的瀏覽器中開啟的連結',
    'Link for a phone, tablet or other computer on your Wi-Fi': '給同一 Wi-Fi 下的手機、平板或其他電腦使用的連結',
    'Copy': '複製',
    'Turn on network sharing in Settings to show this screen on a tablet, old phone or another computer.': '在「設定」中開啟網路共享，就能在平板、舊手機或其他電腦上顯示這個螢幕。',
    'In a display window: ← → changes page, Esc closes it.': '在顯示視窗中：← → 翻頁，Esc 關閉。',
    '{0} connected · {1}': '{0} 已連線 · {1}',
    'Make a screen for it': '為它建立螢幕',
    'Not now': '以後再說',

    // ---------- settings ----------
    'Share displays on my network': '在我的網路上共享顯示',
    'Lets phones, tablets and other computers on your Wi-Fi open display links. The editor stays on this computer only.': '讓同一 Wi-Fi 下的手機、平板和其他電腦開啟顯示連結。編輯器只在這臺電腦上可用。',
    'Open FrameDeck when I log in': '登入時開啟 FrameDeck',
    'Displays that were showing when you quit open again automatically.': '退出時正在顯示的螢幕會自動重新開啟。',
    '♥ Supporter: {0}': '♥ 支持者：{0}',
    'FrameDeck {0} · inspired by <a href="https://github.com/Feeengyuuu/EpaperSystem" target="_blank" style="color:var(--ui-accent)">EpaperSystem</a> by Feeengyuuu, which builds on <a href="https://github.com/fatihak/InkyPi" target="_blank" style="color:var(--ui-accent)">InkyPi</a>. Weather from Open-Meteo.':
      'FrameDeck {0} · 靈感來自 Feeengyuuu 的 <a href="https://github.com/Feeengyuuu/EpaperSystem" target="_blank" style="color:var(--ui-accent)">EpaperSystem</a>（基於 <a href="https://github.com/fatihak/InkyPi" target="_blank" style="color:var(--ui-accent)">InkyPi</a>）。天氣資料來自 Open-Meteo。',

    'Advanced protection': '高階保護',
    'Risk': '風險', 'Tip': '建議',
    'The code check found {0} risky pattern{1} in this widget (open it in Widget Studio to see them). Widgets run in a sandbox and can only load data from the public internet, but only import files from people you trust. Import it?': '程式碼檢查在這個小元件中發現 {0} 處有風險的寫法（在小元件工作室中開啟即可檢視）。小元件在沙盒中執行，只能讀取公共網際網路上的資料，但請只匯入你信任的人發來的檔案。\n\n要匯入嗎？',
    'Check for updates': '檢查更新',
    'FrameDeck {0} is available. <a href="{1}" target="_blank" style="color:var(--ui-accent)">Download it</a>': 'FrameDeck {0} 已釋出。<a href="{1}" target="_blank" style="color:var(--ui-accent)">下載</a>',
    'A new version of FrameDeck is available. See Settings.': 'FrameDeck 有新版本了。請檢視「設定」。',
    'These protect your computer from things you import or show. Turn one off only if you need to, and turn it back on afterwards.': '這些設定保護你的電腦免受匯入或顯示的內容攻擊。只在確實需要時關閉，用完後請重新開啟。',
    'Keep custom widgets and skins off my local network': '禁止自定義小元件和皮膚訪問我的區域網',
    'Off lets them reach devices like Home Assistant or a NAS from this computer, but a widget or skin from someone else could too.': '關閉後，它們可以從這臺電腦訪問 Home Assistant 或 NAS 等裝置，但別人做的小元件或皮膚也能這樣做。',
    'Warn me about risky imports': '匯入有風險的內容時提醒我',
    'Off imports layouts, presets and widgets without asking, even when they contain code or point at your own network.': '關閉後，匯入佈局、預設和小元件時不再詢問，即使其中包含程式碼或指向你自己的網路。',
    'Block camera, microphone and location for web pages': '禁止網頁使用攝像頭、麥克風和位置',
    'Off lets web pages shown in widgets ask to use them.': '關閉後，小元件中顯示的網頁可以請求使用這些功能。',
    '⚠ Some protections are off. Your computer is easier to attack while they are.': '⚠ 部分保護已關閉。在此期間你的電腦更容易受到攻擊。',
    'Turning this protection off means your computer could be attacked through what you import or show in FrameDeck (a shared layout, a skin, a feed or a web page). Only do this if you trust everything you use with FrameDeck. Turn it off?': '關閉這項保護後，你的電腦可能會透過你在 FrameDeck 中匯入或顯示的內容（共享的佈局、皮膚、訂閱源或網頁）受到攻擊。只有在你信任與 FrameDeck 一起使用的所有內容時才這樣做。\n\n要關閉嗎？',
    'This file points at devices on your own network ({0}). FrameDeck would contact them from this computer. Only import it if you trust where it came from. Import it?': '這個檔案指向你自己網路中的裝置（{0}）。FrameDeck 會從這臺電腦聯絡它們。只有在你信任檔案來源時才匯入。\n\n要匯入嗎？',
    "Too many requests. Try again in a minute.": '請求太多。請一分鐘後再試。',

    // ---------- support ----------
    '♥ Support FrameDeck': '♥ 支援 FrameDeck',
    "FrameDeck is free and open source. If it's useful to you, a donation of any size keeps it going.": 'FrameDeck 免費且開源。如果它對你有用，任何金額的捐助都能幫助它繼續下去。',
    "Put your email in the payment note and I'll send you a supporter key, usually within a day.": '在付款備註裡寫上你的郵箱，我會把支持者金鑰發給你，通常一天之內。',
    "Donation links haven't been set up yet.": '還沒有設定捐助連結。',
    'Supporters get a key that unlocks: <b>{0}</b> themes, and a supporter badge.': '支持者會得到一個金鑰，可以解鎖 <b>{0}</b> 主題和支持者徽章。',
    'Have a supporter key?': '已有支持者金鑰？',
    'Unlock': '解鎖',
    '♥ Thank you, {0}!': '♥ 謝謝你，{0}！',
    "You're a FrameDeck supporter since {0}. Supporter themes are unlocked: {1}.": '你從 {0} 起就是 FrameDeck 的支持者。支持者主題已解鎖：{1}。',
    "You're a FrameDeck supporter. Supporter themes are unlocked: {0}.": '你是 FrameDeck 的支持者。支持者主題已解鎖：{0}。',
    'Want to chip in again?': '想再支援一次？',
    'Remove key from this computer': '從這臺電腦移除金鑰',
    'Close': '關閉',
    'Remove the supporter key from this computer? You can add it again any time.': '從這臺電腦移除支持者金鑰？之後隨時可以重新新增。',
    'Thank you! Supporter features unlocked.': '謝謝你！支持者功能已解鎖。',
    "That key isn't valid. Check you copied all of it.": '這個金鑰無效。請檢查是否完整複製。',
    'A key works on up to 3 computers. Unlocking needs an internet connection once.': '一個金鑰最多可在 3 臺電腦上使用。解鎖時需要聯網一次。',
    "Couldn't reach FrameDeck's activation server. Check your internet connection and try again.": '無法連線 FrameDeck 啟用伺服器。請檢查網路連線後重試。',
    'This key is already unlocked on {0} computers. Remove it from one of them (♥ Supporter → Remove key from this computer), or ask the developer to reset it.': '這個金鑰已經在 {0} 臺電腦上解鎖了。請先在其中一臺上移除（♥ 支持者 → 從這臺電腦移除金鑰），或請開發者重置。',
    'The activation server answered: {0}': '啟用伺服器返回：{0}',

    // ---------- Widget Studio ----------
    'Widget': '小元件', 'My widget': '我的小元件', 'New widget': '新小元件', 'Your widget': '你的小元件', 'Built-in': '內建', 'Built-in · edited': '內建 · 已修改',
    'Start from a template': '從模板開始', 'Start from a template…': '從模板開始…',
    'Blank': '空白', 'Quote of the day (from an API)': '每日名言（來自 API）', 'Big number from any JSON': '任意 JSON 中的大數字', 'Drawing with canvas': '用 canvas 繪圖',
    'Run (⌘↩)': '執行 (⌘↩)', '▶ Run': '▶ 執行', 'Reset to original': '還原為原始版本', 'Save as…': '另存為…', 'Save': '儲存', 'Save (⌘S)': '儲存 (⌘S)',
    'Reference': '參考', 'Preview': '預覽', 'Console': '控制檯', 'Clear': '清除',
    'Unsaved changes': '有未儲存的更改', 'Not saved yet': '尚未儲存',
    'Fix the errors in the console before saving': '請先修復控制檯中的錯誤再儲存',
    'Save as a new widget': '另存為新小元件',
    'The original stays as it is. Your new widget appears under My widgets.': '原來的保持不變。新小元件會出現在「我的小元件」中。',
    'Close without saving your changes?': '不儲存更改就關閉？',
    'Replace your code with this template?': '用這個模板替換你的程式碼？',
    'Go back to the original code for this widget? Your changes will be removed.': '把這個小元件還原為原始程式碼？你的更改會被刪除。',
    'Not a FrameDeck widget file': '這不是 FrameDeck 小元件檔案',
    'The widget code has errors': '小元件程式碼有錯誤',

    // ---------- guides menu & shared guide parts ----------
    'A monitor or this computer': '顯示器或這臺電腦',
    'A tablet or old phone': '平板或舊手機',
    'NZXT Kraken LCD': 'NZXT Kraken 液晶屏',
    'Any computer or Raspberry Pi': '任意電腦或樹莓派',
    'Write your own widgets': '編寫自己的小元件',
    'Page presets & sharing': '頁面預設與分享',
    '✓ Network sharing is on. This computer is at <b>{0}</b>.': '✓ 網路共享已開啟。這臺電腦的地址是 <b>{0}</b>。',
    'Network sharing is off.': '網路共享已關閉。',
    'Turn on network sharing': '開啟網路共享',
    'The first time, macOS may ask whether FrameDeck can accept incoming network connections. Click <b>Allow</b>.': '第一次開啟時，macOS 可能會詢問是否允許 FrameDeck 接受傳入的網路連線。請點選<b>允許</b>。',
    'Turning on…': '正在開啟…',
    'Make a screen': '建立螢幕',
    '{0}" screen': '{0} 英寸螢幕',

  };

  // ---------- guides ----------
  function guide(id, h) {
    const { esc, linkBox, screenPicker, shareStep, lanBase, info, KRAKENS } = h;
    const krakenButtons = () => `<div class="g-krakens">${KRAKENS.map((k) => `<button class="btn small" data-gact="make-kraken" data-k="${k.key}">${esc(k.name)} · ${k.w}×${k.h}<small>${esc(k.note)}</small></button>`).join('')}</div>`;
    if (id === 'monitor') {
      return `<h2>在顯示器或這臺電腦上顯示螢幕</h2>
        <ol class="steps">
          <li><b>建立一個和顯示器同樣大小的螢幕。</b>在「螢幕」下點選 <b>+ 新增</b>。已連線的顯示器會以真實解析度列在最前面，佈局可以做到畫素級對應。插上新顯示器時，FrameDeck 會主動提出為它建立螢幕。
            ${h.displays.displays.length ? `<div class="g-displays">${h.displays.displays.map((d) => `<div class="disp"><div class="dn"><b>${esc(d.label)}</b><span>${d.w} × ${d.h}${d.hz ? ` · ${d.hz} Hz` : ''}${d.scale > 1 ? ` · 顯示效果相當於 ${d.looksLikeW} × ${d.looksLikeH}` : ''}</span></div><button class="btn small" data-gact="make-for" data-display="${d.id}">建立螢幕</button></div>`).join('')}</div>` : ''}</li>
          <li><b>設計它。</b>從左側新增小元件，或者用預設新增頁面。</li>
          <li><b>顯示它。</b>點選右上角的<b>在螢幕上顯示</b>，選擇顯示器，它會全屏開啟。按 <kbd>Esc</kbd> 關閉，按 <kbd>←</kbd> <kbd>→</kbd> 翻頁。</li>
          <li><b>讓它常駐（可選）。</b>在<b>設定</b>中開啟<b>登入時開啟 FrameDeck</b>。退出時正在顯示的螢幕會自動重新開啟，閒置的顯示器就像一個電子相框。</li>
        </ol>`;
    }
    if (id === 'tablet') {
      const s = h.screen();
      const url = lanBase() && s ? `${lanBase()}/display.html?screen=${s.id}` : null;
      return `<h2>把平板或舊手機當作顯示屏</h2>
        <ol class="steps">
          <li><b>為它建立一個螢幕。</b>在「螢幕」下點選 <b>+ 新增</b>，選擇<b>平板</b>，或者選<b>自定義尺寸</b>並填入它的解析度。</li>
          <li><b>開啟網路共享。</b>${shareStep()}</li>
          <li><b>在平板上開啟連結。</b>兩臺裝置需要連線同一個 Wi-Fi。${screenPicker()}
            ${url ? linkBox(url) : '<p class="note">開啟共享後，連結會顯示在這裡。</p>'}</li>
          <li><b>全屏顯示。</b>在 iPhone 或 iPad 上，點「分享」→<b>新增到主螢幕</b>，然後從主螢幕開啟。在 Android 上，開啟瀏覽器選單 →<b>新增到主螢幕</b>。其他瀏覽器裡，雙擊頁面即可全屏。</li>
          <li><b>保持常亮。</b>充電時把平板的自動鎖定設為「永不」。在 iPad 上，<b>引導式訪問</b>（設定 → 輔助功能）可以讓它一直停留在這個頁面。</li>
        </ol>
        <p class="note">點螢幕左右邊緣可以翻頁。點新聞小元件裡的標題即可閱讀。</p>`;
    }
    if (id === 'kraken' && info.platform === 'win32') {
      const rounds = h.pickRound();
      const s = h.screen();
      const url = s && s.profile.shape === 'round' ? `http://127.0.0.1:${info.port}/display.html?screen=${s.id}` : null;
      return `<h2>在 NZXT Kraken 液晶屏上顯示螢幕</h2>
        <p>FrameDeck 和 NZXT CAM 都在這臺電腦上執行，大約一分鐘就能設定好。CAM 的 <b>Web Integration</b>（網頁整合）模式會把 FrameDeck 頁面顯示在散熱器上。</p>
        <ol class="steps">
          <li><b>建立一個和 Kraken 同樣大小的圓形螢幕。</b>
            ${krakenButtons()}
            <p class="note">不確定是哪一款？選 Kraken Elite 即可。CAM 會把準確尺寸告訴 FrameDeck，頁面會自動縮放。新螢幕自帶一個時鐘頁面和一個 <b>Kraken 狀態</b>頁面，顯示水溫、CPU 和 GPU 溫度。</p></li>
          <li><b>複製連結。</b>${rounds.length ? screenPicker((x) => x.profile.shape === 'round') : '<p class="note">請先在第 1 步建立 Kraken 螢幕。</p>'}
            ${url ? linkBox(url, '貼上到 NZXT CAM 的連結') + `<button class="btn small" data-gact="open-cam" data-url="${esc(url)}">在 NZXT CAM 中開啟</button>` : ''}</li>
          <li><b>在 NZXT CAM 中開啟 Web Integration。</b>
            <ol class="sub"><li>開啟 <b>NZXT CAM</b>，點選你的 Kraken。</li>
              <li>進入 <b>Lighting</b>（燈光）標籤，開啟液晶屏的 <b>Mode</b>（模式）選單，選擇 <b>Web Integration</b>。</li>
              <li>點選 <b>Custom</b>（自定義）旁的 <b>Edit</b>（編輯），把連結貼上到 <b>URL</b> 欄，然後點箭頭。</li></ol></li>
          <li><b>保持 FrameDeck 執行。</b>在<b>設定</b>中開啟<b>登入時開啟 FrameDeck</b>，這樣重啟後散熱器也能繼續顯示。FrameDeck 會在後臺啟動。</li>
        </ol>
        <h3>疑難解答</h3>
        <ul class="trouble">
          <li><b>Kraken 顯示舊佈局或什麼都不顯示。</b>CAM 只有在連結改變時才會重新載入。把模式切換成別的，再切回 Web Integration。</li>
          <li><b>Kraken 狀態顯示「No data」。</b>請把 NZXT CAM 更新到 4.50 或更新版本。</li>
          <li><b>連結失效了。</b>如果 47820 埠被佔用，FrameDeck 會改用下一個空閒埠。請從這個頁面重新複製連結。</li>
        </ul>`;
    }
    if (id === 'kraken') {
      const rounds = h.cfg.screens.filter((x) => x.profile.shape === 'round');
      const s = h.screen();
      const url = lanBase() && s ? `${lanBase()}/display.html?screen=${s.id}` : null;
      return `<h2>在 NZXT Kraken 液晶屏上顯示螢幕</h2>
        <p>Kraken 的螢幕由 <b>NZXT CAM</b> 控制，而 CAM 只能在 Windows 上執行。CAM 有一個 <b>Web Integration</b>（網頁整合）模式，可以把任意網頁顯示在散熱器上。最簡單的做法是在遊戲電腦上安裝 Windows 版 FrameDeck。如果想用這臺電腦來驅動，就由 FrameDeck 提供頁面、遊戲電腦上的 CAM 來顯示，兩臺電腦需要在同一個網路中。</p>
        <ol class="steps">
          <li><b>建立一個和 Kraken 同樣大小的圓形螢幕。</b>
            ${krakenButtons()}
            <p class="note">不確定是哪一款？選 Kraken Elite 即可。CAM 會把準確尺寸告訴 FrameDeck，頁面會自動縮放。新螢幕自帶一個時鐘頁面和一個 <b>Kraken 狀態</b>頁面，顯示來自 CAM 的水溫、CPU 和 GPU 溫度。</p></li>
          <li><b>開啟網路共享。</b>${shareStep()}</li>
          <li><b>複製 Kraken 螢幕的連結。</b>
            ${rounds.length ? screenPicker((x) => x.profile.shape === 'round') : '<p class="note">請先在第 1 步建立 Kraken 螢幕。</p>'}
            ${url && s && s.profile.shape === 'round' ? linkBox(url, '貼上到 NZXT CAM 的連結') + linkBox(`https://cam-redirect.nzxt.com/action/load-web-integration?url=${encodeURIComponent(url)}`, '或者在 Windows 電腦上開啟這個一鍵連結（會開啟 CAM 並自動填好連結）') : ''}
            <p class="note">把連結發給自己（郵件、Discord、備忘錄），方便在遊戲電腦上開啟。</p></li>
          <li><b>在 Windows 電腦上檢查連結。</b>把連結貼上到遊戲電腦的 Chrome 或 Edge 中，應該能看到你的螢幕。如果打不開，請看下面的疑難解答。</li>
          <li><b>在 NZXT CAM 中開啟 Web Integration。</b>在 Windows 電腦上：
            <ol class="sub"><li>開啟 <b>NZXT CAM</b>，點選你的 Kraken。</li>
              <li>進入 <b>Lighting</b>（燈光）標籤，開啟液晶屏的 <b>Mode</b>（模式）選單，選擇 <b>Web Integration</b>。</li>
              <li>點選 <b>Custom</b>（自定義）旁的 <b>Edit</b>（編輯），把連結貼上到 <b>URL</b> 欄，然後點箭頭。</li></ol>
            幾秒鐘後，你的 FrameDeck 螢幕就會出現在散熱器上。</li>
          <li><b>保持執行。</b>執行 FrameDeck 的電腦需要保持開機且不休眠，Kraken 才能持續更新。在 Mac 上，進入「系統設定」→<b>電池</b>（或<b>節能</b>）→「選項」，開啟<b>顯示器關閉時防止自動進入睡眠</b>（接通電源時）。在路由器設定中給這臺電腦<b>保留一個固定 IP 地址</b>，連結就不會失效。</li>
        </ol>
        <h3>疑難解答</h3>
        <ul class="trouble">
          <li><b>在遊戲電腦上打不開連結。</b>檢查兩臺電腦是否在同一個網路（不是訪客 Wi-Fi），網路共享是否已開啟，以及執行 FrameDeck 的電腦的防火牆是否允許它（Mac：系統設定 → 網路 → 防火牆 → 選項；Windows：系統詢問時允許 FrameDeck）。</li>
          <li><b>Kraken 顯示舊佈局或什麼都不顯示。</b>CAM 只有在連結改變時才會重新載入。把模式切換成別的，再切回 Web Integration。</li>
          <li><b>昨天還好好的，今天不行了。</b>執行 FrameDeck 的電腦的地址可能變了。在路由器中給它保留地址，然後在這裡複製新連結。</li>
          <li><b>Kraken 狀態顯示「No data」。</b>請把 NZXT CAM 更新到 4.50 或更新版本。</li>
        </ul>
        <p class="note">提示：在遊戲電腦上安裝 Windows 版 FrameDeck，就完全不需要網路設定。</p>`;
    }
    if (id === 'kiosk') {
      const s = h.screen();
      const url = lanBase() && s ? `${lanBase()}/display.html?screen=${s.id}` : '<本頁中的連結>';
      return `<h2>把任意電腦或樹莓派當作顯示屏</h2>
        <p>任何有網頁瀏覽器的裝置都能顯示 FrameDeck 螢幕：舊筆記本、電視後面的迷你主機，或者接了小 HDMI 屏或觸控式螢幕的樹莓派。</p>
        <ol class="steps">
          <li><b>開啟網路共享。</b>${shareStep()}</li>
          <li><b>選擇要顯示的螢幕。</b>${screenPicker()}</li>
          <li><b>在那臺電腦上全屏開啟（「kiosk 模式」）。</b>
            <p><b>Raspberry Pi OS</b>，在終端中執行：</p><pre>chromium-browser --kiosk --noerrdialogs --disable-infobars "${esc(url)}"</pre>
            <p><b>Windows</b>，在命令提示符中執行：</p><pre>start msedge --kiosk "${esc(url)}" --edge-kiosk-type=fullscreen</pre>
            <p><b>其他 Mac 或電腦</b>：在瀏覽器中開啟連結，雙擊頁面即可全屏。</p></li>
          <li><b>開機自動啟動（樹莓派）。</b>把上面的命令加到 <code>~/.config/labwc/autostart</code> 的末尾（舊版 Pi OS 是 <code>~/.config/lxsession/LXDE-pi/autostart</code>），重啟後螢幕就會自動出現。</li>
        </ol>
        <p class="note">墨水屏無法執行網頁瀏覽器。向墨水屏相框推送圖片已在開發計劃中；在那之前，如果你有樹莓派和微雪（Waveshare）墨水屏，<a href="https://github.com/Feeengyuuu/EpaperSystem" target="_blank">EpaperSystem</a> 是最好的選擇。</p>`;
    }
    if (id === 'widgets') {
      return `<h2>編寫自己的小元件</h2>
        <ol class="steps">
          <li><b>新建一個。</b>在「小元件 → 我的小元件」下點選 <b>+ 新建</b>。選一個模板作為起點，或者保留空白模板。</li>
          <li><b>編輯程式碼。</b><b>JavaScript</b> 標籤用來描述並繪製小元件，<b>CSS</b> 標籤用來設定樣式。右側的預覽會隨著你輸入實時執行，並同時顯示多種螢幕尺寸，包括圓形屏和墨水屏。錯誤資訊和 <code>console.log()</code> 會顯示在控制檯中。</li>
          <li><b>儲存。</b><b>儲存</b>（<kbd>⌘S</kbd>）會更新所有用到這個小元件的地方。<b>另存為…</b> 會保留原來的，另建一個新小元件。</li>
          <li><b>修改內建小元件。</b>把滑鼠移到列表中的任意小元件上並點選 <b>✎</b>，或者在螢幕上選中一個後點選<b>編輯程式碼</b>。儲存會在所有地方生效；<b>還原為原始版本</b>可以撤銷修改。「另存為」會生成你自己的副本，內建的保持不變。</li>
          <li><b>分享。</b><b>匯出</b>會儲存為 <code>.framedeck-widget.json</code> 檔案。別人可以在「我的小元件」下用<b>匯入</b>新增。</li>
        </ol>
        <p>編輯器中的<b>參考</b>標籤列出了小元件能用的一切：設定項、尺寸、網路資料，以及圓環圖、迷你折線圖等輔助函式。</p>
        <p class="note">你寫的小元件執行在沙盒中：它們不能修改你的佈局或檔案，並且只能讀取公共網際網路上的資料，不能訪問你的區域網。</p>
        <button class="btn primary" data-gact="new-widget">新建小元件</button>`;
    }
    return `<h2>頁面預設與分享</h2>
      <ol class="steps">
        <li><b>用預設新增頁面。</b>在「頁面」下點選 <b>+ 新增</b>，選擇<b>預設</b>。預設會按當前螢幕排好，包括圓形屏和墨水屏。選擇<b>自定義</b>可以新增空白頁面或複製當前頁面。</li>
        <li><b>修改預設。</b>用預設新增頁面後隨意修改。在右側面板中，<b>儲存到預設</b>會更新這個預設；<b>另存為新預設…</b> 會保留原來的。修改過的內建預設可以在預設列表中用<b>還原</b>恢復。</li>
        <li><b>把任意頁面存為預設。</b>選中頁面，在右側點選<b>另存為預設…</b>。</li>
        <li><b>分享。</b>在預設列表中，<b>匯出</b>會儲存為 <code>.framedeck-page.json</code> 檔案，別人可以用<b>匯入預設…</b> 新增。整個螢幕可以在右側面板匯出（<b>匯出佈局</b>）。兩種檔案都會帶上你自己的小元件，所以在別人的 FrameDeck 上也能用。</li>
        <li><b>更精細的控制。</b>每個螢幕的<b>格子大小</b>（右側面板）決定網格有多細。格子越小，小元件的大小和位置就能調得越精確。</li>
      </ol>`;
  }

  // ---------- Widget Studio reference ----------
  const help = `
<h4>小元件是怎麼工作的</h4>
<p>你的程式碼呼叫一次 <code>widget({ ... })</code>。每當需要繪製時，FrameDeck 就會呼叫 <code>render(el, s, ctx)</code>：小元件出現時、大小改變時、每隔 <code>tick</code> 毫秒，以及 <code>data()</code> 載入完成後。</p>
<pre>widget({
  name: 'My widget', icon: '✨', desc: '顯示在列表中',
  def: [8, 4],        // 預設大小（網格格數）
  min: [2, 2],        // 最小大小
  tick: 1000,         // 可選：每秒重繪一次
  dataEvery: 60000,   // 可選：data() 多久重新載入一次
  settings: [         // 設定面板中的欄位
    { key: 'city', label: 'City', type: 'text', default: 'Paris' },
  ],
  async data(s, ctx) { return ctx.fetchJSON('/api/...'); },
  render(el, s, ctx) { el.innerHTML = '...'; },
});</pre>
<h4>設定項型別</h4>
<p><code>text</code>、<code>textarea</code>、<code>select</code>（需要 <code>options: [['value','Label'], ...]</code>）、<code>toggle</code>、<code>datetime</code>、<code>place</code>（城市搜尋，得到 <code>{ label, lat, lon }</code>）、<code>media</code>（圖片或影片）。</p>
<h4>ctx</h4>
<p><code>ctx.w</code>、<code>ctx.h</code>：畫素尺寸 · <code>ctx.cls</code>：<code>'xs' | 's' | 'm' | 'l'</code> · <code>ctx.aspect</code>：<code>'wide' | 'tall' | 'square'</code> · <code>ctx.shape</code>：<code>'rect' | 'round'</code> · <code>ctx.color</code>：<code>'full' | 'eink6' | 'mono'</code> · <code>ctx.data</code>、<code>ctx.error</code>：<code>data()</code> 的結果 · <code>ctx.editor</code>：編輯時為 true。</p>
<p><code>ctx.fetchText(url)</code>：讀取任意公共網址（沒有 CORS 問題；區域網地址會被阻止）· <code>ctx.fetchJSON(path)</code>：FrameDeck 自帶的資料：<code>/api/weather?lat=&amp;lon=&amp;units=f</code>、<code>/api/air</code>、<code>/api/system</code>、<code>/api/hn</code>、<code>/api/rss?url=</code>、<code>/api/ics?url=</code>、<code>/api/scores?league=nba</code>、<code>/api/crypto?ids=bitcoin</code>、<code>/api/nowplaying</code>、<code>/api/geocode?q=</code> · <code>ctx.every(ms, fn)</code>：隨小元件一起停止的定時器。</p>
<h4>輔助函式</h4>
<p><code>esc(text)</code> 為 HTML 轉義文字 · <code>ring(percent, label, sub)</code> 繪製進度圓環 · <code>spark(numbers)</code> 繪製迷你折線圖 · <code>wxIcon(code)</code>、<code>wxLabel(code)</code> 天氣圖示 · <code>fitText(el)</code> 縮小文字以適應大小 · <code>newsList(el, items, {title, per, every, ctx})</code> 可點選的標題列表 · <code>moonSvg(moonPhase())</code>。</p>
<h4>樣式</h4>
<p>使用主題顏色，讓小元件在每個螢幕上都協調：<code>var(--fg)</code>、<code>var(--muted)</code>、<code>var(--accent)</code>、<code>var(--bg)</code>、<code>var(--radius)</code>、<code>var(--font)</code>。用 <code>min(10cqw, 20cqh)</code> 這樣的容器單位設定文字大小，文字就會隨小元件縮放。</p>
<p><code>console.log()</code> 會顯示在右側的控制檯中。用 <code>window.open()</code> 開啟的連結會在你的瀏覽器中開啟。</p>`;

  // ---------- display page ----------
  Object.assign(strings, {
    'Choose a screen': '選擇一個螢幕',
    '← → change page · Esc closes · double-click toggles fullscreen': '← → 翻頁 · Esc 關閉 · 雙擊切換全屏',
    '← → change page · double-click for fullscreen': '← → 翻頁 · 雙擊全屏',
    "FrameDeck isn't reachable ({0}).": '無法連線到 FrameDeck（{0}）。',
  });

  FD.I18N['zh-Hant'] = { strings, guide, help };
})();
