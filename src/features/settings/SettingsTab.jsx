/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { db } from "../../services/db";
import { useToast } from "../../contexts/ToastContext";
import householdsData from "../../data/households.json";
import pregnantData from "../../data/pregnant.json";
import childrenData from "../../data/children.json";
import styles from "./SettingsTab.module.css";

const DEFAULT_AREA = {
  district: "Uttar Dinajpur",
  block: "Raiganj",
  gp: "Sherpur",
  village: "Kokra",
  subcenter: "Khoksa SC",
};

const ASHA_DEFAULTS = {
  ashaName: "Jaba Rani Barman",
  anmName: "Beauty Roy",
  moName: "",
  phcName: "",
};

export default function SettingsTab({ onAreaChange }) {
  const { showToast } = useToast();
  const [area, setArea] = useState(() => {
    const saved = localStorage.getItem("survey_area");
    return saved ? JSON.parse(saved) : DEFAULT_AREA;
  });
  const [asha, setAsha] = useState(() => {
    const saved = localStorage.getItem("survey_asha");
    return saved ? JSON.parse(saved) : ASHA_DEFAULTS;
  });
  const [activeSection, setActiveSection] = useState("area");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [dbStats, setDbStats] = useState({ households: 0, pregnant: 0, children: 0, recycleBin: 0 });

  const [isMigrating, setIsMigrating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [targetUid, setTargetUid] = useState("B8LhTP1JauTlFYlIKCfIAKuZv6r2");
  const currentUid = db.auth?.currentUser?.uid;

  useEffect(() => {
    async function loadStats() {
      const hh = await db.getHouseholds();
      const pg = await db.getPregnant();
      const ch = await db.getChildren();
      const rb = await db.getRecycleBin();
      setDbStats({ households: hh.length, pregnant: pg.length, children: ch.length, recycleBin: rb.length });
    }
    loadStats();
  }, []);

  function saveArea() {
    localStorage.setItem("survey_area", JSON.stringify(area));
    if (onAreaChange) onAreaChange(area);
    showToast("✓ Area settings saved!");
  }

  function saveAsha() {
    localStorage.setItem("survey_asha", JSON.stringify(asha));
    showToast("✓ ASHA details saved!");
  }

  async function handleReset() {
    await db.reset();
    setShowResetConfirm(false);
    showToast("Database reset to seed data.", "error");
    setTimeout(() => window.location.reload(), 800);
  }

  async function handleMigrate() {
    if (!window.confirm("This will migrate all local data to Firebase Cloud. Ensure you have internet. Continue?")) return;
    setIsMigrating(true);
    showToast("Migration started. Please wait...");
    try {
      await db.migrateLocalToFirestore();
      showToast("✓ Migration complete!", "success");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      console.error(e);
      showToast("❌ Migration failed: " + e.message, "error");
    } finally {
      setIsMigrating(false);
    }
  }

  async function handleSeed() {
    if (!window.confirm("This will overwrite existing cloud data with the local JSON files. Continue?")) return;
    setIsSeeding(true);
    showToast("Seeding started. Please wait...");
    try {
      await db.saveBulkData({
        households: householdsData,
        pregnant: pregnantData,
        children: childrenData,
        overrideUid: targetUid
      });
      showToast("✓ Seeding complete!", "success");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      console.error("Seeding error:", e);
      if (e.code === 'permission-denied') {
        showToast("❌ Permission Denied. Please ensure your Firestore rules allow writing to this UID path.", "error");
      } else {
        showToast("❌ Seeding failed: " + (e.message || "Unknown error"), "error");
      }
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleSync() {
    if (!window.confirm("This will create placeholder records in the Pregnant and Children tabs based on the counts in your Household Registry. Continue?")) return;
    setIsSyncing(true);
    showToast("Syncing records... this may take a moment.");
    try {
      const res = await db.seedPlaceholdersFromHouseholds();
      if (res) {
        showToast(`✓ Created ${res.pregnant} pregnant and ${res.children} child placeholders!`, "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast("Records are already in sync!", "success");
      }
    } catch (e) {
      console.error("Sync error:", e);
      showToast("❌ Sync failed: " + e.message, "error");
    } finally {
      setIsSyncing(false);
    }
  }

  async function exportBackup() {
    const backup = {
      exportedAt: new Date().toISOString(),
      area,
      asha,
      households: await db.getHouseholds(),
      pregnant: await db.getPregnant(),
      children: await db.getChildren(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asha_survey_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("✓ Backup downloaded!");
  }

  function importBackup(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.households) localStorage.setItem("hs_households", JSON.stringify(data.households));
        if (data.pregnant) localStorage.setItem("hs_pregnant", JSON.stringify(data.pregnant));
        if (data.children) localStorage.setItem("hs_children", JSON.stringify(data.children));
        if (data.area) {
          localStorage.setItem("survey_area", JSON.stringify(data.area));
          setArea(data.area);
        }
        if (data.asha) {
          localStorage.setItem("survey_asha", JSON.stringify(data.asha));
          setAsha(data.asha);
        }
        showToast("✓ Backup restored!");
        setTimeout(() => window.location.reload(), 800);
      } catch {
        showToast("❌ Invalid backup file", "error");
      }
    };
    reader.readAsText(file);
  }

  const sections = [
    { id: "area", label: "📍 Area Details", icon: "📍" },
    { id: "asha", label: "👤 ASHA / ANM Info", icon: "👤" },
    { id: "data", label: "🗄️ Data Management", icon: "🗄️" },
    { id: "about", label: "ℹ️ About App", icon: "ℹ️" },
  ];

  return (
    <div className={styles.settings}>
      <div className={styles.sidebar}>
        {sections.map((s) => (
          <button
            key={s.id}
            className={`${styles.sideItem} ${activeSection === s.id ? styles.active : ""}`}
            onClick={() => setActiveSection(s.id)}
          >
            <span>{s.icon}</span>
            <span>{s.label.replace(/^.+? /, "")}</span>
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeSection === "area" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>📍 Area & Location Details</h2>
              <p>Configure the geographic information for this ASHA survey register</p>
            </div>
            <div className={styles.formGrid}>
              {[
                ["district", "District"],
                ["block", "Block"],
                ["gp", "Gram Panchayat (GP)"],
                ["village", "Village"],
                ["subcenter", "Sub-Center"],
              ].map(([key, label]) => (
                <div key={key} className={styles.field}>
                  <label>{label}</label>
                  <input
                    type="text"
                    value={area[key] || ""}
                    onChange={(e) => setArea((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={`Enter ${label}...`}
                  />
                </div>
              ))}
            </div>
            <div className={styles.preview}>
              <div className={styles.previewLabel}>Preview</div>
              <div className={styles.previewValue}>
                {area.district} • {area.block} • {area.gp} • {area.village}
              </div>
              <div className={styles.previewSub}>Sub-Center: {area.subcenter}</div>
            </div>
            <button className={styles.btnSave} onClick={saveArea}>✓ Save Area Settings</button>
          </div>
        )}

        {activeSection === "asha" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>👤 ASHA Worker & ANM Details</h2>
              <p>Details shown in reports and printouts</p>
            </div>
            <div className={styles.formGrid}>
              {[
                ["ashaName", "ASHA Worker Name"],
                ["anmName", "ANM Name"],
                ["moName", "Medical Officer (MO) Name"],
                ["phcName", "PHC / Health Center Name"],
              ].map(([key, label]) => (
                <div key={key} className={styles.field}>
                  <label>{label}</label>
                  <input
                    type="text"
                    value={asha[key] || ""}
                    onChange={(e) => setAsha((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={`Enter ${label}...`}
                  />
                </div>
              ))}
            </div>
            <button className={styles.btnSave} onClick={saveAsha}>✓ Save ASHA Details</button>
          </div>
        )}

        {activeSection === "data" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>🗄️ Data Management</h2>
              <p>Backup, restore, and manage your survey data</p>
            </div>

            <div className={styles.statsRow}>
              {[
                { label: "Households", value: dbStats.households, color: "#16a34a" },
                { label: "Pregnant", value: dbStats.pregnant, color: "#be185d" },
                { label: "Children", value: dbStats.children, color: "#d97706" },
                { label: "Recycle Bin", value: dbStats.recycleBin, color: "#dc2626" },
              ].map((s) => (
                <div key={s.label} className={styles.statBox}>
                  <div className={styles.statNum} style={{ color: s.color }}>{s.value}</div>
                  <div className={styles.statLbl}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className={styles.actionCards}>
              <div className={styles.actionCard}>
                <div className={styles.actionTitle}>☁️ Migrate Local Data to Cloud</div>
                <div className={styles.actionDesc}>Push all offline/local records to the Firebase Cloud. Needs internet.</div>
                <button 
                  className={styles.btnAction} 
                  onClick={handleMigrate}
                  disabled={isMigrating}
                  style={{ background: "#0ea5e9", color: "#fff", borderColor: "#0284c7" }}
                >
                  {isMigrating ? "☁️ Migrating..." : "☁️ Migrate to Firestore"}
                </button>
              </div>

              <div className={styles.actionCard}>
                <div className={styles.actionTitle}>🚀 [Admin] Seed Data from JSON</div>
                <div className={styles.actionDesc}>
                  Initialize cloud database using default JSON files. 
                  {currentUid && (
                    <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "5px" }}>
                      Current User: <code>{currentUid}</code>
                    </div>
                  )}
                </div>
                
                <div className={styles.field} style={{ marginBottom: "10px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: "bold" }}>Target UID Path</label>
                  <input 
                    type="text" 
                    value={targetUid} 
                    onChange={e => setTargetUid(e.target.value)}
                    placeholder="Enter UID..."
                    style={{ fontSize: "0.8rem", padding: "5px" }}
                  />
                  <small style={{ color: "#666", fontSize: "0.7rem" }}>
                    The seed will push to <code>users/{"<Target UID>"}/...</code>
                  </small>
                </div>

                <button 
                  className={styles.btnAction} 
                  onClick={handleSeed}
                  disabled={isSeeding}
                  style={{ background: "#8b5cf6", color: "#fff", borderColor: "#7c3aed" }}
                >
                  {isSeeding ? "🚀 Seeding..." : "🚀 Seed Cloud with JSON Data"}
                </button>
              </div>

              <div className={styles.actionCard}>
                <div className={styles.actionTitle}>🔄 Sync Records from Household Counts</div>
                <div className={styles.actionDesc}>
                  Automatically create placeholder records in the Pregnant and Children tabs based on the counts in your Household Registry. 
                  Useful after importing a new household list.
                </div>
                <button 
                   className={styles.btnAction} 
                   onClick={handleSync}
                   disabled={isSyncing}
                   style={{ background: "#10b981", color: "#fff", borderColor: "#059669" }}
                 >
                   {isSyncing ? "🔄 Syncing..." : "🔄 Sync Records Now"}
                </button>
              </div>

              <div className={styles.actionCard}>
                <div className={styles.actionTitle}>📥 Backup Data</div>
                <div className={styles.actionDesc}>Download a full JSON backup of all survey data including households, pregnant women, and children records.</div>
                <button className={styles.btnAction} onClick={exportBackup}>⬇ Download Backup</button>
              </div>

              <div className={styles.actionCard}>
                <div className={styles.actionTitle}>📤 Restore from Backup</div>
                <div className={styles.actionDesc}>Restore data from a previously downloaded JSON backup file. This will overwrite current data.</div>
                <label className={styles.btnAction} style={{ cursor: "pointer" }}>
                  ⬆ Choose Backup File
                  <input type="file" accept=".json" style={{ display: "none" }} onChange={importBackup} />
                </label>
              </div>

              <div className={`${styles.actionCard} ${styles.dangerCard}`}>
                <div className={styles.actionTitle}>⚠️ Reset Database</div>
                <div className={styles.actionDesc}>Reset all data back to the original seed data. <strong>This action is irreversible.</strong></div>
                {!showResetConfirm ? (
                  <button className={`${styles.btnAction} ${styles.btnDanger}`} onClick={() => setShowResetConfirm(true)}>
                    🗑 Reset to Seed Data
                  </button>
                ) : (
                  <div className={styles.confirmRow}>
                    <span className={styles.confirmMsg}>Are you sure? All changes will be lost!</span>
                    <button className={`${styles.btnAction} ${styles.btnDanger}`} onClick={handleReset}>Yes, Reset</button>
                    <button className={styles.btnCancel} onClick={() => setShowResetConfirm(false)}>Cancel</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === "about" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>ℹ️ About ASHA Survey App</h2>
              <p>Digital health survey management for ASHA workers</p>
            </div>
            <div className={styles.aboutCard}>
              <div className={styles.aboutLogo}>🏥</div>
              <h3>ASHA E-Register</h3>
              <div className={styles.aboutVersion}>Version 2.0.0</div>
              <div className={styles.aboutDesc}>
                A comprehensive digital register for ASHA workers to track household surveys,
                pregnant women health records, and children's immunization schedules under the
                National Health Mission (NHM), West Bengal.
              </div>
              <div className={styles.aboutFeatures}>
                {[
                  "✓ Household Survey (Form SC-3)",
                  "✓ Pregnant Women Tracking (Form PW-01)",
                  "✓ Child Immunization Cards (Form SC-4B)",
                  "✓ ANC Visit Monitoring",
                  "✓ Vaccination Due Date Alerts",
                  "✓ Excel & PDF Export",
                  "✓ Offline Data Storage",
                  "✓ Recycle Bin for Deleted Records",
                ].map((f) => (
                  <div key={f} className={styles.featureItem}>{f}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}