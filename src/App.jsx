/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "./services/db";
import { exportToExcel, exportToPDF } from "./utils/exportUtils";
import Modal from "./components/Modal";
import AppRoutes, { NAV_ITEMS } from "./routes/AppRoutes";
import defaultAreaConfig from "./config/areaConfig";
import "./styles/variables.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/tabs.css";
import "./styles/print.css";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab from current URL path
  const activeTab = location.pathname.replace("/", "") || "dashboard";

  const [households, setHouseholds] = useState([]);
  const [pregnant, setPregnant] = useState([]);
  const [children, setChildren] = useState([]);
  const [recycleBin, setRecycleBin] = useState([]);
  const [exportMenu, setExportMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [area, setArea] = useState(() => {
    const saved = localStorage.getItem("survey_area");
    return saved ? JSON.parse(saved) : defaultAreaConfig;
  });

  const handleSaveArea = (newArea) => {
    setArea(newArea);
    localStorage.setItem("survey_area", JSON.stringify(newArea));
    setShowSettings(false);
  };

  useEffect(() => {
    db.init();
    refresh();
  }, []);

  function refresh() {
    db.migrateDeliveredPregnant(); // auto-migrate delivered pregnant → children
    setHouseholds(db.getHouseholds());
    setPregnant(db.getPregnant());
    setChildren(db.getChildren());
    setRecycleBin(db.getRecycleBin());
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  const stats = useMemo(() => {
    const getGroup = (dob) => (db.getAgeGroup ? db.getAgeGroup(dob) : null);
    return {
      totalHouses: households.length,
      totalMembers: households.reduce((s, h) => s + (h.familyMembers || 0), 0),
      totalPregnant: pregnant.length,
      countU1m: children.filter((c) => getGroup(c.dob) === "under1Month")
        .length,
      count1m1y: children.filter((c) => getGroup(c.dob) === "1monthTo1year")
        .length,
      count1y2y: children.filter((c) => getGroup(c.dob) === "1to2years").length,
      totalChildren25: children.filter((c) => getGroup(c.dob) === "2to5years")
        .length,
      totalChildren618: children.filter((c) => getGroup(c.dob) === "6to18years")
        .length,
      totalDeleted: recycleBin.length,
      missedVaccine: households.reduce(
        (s, h) => s + (h.childMissedVaccine || 0),
        0,
      ),
    };
  }, [households, pregnant, children]);

  const currentLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label || "";

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">SC</div>
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
              onClick={() => navigate(`/${n.id}`)}
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

        <div className="sidebar-footer">
          <div className="meta-line">ASHA: Jaba Rani Barman</div>
          <div className="meta-line">ANM: Beauty Roy</div>
          <div className="meta-line">Village: Kokra, Raiganj</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="page-title">{currentLabel}</h1>
            <span className="page-subtitle">
              {area.district} • {area.block} • {area.gp} • {area.village}
            </span>
          </div>
          <div className="topbar-right">
            <button
              className="btn-icon"
              style={{ marginRight: "8px" }}
              onClick={() => setShowSettings(true)}
              title="Area Settings"
            >
              ⚙️
            </button>
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
                      exportToPDF(
                        households,
                        pregnant,
                        children,
                        "pregnant",
                        area,
                      );
                      showToast("PDF ready!");
                      setExportMenu(false);
                    }}
                  >
                    🤰 Pregnant Women List
                  </button>
                  <button
                    onClick={() => {
                      exportToPDF(
                        households,
                        pregnant,
                        children,
                        "children",
                        area,
                      );
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

        <div className="content">
          <AppRoutes
            stats={stats}
            households={households}
            pregnant={pregnant}
            children={children}
            recycleBin={recycleBin}
            refresh={refresh}
            showToast={showToast}
          />
        </div>
      </main>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}
      {showSettings && (
        <SettingsModal
          area={area}
          onSave={handleSaveArea}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function SettingsModal({ area, onSave, onClose }) {
  const [form, setForm] = useState(area);
  return (
    <Modal title="Area & Reporting Settings" onClose={onClose}>
      <div className="modal-body">
        <div className="form-grid">
          <div className="form-field">
            <label>District</label>
            <input
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Block</label>
            <input
              value={form.block}
              onChange={(e) => setForm({ ...form, block: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>GP / Ward</label>
            <input
              value={form.gp}
              onChange={(e) => setForm({ ...form, gp: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Village / Area</label>
            <input
              value={form.village}
              onChange={(e) => setForm({ ...form, village: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Sub-Center Name</label>
            <input
              value={form.subcenter}
              onChange={(e) => setForm({ ...form, subcenter: e.target.value })}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-save" onClick={() => onSave(form)}>
            Save Settings
          </button>
        </div>
      </div>
    </Modal>
  );
}
