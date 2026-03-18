import { useState, useEffect, useMemo } from 'react';
import { db } from "./services/db";
import { exportToExcel, exportToPDF } from "./utils/exportUtils";
import HouseholdsTab from "./features/households/HouseholdsTab";
import PregnantTab from "./features/pregnant/PregnantTab";
import ChildrenTab from "./features/children/ChildrenTab";
import Children6to18Tab from "./features/children/Children6to18Tab";
import Children2to5Tab from "./features/children/Children2to5Tab";
import AllChildrenTab from "./features/children/AllChildrenTab";
import Modal from './components/Modal';
import DashboardTab from "./features/dashboard/DashboardTab";
import "./styles/variables.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/tabs.css";
import "./styles/print.css";

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',      icon: '▦' },
  { id: 'households',  label: 'Households',      icon: '⌂' },
  { id: 'pregnant',    label: 'Pregnant',         icon: '♀' },
  { id: 'under1Month', label: '< 1 Month',        icon: '👶' },
  { id: '1monthTo1year', label: '1M – 1 Year',    icon: '🍼' },
  { id: '1to2years',   label: '1 – 2 Years',      icon: '🐥' },
  { id: 'children25',  label: '2 – 5 Years',      icon: '❋' },
  { id: 'children618', label: '6 – 18 Years',     icon: '🎒' },
  { id: 'allChildren', label: 'All Children',     icon: '🧒' },
];

