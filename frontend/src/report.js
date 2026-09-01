import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtMoney, fmtDuration } from './utils.js';

const RED = '#c8102e';
const INK = '#141414';
const MUTED = '#726f6a';
const LINE = '#e0ddd6';

// Exact letterhead/footer assets extracted from the real Redot invoice PDF
// (frontend/public/pdf/) — native pixel sizes, used to keep aspect ratio.
const LETTERHEAD_SRC = { url: '/pdf/letterhead.png', format: 'PNG', w: 2551, h: 260 };
const FOOTER_SRC = { url: '/pdf/footer.png', format: 'PNG', w: 2554, h: 174 };

const imageCache = new Map();
async function loadImageDataUrl(url) {
  if (imageCache.has(url)) return imageCache.get(url);
  const promise = fetch(url)
    .then((res) => res.blob())
    .then((blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));
  imageCache.set(url, promise);
  return promise;
}

async function loadLetterheadAssets() {
  const [letterheadData, footerData] = await Promise.all([
    loadImageDataUrl(LETTERHEAD_SRC.url),
    loadImageDataUrl(FOOTER_SRC.url),
  ]);
  return { letterheadData, footerData };
}

function drawLetterhead(doc, letterheadData, contentWidth) {
  const letterheadH = (LETTERHEAD_SRC.h / LETTERHEAD_SRC.w) * contentWidth;
  const letterheadY = 32;
  doc.addImage(letterheadData, LETTERHEAD_SRC.format, 50, letterheadY, contentWidth, letterheadH);
  return letterheadY + letterheadH;
}

function applyFooterToAllPages(doc, footerData, contentWidth) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerH = (FOOTER_SRC.h / FOOTER_SRC.w) * contentWidth;
  const footerY = pageHeight - footerH - 36;
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.addImage(footerData, FOOTER_SRC.format, 50, footerY, contentWidth, footerH);
  }
}

