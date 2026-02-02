// Supplement database with timing, interactions, and info

// Timing conflicts - supplements that need separation (in hours)
const TIMING_CONFLICTS = {
  'iron': {
    conflictsWith: ['calcium', 'zinc', 'vitamin-e', 'Calcium', 'Zinc', 'Vitamin E'],
    hoursApart: 3,
    message: 'Iron absorbed - safe to take calcium/zinc in'
  },
  'calcium': {
    conflictsWith: ['iron', 'zinc', 'Iron', 'Zinc'],
    hoursApart: 2,
    message: 'Calcium absorbed - safe to take iron/zinc in'
  },
  'zinc': {
    conflictsWith: ['iron', 'calcium', 'copper', 'Iron', 'Calcium', 'Copper'],
    hoursApart: 2,
    message: 'Zinc absorbed - safe to take iron/calcium in'
  },
  'thyroid': {
    conflictsWith: ['calcium', 'iron', 'coffee', 'Calcium', 'Iron'],
    hoursApart: 4,
    message: 'Thyroid meds absorbed - safe to take calcium/iron in'
  }
};

// Either/Or groups - supplements that overlap, pick one
const EITHER_OR_GROUPS = {
  'b-vitamins': {
    supplements: ['vitamin-b-complex', 'multivitamin', 'multivitamin-womens'],
    message: 'Take ONE - multivitamins contain B vitamins'
  },
  'vitamin-d-sources': {
    supplements: ['vitamin-d', 'multivitamin', 'multivitamin-womens'],
    message: 'Check doses - multi may contain Vitamin D'
  },
  'omega-sources': {
    supplements: ['omega-3', 'fish-oil', 'krill-oil'],
    message: 'Take ONE omega source'
  },
  'sleep-aids': {
    supplements: ['melatonin', 'magnesium', 'ashwagandha', 'valerian'],
    message: 'Start with ONE sleep aid, add others if needed'
  },
  'probiotics': {
    supplements: ['probiotics', 'digestive-enzymes'],
    message: 'Can combine, but start with one first'
  }
};

