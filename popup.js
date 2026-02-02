// Load current settings
chrome.storage.sync.get([
  'enabled',
  'intervalMinutes',
  'affirmation',
  'startDate',
  'timesCompleted',
  'dailyCost',
  'supplementReminders',
  'supplementTimes',
  'nofapEnabled',
  'nofapAffirmation',
  'nofapStartDate',
  'claudeApiKey',
  'bedtimeEnabled',
  'bedtimeHour',
  'bedtimeMinute',
  'wakeHour',
  'wakeMinute',
  'blockedSites',
  'timeLimitsEnabled',
  'timeLimits'
], (result) => {
  // API key
  if (result.claudeApiKey) {
    document.getElementById('apiKeyInput').value = result.claudeApiKey;
  }
  // Enabled toggle
  const toggle = document.getElementById('enabledToggle');
  if (result.enabled === false) {
    toggle.classList.remove('active');
  }

  // Interval
  document.getElementById('intervalInput').value = result.intervalMinutes || 40;

  // Affirmation
  if (result.affirmation) {
    document.getElementById('affirmationInput').value = result.affirmation;
  }

  // Daily cost
  document.getElementById('dailyCostInput').value = result.dailyCost || 10;

  // Supplement toggle
  const suppToggle = document.getElementById('supplementToggle');
  if (result.supplementReminders === false) {
    suppToggle.classList.remove('active');
  }

  // Supplement times
  const times = result.supplementTimes || {
    morning: '08:00',
    afternoon: '14:00',
    dinner: '18:30',
    night: '21:30'
  };
  document.getElementById('timeMorning').value = times.morning;
  document.getElementById('timeAfternoon').value = times.afternoon;
  document.getElementById('timeDinner').value = times.dinner;
  document.getElementById('timeNight').value = times.night;

  // Stats
  const completedTimes = result.timesCompleted || 0;
  document.getElementById('timesCompleted').textContent = completedTimes;

  if (result.startDate) {
    const start = new Date(result.startDate);
    const now = new Date();
    const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    document.getElementById('daysClean').textContent = days;
    document.getElementById('nicotineDays').textContent = days;
    document.getElementById('alcoholDays').textContent = days;

    const dailyCost = result.dailyCost || 10;
    const saved = days * dailyCost;
    document.getElementById('moneySaved').textContent = '$' + saved;
  }

  // NoFap settings
  const nofapToggle = document.getElementById('nofapToggle');
  const nofapSection = document.getElementById('nofapSection');
  const nofapCard = document.getElementById('nofapCard');
  if (result.nofapEnabled) {
    nofapToggle.classList.add('active');
    nofapSection.style.display = 'block';
    nofapCard.style.display = 'block';
  }
  if (result.nofapAffirmation) {
    document.getElementById('nofapAffirmation').value = result.nofapAffirmation;
  }
  if (result.nofapStartDate) {
    const start = new Date(result.nofapStartDate);
    const now = new Date();
    const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    document.getElementById('nofapDays').value = days;
    document.getElementById('nofapDaysDisplay').textContent = days;
  }

  // Bedtime settings
  const bedtimeToggle = document.getElementById('bedtimeToggle');
  const bedtimeSettings = document.getElementById('bedtimeSettings');
  if (result.bedtimeEnabled) {
    bedtimeToggle.classList.add('active');
    bedtimeSettings.style.display = 'block';
  }
  if (result.bedtimeHour !== undefined) {
    const hour = result.bedtimeHour.toString().padStart(2, '0');
    const minute = (result.bedtimeMinute || 0).toString().padStart(2, '0');
    document.getElementById('bedtimeInput').value = `${hour}:${minute}`;
  }
  if (result.wakeHour !== undefined) {
    const hour = result.wakeHour.toString().padStart(2, '0');
    const minute = (result.wakeMinute || 0).toString().padStart(2, '0');
    document.getElementById('wakeTimeInput').value = `${hour}:${minute}`;
  }
  if (result.blockedSites) {
    document.getElementById('blockedSitesInput').value = result.blockedSites.join('\n');
  }

  // Time limits settings
  const timeLimitToggle = document.getElementById('timeLimitToggle');
  const timeLimitSettings = document.getElementById('timeLimitSettings');
  if (result.timeLimitsEnabled) {
    timeLimitToggle.classList.add('active');
    timeLimitSettings.style.display = 'block';
  }
  if (result.timeLimits) {
    renderTimeLimits(result.timeLimits);
  }
});

// Toggle enabled
document.getElementById('enabledToggle').addEventListener('click', function() {
  this.classList.toggle('active');
});

// Toggle supplement reminders
document.getElementById('supplementToggle').addEventListener('click', function() {
  this.classList.toggle('active');
});

