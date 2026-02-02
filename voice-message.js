let mediaRecorder = null;
let audioChunks = [];
let recordingBlob = null;
let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;
let currentlyPlaying = null;

// Scripts for each category
const scripts = {
  general: `<p>Hey. I know you're struggling right now. I know it feels impossible. But I need you to listen to me - I'm you, and I recorded this when I was thinking clearly.</p>

<p><span class="pause">(pause)</span></p>

<p>You started this journey because you were tired of being controlled. Tired of the shame. Tired of waking up and hating yourself. Remember that feeling? That's where giving in leads.</p>

<p><span class="pause">(pause)</span></p>

<p>This craving? It's going to pass. It always does. In 20 minutes you'll feel different. You just have to get through right now.</p>

<p>You've already proven you can do hard things. Every day you've made it is proof. Don't throw that away for 5 minutes of relief followed by hours of regret.</p>

<p><span class="pause">(pause)</span></p>

<p>I believe in you. You've got this. Now go do something else. Move your body. Drink some water. Just get through the next 20 minutes. You'll thank yourself tomorrow.</p>`,

  nicotine: `<p>Hey. You're thinking about nicotine right now. I get it. I've been there. But I need you to really hear me.</p>

<p><span class="pause">(pause)</span></p>

<p>Remember why you quit? The money you were wasting. The way you felt controlled by it. Having to step outside. The smell. The coughing. Your lungs feeling like shit.</p>

<p>That "one" you're thinking about? It's never just one. You know this. One leads to buying a pack. A pack leads to being right back where you started.</p>

<p><span class="pause">(pause)</span></p>

<p>Your body is healing right now. Every hour without nicotine, your lungs are clearing. Your blood pressure is dropping. You're getting healthier by the minute - and you want to reset that?</p>

<p>This craving is a lie. It's your addiction screaming because it's dying. Let it die.</p>

<p><span class="pause">(pause)</span></p>

<p>Go drink a glass of cold water. Do 20 pushups. Take a walk. The craving will pass whether you smoke or not. Choose not to.</p>`,

  alcohol: `<p>Hey. So you want a drink right now. I know that feeling. But you called in reinforcements for a reason - so listen up.</p>

<p><span class="pause">(pause)</span></p>

<p>Think about the last time you drank. Really think about it. Not the first sip - the end of the night. The morning after. The anxiety. The shame. The promises you made to yourself.</p>

<p>You're not craving alcohol. You're craving escape. But alcohol doesn't give you escape - it just delays the problem and adds new ones on top.</p>

<p><span class="pause">(pause)</span></p>

<p>Remember how good you feel when you wake up sober? Clear head. No anxiety. No regret. No checking your phone to see what you said. That's what you're protecting right now.</p>

<p>One drink is never one drink for you. You know this. Play the tape forward.</p>

<p><span class="pause">(pause)</span></p>

<p>Go grab something else to drink. Water. Tea. Anything. Call someone. Get out of wherever you are. You're stronger than this - you've proven it every sober day.</p>`,

  nofap: `<p>Hey. I know what you're about to do. And I need you to stop and listen to yourself for a minute.</p>

<p><span class="pause">(pause)</span></p>

<p>You know how this ends. 10 seconds of pleasure, then immediate regret. Closing the tabs in shame. Avoiding your own reflection. Feeling drained and disgusted with yourself.</p>

<p>Is that worth throwing away your streak? All those days of building discipline, building self-respect - gone in a moment of weakness?</p>

<p><span class="pause">(pause)</span></p>

<p>This urge is not you. It's your brain playing tricks because it got addicted to easy dopamine. You're rewiring right now. Every time you resist, you get stronger. Every time you give in, you make it harder next time.</p>

<p>You're not missing out on anything. You're breaking free from something that was controlling you.</p>

<p><span class="pause">(pause)</span></p>

<p>Close the browser. Get up. Leave the room. Do pushups until you can't. Take a cold shower. The urge will pass - it always does. And tomorrow you'll be grateful you stayed strong.</p>`,

  motivation: `<p>Good morning. This is you, reminding yourself why you're doing all this.</p>

<p><span class="pause">(pause)</span></p>

<p>You're building a better version of yourself. Every day you stay clean, every craving you resist, every hard choice you make - it's adding up. You're becoming someone you're proud of.</p>

<p>Today might be hard. You might face temptation. But you've already proven you can handle it. You've made it this far.</p>

<p><span class="pause">(pause)</span></p>

<p>Remember your goals. The person you want to become. The life you want to live. None of that happens if you stay stuck in old patterns.</p>

<p>You deserve better than being controlled by substances and urges. You deserve to be free. And you're getting there - one day at a time.</p>

<p><span class="pause">(pause)</span></p>

<p>Go make today count. Stay strong. And remember - future you is counting on the choices you make right now.</p>`
};

