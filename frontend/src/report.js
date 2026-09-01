import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const RED = '#c8102e';
const INK = '#141414';
const MUTED = '#726f6a';

// Minutes under an hour read as "45m"; an hour or more reads as "1.5h".
function fmtDuration(mins) {
  const m = Number(mins) || 0;
  if (Math.abs(m) < 60) return `${Math.round(m)}m`;
  return `${(m / 60).toFixed(1)}h`;
}

export function downloadCompanyReport({ company, logs, packages, year }) {
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

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // ---- letterhead: "RE(play icon)OT" / "global" wordmark ----
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('RE', 50, 55);
  const reWidth = doc.getTextWidth('RE');

  const iconR = 9;
  const iconCx = 50 + reWidth + iconR + 2;
  const iconCy = 48;
  doc.setFillColor(RED);
  doc.circle(iconCx, iconCy, iconR, 'F');
  doc.setFillColor('#ffffff');
  doc.triangle(iconCx - 3, iconCy - 4.5, iconCx - 3, iconCy + 4.5, iconCx + 5, iconCy, 'F');

  doc.setTextColor(INK);
  doc.text('OT', iconCx + iconR + 3, 55);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(MUTED);
  doc.text('global', 50, 68);

  doc.setDrawColor(RED);
  doc.setLineWidth(1.5);
  doc.line(50, 84, pageWidth - 50, 84);

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
    { label: 'ALLOTTED', value: fmtDuration(allottedMinutes) },
    { label: 'USED', value: fmtDuration(usedMinutes) },
    { label: 'REMAINING', value: fmtDuration(remainingMinutes), warn: remainingMinutes < 0 },
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
        data.cell.styles.lineColor = '#e0ddd6';
      }
    },
  });

  // ---- footer: matches the Redot invoice footer (line + registration + contact) ----
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerLineY = pageHeight - 62;
  const footerTextY = footerLineY + 12;
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(RED);
    doc.setLineWidth(1);
    doc.line(50, footerLineY, pageWidth - 50, footerLineY);

    doc.setTextColor(MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Redot (Pte) Ltd. Unique Entity Number: 201708294G.', 50, footerTextY);
    doc.text('T: +65 690 173 64  M: +65 927 888 53 | E: info@redot.global | W: redot.global', pageWidth - 50, footerTextY, { align: 'right' });
  }

  const filename = `${company.name.replace(/[^a-z0-9]+/gi, '_')}_maintenance_report_${year}.pdf`;
  doc.save(filename);
}
