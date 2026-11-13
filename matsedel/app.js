'use strict';
const $ = id => document.getElementById(id);
const CACHE_KEY = 'olyckeskolan-menu-v1';
let currentData = null;
let currentSource = '';
let installPrompt = null;
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function swedishDate() {
  const parts = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function currentMonday(iso) {
  const day = new Date(iso + 'T12:00:00Z');
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  return day.toISOString().slice(0, 10);
}
function validMenu(data) {
  return data && typeof data.period === 'string' && Number.isInteger(data.week) && Array.isArray(data.days) && data.days.length === 5 && data.days.every(d => d && typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && typeof d.day === 'string' && typeof d.meal1 === 'string');
}
function mealMarkup(day) {
  return `<div><span class="today-label">DAGENS 1</span><p>${esc(day.meal1 || 'Ingen rätt angiven')}</p></div><div><span class="today-label">DAGENS 2</span><p>${esc(day.meal2 || 'Ingen rätt angiven')}</p></div>`;
}
function render(data, source) {
  currentData = data;
  currentSource = source;
  const today = swedishDate();
  const sameWeek = currentMonday(data.days[0].date) === currentMonday(today);
  const todaysMeal = data.days.find(d => d.date === today);
  const weekend = [0,6].includes(new Date(today + 'T12:00:00Z').getUTCDay());
  $('date-today').textContent = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Stockholm',weekday:'long',day:'numeric',month:'long'}).format(new Date());
  $('weekline').textContent = `VECKA ${data.week} • ${data.period}`;
  $('today-card').innerHTML = todaysMeal
    ? `<h2>Dagens lunch</h2><div class="today-meals">${mealMarkup(todaysMeal)}</div>`
    : weekend ? '<h2>Trevlig helg!</h2><p>Ingen skollunch serveras i dag. Här nedanför ser du den senast hämtade veckomenyn.</p>'
    : '<h2>Dagens meny saknas</h2><p>Vi har ännu ingen matsedel för i dag. Den senast hämtade veckomenyn visas nedanför.</p>';
  const notice = [];
  if (!sameWeek) notice.push(`Matsedeln gäller vecka ${data.week} (${data.period}), inte den här veckan. En ny meny har ännu inte hämtats.`);
  if (source === 'saved') notice.push('Kunde inte hämta en ny meny. En tidigare sparad matsedel visas.');
  $('menu-notice').hidden = !notice.length;
  $('menu-notice').textContent = notice.join(' ');
  $('load-status').textContent = `${source === 'saved' ? 'Sparad matsedel' : 'Matsedel'} • Uppdaterad ${data.updated || 'okänt datum'}${!navigator.onLine ? ' • Utan internet' : ''}`;
  $('status').textContent = `${source === 'saved' ? 'Sparad meny. ' : ''}Uppdaterad ${data.updated || 'okänt datum'}${!sameWeek ? ' • OBS! Gäller en tidigare eller annan vecka.' : ''}`;
  const wrap = $('days');
  wrap.innerHTML = '';
  for (const day of data.days) {
    const card = document.createElement('article');
    card.className = 'card' + (day.date === today ? ' is-today' : '');
    card.innerHTML = `<div class="dayhead">${esc(day.day.toUpperCase())} ${esc((day.date_label || day.date).toUpperCase())}${day.date === today ? '<span class="today-badge">I DAG</span>' : ''}</div><div class="plate"></div><div class="meal"><div class="label">DAGENS 1</div><div class="food">${esc(day.meal1 || '–')}</div></div><div class="meal alt"><div class="label">DAGENS 2</div><div class="food">${esc(day.meal2 || '–')}</div></div>`;
    wrap.appendChild(card);
  }
  const green = document.createElement('section');
  green.className = 'greenbox';
  green.innerHTML = `<b>MÅNADENS GRÖNT</b><span>${esc(data.monthly_green || 'Se salladsutbudet i restaurangen')}</span>`;
  wrap.appendChild(green);
}
async function loadMenu() {
  $('refresh-menu').disabled = true;
  $('load-status').textContent = 'Hämtar senaste matsedeln…';
  try {
    const response = await fetch('./menu.json', {cache:'no-store', signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw new Error('Matsedeln kunde inte hämtas');
    const data = await response.json();
    if (!validMenu(data)) throw new Error('Ogiltig matsedel');
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (_) { /* Private storage may be unavailable. */ }
    render(data, response.headers.get('X-Matsedel-Cache') === 'saved' ? 'saved' : 'live');
  } catch (_) {
    let data = currentData;
    if (!data) {
      try { data = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (_) { /* No saved menu. */ }
    }
    if (validMenu(data)) render(data, 'saved');
    else {
      $('today-card').innerHTML = '<h2>Matsedeln kunde inte hämtas</h2><p>Anslut till internet och tryck på Uppdatera. När du har öppnat matsedeln en gång kan den sparas på din enhet.</p>';
      $('load-status').textContent = 'Ingen sparad matsedel finns på den här enheten.';
      $('weekline').textContent = 'Ingen matsedel tillgänglig';
    }
  } finally { $('refresh-menu').disabled = false; }
}
$('refresh-menu').addEventListener('click', loadMenu);
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) {const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();} });
}
$('show-install').addEventListener('click', () => $('install-dialog').showModal());
$('show-qr').addEventListener('click', () => $('qr-dialog').showModal());
$('copy-link').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('https://thomasc900.github.io/lararverktyg/matsedel/');
    $('copy-status').textContent = 'Länken är kopierad!';
  } catch (_) { $('copy-status').textContent = 'Kopiera adressen som visas ovan.'; }
});
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event; $('install-app').hidden = false;
});
$('install-app').addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  const result = await installPrompt.userChoice;
  installPrompt = null; $('install-app').hidden = true;
  if (result.outcome === 'accepted') $('install-dialog').close();
});
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function installed() { $('show-install').hidden = true; $('install-dialog').close(); }
if (standalone()) installed();
window.addEventListener('appinstalled', installed);
if (new URLSearchParams(location.search).get('install') === '1' && !standalone()) $('install-dialog').showModal();
window.addEventListener('online', loadMenu);
window.addEventListener('offline', () => { if (currentData) render(currentData, currentSource); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) loadMenu(); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', {scope:'./'}).catch(() => {});
loadMenu();