export default function App() {
  const [tab, setTab]           = useState('dashboard');
  const [households, setHouseholds] = useState([]);
  const [pregnant, setPregnant]     = useState([]);
  const [children, setChildren]     = useState([]);
  const [exportMenu, setExportMenu] = useState(false);
  const [toast, setToast]           = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [area, setArea] = useState(() => {
    const saved = localStorage.getItem('survey_area');
    return saved ? JSON.parse(saved) : { district: 'South 24 Parganas', block: 'Diamond Harbour - I', gp: 'Basuldanga', village: 'South Basuldanga', subcenter: 'Basuldanga SC' };
  });

  const handleSaveArea = (newArea) => {
    setArea(newArea);
    localStorage.setItem('survey_area', JSON.stringify(newArea));
    setShowSettings(false);
  };

  useEffect(() => { db.init(); refresh(); }, []);

  function refresh() {
    setHouseholds(db.getHouseholds());
    setPregnant(db.getPregnant());
    setChildren(db.getChildren());
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  const stats = useMemo(() => {
    const getGroup = (dob) => db.getAgeGroup ? db.getAgeGroup(dob) : null;
    return {
      totalHouses:   households.length,
      totalMembers:  households.reduce((s,h) => s+(h.familyMembers||0), 0),
      totalPregnant: pregnant.length,
      countU1m:      children.filter(c => getGroup(c.dob) === 'under1Month').length,
      count1m1y:     children.filter(c => getGroup(c.dob) === '1monthTo1year').length,
      count1y2y:     children.filter(c => getGroup(c.dob) === '1to2years').length,
      totalChildren25: children.filter(c => getGroup(c.dob) === '2to5years').length,
      totalChildren618: children.filter(c => getGroup(c.dob) === '6to18years').length,
      missedVaccine: households.reduce((s,h) => s+(h.childMissedVaccine||0), 0),
    };
  }, [households, pregnant, children]);

  const currentLabel = NAV.find(n => n.id === tab)?.label || '';

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
          {NAV.map(n => (
            <button
              key={n.id}
              className={`nav-item ${tab === n.id ? 'active' : ''}`}
              onClick={() => setTab(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
              {n.id === 'households'   && <span className="nav-badge">{stats.totalHouses}</span>}
              {n.id === 'pregnant'     && <span className="nav-badge teal">{stats.totalPregnant}</span>}
              {n.id === 'under1Month'  && <span className="nav-badge blue">{stats.countU1m}</span>}
              {n.id === '1monthTo1year' && <span className="nav-badge teal">{stats.count1m1y}</span>}
              {n.id === '1to2years'    && <span className="nav-badge purple">{stats.count1y2y}</span>}
              {n.id === 'children25'   && <span className="nav-badge amber">{stats.totalChildren25}</span>}
              {n.id === 'children618'  && <span className="nav-badge purple">{stats.totalChildren618}</span>}
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
            <button className="btn-icon" style={{marginRight: '8px'}} onClick={() => setShowSettings(true)} title="Area Settings">⚙️</button>
            <div className="export-wrap">
              <button className="btn-export" onClick={() => setExportMenu(v => !v)}>
                <span>⬇</span> Export Data
              </button>
              {exportMenu && (
                <div className="export-menu" onMouseLeave={() => setExportMenu(false)}>
                  <div className="export-section-title">📊 Excel Reports</div>
                  <button onClick={() => { exportToExcel(households, pregnant, children, area); showToast('Excel exported!'); setExportMenu(false); }}>
                    💾 Full Workbook (.xlsx)
                  </button>
                  <div className="export-divider" />
                  <div className="export-section-title">📄 PDF Documents</div>
                  <button onClick={() => { exportToPDF(households, pregnant, children, 'households', area); showToast('PDF ready!'); setExportMenu(false); }}>📋 Households Registry</button>
                  <button onClick={() => { exportToPDF(households, pregnant, children, 'pregnant', area);   showToast('PDF ready!'); setExportMenu(false); }}>🤰 Pregnant Women List</button>
                  <button onClick={() => { exportToPDF(households, pregnant, children, 'children', area);   showToast('PDF ready!'); setExportMenu(false); }}>👶 Children Registry</button>
                  <button onClick={() => { exportToPDF(households, pregnant, children, 'all', area);        showToast('PDF ready!'); setExportMenu(false); }}>📑 Master Monthly Report</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content">
          {tab === 'dashboard'  && <DashboardTab stats={stats} households={households} pregnant={pregnant} children={children} />}
          {tab === 'households' && <HouseholdsTab data={households} allPregnant={pregnant} allChildren={children} onRefresh={refresh} onToast={showToast} />}
          {tab === 'pregnant'   && <PregnantTab   data={pregnant}   onRefresh={refresh} onToast={showToast} />}
          {['under1Month', '1monthTo1year', '1to2years'].includes(tab) && (
            <ChildrenTab data={children} filterGroup={tab} onRefresh={refresh} onToast={showToast} />
          )}
          {tab === 'children25' && <Children2to5Tab data={children} onRefresh={refresh} onToast={showToast} />}
          {tab === 'children618' && <Children6to18Tab data={children} onRefresh={refresh} onToast={showToast} />}
          {tab === 'allChildren' && <AllChildrenTab data={children} households={households} onRefresh={refresh} onToast={showToast} />}
        </div>
      </main>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}
      {showSettings && (
        <SettingsModal area={area} onSave={handleSaveArea} onClose={() => setShowSettings(false)} />
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
            <input value={form.district} onChange={e => setForm({...form, district: e.target.value})} />
          </div>
          <div className="form-field">
            <label>Block</label>
            <input value={form.block} onChange={e => setForm({...form, block: e.target.value})} />
          </div>
          <div className="form-field">
            <label>GP / Ward</label>
            <input value={form.gp} onChange={e => setForm({...form, gp: e.target.value})} />
          </div>
          <div className="form-field">
            <label>Village / Area</label>
            <input value={form.village} onChange={e => setForm({...form, village: e.target.value})} />
          </div>
          <div className="form-field">
            <label>Sub-Center Name</label>
            <input value={form.subcenter} onChange={e => setForm({...form, subcenter: e.target.value})} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={() => onSave(form)}>Save Settings</button>
        </div>
      </div>
    </Modal>
  );
}
