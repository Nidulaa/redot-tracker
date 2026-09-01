export default function Header({ user, onLogout }) {
  return (
    <header className="top">
      <div className="brand">
        <div>
          <h1><span className="dot"></span>&nbsp;Redot Global</h1>
          <div className="sub">Maintenance Tracker</div>
        </div>
      </div>
      <div className="session">
        <span className="who">{user ? (user.user_metadata?.name || user.email) : ''}</span>
        <button className="logout-btn" onClick={onLogout}>Log out</button>
      </div>
    </header>
  );
}
