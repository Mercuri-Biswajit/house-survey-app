import React, { useState } from "react";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

export default function Header({
  currentLabel,
  area,
  households,
  pregnant,
  children,
  showToast,
  searchQuery,
  setSearchQuery,
  toggleSidebar,
}) {
  const [exportMenu, setExportMenu] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-left" style={{ display: "flex", alignItems: "center" }}>
        <button className="btn-toggle" onClick={toggleSidebar} title="Toggle Sidebar">
          ☰
        </button>
        <div>
          <h1 className="page-title">{currentLabel}</h1>
          <span className="page-subtitle">
            {area.district} • {area.block} • {area.gp} • {area.village}
          </span>
        </div>
      </div>

      <div className="search-container">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, household #, or mobile..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            style={{
              position: "absolute",
              right: "12px",
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
            }}
            onClick={() => setSearchQuery("")}
          >
            ✕
          </button>
        )}
      </div>

      <div className="topbar-right">
        <div className="export-wrap">
          <button
            className="btn-export"
            onClick={() => setExportMenu((v) => !v)}
          >
            <span>⬇</span> Export Data
          </button>
          {exportMenu && (
            <div
              className="export-menu"
              onMouseLeave={() => setExportMenu(false)}
            >
              <div className="export-section-title">📊 Excel Reports</div>
              <button
                onClick={() => {
                  exportToExcel(households, pregnant, children, area);
                  showToast("Excel exported!");
                  setExportMenu(false);
                }}
              >
                💾 Full Workbook (.xlsx)
              </button>
              <div className="export-divider" />
              <div className="export-section-title">📄 PDF Documents</div>
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
