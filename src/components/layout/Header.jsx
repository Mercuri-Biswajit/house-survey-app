import { useState, useRef } from "react";
import { exportToExcel, exportToPDF } from "../../utils/exportUtils";
import { importFromExcel } from "../../utils/importUtils";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./Header.module.css";

export default function Header({
  currentLabel,
  area,
  households,
  pregnant,
  children,
  searchQuery,
  setSearchQuery,
  toggleSidebar,
  onRefresh,
}) {
  const { showToast } = useToast();
  const { user, logout } = useAuth();
  const [exportMenu, setExportMenu] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsImporting(true);
    try {
      const counts = await importFromExcel(file);
      showToast(
        `✓ Imported: ${counts.households} households, ${counts.pregnant} pregnant, ${counts.children} children`,
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Import error:", err);
      showToast("❌ Import failed. Please check the file format.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  async function handleLogout() {
    setUserMenu(false);
    await logout();
  }

  function getInitials(displayName, email) {
    if (displayName) {
      const parts = displayName.trim().split(" ");
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : displayName.slice(0, 2).toUpperCase();
    }
    return email ? email[0].toUpperCase() : "U";
  }

  return (
    <header className={styles.topbar}>
      {/* ── Left: toggle + page title ── */}
      <div className={styles.topbarLeft}>
        <button
          className={styles.btnToggle}
          onClick={toggleSidebar}
          title="Toggle Sidebar"
        >
          ☰
        </button>
        <div className={styles.titleWrap}>
          <h1 className={styles.pageTitle}>{currentLabel}</h1>
          <span className={styles.pageSubtitle}>
            {area.district} • {area.block} • {area.gp} • {area.village}
          </span>
        </div>
      </div>

      {/* ── Center: search ── */}
      <div className={styles.searchContainer}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by name, household #, or mobile..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className={styles.clearSearch}
            onClick={() => setSearchQuery("")}
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Right: import / export / user ── */}
      <div className={styles.topbarRight}>
        {/* Import */}
        <div className={styles.importWrap}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx"
            style={{ display: "none" }}
          />
          <button
            className={styles.btnImport}
            onClick={handleImportClick}
            disabled={isImporting}
          >
            {isImporting ? <span className={styles.spinner} /> : <span>⬆</span>}
            <span>Import</span>
          </button>
        </div>

        {/* Export */}
        <div className={styles.exportWrap}>
          <button
            className={styles.btnExport}
            onClick={() => setExportMenu((v) => !v)}
          >
            <span>⬇</span>
            <span>Export</span>
          </button>
          {exportMenu && (
            <div
              className={styles.exportMenu}
              onMouseLeave={() => setExportMenu(false)}
            >
              <div className={styles.exportSectionTitle}>📊 Excel Reports</div>
              <button
                onClick={() => {
                  exportToExcel(households, pregnant, children, area);
                  showToast("Excel exported!");
                  setExportMenu(false);
                }}
              >
                💾 Full Workbook (.xlsx)
              </button>
              <div className={styles.exportDivider} />
              <div className={styles.exportSectionTitle}>📄 PDF Documents</div>
              <button
                onClick={() => {
                  exportToPDF(
                    households,
                    pregnant,
                    children,
                    "households",
                    area,
                  );
                  showToast("PDF ready!");
                  setExportMenu(false);
                }}
              >
                📋 Households Registry
              </button>
              <button
                onClick={() => {
                  exportToPDF(households, pregnant, children, "pregnant", area);
                  showToast("PDF ready!");
                  setExportMenu(false);
                }}
              >
                🤰 Pregnant Women List
              </button>
              <button
                onClick={() => {
                  exportToPDF(households, pregnant, children, "children", area);
                  showToast("PDF ready!");
                  setExportMenu(false);
                }}
              >
                👶 Children Registry
              </button>
              <button
                onClick={() => {
                  exportToPDF(households, pregnant, children, "all", area);
                  showToast("PDF ready!");
                  setExportMenu(false);
                }}
              >
                📑 Master Monthly Report
              </button>
            </div>
          )}
        </div>

        {/* User avatar */}
        {user && (
          <div className={styles.userWrap}>
            <button
              className={styles.userAvatar}
              onClick={() => setUserMenu((v) => !v)}
              title={user.displayName || user.email}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="avatar"
                  className={styles.avatarImg}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className={styles.avatarInitials}>
                  {getInitials(user.displayName, user.email)}
                </span>
              )}
            </button>
            {userMenu && (
              <div
                className={styles.userMenu}
                onMouseLeave={() => setUserMenu(false)}
              >
                <div className={styles.userMenuHeader}>
                  <div className={styles.userMenuName}>
                    {user.displayName || "User"}
                  </div>
                  <div className={styles.userMenuEmail}>{user.email}</div>
                  {user.provider && (
                    <span className={styles.userMenuProvider}>
                      via {user.provider === "google" ? "Google" : "Email"}
                    </span>
                  )}
                </div>
                <div className={styles.userMenuDivider} />
                <button
                  className={styles.userMenuItem}
                  onClick={() => {
                    setUserMenu(false);
                    window.location.hash = "#/settings";
                  }}
                >
                  ⚙ Settings
                </button>
                <button
                  className={`${styles.userMenuItem} ${styles.userMenuLogout}`}
                  onClick={handleLogout}
                >
                  ↪ Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
