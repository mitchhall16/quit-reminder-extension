// Default tips per slot
const slotTips = {
  morning: 'Take with breakfast for best absorption. Food helps your body absorb fat-soluble vitamins.',
  afternoon: 'Take with vitamin C (orange juice, fruit) for better absorption. Avoid dairy, coffee, or tea for 1 hour.',
  dinner: 'Take with your meal. Fat-soluble vitamins absorb better with dietary fats.',
  night: 'Take 30-60 min before bed. Promotes relaxation and better sleep quality.'
};

const slotLabels = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  dinner: 'Dinner',
  night: 'Nighttime'
};

// Get params from URL
const params = new URLSearchParams(window.location.search);
const reminderType = params.get('type');

// Check if this is a delayed supplement reminder (after timing conflict)
if (reminderType === 'delayed') {
  const takenSupplement = params.get('taken');
  const conflictingSupplements = params.get('supplements');
  const message = params.get('message');

  // Update the UI for delayed reminder
  document.getElementById('timeLabel').textContent = 'Safe to Take Now';
  document.getElementById('tip').innerHTML = `
    <strong style="color: #4ade80;">✓ ${takenSupplement} has been absorbed!</strong><br><br>
    You can now take your other supplements without absorption conflicts.
  `;

  // Update title
  document.querySelector('h1').textContent = 'Time for More Supplements!';
  document.querySelector('.pill-icon').textContent = '⏰💊';

  // Show the conflicting supplements as a checklist
  const list = document.getElementById('supplementsList');
  const supplements = conflictingSupplements.split(', ');

  list.innerHTML = supplements.map((name, index) => `
    <div class="supplement-item">
      <input type="checkbox" id="supp${index}" class="supp-check">
      <span class="supplement-name">${name}</span>
    </div>
  `).join('');

  // Add checkbox listeners
  list.querySelectorAll('.supp-check').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const allChecked = document.querySelectorAll('.supp-check:not(:checked)').length === 0;
      const doneBtn = document.getElementById('doneBtn');
      doneBtn.disabled = !allChecked;
      if (allChecked) {
        doneBtn.textContent = 'Done! ✓';
        doneBtn.classList.add('active');
      }
    });
  });

  // Play alert
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playTone(freq, start, duration) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }
  const now = audioCtx.currentTime;
  playTone(523, now, 0.2);
  playTone(659, now + 0.15, 0.2);
  playTone(784, now + 0.3, 0.3);

  // Done button closes the tab
  document.getElementById('doneBtn').addEventListener('click', () => {
    window.close();
  });

} else {
  // Normal slot-based supplement reminder
  const slot = params.get('slot') || 'morning';

  // Set labels
  document.getElementById('timeLabel').textContent = slotLabels[slot];
  document.getElementById('tip').textContent = slotTips[slot];

// Play alert sound
function playAlert() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playTone(freq, start, duration) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }
  const now = audioCtx.currentTime;
  playTone(523, now, 0.2);
  playTone(659, now + 0.15, 0.2);
  playTone(784, now + 0.3, 0.3);
}
playAlert();

// Load user's supplements from storage
chrome.storage.sync.get(['userSupplements'], (result) => {
  const userSupplements = result.userSupplements || [];
  const slotSupplements = userSupplements.filter(s => s.slot === slot);

  // If no supplements for this slot, show message
  if (slotSupplements.length === 0) {
    document.getElementById('supplementsList').innerHTML =
      '<p style="color: #888; text-align: center; padding: 20px;">No supplements scheduled for this time.<br>' +
      '<a href="' + chrome.runtime.getURL('supplement-schedule.html') + '" style="color: #22d3ee;">Add supplements</a></p>';
    document.getElementById('doneBtn').disabled = false;
    document.getElementById('doneBtn').textContent = 'Close';
    return;
  }

  // Build checklist
  const list = document.getElementById('supplementsList');
  list.innerHTML = '';
  slotSupplements.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'supplement-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'supp' + index;
    checkbox.className = 'supp-check';
    checkbox.addEventListener('change', updateDoneButton);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'supplement-name';
    nameSpan.textContent = item.name;

    const doseSpan = document.createElement('span');
    doseSpan.className = 'supplement-dose';
    doseSpan.textContent = item.dose;

    div.appendChild(checkbox);
    div.appendChild(nameSpan);
    div.appendChild(doseSpan);
    list.appendChild(div);
  });
});

// Check if all checked
function updateDoneButton() {
  const checks = document.querySelectorAll('.supp-check');
  const allChecked = Array.from(checks).every(c => c.checked);
  document.getElementById('doneBtn').disabled = !allChecked;
}

// Done button
document.getElementById('doneBtn').addEventListener('click', () => {
  const today = new Date().toDateString();
  chrome.storage.sync.get(['supplementCheckStates'], (result) => {
    const states = result.supplementCheckStates || {};
    states[slot] = true;
    chrome.storage.sync.set({
      supplementCheckStates: states,
      supplementCheckDate: today
    });
  });
  window.close();
});

// Snooze button
document.getElementById('snoozeBtn').addEventListener('click', () => {
  chrome.alarms.create('supplement-' + slot + '-snooze', {
    delayInMinutes: 15
  });
  window.close();
});

} // End of else block for normal slot reminders