const SUPPLEMENT_DB = {
  'vitamin-a': {
    name: 'Vitamin A',
    slot: 'morning',
    icon: 'vitamin',
    why: 'Fat-soluble, absorbs with breakfast fats',
    conflicts: ['vitamin-a'],
    warnings: []
  },
  'vitamin-b-complex': {
    name: 'B-Complex',
    slot: 'morning',
    icon: 'vitamin',
    why: 'Energy boost - take early to avoid sleep issues',
    conflicts: [],
    warnings: [{ with: 'night', msg: 'B vitamins can disrupt sleep if taken late' }]
  },
  'vitamin-b12': {
    name: 'Vitamin B12',
    slot: 'morning',
    icon: 'vitamin',
    why: 'Energy support - morning is best',
    conflicts: [],
    warnings: []
  },
  'vitamin-c': {
    name: 'Vitamin C',
    slot: 'morning',
    icon: 'vitamin',
    why: 'Boosts immunity, helps iron absorption',
    conflicts: [],
    warnings: []
  },
  'vitamin-d': {
    name: 'Vitamin D3',
    slot: 'morning',
    icon: 'vitamin',
    why: 'Fat-soluble, take with breakfast',
    conflicts: [],
    warnings: []
  },
  'vitamin-e': {
    name: 'Vitamin E',
    slot: 'dinner',
    icon: 'vitamin',
    why: 'Fat-soluble, needs dietary fat',
    conflicts: [],
    warnings: [{ with: 'iron', msg: 'Vitamin E may reduce iron absorption - take 4+ hours apart' }]
  },
  'vitamin-k': {
    name: 'Vitamin K',
    slot: 'dinner',
    icon: 'vitamin',
    why: 'Fat-soluble, absorbs with dinner fats',
    conflicts: [],
    warnings: []
  },
  'calcium': {
    name: 'Calcium',
    slot: 'dinner',
    icon: 'mineral',
    why: 'Split doses absorb better, dinner works well',
    conflicts: [],
    warnings: [
      { with: 'iron', msg: 'Calcium blocks iron absorption - take at least 4 hours apart' },
      { with: 'zinc', msg: 'Calcium can reduce zinc absorption - separate by 2+ hours' }
    ]
  },
  'iron': {
    name: 'Iron',
    slot: 'afternoon',
    icon: 'mineral',
    why: 'Best absorbed alone with vitamin C, away from other minerals',
    conflicts: [],
    warnings: [
      { with: 'calcium', msg: 'Calcium blocks iron absorption - take 4+ hours apart' },
      { with: 'zinc', msg: 'Iron and zinc compete for absorption - take 4+ hours apart' },
      { with: 'vitamin-e', msg: 'Vitamin E may reduce iron absorption' }
    ]
  },
  'magnesium': {
    name: 'Magnesium',
    slot: 'night',
    icon: 'sleep',
    why: 'Promotes relaxation and better sleep',
    conflicts: [],
    warnings: []
  },
  'zinc': {
    name: 'Zinc',
    slot: 'dinner',
    icon: 'mineral',
    why: 'Take with food to prevent nausea',
    conflicts: [],
    warnings: [
      { with: 'iron', msg: 'Zinc and iron compete for absorption - take 4+ hours apart' },
      { with: 'calcium', msg: 'Calcium can reduce zinc absorption' },
      { with: 'copper', msg: 'High zinc (50mg+) can cause copper deficiency over time' }
    ]
  },
  'potassium': {
    name: 'Potassium',
    slot: 'morning',
    icon: 'mineral',
    why: 'Supports heart and muscle function',
    conflicts: [],
    warnings: []
  },
  'selenium': {
    name: 'Selenium',
    slot: 'morning',
    icon: 'mineral',
    why: 'Antioxidant support',
    conflicts: [],
    warnings: []
  },
  'copper': {
    name: 'Copper',
    slot: 'morning',
    icon: 'mineral',
    why: 'Essential trace mineral',
    conflicts: [],
    warnings: [{ with: 'zinc', msg: 'High zinc can deplete copper over time' }]
  },
  'multivitamin': {
    name: 'Multivitamin (Men\'s)',
    slot: 'morning',
    icon: 'multi',
    why: 'Full spectrum - take with breakfast',
    conflicts: [],
    warnings: [
      { with: 'vitamin-b-complex', msg: 'Multivitamin likely contains B vitamins - check for overlap' },
      { with: 'vitamin-d', msg: 'Multivitamin may contain Vitamin D - check dosage' },
      { with: 'zinc', msg: 'Check if multivitamin contains zinc to avoid excess' }
    ]
  },
  'multivitamin-womens': {
    name: 'Multivitamin (Women\'s)',
    slot: 'morning',
    icon: 'multi',
    why: 'Full spectrum - take with breakfast',
    conflicts: [],
    warnings: [
      { with: 'vitamin-b-complex', msg: 'Multivitamin likely contains B vitamins - check for overlap' },
      { with: 'iron', msg: 'Women\'s multis often contain iron - check for overlap' }
    ]
  },
  'omega-3': {
    name: 'Omega-3 / Fish Oil',
    slot: 'dinner',
    icon: 'omega',
    why: 'Fat-soluble, absorbs best with fatty meal',
    conflicts: [],
    warnings: []
  },
  'coq10': {
    name: 'CoQ10',
    slot: 'morning',
    icon: 'vitamin',
    why: 'Energy production - take with breakfast fats',
    conflicts: [],
    warnings: []
  },
  'probiotics': {
    name: 'Probiotics',
    slot: 'morning',
    icon: 'other',
    why: 'Take on empty stomach or with light breakfast',
    conflicts: [],
    warnings: []
  },
  'ashwagandha': {
    name: 'Ashwagandha',
    slot: 'night',
    icon: 'other',
    why: 'Reduces stress, can be calming - good for evening',
    conflicts: [],
    warnings: []
  },
  'creatine': {
    name: 'Creatine (AM)',
    slot: 'morning',
    icon: 'other',
    why: 'First 5g dose - take with breakfast',
    conflicts: [],
    warnings: []
  },
  'creatine-pm': {
    name: 'Creatine (PM)',
    slot: 'dinner',
    icon: 'other',
    why: 'Second 5g dose - take with dinner (10g total/day)',
    conflicts: [],
    warnings: []
  },
  'collagen': {
    name: 'Collagen',
    slot: 'morning',
    icon: 'other',
    why: 'Take on empty stomach for best absorption',
    conflicts: [],
    warnings: []
  },
  'melatonin': {
    name: 'Melatonin',
    slot: 'night',
    icon: 'sleep',
    why: 'Sleep aid - take 30-60min before bed',
    conflicts: [],
    warnings: [{ with: 'magnesium', msg: 'Both promote sleep - may enhance drowsiness (usually fine)' }]
  },
  'testosterone-booster': {
    name: 'Testosterone Booster',
    slot: 'dinner',
    icon: 'testosterone',
    why: 'Most effective with dinner, follow product directions',
    conflicts: [],
    warnings: []
  },
  'pre-workout': {
    name: 'Pre-Workout',
    slot: 'afternoon',
    icon: 'testosterone',
    why: 'Take 30min before exercise',
    conflicts: [],
    warnings: [{ with: 'night', msg: 'Contains caffeine/stimulants - avoid taking late' }]
  },
  'protein': {
    name: 'Protein Powder',
    slot: 'afternoon',
    icon: 'other',
    why: 'Post-workout or between meals',
    conflicts: [],
    warnings: []
  }
};

