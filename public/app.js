// ---------- storage adapter (talks to the Express API instead of window.storage) ----------
const STORE = {
  async get(key) {
    const res = await fetch(`/api/storage/${encodeURIComponent(key)}`);
    if (res.status === 401) { window.location.href = '/login.html'; throw new Error('Not authenticated'); }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Storage read failed');
    return res.json();
  },
  async set(key, value) {
    const res = await fetch(`/api/storage/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    });
    if (res.status === 401) { window.location.href = '/login.html'; throw new Error('Not authenticated'); }
    if (!res.ok) throw new Error('Storage write failed');
    return res.json();
  }
};

let currentUser = null;

let state = {
  companies: [],
  packages: [],
  logs: [],
  payments: [],
  workers: [],
  workerCosts: [],
  tab: 'log',
  year: new Date().getFullYear(),
  expandedCompany: null,
};

const uid = () => Math.random().toString(36).slice(2, 10);

function toast(msg, type='add'){
  const host = document.getElementById('toastHost');
  const t = document.createElement('div');
  t.className = 'toast' + (type==='remove' ? ' remove' : '');
  t.textContent = msg;
  host.appendChild(t);
  setTimeout(()=>{ t.style.transition='opacity 0.25s'; t.style.opacity='0'; setTimeout(()=>t.remove(), 250); }, 2200);
}

async function loadMe(){
  const res = await fetch('/api/me');
  const data = await res.json();
  if (!data.authenticated) { window.location.href = '/login.html'; return; }
  currentUser = data;
}

async function loadAll(){
  await loadMe();
  const keys = ['companies','packages','logs','payments','workers','workerCosts'];
  for(const k of keys){
    try{
      const r = await STORE.get(k);
      state[k] = r ? JSON.parse(r.value) : [];
    }catch(e){ state[k] = []; }
  }
  render();
}

async function save(key){
  await STORE.set(key, JSON.stringify(state[key]));
}

function fmtHrs(mins){ return (mins/60).toFixed(1); }
function fmtMoney(n){ return '$' + Number(n||0).toFixed(2); }

function companyAllotted(c, year){
  const base = Number(c.annualHours || 12) * 60;
  const pkgMins = state.packages
    .filter(p => p.companyId === c.id && new Date(p.date).getFullYear() === year)
    .reduce((s,p)=> s + Number(p.hours)*60, 0);
  return base + pkgMins;
}
function companyUsed(c, year){
  return state.logs
    .filter(l => l.companyId === c.id && new Date(l.date).getFullYear() === year)
    .reduce((s,l)=> s + Number(l.minutes), 0);
}
function workerTotalCost(w, year){
  return state.workerCosts
    .filter(wc => wc.workerId === w.id && new Date(wc.date).getFullYear() === year)
    .reduce((s,wc)=> s + Number(wc.amount||0), 0);
}

async function logout(){
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
}

function render(){
  const el = document.getElementById('app');
  el.innerHTML = `
    <header class="top">
      <div class="brand">
        <div>
          <h1><span class="dot"></span>&nbsp;Redot Global</h1>
          <div class="sub">Maintenance Tracker</div>
        </div>
      </div>
      <div class="session">
        <span class="who">${currentUser ? escapeHtml(currentUser.name || currentUser.username) : ''}</span>
        <button class="logout-btn" id="logoutBtn">Log out</button>
      </div>
    </header>
    <nav class="tabs">
      <button data-tab="log" class="${state.tab==='log'?'active':''}">Log Task</button>
      <button data-tab="analytics" class="${state.tab==='analytics'?'active':''}">Analytics</button>
      <button data-tab="payments" class="${state.tab==='payments'?'active':''}">Payments</button>
      <button data-tab="people" class="${state.tab==='people'?'active':''}">People</button>
      <button data-tab="companies" class="${state.tab==='companies'?'active':''}">Companies</button>
    </nav>
    <div id="tabBody"></div>
  `;
  document.getElementById('logoutBtn').onclick = logout;
  document.querySelectorAll('nav.tabs button').forEach(b=>{
    b.onclick = ()=>{ state.tab = b.dataset.tab; render(); };
  });
  const body = document.getElementById('tabBody');
  if(state.tab==='log') body.innerHTML = renderLog();
  if(state.tab==='analytics') body.innerHTML = renderAnalytics();
  if(state.tab==='payments') body.innerHTML = renderPayments();
  if(state.tab==='people') body.innerHTML = renderPeople();
  if(state.tab==='companies') body.innerHTML = renderCompanies();
  wireTab();
}

// ---------- LOG TAB ----------
function renderLog(){
  if(state.companies.length===0){
    return `<div class="panel"><p class="empty">No companies yet. Add one in the Companies tab first.</p></div>`;
  }
  const opts = state.companies.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  const workerOpts = state.workers.map(w=>`<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('');
  return `
    <div class="panel">
      <h2>Log a completed task</h2>
      <div class="row">
        <div class="field">
          <label>Company</label>
          <select id="f_company">${opts}</select>
        </div>
        <div class="field">
          <label>Date</label>
          <input type="date" id="f_date" value="${new Date().toISOString().slice(0,10)}">
        </div>
      </div>
      <div class="row" style="margin-top:12px;">
        <div class="field">
          <label>Task description</label>
          <textarea id="f_task" placeholder="e.g. Updated plugins, fixed broken contact form"></textarea>
        </div>
      </div>
      <div class="row" style="margin-top:12px;">
        <div class="field">
          <label>Time spent (minutes)</label>
          <input type="number" id="f_minutes" min="0" step="5" placeholder="e.g. 45">
        </div>
        <div class="field">
          <label>Worker</label>
          <select id="f_worker">
            <option value="">Select a worker…</option>
            ${workerOpts}
            <option value="__new__">+ Add new worker…</option>
          </select>
          <input type="text" id="f_worker_new" placeholder="New worker name" style="display:none;margin-top:6px;">
        </div>
      </div>
      <div id="logMsg"></div>
      <div style="margin-top:16px;">
        <button class="btn" id="submitLog">Save entry</button>
      </div>
    </div>
    <div class="panel">
      <h2>Recent entries</h2>
      ${renderRecentLogs()}
    </div>
  `;
}

function renderRecentLogs(){
  const rows = [...state.logs].sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,10);
  if(rows.length===0) return `<p class="empty">No entries yet.</p>`;
  return `
    <table>
      <thead><tr><th>Date</th><th>Company</th><th>Task</th><th>Time</th><th>Worker</th><th></th></tr></thead>
      <tbody>
        ${rows.map(l=>{
          const c = state.companies.find(x=>x.id===l.companyId);
          const w = state.workers.find(x=>x.id===l.workerId);
          return `<tr>
            <td>${l.date}</td>
            <td>${c? escapeHtml(c.name) : '—'}</td>
            <td>${escapeHtml(l.task||'')}</td>
            <td>${fmtHrs(l.minutes)}h</td>
            <td>${w? escapeHtml(w.name) : '—'}</td>
            <td><button class="btn small secondary" data-del="${l.id}">Delete</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ---------- ANALYTICS TAB ----------
function renderAnalytics(){
  if(state.companies.length===0){
    return `<div class="panel"><p class="empty">No companies yet. Add one in the Companies tab.</p></div>`;
  }
  const years = new Set([new Date().getFullYear()]);
  state.logs.forEach(l=> years.add(new Date(l.date).getFullYear()));
  state.packages.forEach(p=> years.add(new Date(p.date).getFullYear()));
  const yearList = [...years].sort((a,b)=>b-a);

  const cards = state.companies.map(c=>{
    const allotted = companyAllotted(c, state.year);
    const used = companyUsed(c, state.year);
    const remaining = allotted - used;
    const pct = Math.min(100, (used/allotted)*100 || 0);
    const over = used > allotted;
    const isOpen = state.expandedCompany === c.id;
    const companyLogs = state.logs
      .filter(l => l.companyId === c.id && new Date(l.date).getFullYear() === state.year)
      .sort((a,b)=> new Date(b.date)-new Date(a.date));
    return `
      <div class="company-card">
        <div class="head clickable" data-expand="${c.id}" style="cursor:pointer;">
          <h3>${escapeHtml(c.name)}</h3>
          <span class="badge ${over?'over':'ok'}">${over ? 'OVER ALLOWANCE' : 'ON TRACK'}</span>
        </div>
        <div class="bar-track"><div class="bar-fill ${over?'over':''}" style="width:${pct}%"></div></div>
        <div class="stat-row">
          <div><span>Allotted</span><b>${fmtHrs(allotted)}h</b></div>
          <div><span>Used</span><b>${fmtHrs(used)}h</b></div>
          <div><span>Remaining</span><b style="color:${remaining<0?'var(--red)':'var(--ink)'}">${fmtHrs(remaining)}h</b></div>
        </div>
        <button class="btn small secondary" data-expand="${c.id}" style="margin-top:12px;">
          ${isOpen ? 'Hide work log' : 'View work done'}
        </button>
        <a class="btn small" href="/api/report/${c.id}?year=${state.year}" style="margin-top:12px;margin-left:8px;text-decoration:none;display:inline-block;">
          Get report
        </a>
        ${isOpen ? `
          <div style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px;">
            ${companyLogs.length===0 ? '<p class="empty">No work logged for this company yet.</p>' : `
            <table>
              <thead><tr><th>Date</th><th>Task</th><th>Time</th><th>Worker</th></tr></thead>
              <tbody>
                ${companyLogs.map(l=>{
                  const w = state.workers.find(x=>x.id===l.workerId);
                  return `<tr>
                    <td>${l.date}</td>
                    <td>${escapeHtml(l.task||'')}</td>
                    <td>${fmtHrs(l.minutes)}h</td>
                    <td>${w? escapeHtml(w.name) : '—'}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="panel" style="display:flex;justify-content:space-between;align-items:center;">
      <h2 style="margin:0;">Company analytics — ${state.year}</h2>
      <select class="tag-year" id="yearSelect">
        ${yearList.map(y=>`<option value="${y}" ${y===state.year?'selected':''}>${y}</option>`).join('')}
      </select>
    </div>
    ${cards}
  `;
}

// ---------- PAYMENTS TAB ----------
function renderPayments(){
  if(state.companies.length===0){
    return `<div class="panel"><p class="empty">No companies yet. Add one in the Companies tab.</p></div>`;
  }
  const opts = state.companies.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  const rows = [...state.payments].sort((a,b)=> new Date(b.date)-new Date(a.date));
  return `
    <div class="panel">
      <h2>Record a company payment</h2>
      <div class="row">
        <div class="field">
          <label>Company</label>
          <select id="pay_company">${opts}</select>
        </div>
        <div class="field">
          <label>Date</label>
          <input type="date" id="pay_date" value="${new Date().toISOString().slice(0,10)}">
        </div>
        <div class="field">
          <label>Amount ($)</label>
          <input type="number" id="pay_amount" min="0" step="0.01">
        </div>
        <div class="field">
          <label>Status</label>
          <select id="pay_status">
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>
      <div class="row" style="margin-top:12px;">
        <div class="field">
          <label>Note (optional)</label>
          <input type="text" id="pay_note" placeholder="e.g. Extra hours package purchase">
        </div>
      </div>
      <div style="margin-top:16px;">
        <button class="btn" id="submitPayment">Save payment</button>
      </div>
    </div>
    <div class="panel">
      <h2>Payment history</h2>
      ${rows.length===0 ? '<p class="empty">No payments recorded yet.</p>' : `
      <table>
        <thead><tr><th>Date</th><th>Company</th><th>Amount</th><th>Status</th><th>Note</th><th></th></tr></thead>
        <tbody>
          ${rows.map(p=>{
            const c = state.companies.find(x=>x.id===p.companyId);
            return `<tr>
              <td>${p.date}</td>
              <td>${c? escapeHtml(c.name) : '—'}</td>
              <td>${fmtMoney(p.amount)}</td>
              <td><span class="badge ${p.status}">${p.status}</span></td>
              <td>${escapeHtml(p.note||'')}</td>
              <td><button class="btn small secondary" data-delpay="${p.id}">Delete</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`}
    </div>
  `;
}

// ---------- PEOPLE TAB ----------
function renderPeople(){
  const companyOpts = state.companies.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  const workerOpts = state.workers.map(w=>`<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('');

  const years = new Set([new Date().getFullYear()]);
  state.workerCosts.forEach(wc=> years.add(new Date(wc.date).getFullYear()));
  const yearList = [...years].sort((a,b)=>b-a);

  const cards = state.workers.map(w=>{
    const total = workerTotalCost(w, state.year);
    return `
      <div class="worker-card">
        <div class="head">
          <h3>${escapeHtml(w.name)}</h3>
          <b>${fmtMoney(total)}</b>
        </div>
        <div class="small-muted">total paid out · ${state.year}</div>
      </div>
    `;
  }).join('');

  const costRows = [...state.workerCosts].sort((a,b)=> new Date(b.date)-new Date(a.date));

  return `
    <div class="panel">
      <h2>Workers</h2>
      ${state.workers.length===0 ? '<p class="empty">No workers added yet.</p>' : ''}
      <div class="add-company-row">
        <div class="field">
          <label>New worker name</label>
          <input type="text" id="new_worker_name" placeholder="e.g. Kasun Perera">
        </div>
        <div class="field" style="justify-content:flex-end;flex:0;">
          <button class="btn" id="addWorker">Add worker</button>
        </div>
      </div>
    </div>

    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2 style="margin:0;">Payout summary — ${state.year}</h2>
        <select class="tag-year" id="peopleYearSelect">
          ${yearList.map(y=>`<option value="${y}" ${y===state.year?'selected':''}>${y}</option>`).join('')}
        </select>
      </div>
      <div style="margin-top:14px;">
        ${state.workers.length===0 ? '<p class="empty">Add a worker above.</p>' : cards}
      </div>
    </div>

    <div class="panel">
      <h2>Log a personal cost / payout</h2>
      <p class="small-muted">This tracks what each worker is owed or paid for a job — it's separate from what's billed to the company.</p>
      <div class="row">
        <div class="field">
          <label>Worker</label>
          <select id="wc_worker">${workerOpts || '<option disabled>Add a worker first</option>'}</select>
        </div>
        <div class="field">
          <label>Company (optional)</label>
          <select id="wc_company"><option value="">—</option>${companyOpts}</select>
        </div>
        <div class="field">
          <label>Date</label>
          <input type="date" id="wc_date" value="${new Date().toISOString().slice(0,10)}">
        </div>
        <div class="field">
          <label>Amount ($)</label>
          <input type="number" id="wc_amount" min="0" step="0.01">
        </div>
      </div>
      <div class="row" style="margin-top:12px;">
        <div class="field">
          <label>Note (optional)</label>
          <input type="text" id="wc_note" placeholder="e.g. Payout for weekend job">
        </div>
      </div>
      <div style="margin-top:16px;">
        <button class="btn" id="addWorkerCost" ${state.workers.length===0?'disabled':''}>Save</button>
      </div>
      ${costRows.length>0 ? `
      <table style="margin-top:18px;">
        <thead><tr><th>Date</th><th>Worker</th><th>Company</th><th>Amount</th><th>Note</th><th></th></tr></thead>
        <tbody>
          ${costRows.map(wc=>{
            const w = state.workers.find(x=>x.id===wc.workerId);
            const c = state.companies.find(x=>x.id===wc.companyId);
            return `<tr>
              <td>${wc.date}</td><td>${w?escapeHtml(w.name):'—'}</td><td>${c?escapeHtml(c.name):'—'}</td><td>${fmtMoney(wc.amount)}</td>
              <td>${escapeHtml(wc.note||'')}</td>
              <td><button class="btn small secondary" data-delwc="${wc.id}">Delete</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>` : ''}
    </div>

    <div class="panel">
      <h2>Manage workers</h2>
      ${state.workers.length===0 ? '<p class="empty">No workers yet.</p>' : `
      <table>
        <thead><tr><th>Name</th><th></th></tr></thead>
        <tbody>
          ${state.workers.map(w=>`<tr><td>${escapeHtml(w.name)}</td><td><button class="btn small secondary" data-delworker="${w.id}">Delete</button></td></tr>`).join('')}
        </tbody>
      </table>`}
    </div>
  `;
}

// ---------- COMPANIES TAB ----------
function renderCompanies(){
  const rows = state.companies.map(c=>`
    <tr>
      <td>${escapeHtml(c.name)}</td>
      <td>${c.annualHours}h / yr</td>
      <td><button class="btn small secondary" data-delco="${c.id}">Delete</button></td>
    </tr>
  `).join('');

  const pkgOpts = state.companies.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

  return `
    <div class="panel">
      <h2>Companies</h2>
      ${state.companies.length===0 ? '<p class="empty">No companies added yet.</p>' : `
      <table>
        <thead><tr><th>Name</th><th>Default annual hours</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`}
      <div class="add-company-row">
        <div class="field">
          <label>New company name</label>
          <input type="text" id="new_co_name" placeholder="e.g. Acme Ltd">
        </div>
        <div class="field" style="max-width:160px;">
          <label>Annual hours</label>
          <input type="number" id="new_co_hours" value="12" min="0">
        </div>
        <div class="field" style="justify-content:flex-end;flex:0;">
          <button class="btn" id="addCompany">Add company</button>
        </div>
      </div>
    </div>

    <div class="panel">
      <h2>Add a purchased hours package</h2>
      <p class="small-muted">Use this when a customer buys extra maintenance hours separately from their free annual allowance. It adds on top of the base allotment for that year.</p>
      <div class="row">
        <div class="field">
          <label>Company</label>
          <select id="pkg_company">${pkgOpts || '<option disabled>Add a company first</option>'}</select>
        </div>
        <div class="field">
          <label>Date purchased</label>
          <input type="date" id="pkg_date" value="${new Date().toISOString().slice(0,10)}">
        </div>
        <div class="field">
          <label>Hours purchased</label>
          <input type="number" id="pkg_hours" min="0" step="0.5">
        </div>
        <div class="field">
          <label>Cost ($)</label>
          <input type="number" id="pkg_cost" min="0" step="0.01">
        </div>
      </div>
      <div style="margin-top:14px;">
        <button class="btn" id="addPackage" ${state.companies.length===0?'disabled':''}>Add package</button>
      </div>
      ${state.packages.length>0 ? `
      <table style="margin-top:18px;">
        <thead><tr><th>Date</th><th>Company</th><th>Hours</th><th>Cost</th><th></th></tr></thead>
        <tbody>
          ${[...state.packages].sort((a,b)=> new Date(b.date)-new Date(a.date)).map(p=>{
            const c = state.companies.find(x=>x.id===p.companyId);
            return `<tr>
              <td>${p.date}</td><td>${c?escapeHtml(c.name):'—'}</td><td>${p.hours}h</td><td>${fmtMoney(p.cost)}</td>
              <td><button class="btn small secondary" data-delpkg="${p.id}">Delete</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>` : ''}
    </div>
  `;
}

function wireTab(){
  // LOG tab
  const submitLog = document.getElementById('submitLog');
  if(submitLog){
    const workerSelect = document.getElementById('f_worker');
    const newWorkerInput = document.getElementById('f_worker_new');
    workerSelect.onchange = ()=>{
      newWorkerInput.style.display = workerSelect.value === '__new__' ? 'block' : 'none';
    };
    submitLog.onclick = async ()=>{
      const companyId = document.getElementById('f_company').value;
      const date = document.getElementById('f_date').value;
      const task = document.getElementById('f_task').value.trim();
      const minutes = Number(document.getElementById('f_minutes').value);
      const msg = document.getElementById('logMsg');
      let workerId = workerSelect.value;

      if(workerId === '__new__'){
        const name = newWorkerInput.value.trim();
        if(!name){
          msg.innerHTML = `<div style="color:var(--red);font-size:13px;">Enter a name for the new worker.</div>`;
          return;
        }
        const newWorker = {id:uid(), name};
        state.workers.push(newWorker);
        await save('workers');
        toast(`Worker "${name}" added`);
        workerId = newWorker.id;
      }

      if(!companyId || !date || !minutes || !workerId){
        msg.innerHTML = `<div style="color:var(--red);font-size:13px;">Fill in company, date, time spent, and worker.</div>`;
        return;
      }
      state.logs.push({id:uid(), companyId, date, task, minutes, workerId});
      await save('logs');
      const c = state.companies.find(x=>x.id===companyId);
      toast(`Task logged for ${c ? c.name : 'company'}`);
      msg.innerHTML = '';
      render();
    };
    document.querySelectorAll('[data-del]').forEach(b=>{
      b.onclick = async ()=>{
        state.logs = state.logs.filter(l=>l.id!==b.dataset.del);
        await save('logs');
        toast('Entry removed', 'remove');
        render();
      };
    });
  }

  // COMPANIES tab
  const addCo = document.getElementById('addCompany');
  if(addCo){
    addCo.onclick = async ()=>{
      const name = document.getElementById('new_co_name').value.trim();
      const hours = Number(document.getElementById('new_co_hours').value || 12);
      if(!name) return;
      state.companies.push({id:uid(), name, annualHours: hours});
      await save('companies');
      toast(`Company "${name}" added`);
      render();
    };
  }
  document.querySelectorAll('[data-delco]').forEach(b=>{
    b.onclick = async ()=>{
      if(!confirm('Delete this company? Its logs, packages and payments will stay but be orphaned.')) return;
      const c = state.companies.find(x=>x.id===b.dataset.delco);
      state.companies = state.companies.filter(x=>x.id!==b.dataset.delco);
      await save('companies');
      toast(`Company "${c?c.name:''}" removed`, 'remove');
      render();
    };
  });
  const addPkg = document.getElementById('addPackage');
  if(addPkg){
    addPkg.onclick = async ()=>{
      const companyId = document.getElementById('pkg_company').value;
      const date = document.getElementById('pkg_date').value;
      const hours = Number(document.getElementById('pkg_hours').value);
      const cost = Number(document.getElementById('pkg_cost').value || 0);
      if(!companyId || !date || !hours) return;
      state.packages.push({id:uid(), companyId, date, hours, cost});
      await save('packages');
      toast('Hours package added');
      render();
    };
  }
  document.querySelectorAll('[data-delpkg]').forEach(b=>{
    b.onclick = async ()=>{
      state.packages = state.packages.filter(p=>p.id!==b.dataset.delpkg);
      await save('packages');
      toast('Package removed', 'remove');
      render();
    };
  });

  // ANALYTICS tab
  const yearSel = document.getElementById('yearSelect');
  if(yearSel){
    yearSel.onchange = ()=>{ state.year = Number(yearSel.value); render(); };
  }
  document.querySelectorAll('[data-expand]').forEach(elx=>{
    elx.onclick = ()=>{
      const id = elx.dataset.expand;
      state.expandedCompany = state.expandedCompany === id ? null : id;
      render();
    };
  });
  const peopleYearSel = document.getElementById('peopleYearSelect');
  if(peopleYearSel){
    peopleYearSel.onchange = ()=>{ state.year = Number(peopleYearSel.value); render(); };
  }

  // PAYMENTS tab
  const submitPay = document.getElementById('submitPayment');
  if(submitPay){
    submitPay.onclick = async ()=>{
      const companyId = document.getElementById('pay_company').value;
      const date = document.getElementById('pay_date').value;
      const amount = Number(document.getElementById('pay_amount').value);
      const status = document.getElementById('pay_status').value;
      const note = document.getElementById('pay_note').value.trim();
      if(!companyId || !date || !amount) return;
      state.payments.push({id:uid(), companyId, date, amount, status, note});
      await save('payments');
      toast('Payment recorded');
      render();
    };
  }
  document.querySelectorAll('[data-delpay]').forEach(b=>{
    b.onclick = async ()=>{
      state.payments = state.payments.filter(p=>p.id!==b.dataset.delpay);
      await save('payments');
      toast('Payment removed', 'remove');
      render();
    };
  });

  // PEOPLE tab
  const addWorker = document.getElementById('addWorker');
  if(addWorker){
    addWorker.onclick = async ()=>{
      const name = document.getElementById('new_worker_name').value.trim();
      if(!name) return;
      state.workers.push({id:uid(), name});
      await save('workers');
      toast(`Worker "${name}" added`);
      render();
    };
  }
  document.querySelectorAll('[data-delworker]').forEach(b=>{
    b.onclick = async ()=>{
      if(!confirm('Delete this worker? Their logged cost history stays but becomes orphaned.')) return;
      const w = state.workers.find(x=>x.id===b.dataset.delworker);
      state.workers = state.workers.filter(x=>x.id!==b.dataset.delworker);
      await save('workers');
      toast(`Worker "${w?w.name:''}" removed`, 'remove');
      render();
    };
  });
  const addWc = document.getElementById('addWorkerCost');
  if(addWc){
    addWc.onclick = async ()=>{
      const workerId = document.getElementById('wc_worker').value;
      const companyId = document.getElementById('wc_company').value || null;
      const date = document.getElementById('wc_date').value;
      const amount = Number(document.getElementById('wc_amount').value);
      const note = document.getElementById('wc_note').value.trim();
      if(!workerId || !date || !amount) return;
      state.workerCosts.push({id:uid(), workerId, companyId, date, amount, note});
      await save('workerCosts');
      toast('Payout logged');
      render();
    };
  }
  document.querySelectorAll('[data-delwc]').forEach(b=>{
    b.onclick = async ()=>{
      state.workerCosts = state.workerCosts.filter(wc=>wc.id!==b.dataset.delwc);
      await save('workerCosts');
      toast('Payout entry removed', 'remove');
      render();
    };
  });
}

loadAll();
