const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const GOOGLE_MAPS_API_KEY = 'AIzaSyA28Uo3_yGYwcgf4KIl50BdfmbFY22moaA';

// Either/Or groups - supplements that overlap, pick one
const EITHER_OR_GROUPS = {
  'b-vitamins': {
    supplements: ['vitamin-b-complex', 'multivitamin', 'multivitamin-womens', 'B-Complex', "Multivitamin (Men's)", "Multivitamin (Women's)"],
    message: 'Take ONE - multivitamins contain B vitamins'
  },
  'vitamin-d-sources': {
    supplements: ['vitamin-d', 'multivitamin', 'multivitamin-womens', 'Vitamin D3', "Multivitamin (Men's)", "Multivitamin (Women's)"],
    message: 'Check doses - multi may have Vitamin D'
  },
  'omega-sources': {
    supplements: ['omega-3', 'fish-oil', 'krill-oil', 'Omega-3 / Fish Oil', 'Krill Oil'],
    message: 'Take ONE omega source'
  },
  'sleep-aids': {
    supplements: ['melatonin', 'magnesium', 'ashwagandha', 'valerian', 'Melatonin', 'Magnesium', 'Ashwagandha', 'Valerian Root'],
    message: 'Start with ONE sleep aid'
  }
};

let events = [];
let currentDay = new Date().getDay();
let editingEventId = null;
let userLocation = null;
let showSupplements = true;
let supplementTimes = null;
let supplementRemindersEnabled = false;
let userSupplements = [];


// DOM elements
const dayTabs = document.getElementById('dayTabs');
const scheduleContainer = document.getElementById('scheduleContainer');
const eventModal = document.getElementById('eventModal');
const weeklyOverview = document.getElementById('weeklyOverview');
const mapContainer = document.getElementById('mapContainer');

let map = null;
let markers = [];
let directionsService = null;
let directionsRenderer = null;
let currentView = 'list';
let savedPlaces = [];

// Initialize basic stuff
loadEvents();
loadSavedPlaces();
loadSupplementSettings();
setupTabs();
updateClock();
setInterval(updateClock, 1000);
getLocation();

// Load supplement settings from sync storage
function loadSupplementSettings() {
  chrome.storage.sync.get(['supplementReminders', 'supplementTimes', 'userSupplements'], (result) => {
    supplementRemindersEnabled = result.supplementReminders !== false;
    supplementTimes = result.supplementTimes || {
      morning: '08:00',
      afternoon: '14:00',
      dinner: '18:30',
      night: '21:30'
    };
    userSupplements = result.userSupplements || [];

    // Update toggle state
    const checkbox = document.getElementById('showSupplementsCheckbox');
    const toggle = document.getElementById('showSupplementsToggle');

    if (!supplementRemindersEnabled) {
      checkbox.checked = false;
      toggle.style.opacity = '0.5';
      toggle.title = 'Supplements disabled in settings';
    }

    renderAll();
  });
}

// Handle supplement toggle
document.getElementById('showSupplementsCheckbox').addEventListener('change', (e) => {
  showSupplements = e.target.checked;
  renderAll();
});

// Google Maps callback - called when API is fully loaded
window.onGoogleMapsLoaded = function() {
  console.log('Google Maps API loaded');
  // Map is ready for use in map view
};

// Store autocomplete instance globally so we can update it
let placesAutocomplete = null;

// Initialize Places Autocomplete
function initPlacesAutocomplete() {
  if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
    console.log('Google Maps Places not ready yet');
    return;
  }

  const input = document.getElementById('eventLocation');
  if (!input) {
    console.log('Location input not found');
    return;
  }

  // Don't re-initialize if already done
  if (placesAutocomplete) return;

  console.log('Initializing Places Autocomplete');

  placesAutocomplete = new google.maps.places.Autocomplete(input, {
    types: ['establishment', 'geocode'],
    fields: ['formatted_address', 'name', 'geometry']
  });

  // Bias results to user's location
  if (userLocation) {
    const circle = new google.maps.Circle({
      center: userLocation,
      radius: 50000 // 50km radius
    });
    placesAutocomplete.setBounds(circle.getBounds());
  }

  // When a place is selected
  placesAutocomplete.addListener('place_changed', () => {
    const place = placesAutocomplete.getPlace();

    if (place.geometry) {
      // Use the place name + address for better readability
      const displayName = place.name && place.formatted_address
        ? `${place.name}, ${place.formatted_address}`
        : place.formatted_address || place.name;

      input.value = displayName;

      // Auto-calculate travel time
      if (userLocation) {
        const destination = place.geometry.location;
        calculateTravelFromCoords(userLocation, {
          lat: destination.lat(),
          lng: destination.lng()
        });
      }
    }
  });
}