// User's supplements
let userSupplements = [];

// Check if we're in extension context
const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;

// Load supplements
function loadSupplements() {
  if (isExtension) {
    chrome.storage.sync.get(['userSupplements'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Load error:', chrome.runtime.lastError);
        const saved = localStorage.getItem('userSupplements');
        userSupplements = saved ? JSON.parse(saved) : [];
      } else {
        userSupplements = result.userSupplements || [];
      }
      renderSchedule();
    });
  } else {
    const saved = localStorage.getItem('userSupplements');
    userSupplements = saved ? JSON.parse(saved) : [];
    renderSchedule();
  }
}

// Save supplements
function saveSupplements() {
  localStorage.setItem('userSupplements', JSON.stringify(userSupplements));

  if (isExtension) {
    chrome.storage.sync.set({ userSupplements: userSupplements }, () => {
      if (chrome.runtime.lastError) {
        console.error('Save error:', chrome.runtime.lastError);
      }
    });
  }
}

// Add supplement
function addSupplement() {
  const select = document.getElementById('supplementSelect');
  const doseInput = document.getElementById('doseInput');
  const customName = document.getElementById('customName');

  let id = select.value;
  let name, slot, icon, why;

  if (!id) {
    alert('Please select a supplement');
    return;
  }

  if (id === 'custom') {
    if (!customName.value.trim()) {
      alert('Please enter a supplement name');
      return;
    }
    id = 'custom-' + Date.now();
    name = customName.value.trim();
    slot = 'morning';
    icon = 'other';
    why = 'Custom supplement - adjust timing as needed';
  } else {
    const data = SUPPLEMENT_DB[id];
    name = data.name;
    slot = data.slot;
    icon = data.icon;
    why = data.why;
  }

  // Check for duplicates
  if (userSupplements.find(s => s.id === id || s.name.toLowerCase() === name.toLowerCase())) {
    alert('You already have this supplement added');
    return;
  }

  userSupplements.push({
    id: id,
    name: name,
    dose: doseInput.value.trim() || 'As directed',
    slot: slot,
    icon: icon,
    why: why
  });

  saveSupplements();
  renderSchedule();

  // Show confirmation
  const btn = document.getElementById('addBtn');
  const originalText = btn.textContent;
  btn.textContent = 'Added!';
  btn.style.background = '#22c55e';
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.background = '';
  }, 1500);

  // Reset form
  select.value = '';
  doseInput.value = '';
  customName.value = '';
  customName.classList.remove('show');
}

// Remove supplement
function removeSupplement(id) {
  userSupplements = userSupplements.filter(s => s.id !== id);
  saveSupplements();
  renderSchedule();
}

// Get either/or warnings for a specific slot
function getSlotEitherOrWarnings(slotSupplements) {
  const warnings = [];

  for (const [groupId, group] of Object.entries(EITHER_OR_GROUPS)) {
    const matchingSupps = slotSupplements.filter(s =>
      group.supplements.some(gs =>
        gs.toLowerCase() === s.name.toLowerCase() ||
        gs.toLowerCase() === s.id?.toLowerCase()
      )
    );

    if (matchingSupps.length >= 2) {
      warnings.push({
        supplements: matchingSupps.map(s => s.name),
        message: group.message
      });
    }
  }

  return warnings;
}

// Render the schedule
function renderSchedule() {
  const slots = ['morning', 'afternoon', 'dinner', 'night'];

  slots.forEach(slot => {
    const container = document.getElementById(slot + '-supplements');
    const supplements = userSupplements.filter(s => s.slot === slot);

    if (supplements.length === 0) {
      container.innerHTML = '<div class="empty-slot">No supplements scheduled</div>';
    } else {
      // Check for either/or warnings in this slot
      const slotWarnings = getSlotEitherOrWarnings(supplements);
      let warningHtml = '';

      if (slotWarnings.length > 0) {
        warningHtml = slotWarnings.map(w => `
          <div style="background: rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px;">
            <div style="color: #fbbf24; font-weight: 600; font-size: 0.85rem;">⚠️ ${w.supplements.join(' & ')}</div>
            <div style="color: #fcd34d; font-size: 0.8rem; margin-top: 3px;">${w.message}</div>
          </div>
        `).join('');
      }

      container.innerHTML = warningHtml + supplements.map(s => `
        <div class="supplement-card" data-id="${s.id}">
          <button class="remove-btn" data-remove="${s.id}" title="Remove">&times;</button>
          <div class="supplement-icon ${s.icon}">${getIcon(s.icon)}</div>
          <div class="supplement-info">
            <div class="supplement-name">${s.name}</div>
            <div class="supplement-dose">${s.dose}</div>
            <div class="supplement-why">${s.why}</div>
          </div>
        </div>
      `).join('');
    }
  });

  // Attach remove button listeners
  document.querySelectorAll('.remove-btn[data-remove]').forEach(btn => {
    btn.addEventListener('click', function() {
      removeSupplement(this.getAttribute('data-remove'));
    });
  });

  renderWarnings();
  renderChecklist();
}

