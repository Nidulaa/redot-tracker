import { useState } from 'react';
import { fmtHrs, todayISO } from '../utils.js';
import { useToast } from './Toast.jsx';
import { IconTrash } from './Icons.jsx';

export default function LogTab({ state, onAddLog, onDeleteLog, currentWorker }) {
  const toast = useToast();
  const [companyId, setCompanyId] = useState(state.companies[0]?.id || '');
  const [date, setDate] = useState(todayISO());
  const [task, setTask] = useState('');
  const [minutes, setMinutes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  if (state.companies.length === 0) {
    return (
      <div className="panel">
        <p className="empty">No companies yet. Add one in the Companies tab first.</p>
      </div>
    );
  }

  if (!currentWorker) {
    return (
      <div className="panel">
        <p className="empty">Setting up your worker profile… reload the page in a moment.</p>
      </div>
    );
  }

  async function submit() {
    if (!companyId || !date || !minutes) {
      setErrorMsg('Fill in company, date, and time spent.');
      return;
    }
    setSaving(true);
    try {
      await onAddLog({ companyId, date, task, minutes: Number(minutes), workerId: currentWorker.id });
      const c = state.companies.find((x) => x.id === companyId);
      toast(`Task logged for ${c ? c.name : 'company'}`);
      setErrorMsg('');
      setTask('');
      setMinutes('');
    } catch (e) {
      setErrorMsg(e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteLog(id) {
    await onDeleteLog(id);
    toast('Entry removed', 'remove');
  }

  const myLogs = [...state.logs]
    .filter((l) => l.workerId === currentWorker.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  return (
    <>
      <div className="panel">
        <h2>Log a completed task</h2>
        <p className="small-muted" style={{ marginTop: -8, marginBottom: 16 }}>
          Logging as <strong>{currentWorker.name}</strong>
        </p>
        <div className="row">
          <div className="field">
            <label>Company</label>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              {state.companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Task description</label>
            <textarea
              placeholder="e.g. Updated plugins, fixed broken contact form"
              value={task}
              onChange={(e) => setTask(e.target.value)}
            />
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Time spent (minutes)</label>
            <input
              type="number"
              min="0"
              step="5"
              placeholder="e.g. 45"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
        </div>
        <div>{errorMsg && <div style={{ color: 'var(--red)', fontSize: 13 }}>{errorMsg}</div>}</div>
        <div style={{ marginTop: 16 }}>
          <button className="btn" onClick={submit} disabled={saving}>Save entry</button>
        </div>
      </div>
      <div className="panel">
        <h2>Your recent entries</h2>
        {myLogs.length === 0 ? (
          <p className="empty">No entries yet.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Date</th><th>Company</th><th>Task</th><th>Time</th><th></th></tr>
            </thead>
            <tbody>
              {myLogs.map((l) => {
                const c = state.companies.find((x) => x.id === l.companyId);
                return (
                  <tr key={l.id}>
                    <td>{l.date}</td>
                    <td>{c ? c.name : '—'}</td>
                    <td>{l.task || ''}</td>
                    <td>{fmtHrs(l.minutes)}h</td>
                    <td className="row-actions"><button className="icon-btn danger" title="Delete" onClick={() => deleteLog(l.id)}><IconTrash width={15} height={15} /></button></td>
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
