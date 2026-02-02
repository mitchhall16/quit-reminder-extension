const overridePhrase = "I am choosing to stay up late and I accept the consequences";
let selectedMinutes = 15;

// Get blocked URL from query params
const urlParams = new URLSearchParams(window.location.search);
const blockedUrl = urlParams.get('url') || 'a distracting site';
document.getElementById('blockedUrl').textContent = blockedUrl;

// Update current time
function updateTime() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  document.getElementById('currentTime').textContent =
    `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}
updateTime();
setInterval(updateTime, 1000);

// Load bedtime setting
chrome.storage.sync.get(['bedtimeHour', 'bedtimeMinute', 'bedtimeEnabled'], (result) => {
  if (result.bedtimeHour !== undefined) {
    const hour = result.bedtimeHour;
    const minute = result.bedtimeMinute || 0;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    document.getElementById('bedtimeDisplay').textContent =
      `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  }
});

// Load stats
chrome.storage.local.get(['bedtimeStats'], (result) => {
  const stats = result.bedtimeStats || { onTime: 0, overrides: 0, weekStart: Date.now() };

  // Reset weekly stats if it's been more than 7 days
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  if (stats.weekStart < weekAgo) {
    stats.onTime = 0;
    stats.overrides = 0;
    stats.weekStart = Date.now();
    chrome.storage.local.set({ bedtimeStats: stats });
  }

  document.getElementById('onTimeCount').textContent = stats.onTime;
  document.getElementById('overrideWeekCount').textContent = stats.overrides;
  document.getElementById('overrideCount').textContent = stats.overrides;
});

// Override input checking
const overrideInput = document.getElementById('overrideInput');
const overrideBtn = document.getElementById('overrideBtn');

overrideInput.addEventListener('input', () => {
  const typed = overrideInput.value.trim().toLowerCase();
  const target = overridePhrase.toLowerCase();

  if (typed === target) {
    overrideInput.classList.add('correct');
    overrideBtn.disabled = false;
  } else {
    overrideInput.classList.remove('correct');
    overrideBtn.disabled = true;
  }
});

// Time options
document.querySelectorAll('.time-option').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.time-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedMinutes = parseInt(btn.dataset.minutes);
  });
});

// Override button
overrideBtn.addEventListener('click', () => {
  // Grant temporary access
  const expiresAt = Date.now() + (selectedMinutes * 60 * 1000);

  chrome.storage.local.get(['bedtimeStats', 'bedtimeOverrideExpires'], (result) => {
    const stats = result.bedtimeStats || { onTime: 0, overrides: 0, weekStart: Date.now() };
    stats.overrides++;

    chrome.storage.local.set({
      bedtimeStats: stats,
      bedtimeOverrideExpires: expiresAt
    }, () => {
      // Redirect to the original URL
      if (blockedUrl && blockedUrl !== 'a distracting site') {
        window.location.href = 'https://' + blockedUrl.replace(/^https?:\/\//, '');
      } else {
        window.close();
      }
    });
  });
});

// Go to bed button
document.getElementById('goToBedBtn').addEventListener('click', () => {
  // Record that they made the good choice
  chrome.storage.local.get(['bedtimeStats'], (result) => {
    const stats = result.bedtimeStats || { onTime: 0, overrides: 0, weekStart: Date.now() };
    stats.onTime++;

    chrome.storage.local.set({ bedtimeStats: stats }, () => {
      // Close the tab or show a nice message
      document.body.innerHTML = `
        <div style="text-align: center; padding: 100px 20px;">
          <div style="font-size: 5rem; margin-bottom: 20px;">😴</div>
          <h1 style="color: #4ade80; margin-bottom: 20px;">Good choice!</h1>
          <p style="color: #94a3b8; font-size: 1.2rem;">
            Tomorrow-you is going to be grateful.<br>
            Sweet dreams.
          </p>
        </div>
      `;

      // Close after a moment
      setTimeout(() => window.close(), 3000);
    });
  });
});