// Toggle nofap
document.getElementById('nofapToggle').addEventListener('click', function() {
  this.classList.toggle('active');
  const isActive = this.classList.contains('active');
  document.getElementById('nofapSection').style.display = isActive ? 'block' : 'none';
  document.getElementById('nofapCard').style.display = isActive ? 'block' : 'none';
});

// Toggle bedtime blocker
document.getElementById('bedtimeToggle').addEventListener('click', function() {
  this.classList.toggle('active');
  const isActive = this.classList.contains('active');
  document.getElementById('bedtimeSettings').style.display = isActive ? 'block' : 'none';
});

// Toggle time limits
document.getElementById('timeLimitToggle').addEventListener('click', function() {
  this.classList.toggle('active');
  const isActive = this.classList.contains('active');
  document.getElementById('timeLimitSettings').style.display = isActive ? 'block' : 'none';
});

// Time limits management
let currentTimeLimits = {};

function renderTimeLimits(limits) {
  currentTimeLimits = limits || {};
  const container = document.getElementById('timeLimitsList');
  container.innerHTML = '';

  // Get today's usage
  chrome.storage.local.get(['siteTimeUsage'], (result) => {
    const usage = result.siteTimeUsage || {};
    const today = new Date().toDateString();

    for (const [site, minutes] of Object.entries(currentTimeLimits)) {
      // Check multiple hostname variations
      let usedSeconds = 0;
      if (usage[today]) {
        // Check exact match and www. variant
        usedSeconds = usage[today][site] || usage[today]['www.' + site] || 0;
      }
      const usedMinutes = Math.floor(usedSeconds / 60);

      const item = document.createElement('div');
      item.className = 'limit-item';
      item.innerHTML = `
        <span class="limit-site">${site}</span>
        <span class="limit-used">${usedMinutes}m used</span>
        <span class="limit-time">${minutes}m limit</span>
        <button class="limit-remove" data-site="${site}">x</button>
      `;
      container.appendChild(item);
    }

    // Add remove handlers
    container.querySelectorAll('.limit-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const site = btn.dataset.site;
        delete currentTimeLimits[site];
        // Auto-save when removing
        chrome.storage.sync.set({ timeLimits: currentTimeLimits });
        renderTimeLimits(currentTimeLimits);
      });
    });
  });
}

function saveTimeLimits() {
  chrome.storage.sync.set({
    timeLimitsEnabled: document.getElementById('timeLimitToggle').classList.contains('active'),
    timeLimits: currentTimeLimits
  });
}

// Add new time limit
document.getElementById('addLimitBtn').addEventListener('click', () => {
  const siteInput = document.getElementById('newLimitSite');
  const minutesInput = document.getElementById('newLimitMinutes');

  let site = siteInput.value.trim().toLowerCase();
  site = site.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

  const minutes = parseInt(minutesInput.value) || 30;

  if (site) {
    currentTimeLimits[site] = Math.max(1, Math.min(480, minutes));
    // Auto-save when adding
    chrome.storage.sync.set({ timeLimits: currentTimeLimits, timeLimitsEnabled: true }, () => {
      // Also make sure toggle is active
      document.getElementById('timeLimitToggle').classList.add('active');
    });
    renderTimeLimits(currentTimeLimits);
    siteInput.value = '';
    minutesInput.value = '30';
  }
});

// Refresh usage button
document.getElementById('refreshUsageBtn').addEventListener('click', () => {
  renderTimeLimits(currentTimeLimits);
});

// Reset usage button
document.getElementById('resetUsageBtn').addEventListener('click', () => {
  if (confirm('Reset all time usage for today?')) {
    const today = new Date().toDateString();
    chrome.storage.local.get(['siteTimeUsage'], (result) => {
      const usage = result.siteTimeUsage || {};
      delete usage[today];
      chrome.storage.local.set({ siteTimeUsage: usage }, () => {
        renderTimeLimits(currentTimeLimits);
      });
    });
  }
});

// Reset nofap counter
document.getElementById('resetNofapBtn').addEventListener('click', () => {
  if (confirm('Reset your NoFap streak to 0?')) {
    document.getElementById('nofapDays').value = 0;
    chrome.storage.sync.set({ nofapStartDate: new Date().toISOString() });
  }
});

// Crisis button - open chat
document.getElementById('crisisBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('crisis-chat.html') });
});

// Voice message button
document.getElementById('voiceBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('voice-message.html') });
});

// Quick tools
document.getElementById('copingBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('coping-tools.html') });
});

document.getElementById('triggerBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('trigger-log.html') });
});

document.getElementById('timerBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('coping-tools.html#timer') });
});

