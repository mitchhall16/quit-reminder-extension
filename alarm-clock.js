let alarmEnabled = false;
let alarmHour = 7;
let alarmMinute = 0;
let isPM = false;
let isRinging = false;
let snoozesRemaining = 2;
let audioContext = null;
let alarmInterval = null;
let recognition = null;
let wakeupMode = 'affirmation'; // 'affirmation', 'motivation', or 'outside'
let affirmationText = "I don't need to drink. I don't need nicotine. I am stronger than my cravings.";
let currentMotivation = "";

// Outside mode variables
let requiredDistance = 10; // meters
let bedLocation = null; // {lat, lng}
let locationWatchId = null;

// Phone pairing variables
let mqttClient = null;
let roomCode = '';
let phoneConnected = false;

const motivationalQuotes = [
  "Today I choose to be stronger than my excuses.",
  "I am in control of my choices and my life.",
  "Every day I am becoming a better version of myself.",
  "I have the power to create positive change.",
  "My past does not define my future.",
  "I am worthy of a healthy and happy life.",
  "I choose progress over perfection.",
  "My strength is greater than any struggle.",
  "I am building the life I deserve.",
  "Today is a new opportunity to grow.",
  "I am proud of how far I have come.",
  "I will not let temporary feelings make permanent decisions.",
  "My discipline today creates my freedom tomorrow.",
  "I am stronger than any craving or temptation.",
  "I choose long-term success over short-term pleasure.",
  "Every small step forward is still progress.",
  "I believe in my ability to change.",
  "I am committed to my health and wellbeing.",
  "The best time to start was yesterday. The second best time is now.",
  "I am not my addiction. I am so much more.",
  "I deserve to wake up without regret.",
  "My future self is thanking me for the choices I make today.",
  "I am brave enough to face another day.",
  "Pain is temporary but quitting lasts forever.",
  "I will make myself proud today."
];

// DOM elements
const currentTimeEl = document.getElementById('currentTime');
const currentDateEl = document.getElementById('currentDate');
const alarmHourInput = document.getElementById('alarmHour');
const alarmMinuteInput = document.getElementById('alarmMinute');
const amBtn = document.getElementById('amBtn');
const pmBtn = document.getElementById('pmBtn');
const alarmToggle = document.getElementById('alarmToggle');
const alarmStatus = document.getElementById('alarmStatus');
const alarmTimeDisplay = document.getElementById('alarmTimeDisplay');
const alarmRinging = document.getElementById('alarmRinging');
const ringingTime = document.getElementById('ringingTime');
const affirmationToSay = document.getElementById('affirmationToSay');
const heardText = document.getElementById('heardText');
const matchProgress = document.getElementById('matchProgress');
const snoozeBtn = document.getElementById('snoozeBtn');
const snoozeCount = document.getElementById('snoozeCount');
const alarmSuccess = document.getElementById('alarmSuccess');

// Storage helper - works both as extension and standalone webpage
const storage = {
  get: function(keys, callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(keys, callback);
    } else {
      // Fallback to localStorage
      const result = {};
      keys.forEach(key => {
        const val = localStorage.getItem(key);
        if (val) result[key] = JSON.parse(val);
      });
      callback(result);
    }
  },
  set: function(data) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(data);
    } else {
      // Fallback to localStorage
      Object.keys(data).forEach(key => {
        localStorage.setItem(key, JSON.stringify(data[key]));
      });
    }
  },
  getLocal: function(keys, callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(keys, callback);
    } else {
      const result = {};
      keys.forEach(key => {
        const val = localStorage.getItem(key);
        if (val) result[key] = JSON.parse(val);
      });
      callback(result);
    }
  }
};

// Load affirmation from storage
storage.get(['affirmation'], (result) => {
  if (result.affirmation) {
    affirmationText = result.affirmation;
  }
});

