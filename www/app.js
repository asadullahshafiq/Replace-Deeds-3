/* ===================== Replace Deeds — App Logic ===================== */
const LS_KEY = "replace_deeds_data_v1";
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const EMOJIS = ["🌿","🕌","📖","💧","🏃","🧘","😴","🚭","💊","📵","🍎","💪","🧹","✍️","🎯","🙏","🌙","☀️","🧠","💰"];
const COLORS = ["#4fd1a5","#d4af37","#5b9bd5","#e2574c","#c084fc","#f472b6","#fb923c","#94a3b8"];

function todayStr(d = new Date()){
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove("show"), 2200);
}

/* ---------- State ---------- */
function defaultState(){
  return {
    habits: [],
    notes: [],
    timetable: [],
    settings: { theme:"dark", resetTaps: [] },
    customLayout: { background: { type:"default", value:"" }, elements: [] }
  };
}
let state = loadState();
function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultState(), parsed);
  }catch(e){ return defaultState(); }
}
function saveState(){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

/* ---------- Navigation ---------- */
let currentView = "habits";
function switchView(name){
  currentView = name;
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById("view-"+name).classList.add("active");
  document.querySelectorAll(".navbtn").forEach(b=>b.classList.toggle("active", b.dataset.view===name));
  document.getElementById("fabBtn").style.display = (name==="settings") ? "none" : "flex";
  renderView(name);
}
document.querySelectorAll(".navbtn").forEach(b=>{
  b.addEventListener("click", ()=>switchView(b.dataset.view));
});

function renderView(name){
  if(name==="habits") renderHabits();
  else if(name==="tdl") renderTdl();
  else if(name==="timetable") renderTimetable();
  else if(name==="analytics") renderAnalytics();
  else if(name==="settings") renderSettings();
  renderHeader();
}

/* ---------- Header: date/day + ring ---------- */
function renderHeader(){
  const now = new Date();
  const dl = document.getElementById("datelineTxt");
  dl.textContent = `${DAY_NAMES[now.getDay()]} • ${now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}`;
  const t = todayStr();
  const activeHabits = state.habits.filter(h=>habitAppliesToday(h, now));
  const done = activeHabits.filter(h=>h.history[t]==="done").length;
  const pct = activeHabits.length ? Math.round((done/activeHabits.length)*100) : 0;
  const circumference = 113;
  document.getElementById("ringProgress").style.strokeDashoffset = circumference - (circumference*pct/100);
  document.getElementById("ringPct").textContent = pct+"%";
}
function habitAppliesToday(h, d=new Date()){
  if(h.days === "daily" || !h.days) return true;
  return h.days.includes(d.getDay());
}

/* auto day-rollover: check every 30s, re-render if date changed */
let lastKnownDate = todayStr();
setInterval(()=>{
  const t = todayStr();
  if(t !== lastKnownDate){
    lastKnownDate = t;
    renderView(currentView);
    scheduleAllReminders();
  } else {
    renderHeader();
  }
}, 30000);

/* ===================== HABITS ===================== */
function renderHabits(){
  const wrap = document.getElementById("habitsList");
  const t = todayStr();
  const today = new Date();
  const list = state.habits.filter(h=>habitAppliesToday(h, today));
  if(state.habits.length===0){
    wrap.innerHTML = `<div class="empty"><b>Koi habit nahi</b>Neeche + button dabakar apni pehli habit shamil karein.</div>`;
    return;
  }
  wrap.innerHTML = `<div class="section-title">Aaj Ki Habits (${DAY_NAMES[today.getDay()]})</div>` +
  (list.length ? list.map(h=>{
    const status = h.history[t];
    const streak = computeStreak(h);
    return `<div class="card habit-card">
      <div class="habit-emoji" style="background:${status? (status==='done'?'var(--mint)':'var(--danger)') : 'var(--surface3)'}; color:${status?'#fff':'inherit'}">${h.emoji}</div>
      <div class="habit-info" onclick="openHabitEdit('${h.id}')">
        <div class="habit-name">${escapeHtml(h.name)}</div>
        <div class="habit-meta">🔥 ${streak} din streak · ${h.days==='daily'?'Roz':h.days.map(d=>DAY_SHORT[d]).join(', ')}</div>
      </div>
      <div class="habit-actions">
        <div class="round-btn tick ${status==='done'?'on':''}" onclick="markHabit('${h.id}','done')">✓</div>
        <div class="round-btn cross ${status==='missed'?'on':''}" onclick="markHabit('${h.id}','missed')">✕</div>
      </div>
    </div>`;
  }).join("") : `<div class="empty">Aaj ke liye koi habit schedule nahi.</div>`) +
  `<div class="section-title">Baqi Habits</div>` +
  (state.habits.filter(h=>!habitAppliesToday(h,today)).map(h=>`
    <div class="card habit-card" style="opacity:.6">
      <div class="habit-emoji">${h.emoji}</div>
      <div class="habit-info" onclick="openHabitEdit('${h.id}')">
        <div class="habit-name">${escapeHtml(h.name)}</div>
        <div class="habit-meta">${h.days==='daily'?'Roz':h.days.map(d=>DAY_SHORT[d]).join(', ')}</div>
      </div>
    </div>`).join("") || "");
}
function markHabit(id, type){
  const h = state.habits.find(x=>x.id===id);
  const t = todayStr();
  if(h.history[t] === type) delete h.history[t];
  else h.history[t] = type;
  saveState();
  renderHabits(); renderHeader();
}
function computeStreak(h){
  let streak = 0;
  let d = new Date();
  while(true){
    if(!habitAppliesToday(h,d)){ d.setDate(d.getDate()-1); continue; }
    const s = todayStr(d);
    if(h.history[s]==="done"){ streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  return streak;
}
function openHabitEdit(id){ openHabitSheet(state.habits.find(h=>h.id===id)); }

/* ===================== TDL ===================== */
function renderTdl(){
  const q = (document.getElementById("tdlSearch").value||"").toLowerCase();
  const filt = n => (n.title||"").toLowerCase().includes(q) || (n.content||"").toLowerCase().includes(q) ||
    (n.items||[]).some(i=>i.text.toLowerCase().includes(q));
  const all = state.notes.filter(filt).sort((a,b)=>b.updatedAt-a.updatedAt);
  const pinned = all.filter(n=>n.pinned);
  const rest = all.filter(n=>!n.pinned);

  const pinWrap = document.getElementById("tdlPinnedWrap");
  pinWrap.innerHTML = pinned.length ? `<div class="section-title">📌 Pinned</div><div class="notes-grid">${pinned.map(noteCardHtml).join("")}</div>` : "";

  const list = document.getElementById("tdlList");
  if(all.length===0){
    list.innerHTML = `<div class="empty"><b>Kuch bhi note nahi</b>Notes, to-do, diet plan ya time table likhne ke liye + dabayein.</div>`;
    return;
  }
  list.innerHTML = (rest.length? `<div class="section-title">${pinned.length?'Other':'Notes'}</div>` : "") +
    `<div class="notes-grid">${rest.map(noteCardHtml).join("")}</div>`;
}
function noteCardHtml(n){
  const dt = new Date(n.updatedAt);
  let body = "";
  if(n.type==="checklist"){
    body = (n.items||[]).slice(0,6).map(i=>`<div class="note-check ${i.checked?'done':''}">${i.checked?'☑':'☐'} ${escapeHtml(i.text)}</div>`).join("");
  } else {
    body = `<div class="note-body">${escapeHtml(n.content||"")}</div>`;
  }
  return `<div class="note-card ${n.pinned?'pinned':''}" style="border-left:4px solid ${n.color||'var(--border)'}" onclick="openNoteSheet(getNote('${n.id}'))">
    ${n.pinned?'<div class="note-pin">📌</div>':''}
    <div class="note-title">${escapeHtml(n.title || (n.type==='checklist'?'To-Do':'Note'))}</div>
    ${body}
    <div class="note-foot">${dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</div>
  </div>`;
}
function getNote(id){ return state.notes.find(n=>n.id===id); }
document.getElementById("tdlSearch").addEventListener("input", renderTdl);

/* ===================== TIME TABLE ===================== */
let ttSelectedDay = new Date().getDay();
function renderTimetableTabs(){
  const wrap = document.getElementById("ttDayTabs");
  wrap.innerHTML = DAY_SHORT.map((d,i)=>`<div class="day-tab ${i===ttSelectedDay?'active':''}" onclick="setTtDay(${i})">${d}</div>`).join("") +
    `<div class="day-tab ${ttSelectedDay==='daily'?'active':''}" onclick="setTtDay('daily')">Daily</div>`;
}
function setTtDay(d){ ttSelectedDay = d; renderTimetable(); }
function renderTimetable(){
  renderTimetableTabs();
  const list = document.getElementById("ttList");
  const items = state.timetable.filter(t=>t.day===ttSelectedDay).sort((a,b)=>a.time.localeCompare(b.time));
  if(items.length===0){
    list.innerHTML = `<div class="empty"><b>Is din ke liye kuch schedule nahi</b>+ dabakar time table entry banayein.</div>`;
    return;
  }
  list.innerHTML = items.map(t=>`
    <div class="card tt-row" onclick="openTimetableSheet(getTt('${t.id}'))">
      <div class="tt-time">${t.time}</div>
      <div class="tt-info">
        <div class="tt-title">${escapeHtml(t.title)}</div>
        <div class="tt-alarm">${t.alarm.enabled ? '🔔 '+(t.alarm.vibrate?'Vibrate + ':'')+'Alarm ON' : '🔕 Alarm off'}</div>
      </div>
    </div>`).join("");
}
function getTt(id){ return state.timetable.find(t=>t.id===id); }

/* ===================== ANALYTICS ===================== */
function renderAnalytics(){
  document.getElementById("anaDate").value = todayStr();
  const total = state.habits.length;
  const today = new Date();
  const t = todayStr();
  const activeToday = state.habits.filter(h=>habitAppliesToday(h,today));
  const doneToday = activeToday.filter(h=>h.history[t]==="done").length;
  document.getElementById("statToday").textContent = activeToday.length? Math.round(doneToday/activeToday.length*100)+"%" : "0%";
  document.getElementById("statTotal").textContent = total;
  let best = 0;
  state.habits.forEach(h=>{ best = Math.max(best, longestStreak(h)); });
  document.getElementById("statStreak").textContent = best;

  showAnalyticsForDate(t);

  const hm = document.getElementById("anaHeatmap");
  let cells = "";
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    const s = todayStr(d);
    const active = state.habits.filter(h=>habitAppliesToday(h,d));
    const done = active.filter(h=>h.history[s]==="done").length;
    const ratio = active.length ? done/active.length : 0;
    const bg = ratio===0 ? 'var(--surface3)' : `color-mix(in srgb, var(--mint) ${Math.round(ratio*100)}%, var(--surface3))`;
    cells += `<div class="hm-cell" title="${s}" style="background:${bg}" onclick="jumpAnaDate('${s}')"></div>`;
  }
  hm.innerHTML = cells;
}
function jumpAnaDate(s){ document.getElementById("anaDate").value = s; showAnalyticsForDate(s); }
function longestStreak(h){
  const dates = Object.keys(h.history).filter(d=>h.history[d]==="done").sort();
  let best=0, cur=0, prev=null;
  dates.forEach(d=>{
    if(prev){
      const diff = (new Date(d)-new Date(prev))/86400000;
      cur = diff===1 ? cur+1 : 1;
    } else cur = 1;
    best = Math.max(best,cur); prev = d;
  });
  return best;
}
function showAnalyticsForDate(dateStr){
  const d = new Date(dateStr+"T00:00:00");
  const wrap = document.getElementById("anaResult");
  const dayName = DAY_NAMES[d.getDay()];
  const items = state.habits.filter(h=>{
    if(h.days==="daily") return true;
    return h.days.includes(d.getDay()) || h.history[dateStr];
  });
  if(items.length===0){
    wrap.innerHTML = `<h3>${dayName}, ${d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</h3><div style="color:var(--muted); font-size:13px;">Is din koi habit record nahi.</div>`;
    return;
  }
  wrap.innerHTML = `<h3>${dayName}, ${d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</h3>` +
    items.map(h=>{
      const st = h.history[dateStr];
      const tag = st==="done" ? '<span class="tag done">Done</span>' : st==="missed" ? '<span class="tag missed">Missed</span>' : '<span class="tag none">—</span>';
      return `<div class="dr-item"><span>${h.emoji} ${escapeHtml(h.name)}</span>${tag}</div>`;
    }).join("");
}
document.getElementById("anaGoBtn").addEventListener("click", ()=>{
  const v = document.getElementById("anaDate").value;
  if(v) showAnalyticsForDate(v);
});

/* ===================== SETTINGS ===================== */
function renderSettings(){
  document.getElementById("themeSwitch").classList.toggle("on", state.settings.theme==="dark");
  updateResetLabel();
}
document.getElementById("permBtn").addEventListener("click", async ()=>{
  if(IS_NATIVE){
    try{
      const { LocalNotifications } = window.Capacitor.Plugins;
      const res = await LocalNotifications.requestPermissions();
      toast(res.display==="granted" ? "Permission mil gayi ✅" : "Permission nahi mili — phone Settings se manually allow karein");
    }catch(e){ toast("Error: "+e.message); }
  } else {
    if("Notification" in window){
      const perm = await Notification.requestPermission();
      toast(perm==="granted" ? "Permission mil gayi ✅" : "Permission deny hui");
    } else toast("Ye browser notifications support nahi karta");
  }
});
document.getElementById("testAlarmBtn").addEventListener("click", ()=>{
  if(IS_NATIVE) fireNativeTestAlarm();
  else {
    toast("5 second mein test alarm aayega...");
    setTimeout(()=>fireReminder("🔔 Test Alarm","Ye ek test notification hai!",true,true), 5000);
  }
});
document.getElementById("openCustomBtn").addEventListener("click", openCustomEditor);
document.getElementById("themeSwitch").addEventListener("click", ()=>{
  state.settings.theme = state.settings.theme==="dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", state.settings.theme);
  saveState(); renderSettings();
});
document.getElementById("exportBtn").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `replace-deeds-backup-${todayStr()}.json`;
  a.click(); URL.revokeObjectURL(url);
  toast("Backup download ho gaya");
});
document.getElementById("importBtn").addEventListener("click", ()=>document.getElementById("importFile").click());
document.getElementById("importFile").addEventListener("change", (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(reader.result);
      state = Object.assign(defaultState(), data);
      saveState();
      document.documentElement.setAttribute("data-theme", state.settings.theme||"dark");
      toast("Data import ho gaya");
      renderView(currentView);
      scheduleAllReminders();
      renderCustomLayer();
    }catch(err){ toast("Ghalat file — import fail"); }
  };
  reader.readAsText(file);
  e.target.value = "";
});

