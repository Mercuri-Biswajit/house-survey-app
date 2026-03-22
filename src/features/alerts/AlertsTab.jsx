/* eslint-disable no-unused-vars */
import { useMemo, useState } from "react";
import { calcAgeFull } from "../../services/db";
import styles from "./AlertsTab.module.css";

// Vaccination schedule: age in days from DOB when vaccine is due
const VACC_SCHEDULE = [
  { key: "bOPV_birth", label: "bOPV (Birth)", daysFromBirth: 0 },
  { key: "BCG", label: "BCG", daysFromBirth: 0 },
  { key: "HepB", label: "HepB (Birth)", daysFromBirth: 0 },
  { key: "bOPV1", label: "bOPV-1", daysFromBirth: 42 },
  { key: "Penta1", label: "Penta-1", daysFromBirth: 42 },
  { key: "RVV1", label: "RVV-1", daysFromBirth: 42 },
  { key: "PCV1", label: "PCV-1", daysFromBirth: 42 },
  { key: "fIPV1", label: "fIPV-1", daysFromBirth: 42 },
  { key: "bOPV2", label: "bOPV-2", daysFromBirth: 70 },
  { key: "Penta2", label: "Penta-2", daysFromBirth: 70 },
  { key: "RVV2", label: "RVV-2", daysFromBirth: 70 },
  { key: "bOPV3", label: "bOPV-3", daysFromBirth: 98 },
  { key: "Penta3", label: "Penta-3", daysFromBirth: 98 },
  { key: "PCV2", label: "PCV-2", daysFromBirth: 98 },
  { key: "fIPV2", label: "fIPV-2", daysFromBirth: 98 },
  { key: "fIPV3", label: "fIPV-3", daysFromBirth: 274 },
  { key: "MR1", label: "MR-1", daysFromBirth: 274 },
  { key: "PCVBooster", label: "PCV Booster", daysFromBirth: 274 },
  { key: "JE1", label: "JE-1", daysFromBirth: 274 },
  { key: "VitA1", label: "Vit A-1", daysFromBirth: 274 },
  { key: "bOPV_booster", label: "bOPV Booster", daysFromBirth: 487 },
  { key: "MR2", label: "MR-2", daysFromBirth: 487 },
  { key: "DPT_booster", label: "DPT Booster", daysFromBirth: 487 },
  { key: "JE2", label: "JE-2", daysFromBirth: 548 },
];

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((d - today) / 86400000);
}

function calcEDD(lmp) {
  if (!lmp) return null;
  const d = new Date(lmp);
  d.setDate(d.getDate() + 280);
  return d;
}

function getVaccDueAlerts(children, windowDays = 14) {
  const alerts = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  children.forEach((child) => {
    if (!child.dob) return;
    const dob = new Date(child.dob);
    
    VACC_SCHEDULE.forEach((vacc) => {
      if (child[vacc.key]) return; // already given
      
      const dueDate = new Date(dob);
      dueDate.setDate(dob.getDate() + vacc.daysFromBirth);
      
      const daysUntil = Math.floor((dueDate - today) / 86400000);
      
      if (daysUntil <= windowDays) {
        alerts.push({
          type: "vacc",
          childName: child.name,
          hhNo: child.hhNo,
          guardianName: child.guardianName,
          mobile: child.mobile,
          vaccine: vacc.label,
          dueDate: dueDate.toISOString().split("T")[0],
          daysUntil,
          overdue: daysUntil < 0,
          child,
        });
      }
    });
  });

  return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
}

