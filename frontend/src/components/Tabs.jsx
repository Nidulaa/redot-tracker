const TABS = [
  { key: 'log', label: 'Log Task' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'payments', label: 'Payments' },
  { key: 'people', label: 'People' },
  { key: 'companies', label: 'Companies' },
];

export default function Tabs({ active, onChange }) {
  return (
    <nav className="tabs">
      {TABS.map((t) => (
        <button key={t.key} className={active === t.key ? 'active' : ''} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