/* --- 7-tap reset --- */
let resetTapCount = 0, resetTapTimer = null;
function updateResetLabel(){
  document.getElementById("resetBtn").textContent = `Reset Data (${resetTapCount}/7)`;
}
document.getElementById("resetBtn").addEventListener("click", ()=>{
  resetTapCount++;
  updateResetLabel();
  clearTimeout(resetTapTimer);
  resetTapTimer = setTimeout(()=>{ resetTapCount = 0; updateResetLabel(); }, 12000);
  if(resetTapCount < 7){
    toast(`Reset karne ke liye ${7-resetTapCount} baar aur dabayein`);
    return;
  }
  resetTapCount = 0; updateResetLabel();
  openConfirmSheet(
    "Sab Data Delete Karein?",
    "Ye action permanent hai. Tamam habits, notes, time table aur history hamesha ke liye mit jayegi.",
    ()=>{
      localStorage.removeItem(LS_KEY);
      state = defaultState();
      document.documentElement.setAttribute("data-theme","dark");
      saveState();
      toast("Data reset ho gaya");
      renderView(currentView);
      renderCustomLayer();
      closeSheet();
    }
  );
});

/* ===================== MODALS / SHEETS ===================== */
const overlay = document.getElementById("overlay");
const sheetEl = document.getElementById("sheet");
function openSheet(html){ sheetEl.innerHTML = `<div class="sheet-handle"></div>` + html; overlay.classList.add("show"); }
function closeSheet(){ overlay.classList.remove("show"); }
overlay.addEventListener("click", (e)=>{ if(e.target===overlay) closeSheet(); });