function getANCAlerts(pregnant) {
  const alerts = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  pregnant.forEach((p) => {
    if (!p.lmp) return;
    
    const edd = calcEDD(p.lmp);
    if (!edd) return;
    
    const daysToEDD = Math.floor((edd - today) / 86400000);
    
    // Check ANC schedule: 1st at 4-6 weeks, 2nd at 14-16 weeks, 3rd at 28-32 weeks, 4th at 36+ weeks
    const lmpDate = new Date(p.lmp);
    const weeksPreg = Math.floor((today - lmpDate) / (7 * 86400000));
    
    let nextANC = null;
    let nextANCLabel = "";
    
    if (!p.anc1 && weeksPreg >= 4) {
      nextANC = new Date(lmpDate);
      nextANC.setDate(lmpDate.getDate() + 28);
      nextANCLabel = "1st ANC";
    } else if (p.anc1 && !p.anc2 && weeksPreg >= 14) {
      nextANC = new Date(lmpDate);
      nextANC.setDate(lmpDate.getDate() + 98);
      nextANCLabel = "2nd ANC";
    } else if (p.anc2 && !p.anc3 && weeksPreg >= 28) {
      nextANC = new Date(lmpDate);
      nextANC.setDate(lmpDate.getDate() + 196);
      nextANCLabel = "3rd ANC";
    } else if (p.anc3 && !p.anc4 && weeksPreg >= 36) {
      nextANC = new Date(lmpDate);
      nextANC.setDate(lmpDate.getDate() + 252);
      nextANCLabel = "4th ANC";
    }
    
    // EDD alert
    if (daysToEDD >= 0 && daysToEDD <= 30) {
      alerts.push({
        type: "edd",
        name: p.name,
        hhNo: p.hhNo,
        husbandName: p.husbandName,
        mobile: p.mobile,
        label: "Expected Delivery",
        dueDate: edd.toISOString().split("T")[0],
        daysUntil: daysToEDD,
        overdue: false,
        pregnant: p,
      });
    }
    
    if (nextANC) {
      const daysUntil = Math.floor((nextANC - today) / 86400000);
      if (daysUntil <= 21) {
        alerts.push({
          type: "anc",
          name: p.name,
          hhNo: p.hhNo,
          husbandName: p.husbandName,
          mobile: p.mobile,
          label: nextANCLabel,
          dueDate: nextANC.toISOString().split("T")[0],
          daysUntil,
          overdue: daysUntil < 0,
          pregnant: p,
        });
      }
    }
    
    // TD vaccination alerts
    if (!p.td1) {
      const td1Due = new Date(lmpDate);
      td1Due.setDate(lmpDate.getDate() + 84); // ~12 weeks
      const daysUntil = Math.floor((td1Due - today) / 86400000);
      if (daysUntil <= 14) {
        alerts.push({
          type: "td",
          name: p.name,
          hhNo: p.hhNo,
          husbandName: p.husbandName,
          mobile: p.mobile,
          label: "TD-1 Vaccination",
          dueDate: td1Due.toISOString().split("T")[0],
          daysUntil,
          overdue: daysUntil < 0,
          pregnant: p,
        });
      }
    } else if (!p.td2) {
      const td2Due = new Date(p.td1);
      td2Due.setDate(td2Due.getDate() + 28);
      const daysUntil = Math.floor((td2Due - today) / 86400000);
      if (daysUntil <= 14) {
        alerts.push({
          type: "td",
          name: p.name,
          hhNo: p.hhNo,
          husbandName: p.husbandName,
          mobile: p.mobile,
          label: "TD-2 Vaccination",
          dueDate: td2Due.toISOString().split("T")[0],
          daysUntil,
          overdue: daysUntil < 0,
          pregnant: p,
        });
      }
    }
  });

  return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
}

function AlertBadge({ daysUntil }) {
  if (daysUntil < 0) return <span className={`${styles.badge} ${styles.overdue}`}>Overdue {Math.abs(daysUntil)}d</span>;
  if (daysUntil === 0) return <span className={`${styles.badge} ${styles.today}`}>Today!</span>;
  if (daysUntil <= 3) return <span className={`${styles.badge} ${styles.urgent}`}>{daysUntil}d left</span>;
  if (daysUntil <= 7) return <span className={`${styles.badge} ${styles.soon}`}>{daysUntil}d left</span>;
  return <span className={`${styles.badge} ${styles.upcoming}`}>{daysUntil}d left</span>;
}

