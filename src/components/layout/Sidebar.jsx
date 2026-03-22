import logo from "../../assets/hero.png";
import { NAV_ITEMS } from "../../routes/AppRoutes";
import { Badge } from "../common";
import styles from "./Sidebar.module.css";

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
        className={`${styles.modalOverlay} ${!isOpen ? styles.collapsed : ""}`}
        style={{
          display: isOpen && window.innerWidth <= 1024 ? "block" : "none",
          background: "rgba(0,0,0,0.3)",
          position: "fixed",
          inset: 0,
          zIndex: 95,
        }}
        onClick={toggleSidebar}
      />

      <aside className={`${styles.sidebar} ${!isOpen ? styles.mobileClosed : ""}`}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandIcon}>
            <img
              src={logo}
              alt="Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>ASHA Survey</span>
            <span className={styles.brandSub}>E-Register • {area?.village}</span>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          {NAV_ITEMS.map((n) => {
            const badgeVal = n.badgeKey ? stats[n.badgeKey] : undefined;
            const showBadge = badgeVal !== undefined && badgeVal > 0;
            return (
              <button
                key={n.id}
                className={`${styles.navItem} ${activeTab === n.id ? styles.active : ""}`}
                onClick={() => {
                  navigate(`/${n.id}`);
                  if (window.innerWidth <= 1024) toggleSidebar();
                }}
              >
                <span className={styles.navIcon}>{n.icon}</span>
                <span className={styles.navLabel}>{n.label}</span>
                {showBadge && (
                  <Badge
                    variant={n.badgeColor || "dim"}
                    style={{ marginLeft: "auto", fontSize: "10px", flexShrink: 0 }}
                  >
                    {badgeVal}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Today's Status */}
        <div className={styles.sidebarStats}>
          <div className={styles.statMiniCard}>
            <div className={styles.statMiniLabel}>Today's Activity</div>
            <div className={styles.statMiniValue}>{todayStats?.surveys || 0}</div>
            <div className={styles.statMiniSub}>
              +{todayStats?.pregnant || 0} Preg • +{todayStats?.children || 0} Child
            </div>
          </div>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.metaLine}>
            {(() => {
              const asha = localStorage.getItem("survey_asha");
              const parsed = asha ? JSON.parse(asha) : null;
              return parsed?.ashaName || "Jaba Rani Barman";
            })()}
          </div>
          <div className={styles.metaLine}>
            ANM: {(() => {
              const asha = localStorage.getItem("survey_asha");
              const parsed = asha ? JSON.parse(asha) : null;
              return parsed?.anmName || "Beauty Roy";
            })()}
          </div>
          <div className={styles.metaLine}>
            {area?.village}, {area?.block}
          </div>
        </div>
      </aside>
    </>
  );
}