function openConfirmSheet(title, msg, onConfirm){
  openSheet(`
    <h2>${title}</h2>
    <p style="color:var(--muted); font-size:13.5px; line-height:1.6;">${msg}</p>
    <div class="sheet-actions">
      <button class="btn ghost" onclick="closeSheet()">Cancel</button>
      <button class="btn danger" id="confirmYesBtn">Haan, Delete Karein</button>
    </div>
  `);
  document.getElementById("confirmYesBtn").addEventListener("click", onConfirm);
}

/* ---- FAB routing ---- */
document.getElementById("fabBtn").addEventListener("click", ()=>{
  if(currentView==="habits") openHabitSheet(null);
  else if(currentView==="tdl") openNoteSheet(null);
  else if(currentView==="timetable") openTimetableSheet(null);
});

/* ---- Habit Sheet ---- */
function openHabitSheet(h){
  const editing = !!h;
  const emoji = h ? h.emoji : EMOJIS[0];
  const color = h ? h.color : COLORS[0];
  const days = h ? h.days : "daily";
  openSheet(`
    <h2>${editing?'Habit Edit Karein':'Nayi Habit'}</h2>
    <div class="field"><label>Naam</label><input type="text" id="hName" value="${editing?escapeAttr(h.name):''}" placeholder="e.g. Namaz, Paani peena..."></div>
    <div class="field"><label>Icon</label><div class="emoji-row" id="hEmojiRow"></div></div>
    <div class="field"><label>Rang</label><div class="color-row" id="hColorRow"></div></div>
    <div class="field"><label>Kis din?</label><div class="day-chip-row" id="hDayRow"></div></div>
    <div class="field"><label>Reminder</label>
      <div style="display:flex; gap:10px; align-items:center;">
        <div class="switch ${h&&h.reminder.enabled?'on':''}" id="hRemSwitch"></div>
        <input type="time" id="hRemTime" value="${h?h.reminder.time:'08:00'}" style="flex:1;">
      </div>
    </div>
    <div class="field" id="hVibWrap">
      <label>Alert Type</label>
      <div class="type-toggle">
        <button id="hVibOn" class="${h&&h.reminder.vibrate?'sel':''}">📳 Vibration</button>
        <button id="hSoundOn" class="${!h||h.reminder.sound?'sel':''}">🔔 Sound</button>
      </div>
    </div>
    <div class="sheet-actions">
      ${editing?'<button class="btn danger" id="hDelBtn">Delete</button>':'<button class="btn ghost" onclick="closeSheet()">Cancel</button>'}
      <button class="btn primary" id="hSaveBtn">${editing?'Save':'Add Karein'}</button>
    </div>
  `);
  let selEmoji = emoji, selColor = color, selDays = days==="daily"?"daily":[...days];
  let vib = h ? h.reminder.vibrate : true, snd = h ? h.reminder.sound : true;

  document.getElementById("hEmojiRow").innerHTML = EMOJIS.map(e=>`<div class="emoji-opt ${e===selEmoji?'sel':''}" data-e="${e}">${e}</div>`).join("");
  document.getElementById("hColorRow").innerHTML = COLORS.map(c=>`<div class="color-opt ${c===selColor?'sel':''}" data-c="${c}" style="background:${c}"></div>`).join("");
  document.querySelectorAll("#hEmojiRow .emoji-opt").forEach(el=>el.addEventListener("click", ()=>{
    selEmoji = el.dataset.e;
    document.querySelectorAll("#hEmojiRow .emoji-opt").forEach(x=>x.classList.remove("sel"));
    el.classList.add("sel");
  }));
  document.querySelectorAll("#hColorRow .color-opt").forEach(el=>el.addEventListener("click", ()=>{
    selColor = el.dataset.c;
    document.querySelectorAll("#hColorRow .color-opt").forEach(x=>x.classList.remove("sel"));
    el.classList.add("sel");
  }));
  renderDayChips("hDayRow", selDays, (v)=>selDays=v);

  document.getElementById("hRemSwitch").addEventListener("click", (e)=>e.target.classList.toggle("on"));
  document.getElementById("hVibOn").addEventListener("click", (e)=>{ vib=!vib; e.target.classList.toggle("sel"); });
  document.getElementById("hSoundOn").addEventListener("click", (e)=>{ snd=!snd; e.target.classList.toggle("sel"); });

  if(editing) document.getElementById("hDelBtn").addEventListener("click", ()=>{
    openConfirmSheet("Habit Delete Karein?","Is habit ki tamam history bhi mit jayegi.",()=>{
      state.habits = state.habits.filter(x=>x.id!==h.id);
      saveState(); closeSheet(); renderHabits(); scheduleAllReminders();
    });
  });

  document.getElementById("hSaveBtn").addEventListener("click", ()=>{
    const name = document.getElementById("hName").value.trim();
    if(!name){ toast("Habit ka naam likhein"); return; }
    const remEnabled = document.getElementById("hRemSwitch").classList.contains("on");
    const remTime = document.getElementById("hRemTime").value || "08:00";
    if(editing){
      Object.assign(h, {name, emoji:selEmoji, color:selColor, days:selDays,
        reminder:{enabled:remEnabled, time:remTime, vibrate:vib, sound:snd}});
    } else {
      state.habits.push({id:uid(), name, emoji:selEmoji, color:selColor, days:selDays,
        reminder:{enabled:remEnabled, time:remTime, vibrate:vib, sound:snd}, history:{}, createdAt:Date.now()});
    }
    saveState(); closeSheet(); renderHabits(); renderHeader(); scheduleAllReminders();
    toast(editing?"Habit update ho gayi":"Habit add ho gayi");
  });
}
function renderDayChips(containerId, selected, onChange){
  const el = document.getElementById(containerId);
  function draw(){
    el.innerHTML = `<div class="day-chip ${selected==='daily'?'sel':''}" data-d="daily">Roz</div>` +
      DAY_SHORT.map((d,i)=>`<div class="day-chip ${selected!=='daily'&&selected.includes(i)?'sel':''}" data-d="${i}">${d}</div>`).join("");
    el.querySelectorAll(".day-chip").forEach(chip=>chip.addEventListener("click", ()=>{
      const v = chip.dataset.d;
      if(v==="daily"){ selected = "daily"; }
      else {
        const n = Number(v);
        if(selected==="daily") selected = [n];
        else if(selected.includes(n)) selected = selected.filter(x=>x!==n);
        else selected = [...selected, n];
        if(selected.length===0) selected = "daily";
      }
      onChange(selected); draw();
    }));
  }
  draw();
}