// Calculate travel time from coordinates
async function calculateTravelFromCoords(origin, destination) {
  const statusEl = document.getElementById('travelCalcStatus');
  statusEl.textContent = 'Calculating drive time...';
  statusEl.style.color = '#fbbf24';

  try {
    const service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix({
      origins: [new google.maps.LatLng(origin.lat, origin.lng)],
      destinations: [new google.maps.LatLng(destination.lat, destination.lng)],
      travelMode: google.maps.TravelMode.DRIVING
    }, (response, status) => {
      if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
        const duration = response.rows[0].elements[0].duration;
        const durationMinutes = Math.ceil(duration.value / 60);

        document.getElementById('eventTravel').value = durationMinutes;
        statusEl.textContent = `✓ ${duration.text} from your location`;
        statusEl.style.color = '#4ade80';
      } else {
        statusEl.textContent = 'Could not calculate drive time';
        statusEl.style.color = '#f87171';
      }
    });
  } catch (error) {
    console.error('Travel calc error:', error);
    statusEl.textContent = 'Error calculating drive time';
    statusEl.style.color = '#f87171';
  }
}

// Get user location
function getLocation() {
  const dot = document.getElementById('locationDot');
  const text = document.getElementById('locationText');

  if (!navigator.geolocation) {
    text.textContent = 'Location not supported';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      dot.classList.add('active');
      text.textContent = 'Location active';

      // Save location
      chrome.storage.local.set({ userLocation });

      // Update autocomplete bounds with new location
      if (placesAutocomplete && google && google.maps) {
        const circle = new google.maps.Circle({
          center: userLocation,
          radius: 50000
        });
        placesAutocomplete.setBounds(circle.getBounds());
      }
    },
    (error) => {
      text.textContent = 'Location unavailable';
      console.log('Geolocation error:', error);
    },
    { enableHighAccuracy: true }
  );
}

// Load events from storage
function loadEvents() {
  chrome.storage.local.get(['weeklyEvents'], (result) => {
    events = result.weeklyEvents || [];
    renderAll();
  });
}

// Load saved places from storage
function loadSavedPlaces() {
  chrome.storage.local.get(['savedPlaces'], (result) => {
    savedPlaces = result.savedPlaces || [];
    updatePlacesDropdown();
    renderSavedPlacesList();
  });
}

// Save places to storage
function savePlaces() {
  chrome.storage.local.set({ savedPlaces }, () => {
    updatePlacesDropdown();
    renderSavedPlacesList();
  });
}

// Update the dropdown in the event modal
function updatePlacesDropdown() {
  const select = document.getElementById('eventLocationSelect');
  if (!select) return;

  select.innerHTML = '<option value="">-- Select a saved place --</option>';

  savedPlaces.forEach(place => {
    const option = document.createElement('option');
    option.value = JSON.stringify(place);
    option.textContent = `${place.name} (${place.travelTime} min)`;
    select.appendChild(option);
  });
}

// Render saved places in the management modal
function renderSavedPlacesList() {
  const container = document.getElementById('savedPlacesList');
  if (!container) return;

  if (savedPlaces.length === 0) {
    container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No places saved yet</p>';
    return;
  }

  container.innerHTML = savedPlaces.map((place, index) => `
    <div class="saved-place-item">
      <div class="saved-place-icon">📍</div>
      <div class="saved-place-info">
        <div class="saved-place-name">${place.name}</div>
        <div class="saved-place-address">${place.address}</div>
      </div>
      <div class="saved-place-travel">${place.travelTime} min</div>
      <button class="saved-place-delete" data-index="${index}">×</button>
    </div>
  `).join('');

  // Add delete handlers
  container.querySelectorAll('.saved-place-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      savedPlaces.splice(index, 1);
      savePlaces();
    });
  });
}

// Save events to storage
function saveEvents() {
  chrome.storage.local.set({ weeklyEvents: events }, () => {
    renderAll();
  });
}

// Setup day tabs
function setupTabs() {
  dayTabs.innerHTML = '';

  DAYS.forEach((day, index) => {
    const tab = document.createElement('button');
    tab.className = 'tab' + (index === currentDay ? ' active' : '');
    tab.textContent = day;
    tab.addEventListener('click', () => {
      currentDay = index;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderSchedule();
    });
    dayTabs.appendChild(tab);
  });
}

// Render everything
function renderAll() {
  renderOverview();
  renderSchedule();
  updateNextEvent();
}

// Render weekly overview
function renderOverview() {
  weeklyOverview.innerHTML = '';
  const today = new Date().getDay();
  const supplementCount = showSupplements && supplementRemindersEnabled ? 4 : 0;

  DAYS.forEach((day, index) => {
    const dayEvents = events.filter(e => e.days.includes(index));
    const totalEvents = dayEvents.length + supplementCount;
    const div = document.createElement('div');
    div.className = 'overview-day' + (index === today ? ' today' : '');
    div.innerHTML = `
      <div class="overview-day-name">${SHORT_DAYS[index]}</div>
      <div class="overview-count">${totalEvents}</div>
      <div class="overview-label">${supplementCount > 0 ? `${dayEvents.length}+💊` : 'events'}</div>
    `;
    div.addEventListener('click', () => {
      currentDay = index;
      document.querySelectorAll('.tab').forEach((t, i) => {
        t.classList.toggle('active', i === index);
      });
      renderSchedule();
    });
    weeklyOverview.appendChild(div);
  });
}

