import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtHrs } from './utils.js';

const RED = '#c8102e';
const INK = '#141414';
const MUTED = '#726f6a';

export function downloadCompanyReport({ company, logs, packages, workers, year }) {
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

  const workerName = (id) => {
    const w = workers.find((x) => x.id === id);
    return w ? w.name : '—';
  };

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  // ---- letterhead ----
  doc.setFillColor(RED);
  doc.circle(55, 48, 4, 'F');
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('REDOT GLOBAL', 68, 52);
  doc.setTextColor(MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('WEB MAINTENANCE REPORT', 68, 65);

  doc.setDrawColor(INK);
  doc.setLineWidth(2);
  doc.line(50, 84, 545, 84);

  // ---- title ----
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(company.name, 50, 112);
  doc.setTextColor(MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Maintenance activity — ${year}`, 50, 130);

  // ---- summary boxes ----
  const summaryTop = 150;
  const boxW = 158;
  const boxGap = 15;
  const summaries = [
    { label: 'ALLOTTED', value: fmtHrs(allottedMinutes) + 'h' },
    { label: 'USED', value: fmtHrs(usedMinutes) + 'h' },
    { label: 'REMAINING', value: fmtHrs(remainingMinutes) + 'h', warn: remainingMinutes < 0 },
  ];
  summaries.forEach((s, i) => {
    const x = 50 + i * (boxW + boxGap);
    doc.setDrawColor('#e0ddd6');
    doc.setLineWidth(1);
    doc.roundedRect(x, summaryTop, boxW, 58, 4, 4, 'S');
    doc.setTextColor(MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(s.label, x + 14, summaryTop + 20);
    doc.setTextColor(s.warn ? RED : INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(s.value, x + 14, summaryTop + 42);
  });

  // ---- table ----
  const tableTop = summaryTop + 90;
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Work completed', 50, tableTop);

  const rows = companyLogs.length
    ? companyLogs.map((l) => [l.date, l.task || '—', workerName(l.workerId), fmtHrs(l.minutes) + 'h'])
    : [['—', 'No work logged for this year.', '', '']];

  autoTable(doc, {
    startY: tableTop + 14,
    head: [['DATE', 'TASK', 'BY', 'TIME']],
    body: rows,
    margin: { left: 50, right: 50 },
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 6 },
    headStyles: { fillColor: false, textColor: MUTED, fontStyle: 'bold', fontSize: 8, lineWidth: { bottom: 1 }, lineColor: INK },
    columnStyles: {
      0: { cellWidth: 70 },
      2: { cellWidth: 90 },
      3: { cellWidth: 60 },
    },
    theme: 'plain',
    didParseCell: (data) => {
      if (data.section === 'body') {
        data.cell.styles.lineWidth = { bottom: 0.5 };
        data.cell.styles.lineColor = '#e0ddd6';
      }
    },
  });

  // ---- footer ----
  const generatedOn = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Report generated on ${generatedOn} — Redot Global`, 297.5, 800, { align: 'center' });
  }

  const filename = `${company.name.replace(/[^a-z0-9]+/gi, '_')}_maintenance_report_${year}.pdf`;
  doc.save(filename);
}
