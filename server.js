const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const STORE_FILE = path.join(__dirname, 'data', 'store.json');

// ---------- helpers ----------
function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

if (!fs.existsSync(USERS_FILE)) writeJSON(USERS_FILE, []);
if (!fs.existsSync(STORE_FILE)) writeJSON(STORE_FILE, {});

// ---------- middleware ----------
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'redot-global-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 12 // 12 hours
  }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

// ---------- auth routes ----------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const users = readJSON(USERS_FILE, []);
  const user = users.find(u => u.username.toLowerCase() === String(username).toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.name = user.name;
  res.json({ ok: true, user: { username: user.username, name: user.name } });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

app.get('/api/me', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ authenticated: true, username: req.session.username, name: req.session.name });
  }
  res.json({ authenticated: false });
});

// change your own password once logged in
app.post('/api/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const users = readJSON(USERS_FILE, []);
  const user = users.find(u => u.id === req.session.userId);
  if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  writeJSON(USERS_FILE, users);
  res.json({ ok: true });
});

// ---------- data storage routes (protected) ----------
// Mirrors the old window.storage.get/set(key, shared) shape used in the artifact version.
app.get('/api/storage/:key', requireAuth, (req, res) => {
  const store = readJSON(STORE_FILE, {});
  const key = req.params.key;
  if (!(key in store)) return res.status(404).json({ error: 'Not found' });
  res.json({ key, value: store[key] });
});

app.post('/api/storage/:key', requireAuth, (req, res) => {
  const store = readJSON(STORE_FILE, {});
  const key = req.params.key;
  const { value } = req.body || {};
  store[key] = value;
  writeJSON(STORE_FILE, store);
  res.json({ key, value });
});

