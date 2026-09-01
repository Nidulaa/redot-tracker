import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const RED = '#c8102e';
const INK = '#141414';
const MUTED = '#726f6a';

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

// Minutes under an hour read as "45m"; an hour or more reads as "1.5h".
function fmtDuration(mins) {
  const m = Number(mins) || 0;
  if (Math.abs(m) < 60) return `${Math.round(m)}m`;
  return `${(m / 60).toFixed(1)}h`;
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

  const [letterheadData, footerData] = await Promise.all([
    loadImageDataUrl(LETTERHEAD_SRC.url),
    loadImageDataUrl(FOOTER_SRC.url),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - 100;

  // ---- letterhead: the real Redot logo + rule, taken directly from the invoice ----
  const letterheadH = (LETTERHEAD_SRC.h / LETTERHEAD_SRC.w) * contentWidth;
  const letterheadY = 32;
  doc.addImage(letterheadData, LETTERHEAD_SRC.format, 50, letterheadY, contentWidth, letterheadH);

  // ---- title ----
  const titleY = letterheadY + letterheadH + 26;
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

  // ---- footer: the real Redot invoice footer (rule + registration + contact), verbatim ----
  const footerH = (FOOTER_SRC.h / FOOTER_SRC.w) * contentWidth;
  const footerY = pageHeight - footerH - 36;
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.addImage(footerData, FOOTER_SRC.format, 50, footerY, contentWidth, footerH);
  }

  const filename = `${company.name.replace(/[^a-z0-9]+/gi, '_')}_maintenance_report_${year}.pdf`;
  doc.save(filename);
}