/* ---- Note / TDL Sheet ---- */
function openNoteSheet(n){
  const editing = !!n;
  let type = n ? n.type : "checklist";
  let items = n && n.type==="checklist" ? n.items.map(i=>({...i})) : [];
  let pinned = n ? n.pinned : false;
  let color = n ? (n.color||COLORS[7]) : COLORS[7];

  openSheet(`
    <h2>${editing?'Note Edit Karein':'Naya Note / To-Do'}</h2>
    <div class="type-toggle">
      <button id="ntNoteBtn" class="${type==='note'?'sel':''}">📄 Note / Plan</button>
      <button id="ntCheckBtn" class="${type==='checklist'?'sel':''}">☑ Checklist</button>
    </div>
    <div class="field"><label>Title</label><input type="text" id="ntTitle" value="${editing?escapeAttr(n.title||''):''}" placeholder="e.g. Diet Plan, Time Table Notes..."></div>
    <div id="ntBodyWrap"></div>
    <div class="field"><label>Rang</label><div class="color-row" id="ntColorRow"></div></div>
    <div class="field" style="display:flex; align-items:center; gap:10px;">
      <div class="switch ${pinned?'on':''}" id="ntPinSwitch"></div><label style="margin:0;">📌 Pin karein</label>
    </div>
    <div class="sheet-actions">
      ${editing?'<button class="btn danger" id="ntDelBtn">Delete</button>':'<button class="btn ghost" onclick="closeSheet()">Cancel</button>'}
      <button class="btn primary" id="ntSaveBtn">${editing?'Save':'Add Karein'}</button>
    </div>
  `);
  document.getElementById("ntColorRow").innerHTML = COLORS.map(c=>`<div class="color-opt ${c===color?'sel':''}" data-c="${c}" style="background:${c}"></div>`).join("");
  document.querySelectorAll("#ntColorRow .color-opt").forEach(el=>el.addEventListener("click", ()=>{
    color = el.dataset.c;
    document.querySelectorAll("#ntColorRow .color-opt").forEach(x=>x.classList.remove("sel"));
    el.classList.add("sel");
  }));
  document.getElementById("ntPinSwitch").addEventListener("click",(e)=>{ pinned=!pinned; e.target.classList.toggle("on"); });

  function drawBody(){
    const wrap = document.getElementById("ntBodyWrap");
    if(type==="note"){
      wrap.innerHTML = `<div class="field"><label>Likhein</label><textarea id="ntContent" placeholder="Diet plan, ideas, time table...">${editing&&n.type==='note'?escapeHtml(n.content||''):''}</textarea></div>`;
    } else {
      wrap.innerHTML = `<div class="field"><label>Tasks</label><div class="checklist-rows" id="clRows"></div>
        <button class="btn ghost" id="clAddBtn" style="margin-top:6px;">+ Task Shamil Karein</button></div>`;
      drawChecklist();
      document.getElementById("clAddBtn").addEventListener("click", ()=>{
        items.push({id:uid(), text:"", checked:false}); drawChecklist();
      });
    }
  }
  function drawChecklist(){
    const rows = document.getElementById("clRows");
    rows.innerHTML = items.map(it=>`
      <div class="cl-row" data-id="${it.id}">
        <div class="round-btn tick ${it.checked?'on':''}" style="width:28px;height:28px;font-size:13px;" data-check="${it.id}">${it.checked?'✓':''}</div>
        <input type="text" value="${escapeAttr(it.text)}" data-text="${it.id}" placeholder="Task likhein...">
        <div class="cl-del" data-del="${it.id}">✕</div>
      </div>`).join("");
    rows.querySelectorAll("[data-check]").forEach(b=>b.addEventListener("click", ()=>{
      const it = items.find(i=>i.id===b.dataset.check); it.checked=!it.checked; drawChecklist();
    }));
    rows.querySelectorAll("[data-text]").forEach(inp=>inp.addEventListener("input", ()=>{
      items.find(i=>i.id===inp.dataset.text).text = inp.value;
    }));
    rows.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click", ()=>{
      items = items.filter(i=>i.id!==b.dataset.del); drawChecklist();
    }));
  }
  document.getElementById("ntNoteBtn").addEventListener("click", ()=>{
    type="note"; document.getElementById("ntNoteBtn").classList.add("sel"); document.getElementById("ntCheckBtn").classList.remove("sel"); drawBody();
  });
  document.getElementById("ntCheckBtn").addEventListener("click", ()=>{
    type="checklist"; document.getElementById("ntCheckBtn").classList.add("sel"); document.getElementById("ntNoteBtn").classList.remove("sel"); drawBody();
  });
  drawBody();

  if(editing) document.getElementById("ntDelBtn").addEventListener("click", ()=>{
    openConfirmSheet("Note Delete Karein?","Ye permanently mit jayega.",()=>{
      state.notes = state.notes.filter(x=>x.id!==n.id);
      saveState(); closeSheet(); renderTdl();
    });
  });

  document.getElementById("ntSaveBtn").addEventListener("click", ()=>{
    const title = document.getElementById("ntTitle").value.trim();
    const content = type==="note" ? document.getElementById("ntContent").value : "";
    const cleanItems = items.filter(i=>i.text.trim()!=="");
    if(!title && !content && cleanItems.length===0){ toast("Kuch to likhein"); return; }
    if(editing){
      Object.assign(n, {title, type, content, items:cleanItems, pinned, color, updatedAt:Date.now()});
    } else {
      state.notes.push({id:uid(), title, type, content, items:cleanItems, pinned, color, updatedAt:Date.now()});
    }
    saveState(); closeSheet(); renderTdl();
    toast(editing?"Note update ho gaya":"Note add ho gaya");
  });
}

