export function fmtHrs(mins) {
  return (mins / 60).toFixed(1);
}

export function fmtMoney(n) {
  return '$' + Number(n || 0).toFixed(2);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function companyAllotted(c, year, packages) {
  const base = Number(c.annualHours || 12) * 60;
  const pkgMins = packages
    .filter((p) => p.companyId === c.id && new Date(p.date).getFullYear() === year)
    .reduce((s, p) => s + Number(p.hours) * 60, 0);
  return base + pkgMins;
}

export function companyUsed(c, year, logs) {
  return logs
    .filter((l) => l.companyId === c.id && new Date(l.date).getFullYear() === year)
    .reduce((s, l) => s + Number(l.minutes), 0);
}

export function workerTotalCost(w, year, workerCosts) {
  return workerCosts
    .filter((wc) => wc.workerId === w.id && new Date(wc.date).getFullYear() === year)
    .reduce((s, wc) => s + Number(wc.amount || 0), 0);
}