// Mode selection
document.querySelectorAll('.mode-option').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    wakeupMode = btn.dataset.mode;

    // Show/hide mode-specific settings
    const outsideSettings = document.getElementById('outsideSettings');
    const phoneSettings = document.getElementById('phoneSettings');

    outsideSettings.style.display = 'none';
    phoneSettings.style.display = 'none';

    if (wakeupMode === 'outside') {
      outsideSettings.style.display = 'block';
      if (alarmEnabled) {
        captureBedLocation();
      }
    } else if (wakeupMode === 'phone') {
      phoneSettings.style.display = 'block';
      generateRoomCode();
      connectMQTT();
      // Also capture bed location for phone mode
      captureBedLocation();
    } else {
      // Disconnect MQTT if switching away from phone mode
      disconnectMQTT();
    }

    saveAlarmSettings();
  });
});

// Distance option selection
document.querySelectorAll('.distance-option').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.distance-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    requiredDistance = parseInt(btn.dataset.distance);
    saveAlarmSettings();
  });
});

// Geolocation functions
function captureBedLocation() {
  const locStatusText = document.getElementById('locStatusText');
  const locationStatus = document.getElementById('locationStatus');

  if (!navigator.geolocation) {
    locStatusText.textContent = 'Geolocation not supported by browser';
    return;
  }

  locStatusText.textContent = 'Getting your location...';

  navigator.geolocation.getCurrentPosition(
    (position) => {
      bedLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      locStatusText.textContent = `Bed location set! (accuracy: ${Math.round(position.coords.accuracy)}m)`;
      locationStatus.classList.add('set');
      saveAlarmSettings();
    },
    (error) => {
      locStatusText.textContent = `Location error: ${error.message}. Try enabling location permissions.`;
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  // Haversine formula
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

function startLocationTracking() {
  if (!navigator.geolocation || !bedLocation) {
    document.getElementById('gpsStatusText').textContent = 'Location not available';
    return;
  }

  locationWatchId = navigator.geolocation.watchPosition(
    (position) => {
      const currentLat = position.coords.latitude;
      const currentLng = position.coords.longitude;
      const distance = calculateDistance(bedLocation.lat, bedLocation.lng, currentLat, currentLng);

      updateDistanceDisplay(distance);

      // Check if far enough
      if (distance >= requiredDistance) {
        stopAlarm(true);
      }
    },
    (error) => {
      document.getElementById('gpsStatusText').textContent = `GPS error: ${error.message}`;
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  );
}

function stopLocationTracking() {
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  }
}

function updateDistanceDisplay(distance) {
  const distanceEl = document.getElementById('currentDistance');
  const progressEl = document.getElementById('distanceProgress');
  const gpsStatus = document.getElementById('gpsStatusText');

  const distanceRounded = Math.round(distance);
  distanceEl.textContent = `${distanceRounded}m`;

  // Update color based on progress
  const progress = Math.min(100, (distance / requiredDistance) * 100);
  progressEl.style.width = progress + '%';

  if (progress >= 100) {
    distanceEl.classList.remove('close');
    distanceEl.classList.add('success');
  } else if (progress >= 50) {
    distanceEl.classList.add('close');
    distanceEl.classList.remove('success');
  } else {
    distanceEl.classList.remove('close', 'success');
  }

  const remaining = Math.max(0, requiredDistance - distanceRounded);
  gpsStatus.textContent = remaining > 0 ? `${remaining}m more to go!` : 'You made it!';
}

// ==========================================
// PHONE PAIRING / MQTT FUNCTIONS
// ==========================================

function generateRoomCode() {
  // Check if we have a saved code first
  const savedCode = localStorage.getItem('alarmRoomCode');
  if (savedCode) {
    roomCode = savedCode;
  } else {
    // Generate new 4-digit code
    roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    localStorage.setItem('alarmRoomCode', roomCode);
  }
  document.getElementById('roomCode').textContent = roomCode;
  console.log('Room code:', roomCode);
  return roomCode;
}

function resetRoomCode() {
  // Force generate a new code
  roomCode = Math.floor(1000 + Math.random() * 9000).toString();
  localStorage.setItem('alarmRoomCode', roomCode);
  document.getElementById('roomCode').textContent = roomCode;
  console.log('New room code:', roomCode);
  // Reconnect with new code
  disconnectMQTT();
  connectMQTT();
  return roomCode;
}

function connectMQTT() {
  if (mqttClient && mqttClient.connected) {
    console.log('Already connected to MQTT');
    return; // Already connected
  }

  const phoneStatusText = document.getElementById('phoneStatusText');
  const phoneStatus = document.getElementById('phoneStatus');

  if (!roomCode) {
    generateRoomCode();
  }

  phoneStatusText.textContent = 'Connecting to server...';
  console.log('Connecting to MQTT with room code:', roomCode);

  const clientId = 'computer_' + Math.random().toString(16).substr(2, 8);

  mqttClient = mqtt.connect('wss://broker.hivemq.com:8884/mqtt', {
    clientId: clientId,
    keepalive: 60,
    clean: true,
    reconnectPeriod: 5000
  });

  mqttClient.on('connect', () => {
    console.log('MQTT connected!');
    const topic = `wakeupalarm/${roomCode}`;
    console.log('Subscribing to topic:', topic);

    mqttClient.subscribe(topic, (err) => {
      if (err) {
        console.error('Subscribe error:', err);
        phoneStatusText.textContent = 'Connection error. Try refreshing.';
        return;
      }
      console.log('Subscribed successfully');
      phoneStatusText.textContent = 'Ready! Waiting for phone to connect... (Code: ' + roomCode + ')';
    });
  });

  mqttClient.on('message', (topic, message) => {
    console.log('Received message on topic:', topic);
    try {
      const data = JSON.parse(message.toString());
      handlePhoneMessage(data);
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  });

  mqttClient.on('error', (err) => {
    console.error('MQTT error:', err);
    phoneStatusText.textContent = 'Connection error - retrying...';
  });

  mqttClient.on('close', () => {
    console.log('MQTT connection closed');
    if (phoneStatusText) {
      phoneStatusText.textContent = 'Disconnected - reconnecting...';
    }
  });

  mqttClient.on('reconnect', () => {
    console.log('MQTT reconnecting...');
  });
}

function disconnectMQTT() {
  if (mqttClient) {
    mqttClient.end();
    mqttClient = null;
  }
  phoneConnected = false;
}

function sendToPhone(data) {
  console.log('sendToPhone called:', data, 'roomCode:', roomCode, 'connected:', mqttClient?.connected);

  if (!roomCode) {
    console.error('No room code!');
    return;
  }

  if (!mqttClient || !mqttClient.connected) {
    console.error('MQTT not connected, reconnecting...');
    connectMQTT();
    // Retry after connection
    setTimeout(() => sendToPhone(data), 2000);
    return;
  }

  const topic = `wakeupalarm/${roomCode}`;
  console.log('Publishing to topic:', topic);
  mqttClient.publish(topic, JSON.stringify(data), {}, (err) => {
    if (err) {
      console.error('Publish error:', err);
    } else {
      console.log('Message sent successfully');
    }
  });
}

function handlePhoneMessage(data) {
  console.log('Received from phone:', data);

  const phoneStatusText = document.getElementById('phoneStatusText');
  const phoneStatus = document.getElementById('phoneStatus');

  switch (data.type) {
    case 'phone_joined':
      phoneConnected = true;
      phoneStatusText.textContent = 'Phone connected! ✓';
      phoneStatus.classList.add('connected');

      // If alarm is already ringing, tell phone immediately
      if (isRinging) {
        sendToPhone({
          type: 'alarm_status',
          ringing: true,
          bedLocation: bedLocation,
          targetDistance: requiredDistance,
          timestamp: Date.now()
        });
      }
      break;

    case 'request_status':
      // Phone is asking if alarm is ringing (phone just woke up)
      console.log('Phone requesting status, isRinging:', isRinging);
      if (isRinging) {
        sendToPhone({
          type: 'alarm_status',
          ringing: true,
          bedLocation: bedLocation,
          targetDistance: requiredDistance,
          timestamp: Date.now()
        });
      }
      break;

    case 'location_update':
      // Phone sent location update while alarm is ringing
      if (isRinging) {
        updatePhoneDistanceDisplay(data.distance);
      }
      break;

    case 'dismiss_alarm':
      // Phone says user went outside far enough
      if (isRinging) {
        stopAlarm(true);
      }
      break;

    case 'pong':
      // Keep-alive response
      break;
  }
}

function updatePhoneDistanceDisplay(distance) {
  const phoneDistanceEl = document.getElementById('phoneDistance');
  const phoneProgressEl = document.getElementById('phoneDistanceProgress');
  const phoneStatusEl = document.getElementById('phoneTrackingStatus');

  if (phoneDistanceEl) {
    phoneDistanceEl.textContent = Math.round(distance);
  }

  if (phoneProgressEl) {
    const progress = Math.min(100, (distance / requiredDistance) * 100);
    phoneProgressEl.style.width = progress + '%';
  }

  if (phoneStatusEl) {
    const remaining = Math.max(0, requiredDistance - distance);
    phoneStatusEl.textContent = remaining > 0
      ? `${Math.round(remaining)}m more to go!`
      : 'Almost there!';
  }
}

function getTextToSay() {
  // Pick a random motivation
  currentMotivation = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

  if (wakeupMode === 'affirmation') {
    return affirmationText;
  } else if (wakeupMode === 'motivation') {
    return currentMotivation;
  } else {
    // Both - combine them
    return affirmationText + " " + currentMotivation;
  }
}

// Load saved alarm settings
storage.getLocal(['alarmSettings'], (result) => {
  if (result.alarmSettings) {
    const settings = result.alarmSettings;
    alarmHour = settings.hour;
    alarmMinute = settings.minute;
    isPM = settings.isPM;
    alarmEnabled = settings.enabled;
    wakeupMode = settings.wakeupMode || 'affirmation';
    requiredDistance = settings.requiredDistance || 10;
    bedLocation = settings.bedLocation || null;

    alarmHourInput.value = alarmHour;
    alarmMinuteInput.value = alarmMinute.toString().padStart(2, '0');

    if (isPM) {
      pmBtn.classList.add('active');
      amBtn.classList.remove('active');
    }

    // Set mode button
    document.querySelectorAll('.mode-option').forEach(b => b.classList.remove('active'));
    const modeBtn = document.querySelector(`.mode-option[data-mode="${wakeupMode}"]`);
    if (modeBtn) modeBtn.classList.add('active');

    // Set distance button
    document.querySelectorAll('.distance-option').forEach(b => b.classList.remove('active'));
    const distBtn = document.querySelector(`.distance-option[data-distance="${requiredDistance}"]`);
    if (distBtn) distBtn.classList.add('active');

    // Show mode-specific settings
    if (wakeupMode === 'outside') {
      document.getElementById('outsideSettings').style.display = 'block';
      if (bedLocation) {
        document.getElementById('locStatusText').textContent = 'Bed location saved ✓';
        document.getElementById('locationStatus').classList.add('set');
      }
    } else if (wakeupMode === 'phone') {
      document.getElementById('phoneSettings').style.display = 'block';
      // Generate new room code and connect
      generateRoomCode();
      connectMQTT();
      if (bedLocation) {
        // Capture fresh location for accuracy
        captureBedLocation();
      }
    }

    if (alarmEnabled) {
      alarmToggle.classList.add('active');
      alarmStatus.classList.add('active');
      updateAlarmDisplay();
    }
  }
});

// Update current time every second
function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12 || 12;

  currentTimeEl.textContent =
    `${hours}:${minutes.toString().padStart(2, '0')}`;

  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  currentDateEl.textContent = now.toLocaleDateString('en-US', options);

  // Check if alarm should ring
  if (alarmEnabled && !isRinging) {
    checkAlarm(now);
  }
}

function checkAlarm(now) {
  let alarmHour24 = alarmHour;
  if (isPM && alarmHour !== 12) alarmHour24 += 12;
  if (!isPM && alarmHour === 12) alarmHour24 = 0;

  if (now.getHours() === alarmHour24 &&
      now.getMinutes() === alarmMinute &&
      now.getSeconds() === 0) {
    triggerAlarm();
  }
}

function triggerAlarm() {
  isRinging = true;
  alarmRinging.classList.add('active');

  const now = new Date();
  let hours = now.getHours() % 12 || 12;
  ringingTime.textContent = `${hours}:${now.getMinutes().toString().padStart(2, '0')}`;

  // Start alarm sound
  playAlarmSound();

  // Show appropriate UI based on mode
  const speechUI = document.getElementById('speechModeUI');
  const outsideUI = document.getElementById('outsideModeUI');
  const phoneUI = document.getElementById('phoneModeUI');

  // Hide all first
  speechUI.style.display = 'none';
  outsideUI.style.display = 'none';
  phoneUI.style.display = 'none';

  if (wakeupMode === 'outside') {
    // Local GPS outside mode
    outsideUI.style.display = 'block';
    document.getElementById('targetDistanceDisplay').textContent = requiredDistance;
    document.getElementById('currentDistance').textContent = '0m';
    document.getElementById('distanceProgress').style.width = '0%';
    startLocationTracking();

  } else if (wakeupMode === 'phone') {
    // Phone mode - send message to phone
    phoneUI.style.display = 'block';
    document.getElementById('phoneTarget').textContent = requiredDistance;
    document.getElementById('phoneDistance').textContent = '0';
    document.getElementById('phoneDistanceProgress').style.width = '0%';

    // Tell phone the alarm is ringing
    sendToPhone({
      type: 'alarm_ringing',
      bedLocation: bedLocation,
      targetDistance: requiredDistance,
      timestamp: Date.now()
    });

  } else {
    // Speech mode (affirmation or motivation)
    speechUI.style.display = 'block';
    const textToSay = getTextToSay();
    affirmationToSay.textContent = textToSay;
    startListening();
  }
}

function playAlarmSound() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();

  function beepPattern() {
    if (!isRinging) return;

    const now = audioContext.currentTime;

    // Loud, annoying beep pattern
    for (let i = 0; i < 3; i++) {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.frequency.value = 880; // A5 note
      osc.type = 'square';

      gain.gain.setValueAtTime(0.3, now + i * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.3 + 0.25);

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start(now + i * 0.3);
      osc.stop(now + i * 0.3 + 0.25);
    }
  }

  beepPattern();
  alarmInterval = setInterval(beepPattern, 1500);
}

function stopAlarmSound() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}

function startListening() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    heardText.textContent = 'Speech recognition not supported. Tap snooze or refresh.';
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }

    heardText.innerHTML = `Heard: <span>"${transcript}"</span>`;

    // Check how well it matches the displayed text
    const targetText = affirmationToSay.textContent;
    const match = calculateMatch(transcript.toLowerCase(), targetText.toLowerCase());
    matchProgress.style.width = match + '%';

    if (match >= 80) {
      // Success!
      stopAlarm(true);
    }
  };

  recognition.onerror = (event) => {
    console.log('Speech recognition error:', event.error);
    if (event.error === 'no-speech') {
      // Restart listening
      recognition.stop();
      setTimeout(() => {
        if (isRinging) recognition.start();
      }, 100);
    }
  };

  recognition.onend = () => {
    // Restart if still ringing
    if (isRinging) {
      setTimeout(() => recognition.start(), 100);
    }
  };

  recognition.start();
}

