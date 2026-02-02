// Background service worker for timer functionality
console.log('=== BACKGROUND SCRIPT LOADED ===');

// Default supplement times
const DEFAULT_SUPPLEMENT_TIMES = {
  morning: '08:00',
  afternoon: '14:00',
  dinner: '18:30',
  night: '21:30'
};

// Set up alarm when extension loads
chrome.runtime.onInstalled.addListener(() => {
  // Default settings
  chrome.storage.sync.get(['intervalMinutes', 'affirmation', 'enabled', 'supplementReminders', 'supplementTimes'], (result) => {
    if (!result.intervalMinutes) {
      chrome.storage.sync.set({ intervalMinutes: 40 });
    }
    if (!result.affirmation) {
      chrome.storage.sync.set({
        affirmation: "I don't need to drink. I don't need nicotine. I am stronger than my cravings."
      });
    }
    if (result.enabled === undefined) {
      chrome.storage.sync.set({ enabled: true });
    }
    if (result.supplementReminders === undefined) {
      chrome.storage.sync.set({ supplementReminders: true });
    }
    if (!result.supplementTimes) {
      chrome.storage.sync.set({ supplementTimes: DEFAULT_SUPPLEMENT_TIMES });
    }

    // Start the alarms
    startAlarm();
    scheduleSupplementAlarms();
  });
});

function startAlarm() {
  chrome.storage.sync.get(['intervalMinutes', 'enabled'], (result) => {
    chrome.alarms.clear('reminderAlarm');

    if (result.enabled !== false) {
      chrome.alarms.create('reminderAlarm', {
        delayInMinutes: result.intervalMinutes || 40,
        periodInMinutes: result.intervalMinutes || 40
      });
    }
  });
}

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'reminderAlarm') {
    chrome.storage.sync.get(['enabled'], (result) => {
      if (result.enabled !== false) {
        // Set flag that reminder is due
        chrome.storage.sync.set({ reminderDue: true });

        // Open reminder page
        chrome.tabs.create({ url: 'reminder.html' });
      }
    });
  }

  // Handle supplement reminders
  if (alarm.name.startsWith('supplement-')) {
    chrome.storage.sync.get(['supplementReminders'], (result) => {
      if (result.supplementReminders !== false) {
        // Handle snooze alarms (supplement-morning-snooze)
        let slot = alarm.name.replace('supplement-', '');
        if (slot.endsWith('-snooze')) {
          slot = slot.replace('-snooze', '');
        }
        chrome.tabs.create({ url: `supplement-reminder.html?slot=${slot}` });
      }
    });
  }

  // Handle delayed supplement reminders (after timing conflicts)
  if (alarm.name.startsWith('delayed-supplement-')) {
    chrome.storage.local.get(['pendingSupplementReminders'], (result) => {
      const reminders = result.pendingSupplementReminders || [];
      const reminder = reminders.find(r => r.alarmName === alarm.name);

      if (reminder) {
        // Open a special reminder page for the delayed supplement
        const params = new URLSearchParams({
          type: 'delayed',
          taken: reminder.takenSupplement,
          supplements: reminder.conflictingSupplements,
          message: reminder.message
        });
        chrome.tabs.create({ url: `supplement-reminder.html?${params.toString()}` });

        // Remove this reminder from the list
        const updatedReminders = reminders.filter(r => r.alarmName !== alarm.name);
        chrome.storage.local.set({ pendingSupplementReminders: updatedReminders });
      }
    });
  }
});

// Schedule supplement alarms based on set times
function scheduleSupplementAlarms() {
  chrome.storage.sync.get(['supplementReminders', 'supplementTimes'], (result) => {
    // Clear existing supplement alarms
    chrome.alarms.clear('supplement-morning');
    chrome.alarms.clear('supplement-afternoon');
    chrome.alarms.clear('supplement-dinner');
    chrome.alarms.clear('supplement-night');

    if (result.supplementReminders === false) return;

    const times = result.supplementTimes || DEFAULT_SUPPLEMENT_TIMES;
    const now = new Date();

    ['morning', 'afternoon', 'dinner', 'night'].forEach(slot => {
      const [hours, minutes] = times[slot].split(':').map(Number);

      // Calculate when this alarm should fire
      let alarmTime = new Date();
      alarmTime.setHours(hours, minutes, 0, 0);

      // If time already passed today, schedule for tomorrow
      if (alarmTime <= now) {
        alarmTime.setDate(alarmTime.getDate() + 1);
      }

      chrome.alarms.create(`supplement-${slot}`, {
        when: alarmTime.getTime(),
        periodInMinutes: 24 * 60 // Repeat daily
      });
    });
  });
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.intervalMinutes || changes.enabled) {
    startAlarm();
  }
  if (changes.supplementReminders || changes.supplementTimes) {
    scheduleSupplementAlarms();
  }
  if (changes.bedtimeEnabled || changes.bedtimeHour || changes.bedtimeMinute || changes.blockedSites) {
    // Bedtime settings changed, recheck current tabs
    checkBedtimeBlocking();
  }
});

