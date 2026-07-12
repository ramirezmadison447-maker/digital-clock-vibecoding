// Multi Time Zone Digital Clock (no external libs)
// Features: add/remove zones, 12/24 toggle, show/hide seconds, persistence via localStorage

const DEFAULT_ZONES = [
  'UTC',
  'Europe/London',
  'Europe/Madrid',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'Australia/Sydney'
];

const STORAGE_KEY = 'multi-tz-clocks:v1';

const zoneListEl = document.getElementById('clocks');
const addForm = document.getElementById('add-zone-form');
const zoneInput = document.getElementById('zone-input');
const hour12Toggle = document.getElementById('hour12-toggle');
const showSecondsToggle = document.getElementById('show-seconds-toggle');

let zones = loadZones();
let prefs = loadPrefs();

hour12Toggle.checked = prefs.hour12;
showSecondsToggle.checked = prefs.showSeconds;

hour12Toggle.addEventListener('change', () => {
  prefs.hour12 = hour12Toggle.checked;
  savePrefs();
  renderAll();
});
showSecondsToggle.addEventListener('change', () => {
  prefs.showSeconds = showSecondsToggle.checked;
  savePrefs();
  renderAll();
});

addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const zone = (zoneInput.value || '').trim();
  if (!zone) return;
  addZone(zone);
  zoneInput.value = '';
});

function loadZones(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  }catch(e){}
  return DEFAULT_ZONES.slice();
}

function saveZones(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
}

function loadPrefs(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY + ':prefs');
    if (raw) return JSON.parse(raw);
  }catch(e){}
  return { hour12: false, showSeconds: true };
}

function savePrefs(){
  localStorage.setItem(STORAGE_KEY + ':prefs', JSON.stringify(prefs));
}

function addZone(tz){
  // Validate by attempting to format a date with the zone
  try{
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
  }catch(e){
    alert('Invalid time zone name. Use an IANA time zone like "Europe/Madrid" or "America/New_York".');
    return;
  }
  if (!zones.includes(tz)){
    zones.push(tz);
    saveZones();
    renderAll();
  } else {
    // Bring it to the top visually
    zones = zones.filter(z => z !== tz);
    zones.unshift(tz);
    saveZones();
    renderAll();
  }
}

function removeZone(tz){
  zones = zones.filter(z => z !== tz);
  saveZones();
  renderAll();
}

function createCard(zone){
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.tz = zone;

  const name = document.createElement('div');
  name.className = 'tz-name';
  name.textContent = zone;

  const time = document.createElement('div');
  time.className = 'time';
  time.textContent = '—:—';

  const meta = document.createElement('div');
  meta.className = 'meta';

  const offset = document.createElement('div');
  offset.className = 'offset';
  offset.textContent = '';

  const remove = document.createElement('button');
  remove.className = 'remove-btn';
  remove.type = 'button';
  remove.textContent = 'Remove';
  remove.addEventListener('click', () => removeZone(zone));

  meta.appendChild(offset);
  meta.appendChild(remove);
  card.appendChild(name);
  card.appendChild(time);
  card.appendChild(meta);

  return { card, timeEl: time, offsetEl: offset };
}

function formatTimeForZone(date, zone){
  // Use toLocaleTimeString with options
  const opts = {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: zone,
    hour12: prefs.hour12
  };
  if (prefs.showSeconds) opts.second = '2-digit';

  return date.toLocaleTimeString(undefined, opts);
}

function formatOffsetForZone(date, zone){
  // show abbreviation or GMT offset
  try{
    // Use timeZoneName short to get offset/abbr (browser dependent)
    const s = date.toLocaleString(undefined, { timeZone: zone, timeZoneName: 'short' });
    // s will include date/time + zone; extract part after the time (last token)
    const parts = s.split(',').pop().trim().split(' ');
    const tzname = parts[parts.length - 1];
    return tzname;
  }catch(e){
    return '';
  }
}

let cardCache = new Map();

function renderAll(){
  // Ensure there is a card for each zone in order
  zoneListEl.innerHTML = '';
  cardCache.clear();
  zones.forEach(zone => {
    const { card, timeEl, offsetEl } = createCard(zone);
    zoneListEl.appendChild(card);
    cardCache.set(zone, { timeEl, offsetEl });
  });
  // Immediate update
  updateClocks();
}

function updateClocks(){
  const now = new Date();
  for (const zone of zones){
    const entry = cardCache.get(zone);
    if (!entry) continue;
    entry.timeEl.textContent = formatTimeForZone(now, zone);
    entry.offsetEl.textContent = formatOffsetForZone(now, zone);
  }
}

// Initial render
renderAll();

// Update every 1s (aligned)
let tick = () => {
  updateClocks();
  setTimeout(tick, 1000 - (Date.now() % 1000));
};
tick();