// Check for either/or conflicts in a list of supplements
function getEitherOrWarnings(supplements) {
  const warnings = [];
  const suppNames = supplements.map(s => s.name.toLowerCase());
  const suppIds = supplements.map(s => s.id);

  for (const [groupId, group] of Object.entries(EITHER_OR_GROUPS)) {
    const matchingSupps = supplements.filter(s =>
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

// Get supplement events for display
function getSupplementEvents() {
  if (!showSupplements || !supplementRemindersEnabled || !supplementTimes) {
    return [];
  }

  const slotNames = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    dinner: 'Dinner',
    night: 'Night'
  };

  const slotTips = {
    morning: 'Take with breakfast',
    afternoon: 'Take with food or as directed',
    dinner: 'Take with dinner',
    night: 'Take before bed'
  };

  const events = [];

  Object.entries(supplementTimes).forEach(([slot, time]) => {
    // Get user's actual supplements for this slot
    const slotSupplements = userSupplements.filter(s => s.slot === slot);

    // Check for either/or warnings in this slot
    const eitherOrWarnings = getEitherOrWarnings(slotSupplements);

    // Format: "Vitamin D (with fats), Magnesium (for sleep)"
    const supplementList = slotSupplements.map(s => {
      const shortWhy = s.why ? s.why.split(' - ')[0].substring(0, 30) : '';
      return s.name + (shortWhy ? ` (${shortWhy})` : '');
    });
    const supplementNames = supplementList.join(', ');

    // Only show slot if there are supplements OR if user hasn't set up any yet (show placeholder)
    if (slotSupplements.length > 0 || userSupplements.length === 0) {
      events.push({
        id: `supplement_${slot}`,
        name: `${slotNames[slot]} Supplements`,
        details: supplementNames || 'Set up in Supplement Schedule',
        tip: slotTips[slot],
        time: time,
        duration: 5,
        isSupplement: true,
        supplementCount: slotSupplements.length,
        supplements: slotSupplements,
        eitherOrWarnings: eitherOrWarnings,
        days: [0, 1, 2, 3, 4, 5, 6] // Every day
      });
    }
  });

  return events;
}

// Render schedule for current day
function renderSchedule() {
  // Get regular events
  let dayEvents = events
    .filter(e => e.days.includes(currentDay));

  // Add supplement events if enabled
  const supplementEvents = getSupplementEvents().filter(e => e.days.includes(currentDay));
  dayEvents = [...dayEvents, ...supplementEvents];

  // Sort by time
  dayEvents.sort((a, b) => {
    const timeA = a.time.split(':').map(Number);
    const timeB = b.time.split(':').map(Number);
    return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
  });

  if (dayEvents.length === 0 || (dayEvents.length > 0 && dayEvents.every(e => e.isSupplement) && !showSupplements)) {
    scheduleContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <p>No events scheduled for ${DAYS[currentDay]}</p>
      </div>
      <button class="add-event-btn" id="addEventBtn">+ Add Event</button>
      <div class="templates">
        <div class="templates-title">Quick Add</div>
        <div class="template-btns">
          <button class="template-btn" data-template="gym">🏋️ Gym</button>
          <button class="template-btn" data-template="laundry">🧺 Laundry</button>
          <button class="template-btn" data-template="groceries">🛒 Groceries</button>
          <button class="template-btn" data-template="work">💼 Work</button>
          <button class="template-btn" data-template="meal">🍽️ Meal Prep</button>
        </div>
      </div>
    `;
    attachScheduleListeners();
    return;
  }

  let html = '<div class="event-list">';

  dayEvents.forEach((event, index) => {
    // Show travel time indicator between events (not for supplements)
    if (event.travelTime > 0 && !event.isSupplement) {
      html += `
        <div class="travel-indicator">
          <div class="travel-line"></div>
          <span class="travel-time">🚗 ${event.travelTime} min drive</span>
          <div class="travel-line"></div>
        </div>
      `;
    }

    const endTime = calculateEndTime(event.time, event.duration);

    if (event.isSupplement) {
      // Supplement event - special styling, clickable to edit
      const countBadge = event.supplementCount > 0 ? `${event.supplementCount} supps` : 'Setup';

      // Build either/or warning HTML if any
      let warningHtml = '';
      if (event.eitherOrWarnings && event.eitherOrWarnings.length > 0) {
        warningHtml = event.eitherOrWarnings.map(w =>
          `<div style="background: rgba(251, 191, 36, 0.2); border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 6px; padding: 6px 10px; margin-top: 8px; font-size: 0.75rem;">
            <span style="color: #fbbf24;">⚠️ ${w.supplements.join(' & ')}</span>
            <span style="color: #fcd34d; display: block; margin-top: 2px;">${w.message}</span>
          </div>`
        ).join('');
      }

      html += `
        <div class="event-item supplement" style="cursor: pointer;" data-supplement-click="true">
          <div class="event-time">
            <div class="event-time-display">${formatTime(event.time)}</div>
            <div class="event-duration">${event.duration} min</div>
          </div>
          <div class="event-details">
            <div class="event-name">💊 ${event.name}<span class="supplement-badge">${countBadge}</span></div>
            <div class="supplement-details">${event.details}</div>
            <div style="font-size: 0.75rem; color: #c4b5fd; margin-top: 4px;">📝 ${event.tip}</div>
            ${warningHtml}
          </div>
          <div class="event-actions">
            <button class="event-btn open-supplements-btn" style="background: rgba(168, 85, 247, 0.2); color: #a855f7;">View</button>
          </div>
        </div>
      `;
    } else {
      // Regular event
      html += `
        <div class="event-item">
          <div class="event-time">
            <div class="event-time-display">${formatTime(event.time)}</div>
            <div class="event-duration">${event.duration} min</div>
          </div>
          <div class="event-details">
            <div class="event-name">${event.name}</div>
            ${event.location ? `<div class="event-location">📍 ${event.location}</div>` : ''}
            ${event.notes ? `<div class="event-location" style="color: #64748b;">📝 ${event.notes}</div>` : ''}
            <div class="event-travel" style="color: #64748b;">Ends at ${formatTime(endTime)}</div>
          </div>
          <div class="event-actions">
            <button class="event-btn edit-btn" data-id="${event.id}">Edit</button>
            <button class="event-btn delete delete-btn" data-id="${event.id}">Delete</button>
          </div>
        </div>
      `;
    }
  });

  html += '</div>';
  html += '<button class="add-event-btn" id="addEventBtn">+ Add Event</button>';

  scheduleContainer.innerHTML = html;
  attachScheduleListeners();
}

// Attach event listeners after rendering
function attachScheduleListeners() {
  // Add event button
  const addBtn = document.getElementById('addEventBtn');
  if (addBtn) {
    addBtn.addEventListener('click', openAddModal);
  }

  // Template buttons
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addTemplate(btn.dataset.template);
    });
  });

  // Edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      editEvent(btn.dataset.id);
    });
  });

  // Delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteEvent(btn.dataset.id);
    });
  });

  // Supplement view buttons - open supplement schedule
  document.querySelectorAll('.open-supplements-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.tabs.create({ url: chrome.runtime.getURL('supplement-schedule.html') });
    });
  });
}

// Update clock and next event
function updateClock() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  document.getElementById('currentTime').textContent =
    `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;

  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  document.getElementById('currentDate').textContent =
    now.toLocaleDateString('en-US', options);
}

// Update next event display
function updateNextEvent() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const today = now.getDay();

  // Get today's regular events
  let todayEvents = events
    .filter(e => e.days.includes(today))
    .map(e => {
      const [h, m] = e.time.split(':').map(Number);
      return { ...e, minutes: h * 60 + m };
    });

  // Add supplement events if enabled
  if (showSupplements && supplementRemindersEnabled) {
    const supplementEvents = getSupplementEvents().map(e => {
      const [h, m] = e.time.split(':').map(Number);
      return { ...e, minutes: h * 60 + m };
    });
    todayEvents = [...todayEvents, ...supplementEvents];
  }

  // Filter to upcoming and sort
  todayEvents = todayEvents
    .filter(e => e.minutes > currentMinutes)
    .sort((a, b) => a.minutes - b.minutes);

  const nextEventName = document.getElementById('nextEventName');
  const nextEventEta = document.getElementById('nextEventEta');

  if (todayEvents.length > 0) {
    const next = todayEvents[0];
    nextEventName.textContent = next.isSupplement ? `💊 ${next.name}` : next.name;

    const minutesUntil = next.minutes - currentMinutes;

    if (next.isSupplement) {
      // Supplement reminder
      if (minutesUntil <= 5) {
        nextEventEta.textContent = `Take now!`;
        nextEventEta.style.color = '#a855f7';
      } else if (minutesUntil <= 15) {
        nextEventEta.textContent = `In ${minutesUntil} min`;
        nextEventEta.style.color = '#c4b5fd';
      } else {
        nextEventEta.textContent = `In ${minutesUntil} min`;
        nextEventEta.style.color = '#a855f7';
      }
    } else {
      // Regular event with travel time
      const leaveTime = minutesUntil - (next.travelTime || 0);

      if (leaveTime <= 0) {
        nextEventEta.textContent = `Leave now! ${next.travelTime}min drive`;
        nextEventEta.style.color = '#f87171';
      } else if (leaveTime <= 15) {
        nextEventEta.textContent = `Leave in ${leaveTime} min`;
        nextEventEta.style.color = '#fbbf24';
      } else {
        nextEventEta.textContent = `In ${minutesUntil} min` + (next.travelTime ? ` (leave in ${leaveTime} min)` : '');
        nextEventEta.style.color = '#4ade80';
      }
    }
  } else {
    nextEventName.textContent = 'Nothing else today';
    nextEventEta.textContent = '';
  }
}

// Format time to 12-hour
function formatTime(time) {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hours = h % 12 || 12;
  return `${hours}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Calculate end time
function calculateEndTime(startTime, duration) {
  const [h, m] = startTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + duration;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
}

// Open add modal
function openAddModal() {
  editingEventId = null;
  document.getElementById('modalTitle').textContent = 'Add Event';
  document.getElementById('eventName').value = '';
  document.getElementById('eventTime').value = '09:00';
  document.getElementById('eventDuration').value = '60';
  document.getElementById('eventLocation').value = '';
  document.getElementById('eventLocationSelect').value = '';
  document.getElementById('eventTravel').value = '0';
  document.getElementById('eventNotes').value = '';
  document.getElementById('travelCalcStatus').textContent = '';

  // Update places dropdown
  updatePlacesDropdown();

  // Select current day by default
  document.querySelectorAll('.day-checkbox').forEach(cb => {
    cb.classList.toggle('selected', parseInt(cb.dataset.day) === currentDay);
  });

  eventModal.classList.add('active');
}

// Edit event
function editEvent(id) {
  const event = events.find(e => e.id === id);
  if (!event) return;

  editingEventId = id;
  document.getElementById('modalTitle').textContent = 'Edit Event';
  document.getElementById('eventName').value = event.name;
  document.getElementById('eventTime').value = event.time;
  document.getElementById('eventDuration').value = event.duration;
  document.getElementById('eventLocation').value = event.location || '';
  document.getElementById('eventTravel').value = event.travelTime || 0;
  document.getElementById('eventNotes').value = event.notes || '';

  document.querySelectorAll('.day-checkbox').forEach(cb => {
    cb.classList.toggle('selected', event.days.includes(parseInt(cb.dataset.day)));
  });

  eventModal.classList.add('active');
}

// Delete event
function deleteEvent(id) {
  if (confirm('Delete this event?')) {
    events = events.filter(e => e.id !== id);
    saveEvents();
  }
}

// Add template
function addTemplate(type) {
  const templates = {
    gym: { name: 'Gym', duration: 90, time: '06:00' },
    laundry: { name: 'Laundry', duration: 60, time: '10:00' },
    groceries: { name: 'Grocery Shopping', duration: 45, time: '11:00' },
    work: { name: 'Work', duration: 480, time: '09:00' },
    meal: { name: 'Meal Prep', duration: 60, time: '18:00' }
  };

  const template = templates[type];
  if (!template) return;

  document.getElementById('eventName').value = template.name;
  document.getElementById('eventTime').value = template.time;
  document.getElementById('eventDuration').value = template.duration;

  openAddModal();
  document.getElementById('eventName').value = template.name;
  document.getElementById('eventTime').value = template.time;
  document.getElementById('eventDuration').value = template.duration;
}

// Day selector
document.querySelectorAll('.day-checkbox').forEach(cb => {
  cb.addEventListener('click', () => {
    cb.classList.toggle('selected');
  });
});

// Cancel button
document.getElementById('cancelEventBtn').addEventListener('click', () => {
  eventModal.classList.remove('active');
});

// Save event
document.getElementById('saveEventBtn').addEventListener('click', () => {
  const name = document.getElementById('eventName').value.trim();
  const time = document.getElementById('eventTime').value;
  const duration = parseInt(document.getElementById('eventDuration').value) || 60;
  const location = document.getElementById('eventLocation').value.trim();
  const travelTime = parseInt(document.getElementById('eventTravel').value) || 0;
  const notes = document.getElementById('eventNotes').value.trim();

  const selectedDays = [];
  document.querySelectorAll('.day-checkbox.selected').forEach(cb => {
    selectedDays.push(parseInt(cb.dataset.day));
  });

  if (!name) {
    alert('Please enter an event name');
    return;
  }

  if (selectedDays.length === 0) {
    alert('Please select at least one day');
    return;
  }

  if (editingEventId) {
    // Update existing event
    const index = events.findIndex(e => e.id === editingEventId);
    if (index !== -1) {
      events[index] = {
        ...events[index],
        name,
        time,
        duration,
        location,
        travelTime,
        notes,
        days: selectedDays
      };
    }
  } else {
    // Add new event
    events.push({
      id: Date.now().toString(),
      name,
      time,
      duration,
      location,
      travelTime,
      notes,
      days: selectedDays
    });
  }

  saveEvents();
  eventModal.classList.remove('active');
});

// Close modal on background click
eventModal.addEventListener('click', (e) => {
  if (e.target === eventModal) {
    eventModal.classList.remove('active');
  }
});

// Back link
document.getElementById('backLink').addEventListener('click', (e) => {
  e.preventDefault();
  window.close();
});

// Update next event every minute
setInterval(updateNextEvent, 60000);

// ===== SAVED PLACES =====

const placesModal = document.getElementById('placesModal');

// Open places modal
document.getElementById('managePlacesBtn').addEventListener('click', () => {
  renderSavedPlacesList();
  placesModal.classList.add('active');
});

// Close places modal
document.getElementById('closePlacesBtn').addEventListener('click', () => {
  placesModal.classList.remove('active');
});

// Close on background click
placesModal.addEventListener('click', (e) => {
  if (e.target === placesModal) {
    placesModal.classList.remove('active');
  }
});

// Add new place
document.getElementById('addNewPlaceBtn').addEventListener('click', () => {
  const name = document.getElementById('newPlaceName').value.trim();
  const address = document.getElementById('newPlaceAddress').value.trim();
  const travelTime = parseInt(document.getElementById('newPlaceTravel').value) || 15;

  if (!name || !address) {
    alert('Please enter both a name and address');
    return;
  }

  savedPlaces.push({ name, address, travelTime });
  savePlaces();

  // Clear inputs
  document.getElementById('newPlaceName').value = '';
  document.getElementById('newPlaceAddress').value = '';
  document.getElementById('newPlaceTravel').value = '15';
});

// Handle place selection from dropdown
document.getElementById('eventLocationSelect').addEventListener('change', (e) => {
  if (!e.target.value) return;

  try {
    const place = JSON.parse(e.target.value);
    document.getElementById('eventLocation').value = place.address;
    document.getElementById('eventTravel').value = place.travelTime;
    document.getElementById('travelCalcStatus').textContent = `✓ ${place.name} - ${place.travelTime} min`;
    document.getElementById('travelCalcStatus').style.color = '#4ade80';
  } catch (err) {
    console.error('Error parsing place:', err);
  }
});

// Save current location as a place
document.getElementById('saveLocationBtn').addEventListener('click', () => {
  const address = document.getElementById('eventLocation').value.trim();
  const travelTime = parseInt(document.getElementById('eventTravel').value) || 15;

  if (!address) {
    alert('Enter a location first');
    return;
  }

  const name = prompt('Give this place a name (e.g., Gym, Work):');
  if (!name) return;

  savedPlaces.push({ name: name.trim(), address, travelTime });
  savePlaces();

  document.getElementById('travelCalcStatus').textContent = `✓ Saved as "${name.trim()}"`;
  document.getElementById('travelCalcStatus').style.color = '#4ade80';
});

// Calculate travel time using Google Maps API
async function calculateTravelTime(origin, destination) {
  const statusEl = document.getElementById('travelCalcStatus');
  statusEl.textContent = 'Calculating...';
  statusEl.style.color = '#fbbf24';

  try {
    // Use the Directions API
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

    // Since we can't call the API directly from browser (CORS), use a different approach
    // We'll use the Distance Matrix API which supports JSONP-style or we use the embed

    // Actually, let's use the Distance Matrix API with fetch
    const distanceUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(distanceUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
      const durationSeconds = data.rows[0].elements[0].duration.value;
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const durationText = data.rows[0].elements[0].duration.text;

      document.getElementById('eventTravel').value = durationMinutes;
      statusEl.textContent = `✓ ${durationText} drive`;
      statusEl.style.color = '#4ade80';
      return durationMinutes;
    } else {
      throw new Error(data.rows?.[0]?.elements?.[0]?.status || data.status);
    }
  } catch (error) {
    console.error('Travel calc error:', error);
    statusEl.textContent = `Could not calculate: ${error.message}`;
    statusEl.style.color = '#f87171';
    return null;
  }
}

// View toggle handlers
document.getElementById('listViewBtn').addEventListener('click', () => {
  currentView = 'list';
  document.getElementById('listViewBtn').classList.add('active');
  document.getElementById('mapViewBtn').classList.remove('active');
  scheduleContainer.style.display = 'block';
  mapContainer.style.display = 'none';
});

document.getElementById('mapViewBtn').addEventListener('click', () => {
  currentView = 'map';
  document.getElementById('mapViewBtn').classList.add('active');
  document.getElementById('listViewBtn').classList.remove('active');
  scheduleContainer.style.display = 'none';
  mapContainer.style.display = 'block';
  initMap();
  renderMapView();
});

// Initialize Google Map
function initMap() {
  if (map) return; // Already initialized

  const defaultCenter = userLocation || { lat: 39.8283, lng: -98.5795 }; // US center as default

  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: defaultCenter,
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e2e4a' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f0f1a' }] },
      { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e1e3a' }] },
      { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] }
    ]
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map: map,
    suppressMarkers: true,
    polylineOptions: {
      strokeColor: '#4ade80',
      strokeWeight: 4,
      strokeOpacity: 0.8
    }
  });

  // Center on user location if available
  if (userLocation) {
    map.setCenter(userLocation);
  }
}

// Render the map view with events
async function renderMapView() {
  const dayEvents = events
    .filter(e => e.days.includes(currentDay) && e.location)
    .sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

  // Clear existing markers
  markers.forEach(m => m.setMap(null));
  markers = [];

  if (dayEvents.length === 0) {
    document.getElementById('routeInfo').innerHTML = `
      <p style="text-align: center; color: #64748b;">No events with locations for ${DAYS[currentDay]}</p>
    `;
    document.getElementById('mapEventsList').innerHTML = '';
    directionsRenderer.setDirections({ routes: [] });
    return;
  }

  // Add markers for each event
  const geocoder = new google.maps.Geocoder();
  const bounds = new google.maps.LatLngBounds();
  const locations = [];

  for (let i = 0; i < dayEvents.length; i++) {
    const event = dayEvents[i];
    try {
      const result = await geocodeAddress(geocoder, event.location);
      if (result) {
        locations.push({ event, location: result });
        bounds.extend(result);

        const marker = new google.maps.Marker({
          position: result,
          map: map,
          label: {
            text: String(i + 1),
            color: 'white',
            fontWeight: 'bold'
          },
          title: event.name
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="color: #1a1a2e; padding: 5px;">
            <strong>${event.name}</strong><br>
            ${formatTime(event.time)} - ${event.duration} min<br>
            ${event.location}
          </div>`
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        markers.push(marker);
      }
    } catch (e) {
      console.log('Could not geocode:', event.location);
    }
  }

  // Fit map to show all markers
  if (locations.length > 0) {
    map.fitBounds(bounds);
    if (locations.length === 1) {
      map.setZoom(14);
    }
  }

  // Draw route if multiple locations
  if (locations.length >= 2) {
    await drawRoute(locations);
  }

  // Render events list for map view
  renderMapEventsList(dayEvents, locations);
}