// ========== TIME LIMITS ==========

let activeTabId = null;
let activeTabUrl = null;
let lastActiveTime = null;

// Initialize time tracking
function initTimeTracking() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      activeTabId = tabs[0].id;
      activeTabUrl = tabs[0].url;
      lastActiveTime = Date.now();
      console.log('Time tracking initialized for:', activeTabUrl);
    }
  });
}

// Initialize on install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated - initializing time tracking');
  initTimeTracking();
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started - initializing time tracking');
  initTimeTracking();
});

// Also initialize immediately (for when service worker wakes up)
initTimeTracking();

// Get hostname from URL
function getHostname(url) {
  try {
    return new URL(url).hostname.replace('www.', '').toLowerCase();
  } catch {
    return null;
  }
}

// Record time spent on current site
function recordTimeSpent() {
  if (!activeTabUrl || !lastActiveTime) {
    console.log('No active tab or time to record');
    return;
  }

  // Skip extension pages
  if (activeTabUrl.startsWith('chrome://') || activeTabUrl.startsWith('chrome-extension://')) {
    lastActiveTime = Date.now();
    return;
  }

  const hostname = getHostname(activeTabUrl);
  if (!hostname) {
    console.log('Could not get hostname from:', activeTabUrl);
    return;
  }

  const now = Date.now();
  const secondsSpent = Math.floor((now - lastActiveTime) / 1000);
  lastActiveTime = now;

  // Skip if no time or negative
  if (secondsSpent <= 0) return;

  // Cap at 2 minutes per recording (in case of long gaps)
  const recordedSeconds = Math.min(secondsSpent, 120);

  const today = new Date().toDateString();

  chrome.storage.local.get(['siteTimeUsage'], (result) => {
    const usage = result.siteTimeUsage || {};

    if (!usage[today]) {
      usage[today] = {};
      // Clean up old days (keep only last 7 days)
      const dates = Object.keys(usage);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      for (const date of dates) {
        if (new Date(date) < weekAgo) {
          delete usage[date];
        }
      }
    }

    const oldTime = usage[today][hostname] || 0;
    usage[today][hostname] = oldTime + recordedSeconds;

    console.log(`Recorded ${recordedSeconds}s on ${hostname}, total: ${usage[today][hostname]}s`);

    chrome.storage.local.set({ siteTimeUsage: usage });

    // Check if limit exceeded
    checkTimeLimit(hostname, usage[today][hostname]);
  });
}

// Check if time limit is exceeded for a site
function checkTimeLimit(hostname, secondsUsed) {
  chrome.storage.sync.get(['timeLimitsEnabled', 'timeLimits'], (result) => {
    if (!result.timeLimitsEnabled || !result.timeLimits) {
      console.log('Time limits not enabled or no limits set');
      return;
    }

    console.log('Checking limits for', hostname, '- used:', secondsUsed, 'seconds');
    console.log('Limits:', result.timeLimits);

    // Check if this hostname matches any limited site
    for (const [site, limitMinutes] of Object.entries(result.timeLimits)) {
      if (hostname === site || hostname.endsWith('.' + site)) {
        const limitSeconds = limitMinutes * 60;
        console.log(`Matched ${site}: ${secondsUsed}/${limitSeconds} seconds`);

        if (secondsUsed >= limitSeconds) {
          console.log('LIMIT EXCEEDED! Blocking...');
          // Limit exceeded - redirect active tab
          if (activeTabId) {
            chrome.tabs.update(activeTabId, {
              url: chrome.runtime.getURL(`time-limit.html?site=${encodeURIComponent(site)}&limit=${limitMinutes}`)
            });
          }
        }
        break;
      }
    }
  });
}

// Check if a site is over its limit before allowing navigation
async function isSiteOverLimit(url) {
  const hostname = getHostname(url);
  if (!hostname) return false;

  return new Promise((resolve) => {
    chrome.storage.sync.get(['timeLimitsEnabled', 'timeLimits'], (syncResult) => {
      if (!syncResult.timeLimitsEnabled || !syncResult.timeLimits) {
        resolve(false);
        return;
      }

      // Find matching limit
      let matchedSite = null;
      let limitMinutes = null;

      for (const [site, minutes] of Object.entries(syncResult.timeLimits)) {
        if (hostname === site || hostname.endsWith('.' + site)) {
          matchedSite = site;
          limitMinutes = minutes;
          break;
        }
      }

      if (!matchedSite) {
        resolve(false);
        return;
      }

      // Check usage
      const today = new Date().toDateString();
      chrome.storage.local.get(['siteTimeUsage'], (localResult) => {
        const usage = localResult.siteTimeUsage || {};
        const secondsUsed = (usage[today] && usage[today][hostname]) || 0;

        if (secondsUsed >= limitMinutes * 60) {
          resolve({ site: matchedSite, limit: limitMinutes });
        } else {
          resolve(false);
        }
      });
    });
  });
}