// ---------- PDF report ----------
app.get('/api/report/:companyId', requireAuth, (req, res) => {
  const store = readJSON(STORE_FILE, {});
  const companies = store.companies ? JSON.parse(store.companies) : [];
  const logs = store.logs ? JSON.parse(store.logs) : [];
  const packages = store.packages ? JSON.parse(store.packages) : [];
  const workers = store.workers ? JSON.parse(store.workers) : [];

  const company = companies.find(c => c.id === req.params.companyId);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  const companyLogs = logs
    .filter(l => l.companyId === company.id && new Date(l.date).getFullYear() === year)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const baseMinutes = Number(company.annualHours || 12) * 60;
  const pkgMinutes = packages
    .filter(p => p.companyId === company.id && new Date(p.date).getFullYear() === year)
    .reduce((s, p) => s + Number(p.hours) * 60, 0);
  const allottedMinutes = baseMinutes + pkgMinutes;
  const usedMinutes = companyLogs.reduce((s, l) => s + Number(l.minutes), 0);
  const remainingMinutes = allottedMinutes - usedMinutes;

  const fmtH = (mins) => (mins / 60).toFixed(1) + 'h';
  const workerName = (id) => {
    const w = workers.find(x => x.id === id);
    return w ? w.name : '—';
  };

  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  const filename = `${company.name.replace(/[^a-z0-9]+/gi, '_')}_maintenance_report_${year}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  const red = '#c8102e';
  const ink = '#141414';
  const muted = '#726f6a';
  const line = '#e0ddd6';

  // ---- letterhead ----
  doc.fillColor(red).circle(55, 52, 4).fill();
  doc.fillColor(ink).font('Helvetica-Bold').fontSize(16).text('REDOT GLOBAL', 68, 44);
  doc.fillColor(muted).font('Helvetica').fontSize(9).text('WEB MAINTENANCE REPORT', 68, 63);

  doc.moveTo(50, 88).lineTo(545, 88).lineWidth(2).strokeColor(ink).stroke();

  // ---- title ----
  doc.moveDown(2);
  doc.fillColor(ink).font('Helvetica-Bold').fontSize(20).text(company.name, 50, 108);
  doc.fillColor(muted).font('Helvetica').fontSize(10).text(`Maintenance activity — ${year}`, 50, 132);

  // ---- summary boxes ----
  const summaryTop = 165;
  const boxW = 158;
  const boxGap = 15;
  const summaries = [
    { label: 'ALLOTTED', value: fmtH(allottedMinutes) },
    { label: 'USED', value: fmtH(usedMinutes) },
    { label: 'REMAINING', value: fmtH(remainingMinutes), warn: remainingMinutes < 0 }
  ];
  summaries.forEach((s, i) => {
    const x = 50 + i * (boxW + boxGap);
    doc.roundedRect(x, summaryTop, boxW, 58, 4).strokeColor(line).lineWidth(1).stroke();
    doc.fillColor(muted).font('Helvetica').fontSize(8).text(s.label, x + 14, summaryTop + 12, { characterSpacing: 0.5 });
    doc.fillColor(s.warn ? red : ink).font('Helvetica-Bold').fontSize(18).text(s.value, x + 14, summaryTop + 26);
  });

  // ---- table ----
  let y = summaryTop + 90;
  doc.fillColor(ink).font('Helvetica-Bold').fontSize(11).text('Work completed', 50, y);
  y += 22;

  const colDate = 50;
  const colTask = 130;
  const colWorker = 380;
  const colTime = 480;

  doc.fillColor(muted).font('Helvetica-Bold').fontSize(8);
  doc.text('DATE', colDate, y);
  doc.text('TASK', colTask, y);
  doc.text('BY', colWorker, y);
  doc.text('TIME', colTime, y);
  y += 14;
  doc.moveTo(50, y).lineTo(545, y).strokeColor(ink).lineWidth(1).stroke();
  y += 8;

  doc.font('Helvetica').fontSize(9).fillColor(ink);

  if (companyLogs.length === 0) {
    doc.fillColor(muted).text('No work logged for this year.', colDate, y);
    y += 18;
  } else {
    companyLogs.forEach((l) => {
      const taskText = l.task || '—';
      const taskHeight = doc.heightOfString(taskText, { width: colWorker - colTask - 10 });
      const rowHeight = Math.max(16, taskHeight + 4);

      if (y + rowHeight > 740) {
        doc.addPage();
        y = 50;
      }

      doc.fillColor(ink).font('Helvetica').fontSize(9);
      doc.text(l.date, colDate, y, { width: colTask - colDate - 10 });
      doc.text(taskText, colTask, y, { width: colWorker - colTask - 10 });
      doc.text(workerName(l.workerId), colWorker, y, { width: colTime - colWorker - 10 });
      doc.text(fmtH(l.minutes), colTime, y);

      y += rowHeight;
      doc.moveTo(50, y).lineTo(545, y).strokeColor(line).lineWidth(0.5).stroke();
      y += 6;
    });
  }

  // ---- footer ----
  const generatedOn = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const pageRange = doc.bufferedPageRange();
  for (let i = 0; i < pageRange.count; i++) {
    doc.switchToPage(i);
    doc.fillColor(muted).font('Helvetica').fontSize(8)
      .text(`Report generated on ${generatedOn} — Redot Global`, 50, 780, { width: 495, align: 'center', lineBreak: false });
  }

  doc.end();
});

// ---------- static files ----------
// login.html is always accessible. Everything else in /public requires a session,
// except the static assets (css/js) needed to render the login page itself.
app.use('/styles.css', express.static(path.join(__dirname, 'public', 'styles.css')));
app.use('/login.html', express.static(path.join(__dirname, 'public', 'login.html')));
app.use('/login.js', express.static(path.join(__dirname, 'public', 'login.js')));

app.get('/', (req, res, next) => {
  if (!req.session || !req.session.userId) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/app.js', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.js'));
});

app.get('/index.html', (req, res) => {
  if (!req.session || !req.session.userId) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Redot Global tracker running at http://localhost:${PORT}`);
  console.log('If you have not seeded users yet, run: npm run seed');
});
