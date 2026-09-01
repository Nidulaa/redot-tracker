import { fmtHrs, fmtMoney, companyAllotted, companyUsed } from '../utils.js';

export default function OverviewTab({ state, onNavigate }) {
  const year = new Date().getFullYear();

  const logsThisYear = state.logs.filter((l) => new Date(l.date).getFullYear() === year);
  const paymentsThisYear = state.payments.filter((p) => new Date(p.date).getFullYear() === year);
  const costsThisYear = state.workerCosts.filter((wc) => new Date(wc.date).getFullYear() === year);

  const hoursLogged = logsThisYear.reduce((s, l) => s + Number(l.minutes), 0);
  const revenue = paymentsThisYear.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = paymentsThisYear.filter((p) => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const payouts = costsThisYear.reduce((s, wc) => s + Number(wc.amount || 0), 0);

  const companyStats = state.companies
    .map((c) => {
      const allotted = companyAllotted(c, year, state.packages);
      const used = companyUsed(c, year, state.logs);
      return { c, allotted, used, pct: allotted ? (used / allotted) * 100 : 0 };
    })
    .sort((a, b) => b.pct - a.pct);

  const overCount = companyStats.filter((s) => s.used > s.allotted).length;

  const recent = [...state.logs]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6)
    .map((l) => ({ ...l, kind: 'log' }));

  const kpis = [
    { label: 'Companies', value: state.companies.length, sub: overCount > 0 ? `${overCount} over allowance` : 'all on track', warn: overCount > 0 },
    { label: 'Hours logged', value: fmtHrs(hoursLogged) + 'h', sub: `${year} · ${logsThisYear.length} entries` },
    { label: 'Revenue collected', value: fmtMoney(revenue), sub: `${year} · paid` },
    { label: 'Outstanding', value: fmtMoney(outstanding), sub: `${year} · unpaid + partial`, warn: outstanding > 0 },
    { label: 'Worker payouts', value: fmtMoney(payouts), sub: `${year}` },
  ];

  return (
    <>
      <div className="kpi-grid">
        {kpis.map((k) => (
          <div className="kpi-card" key={k.label}>
            <div className="kpi-label">{k.label}</div>
            <div className={'kpi-value' + (k.warn ? ' warn' : '')}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Allowance usage — {year}</h2>
          <button className="btn small secondary" onClick={() => onNavigate('analytics')}>Open analytics</button>
        </div>
        {companyStats.length === 0 ? (
          <p className="empty">No companies yet.</p>
        ) : (
          <div className="usage-list">
            {companyStats.slice(0, 6).map(({ c, allotted, used, pct }) => {
              const over = used > allotted;
              return (
                <div className="usage-row" key={c.id}>
                  <div className="usage-name">{c.name}</div>
                  <div className="bar-track"><div className={'bar-fill' + (over ? ' over' : '')} style={{ width: Math.min(100, pct) + '%' }} /></div>
                  <div className="usage-figures">{fmtHrs(used)}h / {fmtHrs(allotted)}h</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Recent activity</h2>
          <button className="btn small secondary" onClick={() => onNavigate('log')}>Log a task</button>
        </div>
        {recent.length === 0 ? (
          <p className="empty">Nothing logged yet.</p>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Company</th><th>Task</th><th>Time</th></tr></thead>
            <tbody>
              {recent.map((l) => {
                const c = state.companies.find((x) => x.id === l.companyId);
                return (
                  <tr key={l.id}>
                    <td>{l.date}</td>
                    <td>{c ? c.name : '—'}</td>
                    <td>{l.task || ''}</td>
                    <td>{fmtHrs(l.minutes)}h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