/* ---- Time Table Sheet ---- */
function openTimetableSheet(t){
  const editing = !!t;
  openSheet(`
    <h2>${editing?'Entry Edit Karein':'Time Table Entry'}</h2>
    <div class="field"><label>Title</label><input type="text" id="ttTitle" value="${editing?escapeAttr(t.title):''}" placeholder="e.g. Fajr Namaz, School, Gym..."></div>
    <div class="field"><label>Waqt</label><input type="time" id="ttTime" value="${editing?t.time:'07:00'}"></div>
    <div class="field"><label>Din</label><div class="day-chip-row" id="ttDayRowSel"></div></div>
    <div class="field" style="display:flex; gap:10px; align-items:center;">
      <div class="switch ${editing&&t.alarm.enabled?'on':''}" id="ttAlarmSwitch"></div><label style="margin:0;">🔔 Alarm</label>
    </div>
    <div class="type-toggle">
      <button id="ttVibBtn" class="${!editing||t.alarm.vibrate?'sel':''}">📳 Vibration</button>
      <button id="ttSndBtn" class="${!editing||t.alarm.sound?'sel':''}">🔔 Sound</button>
    </div>
    <div class="sheet-actions">
      ${editing?'<button class="btn danger" id="ttDelBtn">Delete</button>':'<button class="btn ghost" onclick="closeSheet()">Cancel</button>'}
      <button class="btn primary" id="ttSaveBtn">${editing?'Save':'Add Karein'}</button>
    </div>
  `);
  let selDay = editing ? t.day : ttSelectedDay;
  let vib = editing ? t.alarm.vibrate : true, snd = editing ? t.alarm.sound : true;
  const singleWrap = document.getElementById("ttDayRowSel");
  function drawDay(){
    singleWrap.innerHTML = `<div class="day-chip ${selDay==='daily'?'sel':''}" data-d="daily">Roz</div>` +
      DAY_SHORT.map((d,i)=>`<div class="day-chip ${selDay===i?'sel':''}" data-d="${i}">${d}</div>`).join("");
    singleWrap.querySelectorAll(".day-chip").forEach(c=>c.addEventListener("click", ()=>{
      selDay = c.dataset.d==="daily" ? "daily" : Number(c.dataset.d); drawDay();
    }));
  }
  drawDay();
  document.getElementById("ttAlarmSwitch").addEventListener("click", e=>e.target.classList.toggle("on"));
  document.getElementById("ttVibBtn").addEventListener("click", e=>{ vib=!vib; e.target.classList.toggle("sel"); });
  document.getElementById("ttSndBtn").addEventListener("click", e=>{ snd=!snd; e.target.classList.toggle("sel"); });

  if(editing) document.getElementById("ttDelBtn").addEventListener("click", ()=>{
    openConfirmSheet("Entry Delete Karein?","Ye permanently mit jayegi.",()=>{
      state.timetable = state.timetable.filter(x=>x.id!==t.id);
      saveState(); closeSheet(); renderTimetable(); scheduleAllReminders();
    });
  });

  document.getElementById("ttSaveBtn").addEventListener("click", ()=>{
    const title = document.getElementById("ttTitle").value.trim();
    const time = document.getElementById("ttTime").value;
    if(!title || !time){ toast("Title aur waqt zaroori hai"); return; }
    const alarmEnabled = document.getElementById("ttAlarmSwitch").classList.contains("on");
    if(editing){
      Object.assign(t, {title, time, day:selDay, alarm:{enabled:alarmEnabled, vibrate:vib, sound:snd}});
    } else {
      state.timetable.push({id:uid(), title, time, day:selDay, alarm:{enabled:alarmEnabled, vibrate:vib, sound:snd}});
    }
    saveState(); closeSheet(); ttSelectedDay = selDay; renderTimetable(); scheduleAllReminders();
    toast(editing?"Entry update ho gayi":"Entry add ho gayi");
  });
}

/* ===================== REMINDERS / NOTIFICATIONS ===================== */
const IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
let scheduledTimers = [];
function clearScheduled(){ scheduledTimers.forEach(t=>clearTimeout(t)); scheduledTimers = []; }

/* Stable 31-bit integer id from a string, required by native notification ids */
function hashId(str){
  let h = 0;
  for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0; }
  return Math.abs(h) % 2000000000;
}

async function nativeCancelAll(ids){
  try{
    const { LocalNotifications } = window.Capacitor.Plugins;
    if(ids.length) await LocalNotifications.cancel({ notifications: ids.map(id=>({id})) });
  }catch(e){}
}
async function nativeScheduleRecurring(id, title, body, days, hour, minute){
  try{
    const { LocalNotifications } = window.Capacitor.Plugins;
    const notifs = [];
    if(days === "daily"){
      notifs.push({ id, title, body, schedule:{ on:{ hour, minute }, repeats:true, allowWhileIdle:true },
        smallIcon:"ic_launcher" });
    } else {
      days.forEach((d,idx)=>{
        notifs.push({ id: (id + idx*1000) % 2000000000, title, body,
          schedule:{ on:{ weekday: d+1, hour, minute }, repeats:true, allowWhileIdle:true },
          smallIcon:"ic_launcher" });
      });
    }
    await LocalNotifications.schedule({ notifications: notifs });
  }catch(e){ console.error("native schedule failed", e); }
}
async function nativeInit(){
  if(!IS_NATIVE) return;
  try{
    const { LocalNotifications } = window.Capacitor.Plugins;
    await LocalNotifications.requestPermissions();
  }catch(e){}
}
async function scheduleAllRemindersNative(){
  try{
    const { LocalNotifications } = window.Capacitor.Plugins;
    const pending = await LocalNotifications.getPending();
    if(pending && pending.notifications && pending.notifications.length){
      await nativeCancelAll(pending.notifications.map(n=>n.id));
    }
  }catch(e){}
  state.habits.forEach(h=>{
    if(!h.reminder || !h.reminder.enabled) return;
    const [hh,mm] = h.reminder.time.split(":").map(Number);
    nativeScheduleRecurring(hashId("h_"+h.id), "🌿 "+h.name, "Habit ka waqt ho gaya — abhi mukammal karein!", h.days, hh, mm);
  });
  state.timetable.forEach(t=>{
    if(!t.alarm || !t.alarm.enabled) return;
    const [hh,mm] = t.time.split(":").map(Number);
    const days = t.day === "daily" ? "daily" : [t.day];
    nativeScheduleRecurring(hashId("t_"+t.id), "🗓️ "+t.title, "Time Table: waqt ho gaya hai.", days, hh, mm);
  });
}
async function fireNativeTestAlarm(){
  try{
    const { LocalNotifications } = window.Capacitor.Plugins;
    await LocalNotifications.schedule({ notifications:[{
      id: 999999999, title:"🔔 Test Alarm", body:"Ye ek test notification hai — agar ye dikhi to alarms sahi kaam kar rahe hain!",
      schedule:{ at: new Date(Date.now()+5000) }, smallIcon:"ic_launcher"
    }]});
    toast("5 second mein test alarm aayega...");
  }catch(e){ toast("Native alarm test fail: "+e.message); }
}

