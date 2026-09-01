import { useState } from 'react';
import { fmtMoney, todayISO } from '../utils.js';
import { downloadMonthlyReport } from '../report.js';
import { IconDownload, IconTrash } from './Icons.jsx';
import { useToast } from './Toast.jsx';
import { useConfirm } from './ConfirmDialog.jsx';

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function EntryForm({ title, hint, onSubmit, submitLabel }) {
  const [date, setDate] = useState(todayISO());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!date || !name.trim() || !amount) return;
    setSaving(true);
    try {
      await onSubmit({ date, name: name.trim(), description: description.trim(), amount: Number(amount) });
      setName('');
      setDescription('');
      setAmount('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel">
      <h2>{title}</h2>
      {hint && <p className="small-muted" style={{ marginTop: -8, marginBottom: 14 }}>{hint}</p>}
      <div className="row">
        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Name</label>
          <input type="text" placeholder="e.g. Office rent" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Amount ($)</label>
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <div className="field">
          <label>Description (optional)</label>
          <input type="text" placeholder="Any extra detail" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <button className="btn" onClick={submit} disabled={saving}>{submitLabel}</button>
      </div>
    </div>
  );
}

function EntryTable({ rows, onDelete, emptyLabel }) {
  if (rows.length === 0) return <p className="empty">{emptyLabel}</p>;
  return (
    <table>
      <thead><tr><th>Date</th><th>Name</th><th>Description</th><th>Amount</th><th></th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.date}</td>
            <td>{r.name}</td>
            <td>{r.description || ''}</td>
            <td>{fmtMoney(r.amount)}</td>
            <td className="row-actions"><button className="icon-btn danger" title="Delete" onClick={() => onDelete(r.id)}><IconTrash width={15} height={15} /></button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdminTab({ state, onAddIncome, onDeleteIncome, onAddExpense, onDeleteExpense }) {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [month, setMonth] = useState(currentMonthKey());
  const [downloading, setDownloading] = useState(false);

  const inMonth = (dateStr) => typeof dateStr === 'string' && dateStr.startsWith(month);

  const monthIncome = state.adminIncome.filter((r) => inMonth(r.date)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const monthExpenses = state.adminExpenses.filter((r) => inMonth(r.date)).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalIncome = monthIncome.reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = monthExpenses.reduce((s, r) => s + Number(r.amount), 0);
  const net = totalIncome - totalExpenses;

  async function addIncome(row) {
    await onAddIncome(row);
    toast('Income entry added');
  }
  async function deleteIncome(id) {
    const ok = await confirmDialog({ title: 'Delete income entry', message: 'This can\'t be undone.' });
    if (!ok) return;
    await onDeleteIncome(id);
    toast('Income entry removed', 'remove');
  }
  async function addExpense(row) {
    await onAddExpense(row);
    toast('Expense entry added');
  }
  async function deleteExpense(id) {
    const ok = await confirmDialog({ title: 'Delete expense entry', message: 'This can\'t be undone.' });
    if (!ok) return;
    await onDeleteExpense(id);
    toast('Expense entry removed', 'remove');
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadMonthlyReport({
        monthKey: month,
        monthLabel: monthLabel(month),
        income: state.adminIncome,
        expenses: state.adminExpenses,
      });
    } catch (e) {
      toast('Could not generate the report', 'remove');
    } finally {
      setDownloading(false);
    }
  }

  const kpis = [
    { label: 'Income', value: fmtMoney(totalIncome) },
    { label: 'Expenses', value: fmtMoney(totalExpenses) },
    { label: 'Net', value: fmtMoney(net), warn: net < 0 },
  ];

  return (
    <>
      <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Admin monthly report</h2>
          <p className="small-muted" style={{ marginTop: 6 }}>A separate income/expense ledger for the business.</p>
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

      <EntryForm title="Add income" submitLabel="Save income" onSubmit={addIncome} />
      <div className="panel">
        <h2>Income — {monthLabel(month)}</h2>
        <EntryTable rows={monthIncome} onDelete={deleteIncome} emptyLabel="No income recorded for this month." />
      </div>

      <EntryForm title="Add expense" submitLabel="Save expense" onSubmit={addExpense} />
      <div className="panel">
        <h2>Expenses — {monthLabel(month)}</h2>
        <EntryTable rows={monthExpenses} onDelete={deleteExpense} emptyLabel="No expenses recorded for this month." />
      </div>
    </>
  );
}