// Geocode an address
function geocodeAddress(geocoder, address) {
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        resolve(results[0].geometry.location);
      } else {
        reject(status);
      }
    });
  });
}

// Draw route between locations
async function drawRoute(locations) {
  if (locations.length < 2) return;

  const origin = locations[0].location;
  const destination = locations[locations.length - 1].location;
  const waypoints = locations.slice(1, -1).map(l => ({
    location: l.location,
    stopover: true
  }));

  try {
    const result = await new Promise((resolve, reject) => {
      directionsService.route({
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false
      }, (response, status) => {
        if (status === 'OK') resolve(response);
        else reject(status);
      });
    });

    directionsRenderer.setDirections(result);

    // Calculate total travel time
    let totalSeconds = 0;
    let totalMeters = 0;
    result.routes[0].legs.forEach(leg => {
      totalSeconds += leg.duration.value;
      totalMeters += leg.distance.value;
    });

    const totalMinutes = Math.round(totalSeconds / 60);
    const totalMiles = (totalMeters / 1609.34).toFixed(1);

    document.getElementById('routeInfo').innerHTML = `
      <div class="route-summary">
        <div class="route-stat">
          <div class="route-stat-value">${locations.length}</div>
          <div class="route-stat-label">Stops</div>
        </div>
        <div class="route-stat">
          <div class="route-stat-value">${totalMinutes} min</div>
          <div class="route-stat-label">Total Drive</div>
        </div>
        <div class="route-stat">
          <div class="route-stat-value">${totalMiles} mi</div>
          <div class="route-stat-label">Distance</div>
        </div>
      </div>
    `;

    // Update individual travel times
    for (let i = 1; i < locations.length; i++) {
      const leg = result.routes[0].legs[i - 1];
      const eventId = locations[i].event.id;
      const travelMins = Math.round(leg.duration.value / 60);

      // Update event's travel time
      const eventIndex = events.findIndex(e => e.id === eventId);
      if (eventIndex !== -1) {
        events[eventIndex].travelTime = travelMins;
      }
    }

    saveEvents();

  } catch (error) {
    console.error('Route error:', error);
    document.getElementById('routeInfo').innerHTML = `
      <p style="text-align: center; color: #f87171;">Could not calculate route</p>
    `;
  }
}