function playTone(){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 880;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.9);
    o.start(); o.stop(ctx.currentTime+0.9);
    setTimeout(()=>{
      const o2=ctx.createOscillator(), g2=ctx.createGain();
      o2.type="sine"; o2.frequency.value=1180; o2.connect(g2); g2.connect(ctx.destination);
      g2.gain.setValueAtTime(0.0001, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime+0.02);
      g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.7);
      o2.start(); o2.stop(ctx.currentTime+0.7);
    },250);
  }catch(e){}
}
function fireReminder(title, body, vibrate, sound){
  if(sound) playTone();
  if(vibrate && navigator.vibrate) navigator.vibrate([300,120,300,120,300]);
  if("Notification" in window && Notification.permission==="granted"){
    try{
      if(navigator.serviceWorker && navigator.serviceWorker.ready){
        navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,{body, icon:"./icon-192.png", vibrate: vibrate?[300,120,300]:undefined}));
      } else {
        new Notification(title,{body, icon:"./icon-192.png"});
      }
    }catch(e){}
  } else {
    toast(`⏰ ${title} — ${body}`);
  }
}
function scheduleAllReminders(){
  if(IS_NATIVE){ scheduleAllRemindersNative(); return; }
  clearScheduled();
  const now = new Date();
  const MAX_MS = 24*60*60*1000; // web fallback: only reliable while app is open/foreground

  state.habits.forEach(h=>{
    if(!h.reminder || !h.reminder.enabled) return;
    if(!habitAppliesToday(h, now)) return;
    const fireAt = timeToday(h.reminder.time);
    const delay = fireAt - now;
    if(delay > 0 && delay < MAX_MS){
      scheduledTimers.push(setTimeout(()=>fireReminder("🌿 "+h.name, "Habit ka waqt ho gaya — abhi mukammal karein!", h.reminder.vibrate, h.reminder.sound), delay));
    }
  });
  state.timetable.forEach(t=>{
    if(!t.alarm || !t.alarm.enabled) return;
    const applies = t.day==="daily" || t.day===now.getDay();
    if(!applies) return;
    const fireAt = timeToday(t.time);
    const delay = fireAt - now;
    if(delay > 0 && delay < MAX_MS){
      scheduledTimers.push(setTimeout(()=>fireReminder("🗓️ "+t.title, "Time Table: waqt ho gaya hai.", t.alarm.vibrate, t.alarm.sound), delay));
    }
  });
}
function timeToday(hhmm){
  const [h,m] = hhmm.split(":").map(Number);
  const d = new Date(); d.setHours(h,m,0,0);
  return d;
}
function requestNotifPermission(){
  if("Notification" in window && Notification.permission==="default"){
    Notification.requestPermission();
  }
}

/* ===================== UTIL ===================== */
function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function escapeAttr(s){ return escapeHtml(s).replace(/\n/g," "); }

/* ===================== INIT ===================== */
async function init(){
  document.documentElement.setAttribute("data-theme", state.settings.theme||"dark");
  switchView("habits");
  if(IS_NATIVE){
    await nativeInit();
  } else if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
    requestNotifPermission();
  }
  scheduleAllReminders();
  setInterval(renderHeader, 60000);
  renderCustomLayer();
}
init();

/* ===================== CUSTOM SCREEN BUILDER ===================== */
const CUSTOM_TYPES = [
  { type:"button", icon:"🔘", label:"Button" },
  { type:"label",  icon:"🔤", label:"Text" },
  { type:"card",   icon:"🗂️", label:"Card" },
  { type:"toggle-el", icon:"🎚️", label:"Toggle" },
  { type:"emoji",  icon:"😊", label:"Emoji" },
  { type:"image",  icon:"🖼️", label:"Image" }
];
const CUSTOM_EFFECTS = [
  { v:"none", label:"None" }, { v:"glow", label:"✨ Glow" }, { v:"pulse", label:"💓 Pulse" },
  { v:"shimmer", label:"🌟 Shimmer" }, { v:"border", label:"🔲 Border" }
];
const BG_PRESETS = ["#0e211c","#153029","#1c3c33","#2b1c3c","#3c1c1c","#123028","#1a1a2e","#2e1a1a"];

let customDraft = null;
let selectedElId = null;
let dragCtx = null;

function newCustomElement(type){
  return {
    id: uid(), type, text: type==="label"?"Naya Text": type==="card"?"Card Title": type==="button"?"Button": "",
    emoji: type==="emoji" ? "🌟" : "", image: "", size:"md", color: COLORS[0], effect:"none",
    xPct:50, yPct:50, rotation:0, toggleState:false,
    action:{ type:"none", target:"" }
  };
}

function elClasses(el){
  let cls = "custom-el";
  if(el.type==="label") cls += " type-label";
  else if(el.type==="card") cls += " type-card";
  else if(el.type==="toggle-el") cls += " type-toggle-el";
  if(el.size==="sm") cls += " sz-sm";
  if(el.size==="lg") cls += " sz-lg";
  if(el.effect==="glow") cls += " fx-glow";
  if(el.effect==="pulse") cls += " fx-pulse";
  if(el.effect==="shimmer") cls += " fx-shimmer";
  if(el.effect==="border") cls += " fx-border";
  return cls;
}
function elInnerHtml(el){
  if(el.type==="emoji") return `<span style="font-size:${el.size==='lg'?'44px':el.size==='sm'?'24px':'34px'};">${el.emoji||"🌟"}</span>`;
  if(el.type==="image") return el.image ? `<img src="${el.image}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">` : `<span style="font-size:11px;color:var(--muted);">Image</span>`;
  if(el.type==="toggle-el") return `<span class="toggle-dot ${el.toggleState?'on':''}"></span>${escapeHtml(el.text||"Toggle")}`;
  if(el.type==="card") return `<div><b>${escapeHtml(el.text||"Card")}</b></div>`;
  return escapeHtml(el.text || (el.type==="label"?"Text":"Button"));
}
function elStyle(el, editable){
  let s = `left:${el.xPct}%; top:${el.yPct}%; transform:translate(-50%,-50%) rotate(${el.rotation||0}deg); --el-color:${el.color};`;
  if(el.type!=="emoji" && el.type!=="image" && el.type!=="label"){
    s += `background:${el.type==='card'?'var(--surface2)':el.color}; color:${el.type==='card'?'var(--text)':'#0a1410'};`;
  }
  if(el.type==="image"){ s += `width:90px; height:90px; padding:0; overflow:hidden; border-radius:14px; background:var(--surface3);`; }
  if(el.type==="label"){ s += `color:${el.color};`; }
  return s;
}