const recordBtn = document.getElementById('recordBtn');
const recordStatus = document.getElementById('recordStatus');
const recordTime = document.getElementById('recordTime');
const saveBtn = document.getElementById('saveBtn');
const labelInput = document.getElementById('labelInput');
const categorySelect = document.getElementById('categorySelect');
const recordingsList = document.getElementById('recordingsList');
const noRecordings = document.getElementById('noRecordings');
const micIcon = document.getElementById('micIcon');
const stopIcon = document.getElementById('stopIcon');

// Script display
const scriptText = document.getElementById('scriptText');
const scriptBox = document.getElementById('scriptBox');
const scriptToggle = document.getElementById('scriptToggle');

// Initialize script
scriptText.innerHTML = scripts.general;

// Update script when category changes
categorySelect.addEventListener('change', () => {
  scriptText.innerHTML = scripts[categorySelect.value] || scripts.general;
});

// Toggle script visibility
scriptToggle.addEventListener('click', () => {
  if (scriptText.style.display === 'none') {
    scriptText.style.display = 'block';
    scriptToggle.textContent = 'Hide script';
  } else {
    scriptText.style.display = 'none';
    scriptToggle.textContent = 'Show script';
  }
});

// Mode switching
document.getElementById('listenModeBtn').addEventListener('click', () => {
  document.getElementById('listenModeBtn').classList.add('active');
  document.getElementById('recordModeBtn').classList.remove('active');
  document.getElementById('listenSection').classList.add('active');
  document.getElementById('recordSection').classList.remove('active');
});

document.getElementById('recordModeBtn').addEventListener('click', () => {
  document.getElementById('recordModeBtn').classList.add('active');
  document.getElementById('listenModeBtn').classList.remove('active');
  document.getElementById('recordSection').classList.add('active');
  document.getElementById('listenSection').classList.remove('active');
});

// Load recordings on start
loadRecordings();

// Record button
recordBtn.addEventListener('click', async () => {
  if (!isRecording) {
    await startRecording();
  } else {
    stopRecording();
  }
});

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      recordingBlob = new Blob(audioChunks, { type: 'audio/webm' });
      saveBtn.disabled = false;
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    recordingStartTime = Date.now();

    recordBtn.classList.add('recording');
    micIcon.style.display = 'none';
    stopIcon.style.display = 'block';
    recordStatus.textContent = 'Recording... Tap to stop';

    timerInterval = setInterval(updateTimer, 100);

  } catch (err) {
    console.error('Microphone access denied:', err);
    recordStatus.textContent = 'Microphone access denied. Check permissions.';
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;

    clearInterval(timerInterval);
    recordBtn.classList.remove('recording');
    micIcon.style.display = 'block';
    stopIcon.style.display = 'none';
    recordStatus.textContent = 'Recording saved. Add a label and save.';
  }
}

