'use strict';
const $ = s => document.querySelector(s);
const SECTION_TITLES = { deadlines: 'Deadlines', eligibility: 'Who can enter', deliverables: 'What to submit', judging: 'How it’s judged', gotchas: 'Gotchas' };
const state = { slot: 'a', a: { form: {}, result: null }, b: { form: {}, result: null }, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, selected: null };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

// ---------- time zone ----------
function initTz() {
  const zones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Europe/Kyiv', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'UTC'];
  if (!zones.includes(state.tz)) zones.unshift(state.tz);
  $('#tz').innerHTML = zones.map(z => `<option ${z === state.tz ? 'selected' : ''}>${z}</option>`).join('');
  $('#tz').onchange = e => { state.tz = e.target.value; render(); };
}
function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-US', { timeZone: state.tz, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}
function countdown(iso) {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return { text: 'passed', cls: 'past' };
  const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4);
  return { text: d ? `${d}d ${h}h left` : `${h}h ${m}m left`, cls: ms < 48 * 36e5 ? 'soon' : '' };
}

// ---------- ticks ----------
const tickKey = r => 'fineprint:' + hash(r.sourceText);
const getTicks = r => new Set(JSON.parse(localStorage.getItem(tickKey(r)) || '[]'));
function setTick(r, id, on) { const t = getTicks(r); on ? t.add(id) : t.delete(id); localStorage.setItem(tickKey(r), JSON.stringify([...t])); }

// ---------- input ----------
function saveForm() { state[state.slot].form = { name: $('#name').value, url: $('#url').value, text: $('#text').value }; }
function loadForm() { const f = state[state.slot].form; $('#name').value = f.name || ''; $('#url').value = f.url || ''; $('#text').value = f.text || ''; }
document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  saveForm(); state.slot = t.dataset.slot; state.selected = null;
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
  $('#example').style.display = state.slot === 'a' ? '' : 'none';
  loadForm(); render();
});

function status(msg, err) { $('#status').textContent = msg || ''; $('#status').classList.toggle('err', !!err); }

async function api(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: 'Bad response from server' }));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

$('#input').onsubmit = async e => {
  e.preventDefault(); saveForm();
  const f = state[state.slot].form;
  if (!f.text.trim() && !f.url.trim()) return status('Paste a rules URL or the rules text first.', true);
  $('#go').disabled = true;
  status(`Reading the rules… (${state.modeLabel})`);
  try {
    const r = await api('/api/analyze', f.text.trim() ? { text: f.text } : { url: f.url });
    r.name = f.name.trim() || r.title || (state.slot === 'a' ? 'Contest A' : 'Contest B');
    state[state.slot].result = r; state.selected = null; state.compare = null;
    document.querySelector(`.tab[data-slot="${state.slot}"]`).classList.add('loaded');
    status(r.notice ? '' : `Done — ${r.items.length} items found.`);
    render();
  } catch (err) { status(err.message, true); }
  finally { $('#go').disabled = false; }
};

$('#example').onclick = async () => {
  const text = await (await fetch('/sample')).text();
  $('#text').value = text; $('#url').value = ''; $('#name').value = 'Sample: Pinecone Valley Civic App Challenge';
  $('#input').requestSubmit();
};

// ---------- source pane ----------
function renderSource(r, item) {
  const el = $('#source');
  if (!r) { el.classList.add('muted'); el.textContent = 'The rules text appears here. Click any checklist item to see the exact sentence it came from.'; $('#source-meta').textContent = ''; return; }
  el.classList.remove('muted');
  $('#source-meta').textContent = (r.url ? new URL(r.url).host + ' · ' : '') + r.sourceText.length.toLocaleString() + ' chars';
  const t = r.sourceText;
  if (item && item.verified && item.offset >= 0) {
    el.innerHTML = esc(t.slice(0, item.offset)) + '<mark id="hit">' + esc(t.slice(item.offset, item.offset + item.length)) + '</mark>' + esc(t.slice(item.offset + item.length));
    const hit = $('#hit'); el.scrollTop = hit.offsetTop - el.offsetTop - 80;
  } else el.textContent = t;
}

// ---------- checklist ----------
function render() {
  const r = state[state.slot].result;
  $('#empty').classList.toggle('hidden', !!r);
  $('#checklist').classList.toggle('hidden', !r);
  renderSource(r, r && r.items.find(i => i.id === state.selected));
  if (r) renderChecklist(r);
  renderCompare();
}