function calculateMatch(spoken, target) {
  // Simple word matching
  const spokenWords = spoken.split(/\s+/).filter(w => w.length > 2);
  const targetWords = target.split(/\s+/).filter(w => w.length > 2);

  if (targetWords.length === 0) return 0;

  let matches = 0;
  for (const word of spokenWords) {
    if (targetWords.some(tw => tw.includes(word) || word.includes(tw))) {
      matches++;
    }
  }

  return Math.min(100, Math.round((matches / targetWords.length) * 100));
}

function stopAlarm(success = false) {
  isRinging = false;
  stopAlarmSound();

  if (recognition) {
    recognition.stop();
    recognition = null;
  }

  stopLocationTracking();

  // Notify phone that alarm stopped
  if (wakeupMode === 'phone') {
    sendToPhone({
      type: 'alarm_stopped',
      success: success,
      timestamp: Date.now()
    });
  }

  alarmRinging.classList.remove('active');

  if (success) {
    alarmSuccess.classList.add('active');

    // Custom message for outside/phone mode
    if (wakeupMode === 'outside' || wakeupMode === 'phone') {
      document.getElementById('motivationText').textContent =
        "You did it! You got up and went outside. Fresh air and movement are the best way to start your day. You're already winning!";
    }

    // Reset for tomorrow
    alarmEnabled = true;
    snoozesRemaining = 2;
    saveAlarmSettings();
  }
}