/* ---- LIVE RENDER (visible across all tabs) ---- */
function renderCustomLayer(){
  const layer = document.getElementById("customLayer");
  const bg = state.customLayout.background;
  if(bg.type==="color"){ document.body.style.background = bg.value; }
  else if(bg.type==="image"){ document.body.style.background = `center/cover no-repeat url(${bg.value})`; }
  else { document.body.style.background = ""; }

  layer.innerHTML = state.customLayout.elements.map(el=>`
    <div class="${elClasses(el)}" style="${elStyle(el,false)}" data-id="${el.id}">${elInnerHtml(el)}</div>
  `).join("");
  layer.querySelectorAll(".custom-el").forEach(node=>{
    node.addEventListener("click", ()=>{
      const el = state.customLayout.elements.find(x=>x.id===node.dataset.id);
      if(el.type==="toggle-el"){ el.toggleState = !el.toggleState; saveState(); renderCustomLayer(); }
      runCustomAction(el.action);
    });
  });
}
function runCustomAction(action){
  if(!action || action.type==="none") return;
  if(action.type==="goto") switchView(action.target);
  else if(action.type==="toggleHabit"){ if(state.habits.find(h=>h.id===action.target)) markHabit(action.target,"done"); }
  else if(action.type==="openNote"){ const n = getNote(action.target); if(n) openNoteSheet(n); }
  else if(action.type==="testAlarm"){ IS_NATIVE ? fireNativeTestAlarm() : (toast("5 second mein test alarm..."), setTimeout(()=>fireReminder("🔔 Custom Alarm","Test alarm trigger hua!",true,true),5000)); }
}

/* ---- EDITOR ---- */
function openCustomEditor(){
  customDraft = JSON.parse(JSON.stringify(state.customLayout));
  selectedElId = null;
  document.getElementById("customOverlay").classList.add("show");
  applyDraftBackground();
  renderEditorCanvas();
  hidePropPanel();
}
function closeCustomEditor(){
  document.getElementById("customOverlay").classList.remove("show");
  customDraft = null; selectedElId = null;
}
function applyDraftBackground(){
  const canvas = document.getElementById("customCanvas");
  const bg = customDraft.background;
  if(bg.type==="color") canvas.style.background = bg.value;
  else if(bg.type==="image") canvas.style.background = `center/cover no-repeat url(${bg.value})`;
  else canvas.style.background = "";
}
function renderEditorCanvas(){
  const canvas = document.getElementById("customCanvas");
  canvas.innerHTML = customDraft.elements.map(el=>`
    <div class="${elClasses(el)} ${el.id===selectedElId?'editing selected':''}" style="${elStyle(el,true)}" data-id="${el.id}">${elInnerHtml(el)}</div>
  `).join("");
  canvas.querySelectorAll(".custom-el").forEach(node=>{
    node.addEventListener("pointerdown", (e)=>startDrag(e, node));
    node.addEventListener("click", (e)=>{ if(!dragCtx || !dragCtx.moved) selectElement(node.dataset.id); });
  });
}
function startDrag(e, node){
  e.preventDefault();
  const canvas = document.getElementById("customCanvas");
  const rect = canvas.getBoundingClientRect();
  const id = node.dataset.id;
  dragCtx = { id, rect, moved:false };
  node.setPointerCapture(e.pointerId);
  const move = (ev)=>{
    const xPct = Math.min(96, Math.max(4, ((ev.clientX - rect.left)/rect.width)*100));
    const yPct = Math.min(96, Math.max(4, ((ev.clientY - rect.top)/rect.height)*100));
    const el = customDraft.elements.find(x=>x.id===id);
    if(Math.abs(el.xPct-xPct)>0.3 || Math.abs(el.yPct-yPct)>0.3) dragCtx.moved = true;
    el.xPct = xPct; el.yPct = yPct;
    node.style.left = xPct+"%"; node.style.top = yPct+"%";
  };
  const up = (ev)=>{
    node.removeEventListener("pointermove", move);
    node.removeEventListener("pointerup", up);
    if(dragCtx.moved) selectElement(id);
  };
  node.addEventListener("pointermove", move);
  node.addEventListener("pointerup", up);
}
function selectElement(id){
  selectedElId = id;
  renderEditorCanvas();
  showElementPropPanel(customDraft.elements.find(x=>x.id===id));
}
function hidePropPanel(){
  document.getElementById("customPropPanel").classList.remove("show");
}

document.getElementById("customCancelBtn").addEventListener("click", closeCustomEditor);
document.getElementById("customApplyBtn").addEventListener("click", ()=>{
  state.customLayout = customDraft;
  saveState();
  closeCustomEditor();
  renderCustomLayer();
  toast("Changes apply ho gaye ✅");
});
document.getElementById("customAddFab").addEventListener("click", showTypePicker);

function showTypePicker(){
  const panel = document.getElementById("customPropPanel");
  panel.innerHTML = `<div class="cp-handle"></div>
    <div class="type-picker">
      ${CUSTOM_TYPES.map(t=>`<div class="type-picker-opt" data-t="${t.type}"><span class="ic">${t.icon}</span>${t.label}</div>`).join("")}
      <div class="type-picker-opt" data-t="__bg__"><span class="ic">🖌️</span>Background</div>
    </div>`;
  panel.classList.add("show");
  panel.querySelectorAll(".type-picker-opt").forEach(opt=>{
    opt.addEventListener("click", ()=>{
      if(opt.dataset.t==="__bg__"){ showBackgroundPanel(); return; }
      const el = newCustomElement(opt.dataset.t);
      customDraft.elements.push(el);
      renderEditorCanvas();
      selectElement(el.id);
    });
  });
}

function showBackgroundPanel(){
  const panel = document.getElementById("customPropPanel");
  const bg = customDraft.background;
  panel.innerHTML = `<div class="cp-handle"></div>
    <div class="field"><label>Background</label>
      <div class="color-row" id="bgPresetRow"></div>
    </div>
    <div class="field"><label>Ya Custom Color</label><input type="text" id="bgCustomColor" placeholder="#123028 ya koi bhi color" value="${bg.type==='color'?escapeAttr(bg.value):''}"></div>
    <div class="field"><label>Ya Image</label>
      <input type="file" id="bgImageInput" accept="image/*" style="display:none">
      <button class="btn ghost block" id="bgImageBtn">📷 Image Chunain</button>
    </div>
    <div class="sheet-actions">
      <button class="btn ghost" id="bgResetBtn">Default</button>
      <button class="btn primary" id="bgDoneBtn">Done</button>
    </div>`;
  panel.classList.add("show");
  const presetRow = document.getElementById("bgPresetRow");
  presetRow.innerHTML = BG_PRESETS.map(c=>`<div class="color-opt ${bg.value===c?'sel':''}" data-c="${c}" style="background:${c}"></div>`).join("");
  presetRow.querySelectorAll(".color-opt").forEach(o=>o.addEventListener("click", ()=>{
    customDraft.background = { type:"color", value:o.dataset.c };
    applyDraftBackground();
    presetRow.querySelectorAll(".color-opt").forEach(x=>x.classList.remove("sel"));
    o.classList.add("sel");
    document.getElementById("bgCustomColor").value = o.dataset.c;
  }));
  document.getElementById("bgCustomColor").addEventListener("input", (e)=>{
    if(e.target.value.trim()){ customDraft.background = { type:"color", value:e.target.value.trim() }; applyDraftBackground(); }
  });
  document.getElementById("bgImageBtn").addEventListener("click", ()=>document.getElementById("bgImageInput").click());
  document.getElementById("bgImageInput").addEventListener("change", (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{ customDraft.background = { type:"image", value: reader.result }; applyDraftBackground(); toast("Image lag gayi"); };
    reader.readAsDataURL(file);
  });
  document.getElementById("bgResetBtn").addEventListener("click", ()=>{
    customDraft.background = { type:"default", value:"" }; applyDraftBackground(); hidePropPanel();
  });
  document.getElementById("bgDoneBtn").addEventListener("click", hidePropPanel);
}