function getIcon(type) {
  const icons = {
    'vitamin': '\u26A1',
    'mineral': '\uD83D\uDD35',
    'multi': '\uD83D\uDC8A',
    'sleep': '\uD83D\uDE34',
    'testosterone': '\uD83D\uDD25',
    'omega': '\uD83D\uDC1F',
    'other': '\u2728'
  };
  return icons[type] || '\uD83D\uDC8A';
}

// Check for either/or conflicts
function getEitherOrWarnings() {
  const eitherOrWarnings = [];

  for (const [groupId, group] of Object.entries(EITHER_OR_GROUPS)) {
    const matchingSupps = userSupplements.filter(s =>
      group.supplements.some(gs =>
        gs.toLowerCase() === s.name.toLowerCase() ||
        gs.toLowerCase() === s.id?.toLowerCase()
      )
    );

    if (matchingSupps.length >= 2) {
      eitherOrWarnings.push({
        key: 'either-or-' + groupId,
        title: '⚠️ ' + matchingSupps.map(s => s.name).join(' & '),
        text: group.message,
        isEitherOr: true
      });
    }
  }

  return eitherOrWarnings;
}

// Render warnings
function renderWarnings() {
  const warningsSection = document.getElementById('warningsSection');
  const warningGrid = document.getElementById('warningGrid');
  const warnings = [];

  // Add either/or warnings first (more prominent)
  const eitherOrWarnings = getEitherOrWarnings();
  warnings.push(...eitherOrWarnings);

  // Add interaction warnings
  userSupplements.forEach(supp => {
    const data = SUPPLEMENT_DB[supp.id];
    if (!data) return;

    data.warnings.forEach(warning => {
      const hasConflict = userSupplements.some(s => s.id === warning.with);
      if (hasConflict) {
        const key = [supp.id, warning.with].sort().join('-');
        if (!warnings.find(w => w.key === key)) {
          warnings.push({
            key: key,
            title: supp.name + ' + ' + (SUPPLEMENT_DB[warning.with]?.name || warning.with),
            text: warning.msg
          });
        }
      }
    });
  });

  if (warnings.length === 0) {
    warningsSection.style.display = 'none';
  } else {
    warningsSection.style.display = 'block';
    warningGrid.innerHTML = warnings.map(w => `
      <div class="warning-card" style="${w.isEitherOr ? 'background: rgba(251, 191, 36, 0.15); border-color: rgba(251, 191, 36, 0.4);' : ''}">
        <div class="warning-title" style="${w.isEitherOr ? 'color: #fbbf24;' : ''}">${w.title}</div>
        <div class="warning-text">${w.text}</div>
      </div>
    `).join('');
  }
}

// Render checklist
function renderChecklist() {
  const container = document.getElementById('checklistItems');
  const slots = ['morning', 'afternoon', 'dinner', 'night'];
  const slotLabels = {
    morning: 'Morning with breakfast',
    afternoon: 'Afternoon',
    dinner: 'With dinner',
    night: 'Before bed'
  };

  const items = [];
  slots.forEach(slot => {
    const supps = userSupplements.filter(s => s.slot === slot);
    if (supps.length > 0) {
      items.push({
        slot: slot,
        label: slotLabels[slot],
        names: supps.map(s => s.name).join(', ')
      });
    }
  });

  if (items.length === 0) {
    container.innerHTML = '<div class="empty-slot">Add supplements above to see your daily checklist</div>';
    return;
  }

  const today = new Date().toDateString();
  let checkStates = {};

  function renderCheckItems() {
    container.innerHTML = items.map(item => `
      <div class="check-item">
        <div class="check-box ${checkStates[item.slot] ? 'checked' : ''}" data-slot="${item.slot}"></div>
        <div class="check-text">${item.names}</div>
        <div class="check-time">${item.label}</div>
      </div>
    `).join('');

    // Attach checkbox listeners
    document.querySelectorAll('.check-box[data-slot]').forEach(box => {
      box.addEventListener('click', function() {
        toggleCheck(this.getAttribute('data-slot'), this);
      });
    });
  }

  if (isExtension) {
    chrome.storage.sync.get(['supplementCheckStates', 'supplementCheckDate'], (result) => {
      if (result.supplementCheckDate === today) {
        checkStates = result.supplementCheckStates || {};
      }
      renderCheckItems();
    });
  } else {
    const savedDate = localStorage.getItem('supplementCheckDate');
    if (savedDate === today) {
      checkStates = JSON.parse(localStorage.getItem('supplementCheckStates') || '{}');
    }
    renderCheckItems();
  }
}

