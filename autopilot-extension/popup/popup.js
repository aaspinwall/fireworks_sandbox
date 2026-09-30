const D = AutopilotValuation.DEFAULTS;
const ids = ['enabled', 'benchmark', 'goldMultiple'];
chrome.storage.sync.get(D, (s) => {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el.type === 'checkbox') el.checked = s[id]; else el.value = s[id];
    el.addEventListener('change', () => {
      const v = el.type === 'checkbox' ? el.checked : parseFloat(el.value);
      if (el.type !== 'checkbox' && !(v > 0)) { el.value = D[id]; return chrome.storage.sync.set({ [id]: D[id] }); }
      chrome.storage.sync.set({ [id]: v });
    });
  });
});
