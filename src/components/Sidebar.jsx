import logo from "../assets/hero.png";
import { NAV_ITEMS } from "../routes/AppRoutes";

export default function Sidebar({
  activeTab,
  navigate,
  stats,
  area,
  isOpen,
  toggleSidebar,
  todayStats,
}) {
  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`modal-overlay ${!isOpen ? "collapsed" : ""}`}
        style={{
          display: isOpen ? "block" : "none",
          background: "rgba(0,0,0,0.3)",
          position: "fixed",
          zIndex: 95,
        }}
        onClick={toggleSidebar}
      />

      <aside className={`sidebar ${!isOpen ? "mobile-closed" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <img
              src={logo}
              alt="Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <div className="brand-text">
            <span className="brand-title">SurveyPulse</span>
            <span className="brand-sub">Form SC-3 · Khoksa</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${activeTab === n.id ? "active" : ""}`}
              onClick={() => {
                navigate(`/${n.id}`);
                if (window.innerWidth <= 1024) toggleSidebar();
              }}
            >
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
              {n.badgeKey && stats[n.badgeKey] !== undefined && (
                <span className={`nav-badge ${n.badgeColor || ""}`}>
                  {stats[n.badgeKey]}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Today's Status */}
        <div className="sidebar-stats">
          <div className="stat-mini-card">
            <div className="stat-mini-label">Today's Surveys</div>
            <div className="stat-mini-value">{todayStats?.surveys || 0}</div>
            <div
              style={{
                fontSize: "9px",
                color: "rgba(255,255,255,0.3)",
                marginTop: "4px",
              }}
            >
              +{todayStats?.pregnant || 0} Preg • +{todayStats?.children || 0} Child
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="meta-line">ASHA: Jaba Rani Barman</div>
          <div className="meta-line">ANM: Beauty Roy</div>
          <div className="meta-line">
            Village: {area?.village}, {area?.block}
          </div>
        </div>
      </aside>
    </>
  );
}