function showElementPropPanel(el){
  const panel = document.getElementById("customPropPanel");
  const habitOpts = state.habits.map(h=>`<option value="${h.id}" ${el.action.target===h.id?'selected':''}>${escapeHtml(h.name)}</option>`).join("");
  const noteOpts = state.notes.map(n=>`<option value="${n.id}" ${el.action.target===n.id?'selected':''}>${escapeHtml(n.title||'Untitled')}</option>`).join("");
  const viewOpts = ["timetable","tdl","analytics","habits","settings"].map(v=>`<option value="${v}" ${el.action.target===v?'selected':''}>${v}</option>`).join("");

  let contentField = "";
  if(el.type==="emoji"){
    contentField = `<div class="field"><label>Emoji</label><input type="text" id="epText" value="${escapeAttr(el.emoji)}" maxlength="4" placeholder="😊"></div>`;
  } else if(el.type==="image"){
    contentField = `<div class="field"><label>Image</label>
      <input type="file" id="epImageInput" accept="image/*" style="display:none">
      <button class="btn ghost block" id="epImageBtn">📷 Image Chunain</button></div>`;
  } else {
    contentField = `<div class="field"><label>Text (kisi bhi language mein)</label><input type="text" id="epText" value="${escapeAttr(el.text)}" placeholder="Kuch bhi likhein... 🎉"></div>`;
  }

  panel.innerHTML = `<div class="cp-handle"></div>
    ${contentField}
    <div class="field"><label>Size</label>
      <div class="type-toggle">
        <button data-sz="sm" class="${el.size==='sm'?'sel':''}">Small</button>
        <button data-sz="md" class="${el.size==='md'?'sel':''}">Medium</button>
        <button data-sz="lg" class="${el.size==='lg'?'sel':''}">Large</button>
      </div>
    </div>
    <div class="field"><label>Rang</label><div class="color-row" id="epColorRow"></div></div>
    <div class="field"><label>Effect</label>
      <div class="fx-opt-row" id="epFxRow">
        ${CUSTOM_EFFECTS.map(f=>`<div class="fx-opt ${el.effect===f.v?'sel':''}" data-fx="${f.v}">${f.label}</div>`).join("")}
      </div>
    </div>
    <div class="field"><label>Rotation: <span id="epRotVal">${el.rotation}</span>°</label>
      <input type="range" id="epRotate" min="-180" max="180" value="${el.rotation}">
    </div>
    <div class="field"><label>Tap karne par kya ho?</label>
      <select id="epActionType">
        <option value="none" ${el.action.type==='none'?'selected':''}>Kuch nahi</option>
        <option value="goto" ${el.action.type==='goto'?'selected':''}>Section kholein</option>
        <option value="toggleHabit" ${el.action.type==='toggleHabit'?'selected':''}>Habit tick karein</option>
        <option value="openNote" ${el.action.type==='openNote'?'selected':''}>Note kholein</option>
        <option value="testAlarm" ${el.action.type==='testAlarm'?'selected':''}>Test Alarm bajayein</option>
      </select>
    </div>
    <div class="field" id="epTargetWrap"></div>
    <div class="sheet-actions">
      <button class="btn danger" id="epDelBtn">Delete</button>
      <button class="btn primary" id="epDoneBtn">Done</button>
    </div>`;
  panel.classList.add("show");

  function drawTarget(){
    const type = document.getElementById("epActionType").value;
    const wrap = document.getElementById("epTargetWrap");
    if(type==="goto") wrap.innerHTML = `<label>Kaunsa Section?</label><select id="epTarget">${viewOpts}</select>`;
    else if(type==="toggleHabit") wrap.innerHTML = `<label>Kaunsi Habit?</label><select id="epTarget">${habitOpts || '<option value="">Koi habit nahi</option>'}</select>`;
    else if(type==="openNote") wrap.innerHTML = `<label>Kaunsa Note?</label><select id="epTarget">${noteOpts || '<option value="">Koi note nahi</option>'}</select>`;
    else wrap.innerHTML = "";
  }
  drawTarget();
  document.getElementById("epActionType").addEventListener("change", drawTarget);

  document.getElementById("epColorRow").innerHTML = COLORS.map(c=>`<div class="color-opt ${el.color===c?'sel':''}" data-c="${c}" style="background:${c}"></div>`).join("");
  document.querySelectorAll("#epColorRow .color-opt").forEach(o=>o.addEventListener("click", ()=>{
    el.color = o.dataset.c;
    document.querySelectorAll("#epColorRow .color-opt").forEach(x=>x.classList.remove("sel"));
    o.classList.add("sel");
    renderEditorCanvas();
  }));
  panel.querySelectorAll("[data-sz]").forEach(b=>b.addEventListener("click", ()=>{
    el.size = b.dataset.sz;
    panel.querySelectorAll("[data-sz]").forEach(x=>x.classList.remove("sel"));
    b.classList.add("sel");
    renderEditorCanvas();
  }));
  panel.querySelectorAll("[data-fx]").forEach(b=>b.addEventListener("click", ()=>{
    el.effect = b.dataset.fx;
    panel.querySelectorAll("[data-fx]").forEach(x=>x.classList.remove("sel"));
    b.classList.add("sel");
    renderEditorCanvas();
  }));
  document.getElementById("epRotate").addEventListener("input", (e)=>{
    el.rotation = Number(e.target.value);
    document.getElementById("epRotVal").textContent = el.rotation;
    renderEditorCanvas();
  });
  if(el.type==="emoji" || el.type!=="image"){
    const txt = document.getElementById("epText");
    if(txt) txt.addEventListener("input", (e)=>{
      if(el.type==="emoji") el.emoji = e.target.value; else el.text = e.target.value;
      renderEditorCanvas();
    });
  }
  if(el.type==="image"){
    document.getElementById("epImageBtn").addEventListener("click", ()=>document.getElementById("epImageInput").click());
    document.getElementById("epImageInput").addEventListener("change", (e)=>{
      const file = e.target.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = ()=>{ el.image = reader.result; renderEditorCanvas(); };
      reader.readAsDataURL(file);
    });
  }
  document.getElementById("epDelBtn").addEventListener("click", ()=>{
    customDraft.elements = customDraft.elements.filter(x=>x.id!==el.id);
    selectedElId = null; hidePropPanel(); renderEditorCanvas();
  });
  document.getElementById("epDoneBtn").addEventListener("click", ()=>{
    const type = document.getElementById("epActionType").value;
    const targetEl = document.getElementById("epTarget");
    el.action = { type, target: targetEl ? targetEl.value : "" };
    selectedElId = null; hidePropPanel(); renderEditorCanvas();
  });
}