// Render map events list with reorder controls
function renderMapEventsList(dayEvents, locations) {
  const container = document.getElementById('mapEventsList');

  let html = '<div style="font-size: 0.85rem; color: #64748b; margin-bottom: 10px;">Drag to reorder or use arrows</div>';

  dayEvents.forEach((event, index) => {
    const locData = locations.find(l => l.event.id === event.id);
    const travelText = event.travelTime ? `${event.travelTime} min drive` : '';

    html += `
      <div class="map-event-item" data-id="${event.id}">
        <div class="map-event-number">${index + 1}</div>
        <div class="map-event-details">
          <div class="map-event-name">${event.name}</div>
          <div class="map-event-location">${event.location || 'No location'}</div>
        </div>
        <div class="map-event-travel">${travelText}</div>
        <div class="map-event-arrows">
          <button class="arrow-btn move-up" data-id="${event.id}" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button class="arrow-btn move-down" data-id="${event.id}" ${index === dayEvents.length - 1 ? 'disabled' : ''}>↓</button>
        </div>
      </div>
    `;
  });

  html += '<button class="recalc-btn" id="recalcRouteBtn">🔄 Recalculate Route</button>';

  container.innerHTML = html;

  // Add event listeners for reorder buttons
  container.querySelectorAll('.move-up').forEach(btn => {
    btn.addEventListener('click', () => moveEvent(btn.dataset.id, -1));
  });

  container.querySelectorAll('.move-down').forEach(btn => {
    btn.addEventListener('click', () => moveEvent(btn.dataset.id, 1));
  });

  document.getElementById('recalcRouteBtn').addEventListener('click', () => {
    renderMapView();
  });
}