function renderChecklist(r) {
  const ticks = getTicks(r);
  const ver = r.items.filter(i => i.verified).length;
  const done = r.items.filter(i => ticks.has(i.id)).length;
  let h = `<div class="cl-head"><div><h2>${esc(r.name)}</h2>
    <div class="cl-stats">${r.items.length} items · <span class="badge ok">✓ ${ver} verified</span> ${r.items.length - ver ? `<span class="badge warn">⚠ ${r.items.length - ver} not found in rules</span>` : ''}
    · read by ${r.mode === 'ai' ? esc(r.model) : 'offline rules (no AI)'}</div></div>
    <div class="cl-stats">${done}/${r.items.length} done</div></div>
    <div class="progress"><div style="width:${r.items.length ? done / r.items.length * 100 : 0}%"></div></div>`;
  if (r.notice) h += `<div class="notice">${esc(r.notice)}</div>`;
  const next = r.items.filter(i => i.deadline && i.verified && new Date(i.deadline.iso) > Date.now() && !/starts/i.test(i.summary))
    .sort((x, y) => x.deadline.iso.localeCompare(y.deadline.iso))[0];
  if (next) { const c = countdown(next.deadline.iso); h += `<div class="next"><span>Next deadline</span><b>${esc(next.summary)}</b> · ${esc(fmtDate(next.deadline.iso))} <span class="cd ${c.cls}">${c.text}</span></div>`; }
  for (const sec of Object.keys(SECTION_TITLES)) {
    const items = r.items.filter(i => i.section === sec);
    h += `<div class="sec"><h3>${SECTION_TITLES[sec]} <small>${items.length || ''}</small></h3>`;
    if (!items.length) h += `<div class="none">Nothing found — check the source.</div>`;
    for (const it of items) {
      let dl = '';
      if (it.deadline) {
        const c = countdown(it.deadline.iso);
        dl = `<div class="dl"><b>${esc(fmtDate(it.deadline.iso))}</b><span class="cd ${c.cls}">${c.text}</span>
          <div class="orig">as written: “${esc(it.deadline.original)}”${it.deadline.zoneStated === false ? ' · no time zone stated, assumed UTC' : ''}${it.deadline.timeStated === false ? ' · no time stated, assumed 11:59 pm' : ''}</div></div>`;
      }
      const past = it.deadline && new Date(it.deadline.iso) < Date.now();
      h += `<div class="item ${past ? 'past' : ''} ${ticks.has(it.id) ? 'done' : ''} ${it.verified ? '' : 'unverified'} ${state.selected === it.id ? 'sel' : ''}" data-id="${it.id}">
        <input type="checkbox" ${ticks.has(it.id) ? 'checked' : ''} aria-label="done">
        <div><div class="sum">${esc(it.summary)}</div>${dl}</div>
        <span class="badge ${it.verified ? 'ok' : 'warn'}">${it.verified ? '✓ quote verified' : '⚠ quote not found'}</span>
        <div class="quote">${it.verified ? '' : 'The AI gave this quote, but it is not in the rules text — don’t rely on this item:\n'}“${esc(it.quote)}”</div></div>`;
    }
    h += '</div>';
  }
  $('#checklist').innerHTML = h;
  $('#checklist').querySelectorAll('.item').forEach(el => {
    el.querySelector('input').onclick = ev => { ev.stopPropagation(); setTick(r, el.dataset.id, ev.target.checked); render(); };
    el.onclick = () => { state.selected = state.selected === el.dataset.id ? null : el.dataset.id; render(); };
  });
}

// ---------- compare ----------
function renderCompare() {
  const box = $('#compare');
  const a = state.a.result, b = state.b.result;
  if (!a || !b) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  if (!state.compare) {
    box.innerHTML = `<h2>Can I stack these?</h2><p class="muted">Check whether one project can go into both <b>${esc(a.name)}</b> and <b>${esc(b.name)}</b>, using only quoted clauses.</p>
      <button class="primary" id="cmp">Compare the two rule sets</button>`;
    $('#cmp').onclick = runCompare;
    return;
  }
  const c = state.compare;
  let h = `<h2>Can I stack these?</h2><div class="verdict ${c.verdict.level}">${esc(c.verdict.text)}</div>`;
  if (c.deadlines.length) h += `<div class="dlines">${c.deadlines.map((d, i) => `<div class="dline">${i === 0 ? 'Due first' : 'Then'}: ${esc(d.name)}<b>${esc(fmtDate(d.iso))}</b>${countdown(d.iso).text}</div>`).join('')}</div>`;
  if (c.conflicts.length) h += `<h3>Differences that matter</h3><ul class="conf">${c.conflicts.map(x => `<li>${esc(x.text)}</li>`).join('')}</ul>`;
  for (const t of c.topics) {
    if (!t.a.length && !t.b.length) continue;
    const col = (name, qs) => `<div class="col"><h4>${esc(name)}</h4>${qs.length ? qs.map(q => `<q>${esc(q)}</q>`).join('') : '<div class="nf">No clause found.</div>'}</div>`;
    h += `<div class="topic"><h3>${esc(t.title)}</h3><div class="cols">${col(a.name, t.a)}${col(b.name, t.b)}</div></div>`;
  }
  box.innerHTML = h;
}
async function runCompare() {
  const a = state.a.result, b = state.b.result;
  $('#cmp').disabled = true;
  try {
    state.compare = await api('/api/compare', { a: { name: a.name, text: a.sourceText }, b: { name: b.name, text: b.sourceText } });
    renderCompare();
    $('#compare').scrollIntoView({ behavior: 'smooth' });
  } catch (e) { status(e.message, true); $('#cmp').disabled = false; }
}

// ---------- boot ----------
(async () => {
  initTz();
  try {
    const c = await (await fetch('/api/config')).json();
    state.modeLabel = c.mode === 'ai' ? `${c.model} on ${c.provider}` : 'offline mode';
    $('#mode').textContent = c.mode === 'ai' ? `AI: ${c.model}` : 'Offline mode — no AI key set';
    $('#mode').className = 'mode ' + c.mode;
  } catch { $('#mode').textContent = 'Server unreachable'; }
  render();
  setInterval(() => { if (state[state.slot].result) document.querySelectorAll('.cd').length && render(); }, 60000);
})();