// Toggle checkbox
function toggleCheck(slot, element) {
  element.classList.toggle('checked');
  const isChecked = element.classList.contains('checked');
  const today = new Date().toDateString();

  if (isExtension) {
    chrome.storage.sync.get(['supplementCheckStates'], (result) => {
      const states = result.supplementCheckStates || {};
      states[slot] = isChecked;
      chrome.storage.sync.set({
        supplementCheckStates: states,
        supplementCheckDate: today
      });

      // If checked, schedule delayed reminders for conflicting supplements
      if (isChecked) {
        scheduleConflictReminders(slot);
      }
    });
  } else {
    const states = JSON.parse(localStorage.getItem('supplementCheckStates') || '{}');
    states[slot] = isChecked;
    localStorage.setItem('supplementCheckStates', JSON.stringify(states));
    localStorage.setItem('supplementCheckDate', today);
  }
}

// Schedule delayed reminders for supplements that conflict with what was just taken
function scheduleConflictReminders(slot) {
  const slotSupplements = userSupplements.filter(s => s.slot === slot);
  const takenNow = new Date();

  // Check each supplement taken for timing conflicts
  slotSupplements.forEach(supp => {
    const conflictData = TIMING_CONFLICTS[supp.id] || TIMING_CONFLICTS[supp.name.toLowerCase()];
    if (!conflictData) return;

    // Find supplements in user's list that conflict with this one
    const conflictingSupps = userSupplements.filter(s =>
      s.slot !== slot && // Different slot
      conflictData.conflictsWith.some(c =>
        c.toLowerCase() === s.id?.toLowerCase() ||
        c.toLowerCase() === s.name.toLowerCase()
      )
    );

    if (conflictingSupps.length > 0) {
      const delayMinutes = conflictData.hoursApart * 60;
      const safeTime = new Date(takenNow.getTime() + delayMinutes * 60 * 1000);
      const conflictNames = conflictingSupps.map(s => s.name).join(', ');

      // Schedule alarm via background script
      chrome.runtime.sendMessage({
        type: 'scheduleDelayedSupplement',
        takenSupplement: supp.name,
        conflictingSupplements: conflictNames,
        delayMinutes: delayMinutes,
        safeTime: safeTime.toISOString(),
        message: `${supp.name} absorbed! You can now take: ${conflictNames}`
      });

      // Show confirmation to user
      showDelayedReminderConfirmation(supp.name, conflictNames, conflictData.hoursApart);
    }
  });
}

// Show confirmation that a delayed reminder was set
function showDelayedReminderConfirmation(taken, conflicts, hours) {
  const existingNotice = document.querySelector('.delayed-reminder-notice');
  if (existingNotice) existingNotice.remove();

  const notice = document.createElement('div');
  notice.className = 'delayed-reminder-notice';
  notice.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(34, 211, 238, 0.95);
    color: #000;
    padding: 15px 25px;
    border-radius: 10px;
    font-size: 0.9rem;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    max-width: 90%;
    text-align: center;
  `;
  notice.innerHTML = `
    <strong>⏰ Reminder set!</strong><br>
    You'll be reminded to take <strong>${conflicts}</strong> in ${hours} hours<br>
    <small>(after ${taken} is absorbed)</small>
  `;

  document.body.appendChild(notice);

  setTimeout(() => {
    notice.style.transition = 'opacity 0.5s';
    notice.style.opacity = '0';
    setTimeout(() => notice.remove(), 500);
  }, 5000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Add button listener
  document.getElementById('addBtn').addEventListener('click', addSupplement);

  // Custom input toggle
  document.getElementById('supplementSelect').addEventListener('change', function() {
    const customInput = document.getElementById('customName');
    if (this.value === 'custom') {
      customInput.classList.add('show');
      customInput.focus();
    } else {
      customInput.classList.remove('show');
    }
  });

  // Load data
  loadSupplements();
});
