import { IconOverview, IconLog, IconChart, IconPayments, IconPeople, IconCompanies, IconLogout, IconClose } from './Icons.jsx';

const NAV = [
  { key: 'overview', label: 'Overview', icon: IconOverview },
  { key: 'log', label: 'Log Task', icon: IconLog },
  { key: 'analytics', label: 'Analytics', icon: IconChart },
  { key: 'payments', label: 'Payments', icon: IconPayments },
  { key: 'people', label: 'People', icon: IconPeople },
  { key: 'companies', label: 'Companies', icon: IconCompanies },
];

export default function Sidebar({ active, onChange, user, onLogout, open, onClose }) {
  return (
    <>
      {open && <div className="sidebar-scrim" onClick={onClose} />}
      <aside className={'sidebar' + (open ? ' open' : '')}>
        <div className="sidebar-brand">
          <span className="dot" />
          <div>
            <div className="sidebar-brand-name">Redot Global</div>
            <div className="sidebar-brand-sub">Maintenance Tracker</div>
          </div>
          <button className="sidebar-close" onClick={onClose} aria-label="Close menu"><IconClose width={16} height={16} /></button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={'sidebar-link' + (active === item.key ? ' active' : '')}
                onClick={() => { onChange(item.key); onClose(); }}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{(user?.user_metadata?.name || user?.email || '?').charAt(0).toUpperCase()}</div>
            <div className="sidebar-user-name">{user?.user_metadata?.name || user?.email}</div>
          </div>
          <button className="sidebar-logout" onClick={onLogout}>
            <IconLogout width={16} height={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