export default function AlertsTab({ children, pregnant }) {
  const [filter, setFilter] = useState("all");
  const [window14, setWindow14] = useState(14);

  const vaccAlerts = useMemo(() => getVaccDueAlerts(children, window14), [children, window14]);
  const ancAlerts = useMemo(() => getANCAlerts(pregnant), [pregnant]);

  const allAlerts = useMemo(() => {
    const combined = [
      ...vaccAlerts.map((a) => ({ ...a, category: "vacc" })),
      ...ancAlerts.map((a) => ({ ...a, category: a.type })),
    ];
    return combined.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [vaccAlerts, ancAlerts]);

  const filtered = useMemo(() => {
    if (filter === "all") return allAlerts;
    if (filter === "overdue") return allAlerts.filter((a) => a.overdue);
    if (filter === "today") return allAlerts.filter((a) => a.daysUntil === 0);
    if (filter === "vacc") return allAlerts.filter((a) => a.category === "vacc");
    if (filter === "anc") return allAlerts.filter((a) => ["anc", "td", "edd"].includes(a.category));
    return allAlerts;
  }, [allAlerts, filter]);

  const overdueCount = allAlerts.filter((a) => a.overdue).length;
  const todayCount = allAlerts.filter((a) => a.daysUntil === 0).length;
  const urgentCount = allAlerts.filter((a) => !a.overdue && a.daysUntil <= 3).length;

  return (
    <div className={styles.alertsTab}>
      {/* Summary Cards */}
      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.cardRed}`} onClick={() => setFilter("overdue")}>
          <div className={styles.summaryNum}>{overdueCount}</div>
          <div className={styles.summaryLabel}>Overdue</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.cardAmber}`} onClick={() => setFilter("today")}>
          <div className={styles.summaryNum}>{todayCount}</div>
          <div className={styles.summaryLabel}>Due Today</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.cardOrange}`}>
          <div className={styles.summaryNum}>{urgentCount}</div>
          <div className={styles.summaryLabel}>Urgent (≤3 days)</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.cardGreen}`} onClick={() => setFilter("all")}>
          <div className={styles.summaryNum}>{allAlerts.length}</div>
          <div className={styles.summaryLabel}>Total Alerts</div>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.filterTabs}>
          {[
            { id: "all", label: `All (${allAlerts.length})` },
            { id: "overdue", label: `⚠ Overdue (${overdueCount})` },
            { id: "vacc", label: `💉 Vaccines (${vaccAlerts.length})` },
            { id: "anc", label: `🤰 ANC/TD (${ancAlerts.length})` },
          ].map((f) => (
            <button
              key={f.id}
              className={`${styles.filterBtn} ${filter === f.id ? styles.filterActive : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className={styles.windowControl}>
          <label>Show next</label>
          <select value={window14} onChange={(e) => setWindow14(Number(e.target.value))}>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✅</div>
          <div className={styles.emptyTitle}>No alerts in this window</div>
          <div className={styles.emptyDesc}>All vaccinations and ANC visits are on schedule</div>
        </div>
      ) : (
        <div className={styles.alertsList}>
          {filtered.map((alert, i) => (
            <div
              key={i}
              className={`${styles.alertCard} ${alert.overdue ? styles.alertOverdue : alert.daysUntil === 0 ? styles.alertToday : alert.daysUntil <= 3 ? styles.alertUrgent : ""}`}
            >
              <div className={styles.alertLeft}>
                <div className={styles.alertIcon}>
                  {alert.category === "vacc" ? "💉" : alert.category === "edd" ? "🍼" : alert.category === "td" ? "🛡" : "🏥"}
                </div>
                <div>
                  <div className={styles.alertName}>
                    {alert.childName || alert.name}
                    <span className={styles.alertHH}> HH#{alert.hhNo}</span>
                  </div>
                  <div className={styles.alertSub}>
                    {alert.guardianName || alert.husbandName ? (
                      <span>Guardian: {alert.guardianName || alert.husbandName}</span>
                    ) : null}
                    {alert.mobile && <span> · 📱 {alert.mobile}</span>}
                  </div>
                  <div className={styles.alertVacc}>
                    {alert.vaccine || alert.label}
                    <span className={styles.alertDate}> — Due: {alert.dueDate}</span>
                  </div>
                  {alert.category === "vacc" && alert.child && (
                    <div className={styles.alertAge}>
                      Age: {calcAgeFull(alert.child.dob)}
                    </div>
                  )}
                </div>
              </div>
              <AlertBadge daysUntil={alert.daysUntil} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}