// Save button
document.getElementById('saveBtn').addEventListener('click', () => {
  const enabled = document.getElementById('enabledToggle').classList.contains('active');
  const interval = parseInt(document.getElementById('intervalInput').value) || 40;
  const affirmation = document.getElementById('affirmationInput').value.trim();
  const dailyCost = parseInt(document.getElementById('dailyCostInput').value) || 10;
  const supplementReminders = document.getElementById('supplementToggle').classList.contains('active');
  const supplementTimes = {
    morning: document.getElementById('timeMorning').value || '08:00',
    afternoon: document.getElementById('timeAfternoon').value || '14:00',
    dinner: document.getElementById('timeDinner').value || '18:30',
    night: document.getElementById('timeNight').value || '21:30'
  };
  const nofapEnabled = document.getElementById('nofapToggle').classList.contains('active');
  const nofapAffirmation = document.getElementById('nofapAffirmation').value.trim();
  const claudeApiKey = document.getElementById('apiKeyInput').value.trim();

  // Bedtime settings
  const bedtimeEnabled = document.getElementById('bedtimeToggle').classList.contains('active');
  const bedtimeValue = document.getElementById('bedtimeInput').value || '22:00';
  const wakeValue = document.getElementById('wakeTimeInput').value || '07:00';
  const [bedtimeHour, bedtimeMinute] = bedtimeValue.split(':').map(Number);
  const [wakeHour, wakeMinute] = wakeValue.split(':').map(Number);
  const blockedSites = document.getElementById('blockedSitesInput').value
    .split('\n')
    .map(s => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, ''))
    .filter(s => s.length > 0);

  // Time limits settings
  const timeLimitsEnabled = document.getElementById('timeLimitToggle').classList.contains('active');
  const timeLimits = currentTimeLimits;

  chrome.storage.sync.get(['startDate', 'nofapStartDate'], (result) => {
    const settings = {
      enabled: enabled,
      intervalMinutes: Math.max(5, Math.min(480, interval)),
      affirmation: affirmation || "I don't need to drink. I don't need nicotine. I am stronger than my cravings.",
      dailyCost: dailyCost,
      supplementReminders: supplementReminders,
      supplementTimes: supplementTimes,
      nofapEnabled: nofapEnabled,
      nofapAffirmation: nofapAffirmation || "I am in control of my urges. I don't need porn. My energy is better spent elsewhere.",
      claudeApiKey: claudeApiKey,
      bedtimeEnabled: bedtimeEnabled,
      bedtimeHour: bedtimeHour,
      bedtimeMinute: bedtimeMinute,
      wakeHour: wakeHour,
      wakeMinute: wakeMinute,
      blockedSites: blockedSites,
      timeLimitsEnabled: timeLimitsEnabled,
      timeLimits: timeLimits
    };

    // Set start date if not already set
    if (!result.startDate) {
      settings.startDate = new Date().toISOString();
    }

    // Set nofap start date if enabled and not set
    if (nofapEnabled && !result.nofapStartDate) {
      settings.nofapStartDate = new Date().toISOString();
    }

    chrome.storage.sync.set(settings, () => {
      document.getElementById('savedMsg').style.display = 'block';
      setTimeout(() => {
        document.getElementById('savedMsg').style.display = 'none';
      }, 2000);
    });
  });
});

// View timeline buttons
document.getElementById('viewNicotineBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('detox-timeline.html') });
});

document.getElementById('viewAlcoholBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('alcohol-timeline.html') });
});

document.getElementById('viewNofapBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('nofap-timeline.html') });
});

// View supplement schedule
document.getElementById('viewSupplementsBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('supplement-schedule.html') });
});

// View cooking guide
document.getElementById('viewCookingBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('cooking-guide.html') });
});

// Recipe chat (AI)
document.getElementById('recipeChatBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('recipe-chat.html') });
});

// Alarm clock
document.getElementById('alarmClockBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('alarm-clock.html') });
});

// Weekly scheduler
document.getElementById('weeklySchedulerBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('weekly-scheduler.html') });
});

// Daily habits
document.getElementById('dailyHabitsBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('daily-habits.html') });
});

// Reset start date
document.getElementById('resetDayBtn').addEventListener('click', () => {
  if (confirm('Reset your start date to today? This will reset your days counter.')) {
    chrome.storage.sync.set({ startDate: new Date().toISOString() }, () => {
      document.getElementById('daysClean').textContent = '0';
      document.getElementById('moneySaved').textContent = '$0';
    });
  }
});

// Reset all data
document.getElementById('resetAllLink').addEventListener('click', () => {
  if (confirm('This will erase all your progress. Are you sure?')) {
    chrome.storage.sync.clear(() => {
      chrome.storage.sync.set({
        enabled: true,
        intervalMinutes: 40,
        affirmation: "I don't need to drink. I don't need nicotine. I am stronger than my cravings.",
        startDate: new Date().toISOString(),
        timesCompleted: 0,
        dailyCost: 10
      }, () => {
        window.location.reload();
      });
    });
  }
});