function drawSummaryBoxes(doc, boxes, top, boxW, boxGap) {
  boxes.forEach((s, i) => {
    const x = 50 + i * (boxW + boxGap);
    doc.setDrawColor(LINE);
    doc.setLineWidth(1);
    doc.roundedRect(x, top, boxW, 58, 4, 4, 'S');
    doc.setTextColor(MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(s.label, x + 14, top + 20);
    doc.setTextColor(s.warn ? RED : INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(s.big ? 18 : 15);
    doc.text(s.value, x + 14, top + 42);
  });
}

export async function downloadCompanyReport({ company, logs, packages, year }) {
  const companyLogs = logs
    .filter((l) => l.companyId === company.id && new Date(l.date).getFullYear() === year)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const baseMinutes = Number(company.annualHours || 12) * 60;
  const pkgMinutes = packages
    .filter((p) => p.companyId === company.id && new Date(p.date).getFullYear() === year)
    .reduce((s, p) => s + Number(p.hours) * 60, 0);
  const allottedMinutes = baseMinutes + pkgMinutes;
  const usedMinutes = companyLogs.reduce((s, l) => s + Number(l.minutes), 0);
  const remainingMinutes = allottedMinutes - usedMinutes;

  const { letterheadData, footerData } = await loadLetterheadAssets();

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 100;

  const letterheadBottom = drawLetterhead(doc, letterheadData, contentWidth);

  // ---- title ----
  const titleY = letterheadBottom + 26;
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(company.name, 50, titleY);
  doc.setTextColor(MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Maintenance activity — ${year}`, 50, titleY + 18);

  // ---- summary boxes ----
  const summaryTop = titleY + 38;
  drawSummaryBoxes(doc, [
    { label: 'ALLOTTED', value: fmtDuration(allottedMinutes), big: true },
    { label: 'USED', value: fmtDuration(usedMinutes), big: true },
    { label: 'REMAINING', value: fmtDuration(remainingMinutes), warn: remainingMinutes < 0, big: true },
  ], summaryTop, 158, 15);

  // ---- table ----
  const tableTop = summaryTop + 90;
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Work completed', 50, tableTop);

  const rows = companyLogs.length
    ? companyLogs.map((l) => [l.date, l.task || '—', fmtDuration(l.minutes)])
    : [['—', 'No work logged for this year.', '']];

  autoTable(doc, {
    startY: tableTop + 14,
    head: [['DATE', 'TASK', 'TIME']],
    body: rows,
    margin: { left: 50, right: 50, bottom: 90 },
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 6 },
    headStyles: { fillColor: false, textColor: MUTED, fontStyle: 'bold', fontSize: 8, lineWidth: { bottom: 1 }, lineColor: INK },
    columnStyles: {
      0: { cellWidth: 80 },
      2: { cellWidth: 70 },
    },
    theme: 'plain',
    didParseCell: (data) => {
      if (data.section === 'body') {
        data.cell.styles.lineWidth = { bottom: 0.5 };
        data.cell.styles.lineColor = LINE;
      }
    },
  });

  applyFooterToAllPages(doc, footerData, contentWidth);

  const filename = `${company.name.replace(/[^a-z0-9]+/gi, '_')}_maintenance_report_${year}.pdf`;
  doc.save(filename);
}

// ---------- Admin monthly report: income, expenses, and every logged task ----------
export async function downloadMonthlyReport({ monthKey, monthLabel, companies, workers, logs, payments, workerCosts }) {
  const inMonth = (dateStr) => typeof dateStr === 'string' && dateStr.startsWith(monthKey);

  const monthPayments = payments.filter((p) => inMonth(p.date)).sort((a, b) => new Date(a.date) - new Date(b.date));
  const monthCosts = workerCosts.filter((wc) => inMonth(wc.date)).sort((a, b) => new Date(a.date) - new Date(b.date));
  const monthLogs = logs.filter((l) => inMonth(l.date)).sort((a, b) => new Date(a.date) - new Date(b.date));

  const companyName = (id) => companies.find((c) => c.id === id)?.name || '—';
  const workerName = (id) => workers.find((w) => w.id === id)?.name || '—';

  const incomePaid = monthPayments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = monthPayments.filter((p) => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const expenses = monthCosts.reduce((s, wc) => s + Number(wc.amount || 0), 0);
  const net = incomePaid - expenses;
  const hoursLogged = monthLogs.reduce((s, l) => s + Number(l.minutes), 0);

  const { letterheadData, footerData } = await loadLetterheadAssets();

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - 100;
  const footerReserve = 110;

  const letterheadBottom = drawLetterhead(doc, letterheadData, contentWidth);

  const titleY = letterheadBottom + 26;
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Admin Monthly Report', 50, titleY);
  doc.setTextColor(MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(monthLabel, 50, titleY + 18);

  const row1Top = titleY + 38;
  drawSummaryBoxes(doc, [
    { label: 'INCOME (PAID)', value: fmtMoney(incomePaid) },
    { label: 'EXPENSES', value: fmtMoney(expenses) },
    { label: 'NET', value: fmtMoney(net), warn: net < 0 },
  ], row1Top, 158, 15);

  const row2Top = row1Top + 70;
  drawSummaryBoxes(doc, [
    { label: 'OUTSTANDING', value: fmtMoney(outstanding), warn: outstanding > 0 },
    { label: 'HOURS LOGGED', value: fmtDuration(hoursLogged) },
    { label: 'TASK ENTRIES', value: String(monthLogs.length) },
  ], row2Top, 158, 15);

  let y = row2Top + 90;

  function ensureSpace(needed) {
    if (y + needed > pageHeight - footerReserve) {
      doc.addPage();
      y = 50;
    }
  }

  function sectionHeading(title) {
    ensureSpace(30);
    doc.setTextColor(INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, 50, y);
    y += 14;
  }

  // ---- income ----
  sectionHeading('Income — company payments');
  autoTable(doc, {
    startY: y,
    head: [['DATE', 'COMPANY', 'AMOUNT', 'STATUS', 'NOTE']],
    body: monthPayments.length
      ? monthPayments.map((p) => [p.date, companyName(p.companyId), fmtMoney(p.amount), p.status, p.note || ''])
      : [['—', 'No payments recorded this month.', '', '', '']],
    margin: { left: 50, right: 50, bottom: footerReserve },
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 6 },
    headStyles: { fillColor: false, textColor: MUTED, fontStyle: 'bold', fontSize: 8, lineWidth: { bottom: 1 }, lineColor: INK },
    columnStyles: { 0: { cellWidth: 68 }, 2: { cellWidth: 70 }, 3: { cellWidth: 60 } },
    theme: 'plain',
    didParseCell: (data) => {
      if (data.section === 'body') {
        data.cell.styles.lineWidth = { bottom: 0.5 };
        data.cell.styles.lineColor = LINE;
      }
    },
  });
  y = doc.lastAutoTable.finalY + 26;

  // ---- expenses ----
  sectionHeading('Expenses — worker payouts');
  autoTable(doc, {
    startY: y,
    head: [['DATE', 'WORKER', 'COMPANY', 'AMOUNT', 'NOTE']],
    body: monthCosts.length
      ? monthCosts.map((wc) => [wc.date, workerName(wc.workerId), wc.companyId ? companyName(wc.companyId) : '—', fmtMoney(wc.amount), wc.note || ''])
      : [['—', 'No payouts recorded this month.', '', '', '']],
    margin: { left: 50, right: 50, bottom: footerReserve },
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 6 },
    headStyles: { fillColor: false, textColor: MUTED, fontStyle: 'bold', fontSize: 8, lineWidth: { bottom: 1 }, lineColor: INK },
    columnStyles: { 0: { cellWidth: 68 }, 3: { cellWidth: 70 } },
    theme: 'plain',
    didParseCell: (data) => {
      if (data.section === 'body') {
        data.cell.styles.lineWidth = { bottom: 0.5 };
        data.cell.styles.lineColor = LINE;
      }
    },
  });
  y = doc.lastAutoTable.finalY + 26;

  // ---- work logs ----
  sectionHeading('Work logs — every task this month');
  autoTable(doc, {
    startY: y,
    head: [['DATE', 'COMPANY', 'WORKER', 'DESCRIPTION', 'TIME', 'LOGGED AT']],
    body: monthLogs.length
      ? monthLogs.map((l) => [
          l.date,
          companyName(l.companyId),
          workerName(l.workerId),
          l.task || '—',
          fmtDuration(l.minutes),
          l.created_at ? new Date(l.created_at).toLocaleString() : '—',
        ])
      : [['—', 'No work logged this month.', '', '', '', '']],
    margin: { left: 50, right: 50, bottom: footerReserve },
    styles: { font: 'helvetica', fontSize: 8.5, textColor: INK, cellPadding: 5 },
    headStyles: { fillColor: false, textColor: MUTED, fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 1 }, lineColor: INK },
    columnStyles: { 0: { cellWidth: 58 }, 4: { cellWidth: 42 }, 5: { cellWidth: 90 } },
    theme: 'plain',
    didParseCell: (data) => {
      if (data.section === 'body') {
        data.cell.styles.lineWidth = { bottom: 0.5 };
        data.cell.styles.lineColor = LINE;
      }
    },
  });

  applyFooterToAllPages(doc, footerData, contentWidth);

  doc.save(`redot_admin_report_${monthKey}.pdf`);
}