// Move event up or down in order
function moveEvent(eventId, direction) {
  const dayEvents = events
    .filter(e => e.days.includes(currentDay))
    .sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

  const index = dayEvents.findIndex(e => e.id === eventId);
  if (index === -1) return;

  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= dayEvents.length) return;

  // Swap times to reorder
  const thisEvent = dayEvents[index];
  const otherEvent = dayEvents[newIndex];

  const tempTime = thisEvent.time;
  thisEvent.time = otherEvent.time;
  otherEvent.time = tempTime;

  saveEvents();
  renderMapView();
}

// Calculate button handler
document.getElementById('calcTravelBtn').addEventListener('click', async () => {
  const destination = document.getElementById('eventLocation').value.trim();
  const statusEl = document.getElementById('travelCalcStatus');

  if (!destination) {
    statusEl.textContent = 'Enter a location first';
    statusEl.style.color = '#f87171';
    return;
  }

  statusEl.textContent = 'Getting your location...';
  statusEl.style.color = '#fbbf24';

  // Get origin - either user's current location or home address
  let origin;
  if (userLocation) {
    origin = `${userLocation.lat},${userLocation.lng}`;
  } else {
    // Try to get location
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      origin = `${position.coords.latitude},${position.coords.longitude}`;
      userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
    } catch (e) {
      statusEl.textContent = 'Could not get your location. Enter manually.';
      statusEl.style.color = '#f87171';
      return;
    }
  }

  statusEl.textContent = `Calculating from: ${origin}`;
  document.getElementById('travelCalcDetails').textContent = '';
  document.getElementById('eventTravel').value = '0'; // Reset to 0 so we can see if API updates it

  // Get departure time
  const departureSelect = document.getElementById('departureTime');
  const departureOption = departureSelect.value;
  let departureTime = null;

  if (departureOption !== 'now') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const hourMap = {
      'tomorrow_7am': 7,
      'tomorrow_8am': 8,
      'tomorrow_9am': 9,
      'tomorrow_5pm': 17,
      'tomorrow_6pm': 18
    };

    tomorrow.setHours(hourMap[departureOption], 0, 0, 0);
    departureTime = Math.floor(tomorrow.getTime() / 1000); // Unix timestamp
  }

  try {
    // Send request through background script to avoid CORS
    const response = await chrome.runtime.sendMessage({
      type: 'calculateTravelTime',
      origin: origin,
      destination: destination,
      apiKey: GOOGLE_MAPS_API_KEY,
      departureTime: departureTime
    });

    console.log('Full API response:', response);
    const detailsEl = document.getElementById('travelCalcDetails');

    if (!response.success) {
      statusEl.textContent = `API Error: ${response.error}`;
      statusEl.style.color = '#f87171';
      return;
    }

    if (response.data.error_message) {
      statusEl.textContent = `API Error: ${response.data.error_message}`;
      statusEl.style.color = '#f87171';
      detailsEl.textContent = 'Check if Distance Matrix API is enabled in Google Cloud Console';
      return;
    }

    if (response.data.status === 'OK' && response.data.rows[0].elements[0].status === 'OK') {
      const element = response.data.rows[0].elements[0];
      const duration = element.duration;
      const distance = element.distance;
      const durationMinutes = Math.ceil(duration.value / 60);

      document.getElementById('eventTravel').value = durationMinutes;
      const timeLabel = departureOption === 'now' ? 'current traffic' : departureSelect.options[departureSelect.selectedIndex].text;
      statusEl.textContent = `✓ ${duration.text} (${distance.text}) - ${timeLabel}`;
      statusEl.style.color = '#4ade80';

      // Show origin/destination for verification
      const originAddr = response.data.origin_addresses[0];
      const destAddr = response.data.destination_addresses[0];
      detailsEl.innerHTML = `From: ${originAddr}<br>To: ${destAddr}`;
    } else {
      const errorStatus = response.data?.rows?.[0]?.elements?.[0]?.status || response.data?.status || 'Unknown error';
      statusEl.textContent = `Could not calculate: ${errorStatus}`;
      statusEl.style.color = '#f87171';
      detailsEl.textContent = JSON.stringify(response.data).substring(0, 200);
    }
  } catch (error) {
    console.error('Travel calc error:', error);
    statusEl.textContent = `Error: ${error.message}`;
    statusEl.style.color = '#f87171';
    document.getElementById('travelCalcDetails').textContent = error.stack || 'No stack trace';
  }
});
