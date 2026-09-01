import { useState } from 'react';
import { fmtMoney, fmtDuration } from '../utils.js';
import { downloadMonthlyReport } from '../report.js';
import { IconDownload } from './Icons.jsx';
import { useToast } from './Toast.jsx';

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function AdminTab({ state }) {
  const toast = useToast();
  const [month, setMonth] = useState(currentMonthKey());
  const [downloading, setDownloading] = useState(false);

  const inMonth = (dateStr) => typeof dateStr === 'string' && dateStr.startsWith(month);

  const companyName = (id) => state.companies.find((c) => c.id === id)?.name || '—';
  const workerName = (id) => state.workers.find((w) => w.id === id)?.name || '—';

  const monthPayments = state.payments.filter((p) => inMonth(p.date)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const monthCosts = state.workerCosts.filter((wc) => inMonth(wc.date)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const monthLogs = state.logs.filter((l) => inMonth(l.date)).sort((a, b) => new Date(b.date) - new Date(a.date));

  const incomePaid = monthPayments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = monthPayments.filter((p) => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const expenses = monthCosts.reduce((s, wc) => s + Number(wc.amount || 0), 0);
  const net = incomePaid - expenses;
  const hoursLogged = monthLogs.reduce((s, l) => s + Number(l.minutes), 0);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadMonthlyReport({
        monthKey: month,
        monthLabel: monthLabel(month),
        companies: state.companies,
        workers: state.workers,
        logs: state.logs,
        payments: state.payments,
        workerCosts: state.workerCosts,
      });
    } catch (e) {
      toast('Could not generate the report', 'remove');
    } finally {
      setDownloading(false);
    }
  }

  const kpis = [
    { label: 'Income (paid)', value: fmtMoney(incomePaid) },
    { label: 'Expenses', value: fmtMoney(expenses) },
    { label: 'Net', value: fmtMoney(net), warn: net < 0 },
    { label: 'Outstanding', value: fmtMoney(outstanding), warn: outstanding > 0 },
    { label: 'Hours logged', value: fmtDuration(hoursLogged) },
  ];

  return (
    <>
      <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Admin monthly report</h2>
          <p className="small-muted" style={{ marginTop: 6 }}>Every income, expense, and logged task for the selected month.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="tag-year" />
          <button className="btn small icon-inline" onClick={handleDownload} disabled={downloading}>
            <IconDownload width={14} height={14} /> {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div className="kpi-card" key={k.label}>
            <div className="kpi-label">{k.label}</div>
            <div className={'kpi-value' + (k.warn ? ' warn' : '')}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>Income — company payments</h2>
        {monthPayments.length === 0 ? (
          <p className="empty">No payments recorded for {monthLabel(month)}.</p>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Company</th><th>Amount</th><th>Status</th><th>Note</th></tr></thead>
            <tbody>
              {monthPayments.map((p) => (
                <tr key={p.id}>
                  <td>{p.date}</td>
                  <td>{companyName(p.companyId)}</td>
                  <td>{fmtMoney(p.amount)}</td>
                  <td><span className={'badge ' + p.status}>{p.status}</span></td>
                  <td>{p.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2>Expenses — worker payouts</h2>
        {monthCosts.length === 0 ? (
          <p className="empty">No payouts recorded for {monthLabel(month)}.</p>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Worker</th><th>Company</th><th>Amount</th><th>Note</th></tr></thead>
            <tbody>
              {monthCosts.map((wc) => (
                <tr key={wc.id}>
                  <td>{wc.date}</td>
                  <td>{workerName(wc.workerId)}</td>
                  <td>{wc.companyId ? companyName(wc.companyId) : '—'}</td>
                  <td>{fmtMoney(wc.amount)}</td>
                  <td>{wc.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2>Work logs — every task this month</h2>
        {monthLogs.length === 0 ? (
          <p className="empty">No work logged for {monthLabel(month)}.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Date</th><th>Company</th><th>Worker</th><th>Description</th><th>Time</th><th>Logged at</th></tr></thead>
              <tbody>
                {monthLogs.map((l) => (
                  <tr key={l.id}>
                    <td>{l.date}</td>
                    <td>{companyName(l.companyId)}</td>
                    <td>{workerName(l.workerId)}</td>
                    <td>{l.task || ''}</td>
                    <td>{fmtDuration(l.minutes)}</td>
                    <td>{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
