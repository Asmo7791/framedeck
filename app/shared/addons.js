// Loads add-ons (see src/addons.js): each one's client/index.js, before the page draws.
(function () {
  const FD = (window.FD = window.FD || {});
  FD.loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load ' + src));
    document.head.appendChild(s);
  });
  FD.loadAddons = async function () {
    let list = [];
    try { list = (await FD.fetchJSON('/api/addons')).addons || []; } catch { return; }
    for (const a of list) {
      // An add-on can set FD.addonReady[name] to a promise while it loads its other files.
      try { await FD.loadScript(a.script); await (FD.addonReady || {})[a.name]; } catch (err) { console.error(`Add-on ${a.name}:`, err.message); }
    }
  };
})();
