import { fmtHrs, companyAllotted, companyUsed } from '../utils.js';
import { downloadCompanyReport } from '../report.js';
import { IconDownload } from './Icons.jsx';

export default function AnalyticsTab({ state, year, setYear, expandedCompany, setExpandedCompany }) {
  if (state.companies.length === 0) {
    return (
      <div className="panel">
        <p className="empty">No companies yet. Add companies in the Companies tab.</p>
      </div>
    );
  }

  const years = new Set([new Date().getFullYear()]);
  state.logs.forEach((l) => years.add(new Date(l.date).getFullYear()));
  state.packages.forEach((p) => years.add(new Date(p.date).getFullYear()));
  const yearList = [...years].sort((a, b) => b - a);

  return (
    <>
      <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Company analytics — {year}</h2>
        <select className="tag-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {yearList.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      {state.companies.map((c) => {
        const allotted = companyAllotted(c, year, state.packages);
        const used = companyUsed(c, year, state.logs);
        const remaining = allotted - used;
        const pct = Math.min(100, (used / allotted) * 100 || 0);
        const over = used > allotted;
        const isOpen = expandedCompany === c.id;
        const companyLogs = state.logs
          .filter((l) => l.companyId === c.id && new Date(l.date).getFullYear() === year)
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        return (
          <div className="company-card" key={c.id}>
            <div className="head clickable" style={{ cursor: 'pointer' }} onClick={() => setExpandedCompany(isOpen ? null : c.id)}>
              <h3>{c.name}</h3>
              <span className={'badge ' + (over ? 'over' : 'ok')}>{over ? 'OVER ALLOWANCE' : 'ON TRACK'}</span>
            </div>
            <div className="bar-track"><div className={'bar-fill' + (over ? ' over' : '')} style={{ width: pct + '%' }} /></div>
            <div className="stat-row">
              <div><span>Allotted</span><b>{fmtHrs(allotted)}h</b></div>
              <div><span>Used</span><b>{fmtHrs(used)}h</b></div>
              <div><span>Remaining</span><b style={{ color: remaining < 0 ? 'var(--red)' : 'var(--ink)' }}>{fmtHrs(remaining)}h</b></div>
            </div>
            <button className="btn small secondary" style={{ marginTop: 12 }} onClick={() => setExpandedCompany(isOpen ? null : c.id)}>
              {isOpen ? 'Hide work log' : 'View work done'}
            </button>
            <button
              className="btn small icon-inline"
              style={{ marginTop: 12, marginLeft: 8 }}
              onClick={() => downloadCompanyReport({ company: c, logs: state.logs, packages: state.packages, workers: state.workers, year })}
            >
              <IconDownload width={14} height={14} /> Get report
            </button>
            {isOpen && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                {companyLogs.length === 0 ? (
                  <p className="empty">No work logged for this company yet.</p>
                ) : (
                  <table>
                    <thead><tr><th>Date</th><th>Task</th><th>Time</th><th>Worker</th></tr></thead>
                    <tbody>
                      {companyLogs.map((l) => {
                        const w = state.workers.find((x) => x.id === l.workerId);
                        return (
                          <tr key={l.id}>
                            <td>{l.date}</td>
                            <td>{l.task || ''}</td>
                            <td>{fmtHrs(l.minutes)}h</td>
                            <td>{w ? w.name : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
