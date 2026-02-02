// Get site info from URL params
const urlParams = new URLSearchParams(window.location.search);
const site = urlParams.get('site') || 'this site';
const limit = parseInt(urlParams.get('limit')) || 30;

document.getElementById('siteName').textContent = site;
document.getElementById('limitDisplay').textContent = `${limit} minutes`;

// Do something better - open coping tools
document.getElementById('doSomethingBtn').addEventListener('click', () => {
  chrome.tabs.update({ url: chrome.runtime.getURL('coping-tools.html') });
});

// Close tab
document.getElementById('closeBtn').addEventListener('click', () => {
  window.close();
});
