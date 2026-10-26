// 简体中文 interface text. zh-Hant.js is generated from this file by tools/make-zh-hant.mjs;
// edit this one and run `npm run i18n`.
// Keys are the English text exactly as shown. {0} keeps the matched text; {t0} translates it too.
(function () {
  const FD = (window.FD = window.FD || {});
  FD.I18N = FD.I18N || {};

  const strings = {
    // ---------- top bar & layout ----------
    'Saved': '已保存',
    'Saving…': '正在保存…',
    'Not saved: {0}': '未保存：{0}',
    '♥ Support': '♥ 支持',
    '♥ Supporter': '♥ 支持者',
    'Guides': '使用指南',
    'Settings': '设置',
    'Show on a display ▾': '在屏幕上显示 ▾',
    'Undo (⌘Z)': '撤销 (⌘Z)',
    'Undo': '撤销',
    'Redo (⇧⌘Z)': '重做 (⇧⌘Z)',
    'Redo': '重做',
    'Screens': '屏幕',
    '+ Add': '+ 添加',
    'Pages': '页面',
    'Widgets': '小组件',
    'click or drag · ✎ edits code': '点击或拖动 · ✎ 编辑代码',
    'My widgets': '我的小组件',
    'Import': '导入',
    '+ New': '+ 新建',
    'Write your own in HTML, CSS and JavaScript. Click + New.': '用 HTML、CSS 和 JavaScript 自己写一个。点击“+ 新建”。',
    'Grid': '网格',
    'Live data': '实时数据',
    'This page is empty. Click a widget on the left to add it.': '这个页面是空的。点击左侧的小组件即可添加。',
    'Add a screen to start': '先添加一个屏幕',
    '{0} · round': '{0} · 圆形',
    '{0} grid': '{0} 网格',
    'E-ink · 6 colors': '墨水屏 · 6 色',
    'E-ink · black & white': '墨水屏 · 黑白',
    '{t0} · {1}': '{0} · {1}',
    '{t0} — partly outside the round screen': '{0} — 部分超出圆形屏幕',
    'Edit code': '编辑代码',
    'Edit {t0} code': '编辑“{0}”的代码',
    'Supporter theme': '支持者主题',
    'Copied': '已复制',
    'Link copied': '链接已复制',

    // ---------- inspector: page & screen ----------
    'Page': '页面',
    'Name': '名称',
    'Show for': '显示时长',
    '5 seconds': '5 秒', '10 seconds': '10 秒', '15 seconds': '15 秒', '20 seconds': '20 秒', '30 seconds': '30 秒', '45 seconds': '45 秒',
    '1 minute': '1 分钟', '2 minutes': '2 分钟', '5 minutes': '5 分钟', '10 minutes': '10 分钟', '15 minutes': '15 分钟', '30 minutes': '30 分钟',
    '1 hour': '1 小时', 'Hour': '每小时',
    'Save as preset…': '另存为预设…',
    'From preset': '来自预设',
    'Save to preset': '保存到预设',
    'Save as new preset…': '另存为新预设…',
    'Duplicate': '复制',
    'Copy to screen…': '复制到屏幕…',
    'Delete': '删除',
    'Screen': '屏幕',
    'Size': '尺寸',
    'Change size…': '更改尺寸…',
    'Match {0} ({1})': '匹配 {0}（{1}）',
    'Width px': '宽度 px',
    'Height px': '高度 px',
    'Shape': '形状',
    'Rectangle': '矩形',
    'Round': '圆形',
    'Colors': '颜色',
    'Full color': '全彩',
    'E-ink 6-color': '墨水屏 6 色',
    'Black & white': '黑白',
    'Block size': '格子大小',
    'Custom ({0})': '自定义（{0}）',
    'Large blocks ({0})': '大格子（{0}）',
    'Medium blocks ({0})': '中格子（{0}）',
    'Small blocks ({0})': '小格子（{0}）',
    'Tiny blocks ({0})': '极小格子（{0}）',
    'Grid columns': '网格列数',
    'Grid rows': '网格行数',
    'Widgets are placed on the grid, so changing the size or grid stretches the layout instead of breaking it.': '小组件按网格摆放，所以更改尺寸或网格时，布局会自动拉伸而不会错乱。',
    'Rotate through pages': '轮流显示页面',
    'Look': '外观',
    'Midnight': '午夜', 'Paper': '纸张', 'Black glass': '黑玻璃', 'Terminal': '终端', 'Sunset': '日落', 'E-ink color': '墨水屏彩色', 'E-ink mono': '墨水屏黑白',
    'Aurora': '极光', 'Neon': '霓虹', 'Sakura': '樱花', 'Retro amber': '复古琥珀', 'Ocean': '海洋', 'Forest': '森林',
    'Back': '背景', 'Text': '文字', 'Muted': '次要', 'Accent': '强调色', 'Card': '卡片',
    'This screen can only show {0} colors, so choices are limited to what the panel can display.': '这个屏幕只能显示 {0} 种颜色，所以只能选择面板能显示的颜色。',
    'Font': '字体', 'System': '系统', 'Rounded': '圆体', 'Serif': '衬线', 'Monospace': '等宽', 'Condensed': '窄体',
    'Widget background': '小组件背景', 'Cards': '卡片', 'Outlines': '描边', 'None': '无',
    'Corner roundness': '圆角大小',
    'Spacing between widgets': '小组件间距',
    'Share & back up': '分享与备份',
    'Export layout': '导出布局',
    'Import layout': '导入布局',
    'Duplicate screen': '复制屏幕',
    'Delete screen': '删除屏幕',

    // ---------- inspector: widget ----------
    'Missing widget': '小组件不存在',
    "This widget's code was deleted.": '这个小组件的代码已被删除。',
    'Position & size': '位置与大小',
    'Column': '列', 'Row': '行', 'Width': '宽度', 'Height': '高度',
    'corners fall outside the round screen': '四角超出圆形屏幕',
    'very small for this screen': '对这个屏幕来说太小了',
    'Background': '背景',
    'Theme default': '跟随主题',
    'Outline': '描边',
    'Arrange': '排列',
    '✎ Edit code': '✎ 编辑代码',
    'Bring to front': '移到最前',
    'Move to page': '移到页面',
    'Choose…': '选择…',
    'Choose picture or video…': '选择图片或视频…',
    'Remove': '移除',
    'or paste a link to a picture, GIF or video': '或粘贴图片、GIF 或视频的链接',
    'GIFs animate. Videos play muted on a loop, up to {0} seconds.': 'GIF 会动起来。视频会静音循环播放，最长 {0} 秒。',
    'No city set': '未设置城市',
    'Search for a city': '搜索城市',
    'Find': '查找',
    'Videos can be up to 150 MB': '视频最大 150 MB',
    'Uploading…': '正在上传…',
    'Upload failed: {0}': '上传失败：{0}',
    'Use a PNG, JPG, GIF or WebP image, or an MP4, MOV or WebM video': '请使用 PNG、JPG、GIF、WebP 图片，或 MP4、MOV、WebM 视频',

    // ---------- widgets: names & descriptions ----------
    'Clock': '时钟', 'Digital or analog time, any time zone': '数字或指针时钟，任意时区',
    'Date': '日期', 'Weekday and date, in your language': '星期和日期，使用你的语言',
    'Month calendar': '月历', 'This month with today marked': '本月日历，标出今天',
    'Weather': '天气', 'Now and the week ahead, no API key needed': '当前和未来一周的天气，无需 API 密钥',
    'Countdown': '倒计时', 'Days until a date': '距离某个日期还有几天',
    'Progress': '进度', 'How far through the year, month, week or day': '今年、本月、本周或今天已过去多少',
    'This computer': '这台电脑', 'CPU, memory and uptime': 'CPU、内存和运行时间',
    'Any text: a note, quote or heading': '任意文字：便签、名言或标题',
    'Image & video': '图片与视频', 'A photo, GIF or short looping video': '照片、GIF 或循环短视频',
    'Hacker News': 'Hacker News', 'Top stories right now; tap one to read': '当前热门文章；点一下即可阅读', 'Top stories right now': '当前热门文章',
    'Web page': '网页', 'Embed a page (some sites block this)': '嵌入一个网页（有些网站不允许）',
    'World clocks': '世界时钟', 'Several cities at a glance': '一眼看到多个城市的时间',
    'Calendar events': '日历事件', 'Upcoming events from a calendar link (iCal)': '来自日历链接（iCal）的近期事件',
    'News feed': '新闻订阅', 'Headlines from any RSS or Atom feed; tap one to read': '来自任意 RSS 或 Atom 订阅的头条；点一下即可阅读',
    'Sports scores': '体育比分', 'Live and recent games (NBA, NFL, MLB, soccer, esports…)': '直播和近期比赛（NBA、NFL、MLB、足球、电竞…）',
    'Crypto prices': '加密货币价格', 'Prices and 24h change from CoinGecko': '来自 CoinGecko 的价格和 24 小时涨跌',
    'Air quality': '空气质量', 'US AQI and PM2.5 from Open-Meteo': '来自 Open-Meteo 的美国 AQI 和 PM2.5',
    'Sun & moon': '日月', 'Moon phase, plus sunrise and sunset for a city': '月相，以及某个城市的日出日落',
    'Now playing': '正在播放', 'Spotify or Apple Music (Mac only)': 'Spotify 或 Apple Music（仅限 Mac）',
    'Rotating text': '轮播文字', 'Cycles through quotes, reminders or facts': '轮流显示名言、提醒或小知识',
    'Kraken stats': 'Kraken 状态', 'Liquid, CPU and GPU temperature when shown on an NZXT Kraken': '在 NZXT Kraken 上显示时，展示水温、CPU 和 GPU 温度',

    // ---------- widgets: settings ----------
    'Style': '样式', 'Digital': '数字', 'Analog': '指针',
    '24-hour time': '24 小时制', 'Show seconds': '显示秒', 'Time zone': '时区', 'Label (optional)': '标签（可选）',
    'Format': '格式', 'Weekday + date': '星期 + 日期', 'Short': '简短', 'Numbers': '数字',
    'Language': '语言', 'Week starts on': '每周开始于', 'Sunday': '星期日', 'Monday': '星期一',
    'City': '城市', 'Units': '单位', '°F, mph': '°F，mph', '°C, km/h': '°C，km/h', 'Days of forecast': '预报天数', 'Fit to size': '按大小自动调整',
    'Show': '显示', 'CPU + memory': 'CPU + 内存', 'CPU only': '仅 CPU', 'Memory only': '仅内存',
    'Title': '标题', 'Date and time': '日期和时间', 'Show hours and minutes': '显示小时和分钟',
    'Alignment': '对齐', 'Left': '左', 'Center': '居中', 'Right': '右',
    'Weight': '粗细', 'Regular': '常规', 'Medium': '中等', 'Bold': '粗体', 'Color': '颜色',
    'Picture or video': '图片或视频', 'Fit': '填充方式', 'Fill the box': '填满方框', 'Show all of it': '完整显示', 'Caption': '说明文字',
    'Track': '统计', 'Year': '年', 'Month': '月', 'Week': '周', 'Day': '日',
    'Stories per page': '每页文章数', 'Turn the page every': '翻页间隔', 'Never': '从不',
    'Address': '地址', 'Zoom': '缩放', 'Reload every': '刷新间隔',
    'Cities (Name = time zone, one per line)': '城市（名称 = 时区，每行一个）',
    'Coins (CoinGecko ids, comma separated)': '币种（CoinGecko ID，用逗号分隔）',
    'Currency': '货币',
    'Feed': '订阅源', 'Custom link…': '自定义链接…',
    'BBC News · World': 'BBC 新闻 · 国际', 'BBC News · Business': 'BBC 新闻 · 商业', 'BBC News · Technology': 'BBC 新闻 · 科技',
    'The Guardian · World': '卫报 · 国际', 'The New York Times': '纽约时报', 'Al Jazeera': '半岛电视台',
    'CNBC · Top news': 'CNBC · 头条', 'The Economist · The world this week': '经济学人 · 本周世界',
    'Feed address (RSS or Atom link)': '订阅地址（RSS 或 Atom 链接）',
    'Title (blank uses the feed name)': '标题（留空则使用订阅名称）',
    'Headlines per page': '每页标题数',
    'Calendar link (.ics or webcal://)': '日历链接（.ics 或 webcal://）',
    'Look ahead': '显示范围', 'Today': '今天', '3 days': '3 天', '1 week': '1 周', '2 weeks': '2 周', '1 month': '1 个月',
    'League': '联赛', 'College football': '大学橄榄球', 'College basketball': '大学篮球', 'Premier League': '英超', 'La Liga': '西甲',
    'Serie A': '意甲', 'Bundesliga': '德甲', 'Ligue 1': '法甲', 'Champions League': '欧冠',
    'Esports · Dota 2': '电竞 · Dota 2', 'Esports · League of Legends': '电竞 · 英雄联盟', 'Esports · Counter-Strike 2': '电竞 · 反恐精英 2',
    'Esports · Valorant': '电竞 · 无畏契约', 'Esports · Overwatch': '电竞 · 守望先锋', 'Esports · Rainbow Six Siege': '电竞 · 彩虹六号：围攻', 'Esports · Rocket League': '电竞 · 火箭联盟',
    'Your own PandaScore token (optional; free at pandascore.co)': '你自己的 PandaScore 令牌（可选；可在 pandascore.co 免费获取）',
    'Only this team (abbreviation or name, optional)': '只看这支队伍（缩写或名称，可选）',
    'Show team logos': '显示队伍标志',
    'City (for sunrise and sunset)': '城市（用于日出日落）',
    'Show album art': '显示专辑封面',
    'Lines (one per line)': '内容（每行一条）', 'Change every': '切换间隔',
    'Quote': '名言', 'Plain': '普通', 'Big number': '大数字',
    'Liquid temperature': '水温', 'CPU temperature': 'CPU 温度', 'GPU temperature': 'GPU 温度',

    // ---------- add a screen ----------
    'Add a screen': '添加屏幕',
    "Pick what you'll show it on. You can change the size later and the layout stretches to fit.": '选择要显示在哪种屏幕上。之后可以更改尺寸，布局会自动拉伸适应。',
    'Monitors & laptops': '显示器和笔记本', 'Small & bar screens': '小屏和条形屏', 'Round screens (cooler LCDs)': '圆形屏（散热器液晶屏）', 'E-ink': '墨水屏', 'Other': '其他',
    'Match a connected display': '匹配已连接的显示器', 'Custom size…': '自定义尺寸…',
    'Monitor {0}': '显示器 {0}', 'Portrait monitor {0}': '竖屏显示器 {0}', 'Ultrawide {0}': '带鱼屏 {0}', 'Tablet {0}': '平板 {0}', 'Bar display {0}': '条形屏 {0}',
    '{0} USB screen {1}': '{0} USB 小屏 {1}',
    'Round {0} (Kraken Elite size)': '圆形 {0}（Kraken Elite 尺寸）', 'Round {0} (Kraken Z size)': '圆形 {0}（Kraken Z 尺寸）', 'Round {0} (Kraken size)': '圆形 {0}（Kraken 尺寸）',
    'E-ink {0}, 6-color': '墨水屏 {0}，6 色', 'E-ink {0}, black & white': '墨水屏 {0}，黑白',
    'Cancel': '取消', 'Add screen': '添加屏幕', 'My screen': '我的屏幕', 'Custom screen': '自定义屏幕', 'New screen': '新屏幕',
    'Pick a screen type first': '请先选择一种屏幕类型',

    // ---------- add a page & presets ----------
    'Add a page': '添加页面', 'Preset': '预设', 'Custom': '自定义',
    "Presets are laid out for this screen's size. Pick one, then change anything you like.": '预设已按这个屏幕的尺寸排好。选一个，然后随意修改。',
    'Import a preset…': '导入预设…', 'Page name': '页面名称', 'New page': '新页面',
    '<b>Blank page</b><small>Start empty and add widgets from the left.</small>': '<b>空白页面</b><small>从空白开始，再从左侧添加小组件。</small>',
    'Blank page': '空白页面', 'Start empty and add widgets from the left.': '从空白开始，再从左侧添加小组件。',
    'Copy of the current page': '复制当前页面', '"{0}" with all its widgets': '“{0}”及其所有小组件',
    'Add page': '添加页面', 'Add this preset': '添加这个预设',
    '🕒 Clock & date': '🕒 时钟和日期', 'A big clock with the date under it': '大时钟，下方显示日期',
    '☀️ Today': '☀️ 今天', "Date, weather, calendar and what's coming up": '日期、天气、日历和接下来的安排',
    '⛅ Weather focus': '⛅ 天气', 'Forecast, air quality, sun and moon': '天气预报、空气质量、日月',
    '🗞️ News desk': '🗞️ 新闻', 'World headlines and Hacker News, tap to read': '国际头条和 Hacker News，点一下即可阅读',
    '🪙 Markets': '🪙 行情', 'Crypto prices, world clocks and business news': '加密货币价格、世界时钟和商业新闻',
    '🏀 Game day': '🏀 比赛日', 'Scores from two leagues and the time': '两个联赛的比分和时间',
    '🎵 Now playing': '🎵 正在播放', 'What Spotify or Music is playing': 'Spotify 或“音乐”正在播放的内容',
    '📈 System monitor': '📈 系统监视', 'CPU, memory and the time': 'CPU、内存和时间',
    '🖼️ Photo frame': '🖼️ 相框', 'A picture with a small clock on top': '一张图片，上面有个小时钟',
    '🎯 Focus': '🎯 专注', 'A countdown with rotating reminders': '倒计时加轮播提醒',
    '🌍 World clocks': '🌍 世界时钟', "Times around the world and today's date": '世界各地的时间和今天的日期',
    'Clock & date': '时钟和日期', 'Weather focus': '天气', 'News desk': '新闻', 'Markets': '行情', 'Game day': '比赛日',
    'System monitor': '系统监视', 'Photo frame': '相框', 'Focus': '专注',
    'Edited preset': '已修改的预设', 'Your preset': '你的预设', 'Reset': '还原', 'Export': '导出',
    'Pick a preset first, or switch to Custom': '请先选择一个预设，或切换到“自定义”',
    'Not a FrameDeck page preset': '这不是 FrameDeck 页面预设文件',
    'Imported preset': '导入的预设',
    'Save page as a preset': '把页面另存为预设',
    'You can pick it under Pages → + Add → Preset on any screen, and export it to share.': '之后可以在任意屏幕的“页面 → + 添加 → 预设”中选用，也可以导出分享。',
    'Added "{0}". Change it, then use Save to preset on the right to update the preset.': '已添加“{0}”。修改后，用右侧的“保存到预设”来更新这个预设。',
    'Saved preset "{0}"': '已保存预设“{0}”',
    'Updated the "{0}" preset': '已更新预设“{0}”',
    'Imported "{0}"': '已导入“{0}”',
    'Imported {0}': '已导入 {0}',
    'Copied "{0}" to {1}': '已把“{0}”复制到 {1}',
    'Go back to the original "{0}" preset?': '把预设“{0}”还原为原始版本？',
    'Delete the preset "{0}"? Pages already made from it stay.': '删除预设“{0}”？已经用它创建的页面会保留。',

    // ---------- prompts & messages ----------
    'OK': '确定',
    'Import failed: {0}': '导入失败：{0}',
    'Not a FrameDeck layout file': '这不是 FrameDeck 布局文件',
    'Delete the page "{0}"?': '删除页面“{0}”？',
    'Delete the screen "{0}" and all its pages?': '删除屏幕“{0}”及其所有页面？',
    'Delete this widget?': '删除这个小组件？',
    'Delete this widget and remove it from {0} place{1} in your layouts?': '删除这个小组件，并从布局中的 {0} 个位置移除？',
    'This file contains {0} custom widget{1} with code. Widgets run in a sandbox and can only load data from the public internet, but only import files from people you trust. Import it?':
      '这个文件包含 {0} 个带代码的自定义小组件。小组件在沙盒中运行，只能读取公共互联网上的数据，但请只导入你信任的人发来的文件。\n\n要导入吗？',
    'That widget no longer exists': '这个小组件已经不存在了',
    'Made a screen for {0}': '已为 {0} 创建屏幕',
    'Made "{0}". Continue with step 2.': '已创建“{0}”。请继续第 2 步。',
    'Saved as {0}': '已另存为 {0}',

    // ---------- show on a display ----------
    'Show "{0}"': '显示“{0}”',
    '{0} · main': '{0} · 主显示器',
    '{0} · same shape': '{0} · 比例相同',
    '{0} · will letterbox': '{0} · 会有黑边',
    '{0} · looks like {1}': '{0} · 显示效果相当于 {1}',
    'Stop': '停止', 'Fullscreen': '全屏', 'Open in a window': '在窗口中打开', 'Stop all ({0})': '全部停止（{0}）',
    'Connected displays show up here when FrameDeck runs as the app.': '以应用方式运行 FrameDeck 时，已连接的显示器会显示在这里。',
    'Link for a browser on this computer': '在这台电脑的浏览器中打开的链接',
    'Link for a phone, tablet or other computer on your Wi-Fi': '给同一 Wi-Fi 下的手机、平板或其他电脑使用的链接',
    'Copy': '复制',
    'Turn on network sharing in Settings to show this screen on a tablet, old phone or another computer.': '在“设置”中打开网络共享，就能在平板、旧手机或其他电脑上显示这个屏幕。',
    'In a display window: ← → changes page, Esc closes it.': '在显示窗口中：← → 翻页，Esc 关闭。',
    '{0} connected · {1}': '{0} 已连接 · {1}',
    'Make a screen for it': '为它创建屏幕',
    'Not now': '以后再说',

    // ---------- settings ----------
    'Share displays on my network': '在我的网络上共享显示',
    'Lets phones, tablets and other computers on your Wi-Fi open display links. The editor stays on this computer only.': '让同一 Wi-Fi 下的手机、平板和其他电脑打开显示链接。编辑器只在这台电脑上可用。',
    'Open FrameDeck when I log in': '登录时打开 FrameDeck',
    'Displays that were showing when you quit open again automatically.': '退出时正在显示的屏幕会自动重新打开。',
    '♥ Supporter: {0}': '♥ 支持者：{0}',
    'FrameDeck {0} · inspired by <a href="https://github.com/Feeengyuuu/EpaperSystem" target="_blank" style="color:var(--ui-accent)">EpaperSystem</a> by Feeengyuuu, which builds on <a href="https://github.com/fatihak/InkyPi" target="_blank" style="color:var(--ui-accent)">InkyPi</a>. Weather from Open-Meteo.':
      'FrameDeck {0} · 灵感来自 Feeengyuuu 的 <a href="https://github.com/Feeengyuuu/EpaperSystem" target="_blank" style="color:var(--ui-accent)">EpaperSystem</a>（基于 <a href="https://github.com/fatihak/InkyPi" target="_blank" style="color:var(--ui-accent)">InkyPi</a>）。天气数据来自 Open-Meteo。',

    // ---------- support ----------
    '♥ Support FrameDeck': '♥ 支持 FrameDeck',
    "FrameDeck is free and open source. If it's useful to you, a donation of any size keeps it going.": 'FrameDeck 免费且开源。如果它对你有用，任何金额的捐助都能帮助它继续下去。',
    "Put your email in the payment note and I'll send you a supporter key, usually within a day.": '在付款备注里写上你的邮箱，我会把支持者密钥发给你，通常一天之内。',
    "Donation links haven't been set up yet.": '还没有设置捐助链接。',
    'Supporters get a key that unlocks: <b>{0}</b> themes, and a supporter badge.': '支持者会得到一个密钥，可以解锁 <b>{0}</b> 主题和支持者徽章。',
    'Have a supporter key?': '已有支持者密钥？',
    'Unlock': '解锁',
    '♥ Thank you, {0}!': '♥ 谢谢你，{0}！',
    "You're a FrameDeck supporter since {0}. Supporter themes are unlocked: {1}.": '你从 {0} 起就是 FrameDeck 的支持者。支持者主题已解锁：{1}。',
    "You're a FrameDeck supporter. Supporter themes are unlocked: {0}.": '你是 FrameDeck 的支持者。支持者主题已解锁：{0}。',
    'Want to chip in again?': '想再支持一次？',
    'Remove key from this computer': '从这台电脑移除密钥',
    'Close': '关闭',
    'Remove the supporter key from this computer? You can add it again any time.': '从这台电脑移除支持者密钥？之后随时可以重新添加。',
    'Thank you! Supporter features unlocked.': '谢谢你！支持者功能已解锁。',
    "That key isn't valid. Check you copied all of it.": '这个密钥无效。请检查是否完整复制。',
    'A key works on up to 3 computers. Unlocking needs an internet connection once.': '一个密钥最多可在 3 台电脑上使用。解锁时需要联网一次。',
    "Couldn't reach FrameDeck's activation server. Check your internet connection and try again.": '无法连接 FrameDeck 激活服务器。请检查网络连接后重试。',
    'This key is already unlocked on {0} computers. Remove it from one of them (♥ Supporter → Remove key from this computer), or ask the developer to reset it.': '这个密钥已经在 {0} 台电脑上解锁了。请先在其中一台上移除（♥ 支持者 → 从这台电脑移除密钥），或请开发者重置。',
    'The activation server answered: {0}': '激活服务器返回：{0}',

    // ---------- Widget Studio ----------
    'Widget': '小组件', 'My widget': '我的小组件', 'New widget': '新小组件', 'Your widget': '你的小组件', 'Built-in': '内置', 'Built-in · edited': '内置 · 已修改',
    'Start from a template': '从模板开始', 'Start from a template…': '从模板开始…',
    'Blank': '空白', 'Quote of the day (from an API)': '每日名言（来自 API）', 'Big number from any JSON': '任意 JSON 中的大数字', 'Drawing with canvas': '用 canvas 绘图',
    'Run (⌘↩)': '运行 (⌘↩)', '▶ Run': '▶ 运行', 'Reset to original': '还原为原始版本', 'Save as…': '另存为…', 'Save': '保存', 'Save (⌘S)': '保存 (⌘S)',
    'Reference': '参考', 'Preview': '预览', 'Console': '控制台', 'Clear': '清除',
    'Unsaved changes': '有未保存的更改', 'Not saved yet': '尚未保存',
    'Fix the errors in the console before saving': '请先修复控制台中的错误再保存',
    'Save as a new widget': '另存为新小组件',
    'The original stays as it is. Your new widget appears under My widgets.': '原来的保持不变。新小组件会出现在“我的小组件”中。',
    'Close without saving your changes?': '不保存更改就关闭？',
    'Replace your code with this template?': '用这个模板替换你的代码？',
    'Go back to the original code for this widget? Your changes will be removed.': '把这个小组件还原为原始代码？你的更改会被删除。',
    'Not a FrameDeck widget file': '这不是 FrameDeck 小组件文件',
    'The widget code has errors': '小组件代码有错误',

    // ---------- guides menu & shared guide parts ----------
    'A monitor or this computer': '显示器或这台电脑',
    'A tablet or old phone': '平板或旧手机',
    'NZXT Kraken LCD': 'NZXT Kraken 液晶屏',
    'Any computer or Raspberry Pi': '任意电脑或树莓派',
    'Write your own widgets': '编写自己的小组件',
    'Page presets & sharing': '页面预设与分享',
    '✓ Network sharing is on. This computer is at <b>{0}</b>.': '✓ 网络共享已打开。这台电脑的地址是 <b>{0}</b>。',
    'Network sharing is off.': '网络共享已关闭。',
    'Turn on network sharing': '打开网络共享',
    'The first time, macOS may ask whether FrameDeck can accept incoming network connections. Click <b>Allow</b>.': '第一次打开时，macOS 可能会询问是否允许 FrameDeck 接受传入的网络连接。请点击<b>允许</b>。',
    'Turning on…': '正在打开…',
    'Make a screen': '创建屏幕',
    '{0}" screen': '{0} 英寸屏幕',

  };

  // ---------- guides ----------
  function guide(id, h) {
    const { esc, linkBox, screenPicker, shareStep, lanBase, info, KRAKENS } = h;
    const krakenButtons = () => `<div class="g-krakens">${KRAKENS.map((k) => `<button class="btn small" data-gact="make-kraken" data-k="${k.key}">${esc(k.name)} · ${k.w}×${k.h}<small>${esc(k.note)}</small></button>`).join('')}</div>`;
    if (id === 'monitor') {
      return `<h2>在显示器或这台电脑上显示屏幕</h2>
        <ol class="steps">
          <li><b>创建一个和显示器同样大小的屏幕。</b>在“屏幕”下点击 <b>+ 添加</b>。已连接的显示器会以真实分辨率列在最前面，布局可以做到像素级对应。插上新显示器时，FrameDeck 会主动提出为它创建屏幕。
            ${h.displays.displays.length ? `<div class="g-displays">${h.displays.displays.map((d) => `<div class="disp"><div class="dn"><b>${esc(d.label)}</b><span>${d.w} × ${d.h}${d.hz ? ` · ${d.hz} Hz` : ''}${d.scale > 1 ? ` · 显示效果相当于 ${d.looksLikeW} × ${d.looksLikeH}` : ''}</span></div><button class="btn small" data-gact="make-for" data-display="${d.id}">创建屏幕</button></div>`).join('')}</div>` : ''}</li>
          <li><b>设计它。</b>从左侧添加小组件，或者用预设添加页面。</li>
          <li><b>显示它。</b>点击右上角的<b>在屏幕上显示</b>，选择显示器，它会全屏打开。按 <kbd>Esc</kbd> 关闭，按 <kbd>←</kbd> <kbd>→</kbd> 翻页。</li>
          <li><b>让它常驻（可选）。</b>在<b>设置</b>中打开<b>登录时打开 FrameDeck</b>。退出时正在显示的屏幕会自动重新打开，闲置的显示器就像一个电子相框。</li>
        </ol>`;
    }
    if (id === 'tablet') {
      const s = h.screen();
      const url = lanBase() && s ? `${lanBase()}/display.html?screen=${s.id}` : null;
      return `<h2>把平板或旧手机当作显示屏</h2>
        <ol class="steps">
          <li><b>为它创建一个屏幕。</b>在“屏幕”下点击 <b>+ 添加</b>，选择<b>平板</b>，或者选<b>自定义尺寸</b>并填入它的分辨率。</li>
          <li><b>打开网络共享。</b>${shareStep()}</li>
          <li><b>在平板上打开链接。</b>两台设备需要连接同一个 Wi-Fi。${screenPicker()}
            ${url ? linkBox(url) : '<p class="note">打开共享后，链接会显示在这里。</p>'}</li>
          <li><b>全屏显示。</b>在 iPhone 或 iPad 上，点“分享”→<b>添加到主屏幕</b>，然后从主屏幕打开。在 Android 上，打开浏览器菜单 →<b>添加到主屏幕</b>。其他浏览器里，双击页面即可全屏。</li>
          <li><b>保持常亮。</b>充电时把平板的自动锁定设为“永不”。在 iPad 上，<b>引导式访问</b>（设置 → 辅助功能）可以让它一直停留在这个页面。</li>
        </ol>
        <p class="note">点屏幕左右边缘可以翻页。点新闻小组件里的标题即可阅读。</p>`;
    }
    if (id === 'kraken' && info.platform === 'win32') {
      const rounds = h.pickRound();
      const s = h.screen();
      const url = s && s.profile.shape === 'round' ? `http://127.0.0.1:${info.port}/display.html?screen=${s.id}` : null;
      return `<h2>在 NZXT Kraken 液晶屏上显示屏幕</h2>
        <p>FrameDeck 和 NZXT CAM 都在这台电脑上运行，大约一分钟就能设置好。CAM 的 <b>Web Integration</b>（网页集成）模式会把 FrameDeck 页面显示在散热器上。</p>
        <ol class="steps">
          <li><b>创建一个和 Kraken 同样大小的圆形屏幕。</b>
            ${krakenButtons()}
            <p class="note">不确定是哪一款？选 Kraken Elite 即可。CAM 会把准确尺寸告诉 FrameDeck，页面会自动缩放。新屏幕自带一个时钟页面和一个 <b>Kraken 状态</b>页面，显示水温、CPU 和 GPU 温度。</p></li>
          <li><b>复制链接。</b>${rounds.length ? screenPicker((x) => x.profile.shape === 'round') : '<p class="note">请先在第 1 步创建 Kraken 屏幕。</p>'}
            ${url ? linkBox(url, '粘贴到 NZXT CAM 的链接') + `<button class="btn small" data-gact="open-cam" data-url="${esc(url)}">在 NZXT CAM 中打开</button>` : ''}</li>
          <li><b>在 NZXT CAM 中打开 Web Integration。</b>
            <ol class="sub"><li>打开 <b>NZXT CAM</b>，点击你的 Kraken。</li>
              <li>进入 <b>Lighting</b>（灯光）标签，打开液晶屏的 <b>Mode</b>（模式）菜单，选择 <b>Web Integration</b>。</li>
              <li>点击 <b>Custom</b>（自定义）旁的 <b>Edit</b>（编辑），把链接粘贴到 <b>URL</b> 栏，然后点箭头。</li></ol></li>
          <li><b>保持 FrameDeck 运行。</b>在<b>设置</b>中打开<b>登录时打开 FrameDeck</b>，这样重启后散热器也能继续显示。FrameDeck 会在后台启动。</li>
        </ol>
        <h3>疑难解答</h3>
        <ul class="trouble">
          <li><b>Kraken 显示旧布局或什么都不显示。</b>CAM 只有在链接改变时才会重新加载。把模式切换成别的，再切回 Web Integration。</li>
          <li><b>Kraken 状态显示“No data”。</b>请把 NZXT CAM 更新到 4.50 或更新版本。</li>
          <li><b>链接失效了。</b>如果 47820 端口被占用，FrameDeck 会改用下一个空闲端口。请从这个页面重新复制链接。</li>
        </ul>`;
    }
    if (id === 'kraken') {
      const rounds = h.cfg.screens.filter((x) => x.profile.shape === 'round');
      const s = h.screen();
      const url = lanBase() && s ? `${lanBase()}/display.html?screen=${s.id}` : null;
      return `<h2>在 NZXT Kraken 液晶屏上显示屏幕</h2>
        <p>Kraken 的屏幕由 <b>NZXT CAM</b> 控制，而 CAM 只能在 Windows 上运行。CAM 有一个 <b>Web Integration</b>（网页集成）模式，可以把任意网页显示在散热器上。最简单的做法是在游戏电脑上安装 Windows 版 FrameDeck。如果想用这台电脑来驱动，就由 FrameDeck 提供页面、游戏电脑上的 CAM 来显示，两台电脑需要在同一个网络中。</p>
        <ol class="steps">
          <li><b>创建一个和 Kraken 同样大小的圆形屏幕。</b>
            ${krakenButtons()}
            <p class="note">不确定是哪一款？选 Kraken Elite 即可。CAM 会把准确尺寸告诉 FrameDeck，页面会自动缩放。新屏幕自带一个时钟页面和一个 <b>Kraken 状态</b>页面，显示来自 CAM 的水温、CPU 和 GPU 温度。</p></li>
          <li><b>打开网络共享。</b>${shareStep()}</li>
          <li><b>复制 Kraken 屏幕的链接。</b>
            ${rounds.length ? screenPicker((x) => x.profile.shape === 'round') : '<p class="note">请先在第 1 步创建 Kraken 屏幕。</p>'}
            ${url && s && s.profile.shape === 'round' ? linkBox(url, '粘贴到 NZXT CAM 的链接') + linkBox(`https://cam-redirect.nzxt.com/action/load-web-integration?url=${encodeURIComponent(url)}`, '或者在 Windows 电脑上打开这个一键链接（会打开 CAM 并自动填好链接）') : ''}
            <p class="note">把链接发给自己（邮件、Discord、备忘录），方便在游戏电脑上打开。</p></li>
          <li><b>在 Windows 电脑上检查链接。</b>把链接粘贴到游戏电脑的 Chrome 或 Edge 中，应该能看到你的屏幕。如果打不开，请看下面的疑难解答。</li>
          <li><b>在 NZXT CAM 中打开 Web Integration。</b>在 Windows 电脑上：
            <ol class="sub"><li>打开 <b>NZXT CAM</b>，点击你的 Kraken。</li>
              <li>进入 <b>Lighting</b>（灯光）标签，打开液晶屏的 <b>Mode</b>（模式）菜单，选择 <b>Web Integration</b>。</li>
              <li>点击 <b>Custom</b>（自定义）旁的 <b>Edit</b>（编辑），把链接粘贴到 <b>URL</b> 栏，然后点箭头。</li></ol>
            几秒钟后，你的 FrameDeck 屏幕就会出现在散热器上。</li>
          <li><b>保持运行。</b>运行 FrameDeck 的电脑需要保持开机且不休眠，Kraken 才能持续更新。在 Mac 上，进入“系统设置”→<b>电池</b>（或<b>节能</b>）→“选项”，打开<b>显示器关闭时防止自动进入睡眠</b>（接通电源时）。在路由器设置中给这台电脑<b>保留一个固定 IP 地址</b>，链接就不会失效。</li>
        </ol>
        <h3>疑难解答</h3>
        <ul class="trouble">
          <li><b>在游戏电脑上打不开链接。</b>检查两台电脑是否在同一个网络（不是访客 Wi-Fi），网络共享是否已打开，以及运行 FrameDeck 的电脑的防火墙是否允许它（Mac：系统设置 → 网络 → 防火墙 → 选项；Windows：系统询问时允许 FrameDeck）。</li>
          <li><b>Kraken 显示旧布局或什么都不显示。</b>CAM 只有在链接改变时才会重新加载。把模式切换成别的，再切回 Web Integration。</li>
          <li><b>昨天还好好的，今天不行了。</b>运行 FrameDeck 的电脑的地址可能变了。在路由器中给它保留地址，然后在这里复制新链接。</li>
          <li><b>Kraken 状态显示“No data”。</b>请把 NZXT CAM 更新到 4.50 或更新版本。</li>
        </ul>
        <p class="note">提示：在游戏电脑上安装 Windows 版 FrameDeck，就完全不需要网络设置。</p>`;
    }
    if (id === 'kiosk') {
      const s = h.screen();
      const url = lanBase() && s ? `${lanBase()}/display.html?screen=${s.id}` : '<本页中的链接>';
      return `<h2>把任意电脑或树莓派当作显示屏</h2>
        <p>任何有网页浏览器的设备都能显示 FrameDeck 屏幕：旧笔记本、电视后面的迷你主机，或者接了小 HDMI 屏或触摸屏的树莓派。</p>
        <ol class="steps">
          <li><b>打开网络共享。</b>${shareStep()}</li>
          <li><b>选择要显示的屏幕。</b>${screenPicker()}</li>
          <li><b>在那台电脑上全屏打开（“kiosk 模式”）。</b>
            <p><b>Raspberry Pi OS</b>，在终端中运行：</p><pre>chromium-browser --kiosk --noerrdialogs --disable-infobars "${esc(url)}"</pre>
            <p><b>Windows</b>，在命令提示符中运行：</p><pre>start msedge --kiosk "${esc(url)}" --edge-kiosk-type=fullscreen</pre>
            <p><b>其他 Mac 或电脑</b>：在浏览器中打开链接，双击页面即可全屏。</p></li>
          <li><b>开机自动启动（树莓派）。</b>把上面的命令加到 <code>~/.config/labwc/autostart</code> 的末尾（旧版 Pi OS 是 <code>~/.config/lxsession/LXDE-pi/autostart</code>），重启后屏幕就会自动出现。</li>
        </ol>
        <p class="note">墨水屏无法运行网页浏览器。向墨水屏相框推送图片已在开发计划中；在那之前，如果你有树莓派和微雪（Waveshare）墨水屏，<a href="https://github.com/Feeengyuuu/EpaperSystem" target="_blank">EpaperSystem</a> 是最好的选择。</p>`;
    }
    if (id === 'widgets') {
      return `<h2>编写自己的小组件</h2>
        <ol class="steps">
          <li><b>新建一个。</b>在“小组件 → 我的小组件”下点击 <b>+ 新建</b>。选一个模板作为起点，或者保留空白模板。</li>
          <li><b>编辑代码。</b><b>JavaScript</b> 标签用来描述并绘制小组件，<b>CSS</b> 标签用来设置样式。右侧的预览会随着你输入实时运行，并同时显示多种屏幕尺寸，包括圆形屏和墨水屏。错误信息和 <code>console.log()</code> 会显示在控制台中。</li>
          <li><b>保存。</b><b>保存</b>（<kbd>⌘S</kbd>）会更新所有用到这个小组件的地方。<b>另存为…</b> 会保留原来的，另建一个新小组件。</li>
          <li><b>修改内置小组件。</b>把鼠标移到列表中的任意小组件上并点击 <b>✎</b>，或者在屏幕上选中一个后点击<b>编辑代码</b>。保存会在所有地方生效；<b>还原为原始版本</b>可以撤销修改。“另存为”会生成你自己的副本，内置的保持不变。</li>
          <li><b>分享。</b><b>导出</b>会保存为 <code>.framedeck-widget.json</code> 文件。别人可以在“我的小组件”下用<b>导入</b>添加。</li>
        </ol>
        <p>编辑器中的<b>参考</b>标签列出了小组件能用的一切：设置项、尺寸、网络数据，以及圆环图、迷你折线图等辅助函数。</p>
        <p class="note">你写的小组件运行在沙盒中：它们不能修改你的布局或文件，并且只能读取公共互联网上的数据，不能访问你的局域网。</p>
        <button class="btn primary" data-gact="new-widget">新建小组件</button>`;
    }
    return `<h2>页面预设与分享</h2>
      <ol class="steps">
        <li><b>用预设添加页面。</b>在“页面”下点击 <b>+ 添加</b>，选择<b>预设</b>。预设会按当前屏幕排好，包括圆形屏和墨水屏。选择<b>自定义</b>可以添加空白页面或复制当前页面。</li>
        <li><b>修改预设。</b>用预设添加页面后随意修改。在右侧面板中，<b>保存到预设</b>会更新这个预设；<b>另存为新预设…</b> 会保留原来的。修改过的内置预设可以在预设列表中用<b>还原</b>恢复。</li>
        <li><b>把任意页面存为预设。</b>选中页面，在右侧点击<b>另存为预设…</b>。</li>
        <li><b>分享。</b>在预设列表中，<b>导出</b>会保存为 <code>.framedeck-page.json</code> 文件，别人可以用<b>导入预设…</b> 添加。整个屏幕可以在右侧面板导出（<b>导出布局</b>）。两种文件都会带上你自己的小组件，所以在别人的 FrameDeck 上也能用。</li>
        <li><b>更精细的控制。</b>每个屏幕的<b>格子大小</b>（右侧面板）决定网格有多细。格子越小，小组件的大小和位置就能调得越精确。</li>
      </ol>`;
  }

  // ---------- Widget Studio reference ----------
  const help = `
<h4>小组件是怎么工作的</h4>
<p>你的代码调用一次 <code>widget({ ... })</code>。每当需要绘制时，FrameDeck 就会调用 <code>render(el, s, ctx)</code>：小组件出现时、大小改变时、每隔 <code>tick</code> 毫秒，以及 <code>data()</code> 加载完成后。</p>
<pre>widget({
  name: 'My widget', icon: '✨', desc: '显示在列表中',
  def: [8, 4],        // 默认大小（网格格数）
  min: [2, 2],        // 最小大小
  tick: 1000,         // 可选：每秒重绘一次
  dataEvery: 60000,   // 可选：data() 多久重新加载一次
  settings: [         // 设置面板中的字段
    { key: 'city', label: 'City', type: 'text', default: 'Paris' },
  ],
  async data(s, ctx) { return ctx.fetchJSON('/api/...'); },
  render(el, s, ctx) { el.innerHTML = '...'; },
});</pre>
<h4>设置项类型</h4>
<p><code>text</code>、<code>textarea</code>、<code>select</code>（需要 <code>options: [['value','Label'], ...]</code>）、<code>toggle</code>、<code>datetime</code>、<code>place</code>（城市搜索，得到 <code>{ label, lat, lon }</code>）、<code>media</code>（图片或视频）。</p>
<h4>ctx</h4>
<p><code>ctx.w</code>、<code>ctx.h</code>：像素尺寸 · <code>ctx.cls</code>：<code>'xs' | 's' | 'm' | 'l'</code> · <code>ctx.aspect</code>：<code>'wide' | 'tall' | 'square'</code> · <code>ctx.shape</code>：<code>'rect' | 'round'</code> · <code>ctx.color</code>：<code>'full' | 'eink6' | 'mono'</code> · <code>ctx.data</code>、<code>ctx.error</code>：<code>data()</code> 的结果 · <code>ctx.editor</code>：编辑时为 true。</p>
<p><code>ctx.fetchText(url)</code>：读取任意公共网址（没有 CORS 问题；局域网地址会被阻止）· <code>ctx.fetchJSON(path)</code>：FrameDeck 自带的数据：<code>/api/weather?lat=&amp;lon=&amp;units=f</code>、<code>/api/air</code>、<code>/api/system</code>、<code>/api/hn</code>、<code>/api/rss?url=</code>、<code>/api/ics?url=</code>、<code>/api/scores?league=nba</code>、<code>/api/crypto?ids=bitcoin</code>、<code>/api/nowplaying</code>、<code>/api/geocode?q=</code> · <code>ctx.every(ms, fn)</code>：随小组件一起停止的定时器。</p>
<h4>辅助函数</h4>
<p><code>esc(text)</code> 为 HTML 转义文字 · <code>ring(percent, label, sub)</code> 绘制进度圆环 · <code>spark(numbers)</code> 绘制迷你折线图 · <code>wxIcon(code)</code>、<code>wxLabel(code)</code> 天气图标 · <code>fitText(el)</code> 缩小文字以适应大小 · <code>newsList(el, items, {title, per, every, ctx})</code> 可点击的标题列表 · <code>moonSvg(moonPhase())</code>。</p>
<h4>样式</h4>
<p>使用主题颜色，让小组件在每个屏幕上都协调：<code>var(--fg)</code>、<code>var(--muted)</code>、<code>var(--accent)</code>、<code>var(--bg)</code>、<code>var(--radius)</code>、<code>var(--font)</code>。用 <code>min(10cqw, 20cqh)</code> 这样的容器单位设置文字大小，文字就会随小组件缩放。</p>
<p><code>console.log()</code> 会显示在右侧的控制台中。用 <code>window.open()</code> 打开的链接会在你的浏览器中打开。</p>`;

  // ---------- display page ----------
  Object.assign(strings, {
    'Choose a screen': '选择一个屏幕',
    '← → change page · Esc closes · double-click toggles fullscreen': '← → 翻页 · Esc 关闭 · 双击切换全屏',
    '← → change page · double-click for fullscreen': '← → 翻页 · 双击全屏',
    "FrameDeck isn't reachable ({0}).": '无法连接到 FrameDeck（{0}）。',
  });

  FD.I18N['zh-Hans'] = { strings, guide, help };
})();