function updateTimer() {
  const elapsed = Date.now() - recordingStartTime;
  const seconds = Math.floor(elapsed / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  recordTime.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Save recording
saveBtn.addEventListener('click', async () => {
  if (!recordingBlob) return;

  const reader = new FileReader();
  reader.onloadend = () => {
    const base64Audio = reader.result;
    const recording = {
      id: Date.now().toString(),
      label: labelInput.value.trim() || 'Untitled',
      category: categorySelect.value,
      audio: base64Audio,
      date: new Date().toISOString(),
      duration: recordTime.textContent
    };

    chrome.storage.local.get(['voiceRecordings'], (result) => {
      const recordings = result.voiceRecordings || [];
      recordings.unshift(recording);
      // Keep max 10 recordings (audio files are large)
      if (recordings.length > 10) recordings.pop();

      chrome.storage.local.set({ voiceRecordings: recordings }, () => {
        // Reset form
        recordingBlob = null;
        labelInput.value = '';
        recordTime.textContent = '0:00';
        recordStatus.textContent = 'Saved! Record another or switch to Listen.';
        saveBtn.disabled = true;
        loadRecordings();
      });
    });
  };
  reader.readAsDataURL(recordingBlob);
});

// Load and display recordings
function loadRecordings() {
  chrome.storage.local.get(['voiceRecordings'], (result) => {
    const recordings = result.voiceRecordings || [];

    if (recordings.length === 0) {
      noRecordings.style.display = 'block';
      return;
    }

    noRecordings.style.display = 'none';

    // Clear list (except noRecordings placeholder)
    recordingsList.innerHTML = '';
    recordingsList.appendChild(noRecordings);

    recordings.forEach(recording => {
      const item = createRecordingItem(recording);
      recordingsList.appendChild(item);
    });
  });
}

function createRecordingItem(recording) {
  const item = document.createElement('div');
  item.className = 'recording-item';
  item.dataset.id = recording.id;

  const categoryLabels = {
    general: 'General',
    nicotine: 'Nicotine',
    alcohol: 'Alcohol',
    nofap: 'NoFap',
    motivation: 'Motivation'
  };

  const date = new Date(recording.date);
  const dateStr = date.toLocaleDateString();

  item.innerHTML = `
    <button class="recording-play-btn" data-audio="${recording.audio}">
      <svg viewBox="0 0 24 24" class="play-icon">
        <path d="M8 5v14l11-7z"/>
      </svg>
      <svg viewBox="0 0 24 24" class="pause-icon" style="display:none;">
        <rect x="6" y="5" width="4" height="14"/>
        <rect x="14" y="5" width="4" height="14"/>
      </svg>
    </button>
    <div class="recording-info">
      <div class="recording-label">${recording.label}</div>
      <div class="recording-meta">${categoryLabels[recording.category] || 'General'} • ${recording.duration} • ${dateStr}</div>
    </div>
    <button class="recording-delete" data-id="${recording.id}">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
      </svg>
    </button>
  `;

  // Play button
  const playBtn = item.querySelector('.recording-play-btn');
  const playIcon = item.querySelector('.play-icon');
  const pauseIcon = item.querySelector('.pause-icon');

  playBtn.addEventListener('click', () => {
    const audioData = playBtn.dataset.audio;

    if (currentlyPlaying && currentlyPlaying.btn === playBtn) {
      // Stop current
      currentlyPlaying.audio.pause();
      currentlyPlaying.audio.currentTime = 0;
      playBtn.classList.remove('playing');
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      currentlyPlaying = null;
    } else {
      // Stop any other playing
      if (currentlyPlaying) {
        currentlyPlaying.audio.pause();
        currentlyPlaying.btn.classList.remove('playing');
        currentlyPlaying.btn.querySelector('.play-icon').style.display = 'block';
        currentlyPlaying.btn.querySelector('.pause-icon').style.display = 'none';
      }

      // Play this one
      const audio = new Audio(audioData);
      audio.play();
      playBtn.classList.add('playing');
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
      currentlyPlaying = { audio, btn: playBtn };

      audio.onended = () => {
        playBtn.classList.remove('playing');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        currentlyPlaying = null;
      };
    }
  });

  // Delete button
  const deleteBtn = item.querySelector('.recording-delete');
  deleteBtn.addEventListener('click', () => {
    if (confirm('Delete this recording?')) {
      chrome.storage.local.get(['voiceRecordings'], (result) => {
        const recordings = result.voiceRecordings || [];
        const filtered = recordings.filter(r => r.id !== recording.id);
        chrome.storage.local.set({ voiceRecordings: filtered }, () => {
          loadRecordings();
        });
      });
    }
  });

  return item;
}

// Back link
document.getElementById('backLink').addEventListener('click', (e) => {
  e.preventDefault();
  window.close();
});