// Track active tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('Tab activated:', activeInfo.tabId);
  recordTimeSpent(); // Record time on previous tab

  activeTabId = activeInfo.tabId;

  chrome.tabs.get(activeTabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.log('Error getting tab:', chrome.runtime.lastError);
      return;
    }

    activeTabUrl = tab.url;
    lastActiveTime = Date.now();
    console.log('Now tracking:', activeTabUrl);

    // Check if this site is already over limit
    if (activeTabUrl && !activeTabUrl.startsWith('chrome')) {
      isSiteOverLimit(activeTabUrl).then((result) => {
        if (result) {
          chrome.tabs.update(activeTabId, {
            url: chrome.runtime.getURL(`time-limit.html?site=${encodeURIComponent(result.site)}&limit=${result.limit}`)
          });
        }
      });
    }
  });
});

// Track tab URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Track URL changes on active tab
  if (tabId === activeTabId && changeInfo.url) {
    console.log('URL changed on active tab:', changeInfo.url);
    recordTimeSpent(); // Record time on previous URL
    activeTabUrl = changeInfo.url;
    lastActiveTime = Date.now();

    // Check if new URL is over limit
    if (activeTabUrl && !activeTabUrl.startsWith('chrome')) {
      isSiteOverLimit(activeTabUrl).then((result) => {
        if (result) {
          chrome.tabs.update(tabId, {
            url: chrome.runtime.getURL(`time-limit.html?site=${encodeURIComponent(result.site)}&limit=${result.limit}`)
          });
        }
      });
    }
  }

  // Also update if this becomes the active tab with a complete status
  if (changeInfo.status === 'complete' && tab.active) {
    activeTabId = tabId;
    activeTabUrl = tab.url;
    if (!lastActiveTime) {
      lastActiveTime = Date.now();
    }
  }
});

// Record time periodically (minimum is 1 minute for Chrome alarms)
chrome.alarms.create('recordTime', { periodInMinutes: 1 });

// Also add to existing alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'recordTime') {
    recordTimeSpent();
  }
});

// Track window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus - record time
    recordTimeSpent();
  } else {
    // Browser gained focus - reset timer
    lastActiveTime = Date.now();
  }
});