// Snooze button
snoozeBtn.addEventListener('click', () => {
  if (snoozesRemaining <= 0) {
    snoozeBtn.textContent = 'No snoozes left!';
    return;
  }

  snoozesRemaining--;
  snoozeCount.textContent = `${snoozesRemaining} snooze${snoozesRemaining !== 1 ? 's' : ''} remaining`;

  // Stop current alarm
  stopAlarmSound();
  if (recognition) recognition.stop();

  // Snooze for 5 minutes
  isRinging = false;
  alarmRinging.classList.remove('active');

  // Set new alarm time
  const snoozeTime = new Date();
  snoozeTime.setMinutes(snoozeTime.getMinutes() + 5);

  setTimeout(() => {
    if (alarmEnabled) {
      triggerAlarm();
    }
  }, 5 * 60 * 1000);

  // Show confirmation
  alarmStatus.textContent = `Snoozed. Alarm will ring at ${snoozeTime.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}`;
});

// Close success
document.getElementById('closeSuccessBtn').addEventListener('click', () => {
  alarmSuccess.classList.remove('active');
});

// AM/PM toggle
amBtn.addEventListener('click', () => {
  amBtn.classList.add('active');
  pmBtn.classList.remove('active');
  isPM = false;
  updateAlarmDisplay();
  saveAlarmSettings();
});

