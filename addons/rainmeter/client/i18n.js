// Rainmeter add-on interface text for FrameDeck's languages (see app/i18n/). Merged into
// the language packs when the add-on loads, before the page is translated.
(function () {
  const FD = window.FD;
  const text = {
    'zh-Hans': {
      "Rainmeter skin": "Rainmeter 皮肤",
      "Shows a Rainmeter skin you import (.rmskin or .zip)": "显示你导入的 Rainmeter 皮肤（.rmskin 或 .zip）",
      "Skin": "皮肤",
      "Choose a skin…": "选择皮肤…",
      "Import a skin (.rmskin or .zip)…": "导入皮肤（.rmskin 或 .zip）…",
      "Download skins from sites like DeviantArt or VisualSkins. Plugins and Lua scripts in skins aren't supported.": "可以从 DeviantArt 或 VisualSkins 等网站下载皮肤。皮肤中的插件和 Lua 脚本不受支持。",
      "Fit inside the widget": "缩放到小组件内",
      "Fill the widget": "填满小组件",
      "Actual size": "实际大小",
      "Remove this skin package…": "移除这个皮肤包…",
      "Choose a skin in this widget's settings, or import one.": "在这个小组件的设置中选择或导入一个皮肤。",
      "Not supported here:": "此处不支持：",
      "This skin couldn't be loaded.": "无法加载这个皮肤。",
      "(missing)": "（已缺失）",
      "Importing…": "正在导入…",
      "Imported": "已导入",
      "Import failed:": "导入失败：",
      "Choose a skin first": "请先选择一个皮肤",
      "Remove the imported package \"{0}\" and all its skins from FrameDeck?": "从 FrameDeck 移除导入的皮肤包“{0}”及其所有皮肤？",
      "No Rainmeter skins found in this file": "这个文件中没有找到 Rainmeter 皮肤",
      "This isn't a zip or .rmskin file": "这不是 zip 或 .rmskin 文件"
    },
    'zh-Hant': {
      "Rainmeter skin": "Rainmeter 皮膚",
      "Shows a Rainmeter skin you import (.rmskin or .zip)": "顯示你匯入的 Rainmeter 皮膚（.rmskin 或 .zip）",
      "Skin": "皮膚",
      "Choose a skin…": "選擇皮膚…",
      "Import a skin (.rmskin or .zip)…": "匯入皮膚（.rmskin 或 .zip）…",
      "Download skins from sites like DeviantArt or VisualSkins. Plugins and Lua scripts in skins aren't supported.": "可以從 DeviantArt 或 VisualSkins 等網站下載皮膚。皮膚中的外掛和 Lua 指令碼不受支援。",
      "Fit inside the widget": "縮放到小元件內",
      "Fill the widget": "填滿小元件",
      "Actual size": "實際大小",
      "Remove this skin package…": "移除這個皮膚包…",
      "Choose a skin in this widget's settings, or import one.": "在這個小元件的設定中選擇或匯入一個皮膚。",
      "Not supported here:": "此處不支援：",
      "This skin couldn't be loaded.": "無法載入這個皮膚。",
      "(missing)": "（已缺失）",
      "Importing…": "正在匯入…",
      "Imported": "已匯入",
      "Import failed:": "匯入失敗：",
      "Choose a skin first": "請先選擇一個皮膚",
      "Remove the imported package \"{0}\" and all its skins from FrameDeck?": "從 FrameDeck 移除匯入的皮膚包「{0}」及其所有皮膚？",
      "No Rainmeter skins found in this file": "這個檔案中沒有找到 Rainmeter 皮膚",
      "This isn't a zip or .rmskin file": "這不是 zip 或 .rmskin 檔案"
    },
  };
  for (const [lang, strings] of Object.entries(text)) if (FD.I18N && FD.I18N[lang]) Object.assign(FD.I18N[lang].strings, strings);
})();