// Handle messages from extension pages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'calculateTravelTime') {
    const { origin, destination, apiKey, departureTime } = request;
    let url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=driving&key=${apiKey}`;

    // Add departure time for traffic prediction
    if (departureTime) {
      url += `&departure_time=${departureTime}`;
    } else {
      url += `&departure_time=now`;
    }

    console.log('Background: Fetching URL:', url);

    fetch(url)
      .then(response => {
        console.log('Background: Got response, status:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('Background: Parsed data:', data);
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.log('Background: Fetch error:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep the message channel open for async response
  }

  // Handle delayed supplement reminder scheduling
  if (request.type === 'scheduleDelayedSupplement') {
    const { takenSupplement, conflictingSupplements, delayMinutes, message } = request;
    const alarmName = `delayed-supplement-${Date.now()}`;

    // Store the reminder details
    chrome.storage.local.get(['pendingSupplementReminders'], (result) => {
      const reminders = result.pendingSupplementReminders || [];
      reminders.push({
        alarmName: alarmName,
        takenSupplement: takenSupplement,
        conflictingSupplements: conflictingSupplements,
        message: message,
        scheduledFor: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()
      });
      chrome.storage.local.set({ pendingSupplementReminders: reminders });
    });

    // Chrome alarms require minimum 1 minute
    const actualDelay = Math.max(1, delayMinutes);
    chrome.alarms.create(alarmName, {
      delayInMinutes: actualDelay
    });

    console.log(`Scheduled delayed supplement reminder: ${alarmName} in ${actualDelay} minutes`);
    sendResponse({ success: true, alarmName: alarmName });
    return true;
  }
});

// ========== BEDTIME BLOCKER ==========

// Default sites to block after bedtime
const DEFAULT_BLOCKED_SITES = [
  'youtube.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'reddit.com',
  'twitch.tv',
  'netflix.com',
  'hulu.com',
  'disneyplus.com',
  'hbomax.com',
  'primevideo.com',
  'movies.do',
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'xhamster.com',
  'chaturbate.com',
  'onlyfans.com'
];

// Get blocked sites from storage or use defaults
function getBlockedSites() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['blockedSites'], (result) => {
      resolve(result.blockedSites || DEFAULT_BLOCKED_SITES);
    });
  });
}

// Check if current time is past bedtime
function isPastBedtime() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['bedtimeEnabled', 'bedtimeHour', 'bedtimeMinute', 'wakeHour', 'wakeMinute'], (result) => {
      console.log('Bedtime settings:', result);

      if (!result.bedtimeEnabled) {
        console.log('Bedtime blocker is DISABLED');
        resolve(false);
        return;
      }

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      const bedtimeHour = result.bedtimeHour || 22; // Default 10 PM
      const bedtimeMinute = result.bedtimeMinute || 0;
      const bedtime = bedtimeHour * 60 + bedtimeMinute;

      const wakeHour = result.wakeHour || 7; // Default 7 AM
      const wakeMinute = result.wakeMinute || 0;
      const wakeTime = wakeHour * 60 + wakeMinute;

      // Handle overnight bedtime (e.g., 10 PM to 7 AM)
      if (bedtime > wakeTime) {
        // Bedtime is at night, wake is in morning
        resolve(currentTime >= bedtime || currentTime < wakeTime);
      } else {
        // Edge case: bedtime and wake on same side of midnight
        resolve(currentTime >= bedtime && currentTime < wakeTime);
      }
    });
  });
}

// Check if override is active
function hasActiveOverride() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['bedtimeOverrideExpires'], (result) => {
      if (result.bedtimeOverrideExpires && result.bedtimeOverrideExpires > Date.now()) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

// Check if URL is a blocked site
async function isBlockedSite(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '').toLowerCase();
    const blockedSites = await getBlockedSites();
    return blockedSites.some(site => hostname === site || hostname.endsWith('.' + site));
  } catch {
    return false;
  }
}

// Block a tab if needed
async function checkAndBlockTab(tabId, url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return;
  }

  const blocked = await isBlockedSite(url);
  if (!blocked) {
    return;
  }

  console.log('Blocked site detected:', url);

  const pastBedtime = await isPastBedtime();
  console.log('Past bedtime?', pastBedtime);

  if (!pastBedtime) {
    return;
  }

  const hasOverride = await hasActiveOverride();
  if (hasOverride) {
    console.log('Override active, allowing access');
    return;
  }

  // Block this tab
  console.log('BLOCKING TAB:', url);
  const blockedUrl = encodeURIComponent(url);
  chrome.tabs.update(tabId, {
    url: chrome.runtime.getURL(`bedtime-block.html?url=${blockedUrl}`)
  });
}

// Check all current tabs for bedtime blocking
async function checkBedtimeBlocking() {
  const pastBedtime = await isPastBedtime();
  if (!pastBedtime) return;

  const hasOverride = await hasActiveOverride();
  if (hasOverride) return;

  const blockedSites = await getBlockedSites();

  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.url) {
        try {
          const hostname = new URL(tab.url).hostname.replace('www.', '').toLowerCase();
          const isBlocked = blockedSites.some(site => hostname === site || hostname.endsWith('.' + site));
          if (isBlocked) {
            const blockedUrl = encodeURIComponent(tab.url);
            chrome.tabs.update(tab.id, {
              url: chrome.runtime.getURL(`bedtime-block.html?url=${blockedUrl}`)
            });
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }
  });
}

// Listen for tab updates - check on URL change AND when page starts loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check when URL changes
  if (changeInfo.url) {
    checkAndBlockTab(tabId, changeInfo.url);
  }
  // Also check when page starts loading (catches more cases)
  if (changeInfo.status === 'loading' && tab.url) {
    checkAndBlockTab(tabId, tab.url);
  }
});

// Listen for new tabs
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.pendingUrl) {
    checkAndBlockTab(tab.id, tab.pendingUrl);
  } else if (tab.url) {
    checkAndBlockTab(tab.id, tab.url);
  }
});

// Also listen for tab activation (switching tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      checkAndBlockTab(tab.id, tab.url);
    }
  });
});

// Initialize bedtime blocker on startup
function initBedtimeBlocker() {
  console.log('Initializing bedtime blocker...');

  // Check settings first
  chrome.storage.sync.get(['bedtimeEnabled', 'bedtimeHour', 'bedtimeMinute'], (result) => {
    console.log('Bedtime blocker enabled:', result.bedtimeEnabled);
    console.log('Bedtime set to:', result.bedtimeHour + ':' + (result.bedtimeMinute || '00'));
  });

  // Create alarm for periodic checks
  chrome.alarms.create('bedtimeCheck', { periodInMinutes: 1 });

  // Run immediate check after a short delay
  setTimeout(() => {
    console.log('Running initial bedtime check...');
    checkBedtimeBlocking();
  }, 2000);
}

// Run on service worker start
initBedtimeBlocker();

// Also run on browser startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started - checking bedtime...');
  initBedtimeBlocker();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'bedtimeCheck') {
    checkBedtimeBlocking();
  }
});
