import { useState, useRef } from "react";
import { exportToExcel, exportToPDF } from "../../utils/exportUtils";
import { importFromExcel } from "../../utils/importUtils";
import { useToast } from "../../contexts/ToastContext";
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
  const [exportMenu, setExportMenu] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be imported again if needed
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

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLeft}>
        <button
          className={styles.btnToggle}
          onClick={toggleSidebar}
          title="Toggle Sidebar"
        >
          ☰
        </button>
        <div>
          <h1 className={styles.pageTitle}>{currentLabel}</h1>
          <span className={styles.pageSubtitle}>
            {area.district} • {area.block} • {area.gp} • {area.village}
          </span>
        </div>
      </div>

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

      <div className={styles.topbarRight}>
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
            {isImporting ? (
              <span className={styles.spinner}></span>
            ) : (
              <span>⬆</span>
            )}
            <span>Import Excel</span>
          </button>
        </div>

        <div className={styles.exportWrap}>
          <button
            className={styles.btnExport}
            onClick={() => setExportMenu((v) => !v)}
          >
            <span>⬇</span> Export Data
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
      </div>
    </header>
  );
}