pmBtn.addEventListener('click', () => {
  pmBtn.classList.add('active');
  amBtn.classList.remove('active');
  isPM = true;
  updateAlarmDisplay();
  saveAlarmSettings();
});

// Alarm toggle
alarmToggle.addEventListener('click', () => {
  alarmEnabled = !alarmEnabled;
  alarmToggle.classList.toggle('active');
  alarmStatus.classList.toggle('active');
  updateAlarmDisplay();

  // If enabling and in outside/phone mode, capture bed location
  if (alarmEnabled && (wakeupMode === 'outside' || wakeupMode === 'phone')) {
    captureBedLocation();
  }

  // If enabling phone mode, ensure MQTT is connected
  if (alarmEnabled && wakeupMode === 'phone') {
    if (!mqttClient || !mqttClient.connected) {
      generateRoomCode();
      connectMQTT();
    }
  }

  saveAlarmSettings();
});

// Time inputs
alarmHourInput.addEventListener('change', () => {
  let val = parseInt(alarmHourInput.value);
  if (val < 1) val = 1;
  if (val > 12) val = 12;
  alarmHour = val;
  alarmHourInput.value = val;
  updateAlarmDisplay();
  saveAlarmSettings();
});

alarmMinuteInput.addEventListener('change', () => {
  let val = parseInt(alarmMinuteInput.value);
  if (val < 0) val = 0;
  if (val > 59) val = 59;
  alarmMinute = val;
  alarmMinuteInput.value = val.toString().padStart(2, '0');
  updateAlarmDisplay();
  saveAlarmSettings();
});

function updateAlarmDisplay() {
  const ampm = isPM ? 'PM' : 'AM';
  alarmTimeDisplay.textContent = `${alarmHour}:${alarmMinute.toString().padStart(2, '0')} ${ampm}`;
}

function saveAlarmSettings() {
  storage.set({
    alarmSettings: {
      hour: alarmHour,
      minute: alarmMinute,
      isPM: isPM,
      enabled: alarmEnabled,
      wakeupMode: wakeupMode,
      requiredDistance: requiredDistance,
      bedLocation: bedLocation
    }
  });
}

// Start clock
updateClock();
setInterval(updateClock, 1000);

// Back link
document.getElementById('backLink').addEventListener('click', (e) => {
  e.preventDefault();
  if (alarmEnabled) {
    if (confirm('Alarm is set. If you close this page, the alarm won\'t work. Close anyway?')) {
      window.close();
    }
  } else {
    window.close();
  }
});

// Prevent accidental close
window.addEventListener('beforeunload', (e) => {
  if (alarmEnabled && !isRinging) {
    e.preventDefault();
    e.returnValue = 'Alarm is set. If you close this page, the alarm won\'t work.';
  }
});
