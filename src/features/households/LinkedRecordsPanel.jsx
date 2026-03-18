import { useState, useEffect } from "react";
import { db, getAgeGroupFromDOB, calcAgeYears, calcAgeFull } from "../../services/db";
import Modal from "../../components/Modal";
import ConfirmModal from "../../components/ConfirmModal";

const EMPTY_PREGNANT = {
  hhNo: "",
  name: "",
  dob: "",
  husbandName: "",
  mobile: "",
  mcpCardUwn: "",
  lmp: "",
  td1: "",
  td2: "",
  tdBooster: "",
  anc1: "",
  anc2: "",
  anc3: "",
  anc4: "",
  tdDue: "",
  ancDue: "",
};

const EMPTY_CHILD = {
  hhNo: "",
  name: "",
  dob: "",
  gender: "M",
  guardianName: "",
  mobile: "",
  mcpCardUwn: "",
  missedVaccine: false,
  bOPV_birth: "",
  BCG: "",
  HepB: "",
  bOPV1: "",
  RVV1: "",
  fIPV1: "",
  PCV1: "",
  Penta1: "",
  bOPV2: "",
  RVV2: "",
  Penta2: "",
  bOPV3: "",
  RVV3: "",
  fIPV2: "",
  PCV2: "",
  Penta3: "",
  fIPV3: "",
  MR1: "",
  PCVBooster: "",
  JE1: "",
  VitA1: "",
  bOPV_booster: "",
  MR2: "",
  DPT_booster: "",
  JE2: "",
  VitA2: "",
  fIPV_booster: "",
};

const AGE_GROUP_LABELS = {
  under1Month: "< 1 Month",
  "1monthTo1year": "1 Month – 1 Year",
  "1to2years": "1 – 2 Years",
  "2to5years": "2 – 5 Years",
  above5years: "Above 5 Years",
};

const AGE_GROUP_COLORS = {
  under1Month: "blue",
  "1monthTo1year": "teal",
  "1to2years": "purple",
  "2to5years": "amber",
  above5years: "dim",
};


export default function LinkedRecordsPanel({
  hhNo,
  defaultTab,
  onClose,
  onRefresh,
  onToast,
}) {
  const [tab, setTab] = useState(defaultTab || "pregnant");
  const [pregnantList, setPregnantList] = useState([]);
  const [childrenList, setChildrenList] = useState([]);
  const [searchChildren, setSearchChildren] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, item }
  const [editingP, setEditingP] = useState(null); // pregnant form
  const [editingC, setEditingC] = useState(null); // child form

  useEffect(() => {
    loadData();
  }, [hhNo]);

  function loadData() {
    setPregnantList(db.getPregnantByHH(hhNo));
    setChildrenList(db.getChildrenByHH(hhNo));
  }

  function refreshAll() {
    loadData();
    onRefresh();
  }

  // ── Pregnant handlers ──────────────────────────────────────────────────────
  function addPregnant() {
    setEditingP({ ...EMPTY_PREGNANT, hhNo, _id: Date.now() });
  }
  function editPregnant(p) {
    setEditingP({ ...p });
  }
  function savePregnant() {
    if (!editingP.name?.trim()) {
      onToast("Name is required", "error");
      return;
    }
    db.savePregnant(editingP);
    refreshAll();
    setEditingP(null);
    onToast("Pregnant record saved! Main sheet updated ⟳");
  }

  function deleteChild(c) {
    setConfirmDelete({ type: "child", item: c });
  }

  function deletePregnant(p) {
    setConfirmDelete({ type: "pregnant", item: p });
  }

  function confirmDeleteAction() {
    if (!confirmDelete) return;
    const { type, item } = confirmDelete;
    if (type === "child") {
      db.deleteChild(item._id);
    } else {
      db.deletePregnant(item._id);
    }
    refreshAll();
    setConfirmDelete(null);
    onToast("Record moved to Recycle Bin", "error");
  }

  // ── Children handlers ──────────────────────────────────────────────────────
  function addChild() {
    setEditingC({ ...EMPTY_CHILD, hhNo, _id: Date.now() });
  }
  function editChild(c) {
    setEditingC({ ...c });
  }
  function saveChild() {
    if (!editingC.name?.trim()) {
      onToast("Child name required", "error");
      return;
    }
    db.saveChild(editingC);
    refreshAll();
    setEditingC(null);
    onToast("Child record saved! Main sheet updated ⟳");
  }

  function calcEDD(lmp) {
    if (!lmp) return "";
    const d = new Date(lmp);
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + 280);
    return d.toISOString().split("T")[0];
  }

  function calcTrimester(lmp) {
    if (!lmp) return null;
    const lmpDate = new Date(lmp);
    const today = new Date();
    const diffTime = Math.abs(today - lmpDate);
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    if (diffWeeks <= 12) return { label: "1st Trimester", color: "#16a34a" };
    if (diffWeeks <= 27) return { label: "2nd Trimester", color: "#0891b2" };
    if (diffWeeks <= 42) return { label: "3rd Trimester", color: "#d97706" };
    return { label: "Overdue?", color: "#dc2626" };
  }

  function handlePrint() {
    window.print();
  }

  // ── Field helpers ──────────────────────────────────────────────────────────
  function Row(label, key, type = "text") {
    return (
      <tr>
        <td className="row-labels">{label}</td>
        <td className="row-inputs">
          <input
            className="form-input"
            type={type}
            value={editingP[key] ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setEditingP((p) => {
                const next = { ...p, [key]: val };
                if (key === "lmp") next.edd = calcEDD(val);
                return next;
              });
            }}
          />
        </td>
      </tr>
    );
  }

  function PF(key, label, type = "text") {
    return (
      <div className="report-field">
        {label && <label>{label}</label>}
        <input
          type={type}
          value={editingP[key] ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            setEditingP((p) => {
              const next = { ...p, [key]: val };
              if (key === "lmp") next.edd = calcEDD(val);
              return next;
            });
          }}
        />
      </div>
    );
  }

  function CF(key, label, type = "text") {
    if (key === "gender")
      return (
        <div className="form-field">
          <label>Gender</label>
          <select
            value={editingC.gender || "M"}
            onChange={(e) =>
              setEditingC((p) => ({ ...p, gender: e.target.value }))
            }
          >
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </div>
      );
    if (key === "missedVaccine")
      return (
        <div className="form-field form-field-check">
          <label>
            <input
              type="checkbox"
              checked={!!editingC.missedVaccine}
              onChange={(e) =>
                setEditingC((p) => ({ ...p, missedVaccine: e.target.checked }))
              }
            />
            &nbsp;Missed Vaccine (MR-1/MR-2/DPT/OPV)
          </label>
        </div>
      );
    return (
      <div className="form-field">
        <label>{label}</label>
        <input
          type={type}
          value={editingC[key] ?? ""}
          onChange={(e) =>
            setEditingC((p) => ({ ...p, [key]: e.target.value }))
          }
        />
      </div>
    );
  }

  const VACC_GROUPS = [
    {
      label: "At Birth",
      fields: [
        ["bOPV_birth", "bOPV (B)"],
        ["BCG", "BCG"],
        ["HepB", "HepB (B)"],
      ],
    },
    {
      label: "6 Weeks",
      fields: [
        ["bOPV1", "bOPV-1"],
        ["RVV1", "RVV-1"],
        ["fIPV1", "f-IPV 1"],
        ["PCV1", "PCV-1"],
        ["Penta1", "Penta-1"],
      ],
    },
    {
      label: "10 Weeks",
      fields: [
        ["bOPV2", "bOPV-2"],
        ["RVV2", "RVV-2"],
        ["Penta2", "Penta-2"],
      ],
    },
    {
      label: "14 Weeks",
      fields: [
        ["bOPV3", "bOPV-3"],
        ["RVV3", "RVV-3"],
        ["fIPV2", "f-IPV 2"],
        ["PCV2", "PCV-2"],
        ["Penta3", "Penta-3"],
      ],
    },
    {
      label: "9–11 Months",
      fields: [
        ["fIPV3", "f-IPV 3"],
        ["MR1", "MR-1"],
        ["PCVBooster", "PCV Booster"],
        ["JE1", "JE-1"],
        ["VitA1", "VitA-1"],
      ],
    },
    {
      label: "16–23 Months",
      fields: [
        ["bOPV_booster", "bOPV Booster"],
        ["MR2", "MR-2"],
        ["DPT_booster", "DPT Booster"],
        ["JE2", "JE-2"],
        ["VitA2", "VitA-2"],
        ["fIPV_booster", "f-IPV Booster"],
      ],
    },
  ];

  return (
    <div
      className="panel-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="linked-panel">
        {/* Header */}
        <div className="linked-header">
          <div>
            <div className="linked-title">House #{hhNo} — Linked Records</div>
            <div className="linked-sub">
              Changes here auto-update the Main Sheet ⟳
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="linked-tabs">
          <button
            className={tab === "pregnant" ? "active pink" : ""}
            onClick={() => setTab("pregnant")}
          >
            ♀ Pregnant Women{" "}
            <span className="tab-count">{pregnantList.length}</span>
          </button>
          <button
            className={tab === "children" ? "active amber" : ""}
            onClick={() => setTab("children")}
          >
            ✦ Children <span className="tab-count">{childrenList.length}</span>
          </button>
        </div>

        <div className="linked-body">
          {/* ── PREGNANT TAB ─────────────────────────────────────────────── */}
          {tab === "pregnant" && (
            <div className="linked-section">
              <div className="linked-section-toolbar">
                <span className="section-hint">
                  Each row = 1 pregnant woman in this house
                </span>
                <button
                  className="btn-add btn-pink btn-sm"
                  onClick={addPregnant}
                >
                  + Add Pregnant Woman
                </button>
              </div>

              {/* Pregnant list */}
              {pregnantList.length === 0 && !editingP && (
                <div className="empty-state">
                  No pregnant women recorded for this house.
                </div>
              )}
              {pregnantList.map((p, i) => {
                const tri = calcTrimester(p.lmp);
                return (
                  <div key={p._id} className="record-card pink-card clickable-card" onClick={() => editPregnant(p)}>
                    <div className="record-card-header">
                      <div className="clickable-name">
                        <div className="record-name">{p.name} 📋</div>
                        <div className="record-meta">
                          <span>Husband: {p.husbandName}</span>
                          <span>Age: {calcAgeYears(p.dob)}</span>
                        </div>
                      </div>
                      <div className="card-right-side" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {tri && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: tri.color + "15",
                              color: tri.color,
                              borderColor: tri.color + "30",
                              borderStyle: "solid",
                              borderWidth: "1px",
                              fontSize: "10px",
                              padding: "2px 8px",
                              borderRadius: "12px"
                            }}
                          >
                            {tri.label}
                          </span>
                        )}
                        <div className="action-btns no-print" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn-icon btn-del"
                            onClick={() => deletePregnant(p)}
                            title="Delete Record"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pregnant Detailed Modal */}
              {editingP && (
                <Modal
                  title={`Mother Health Report: ${editingP.name || "New Record"}`}
                  onClose={() => setEditingP(null)}
                  wide
                >
                  <div className="report-container printable-area">
                    <div className="report-doc-header">
                      <div className="govt-text">Government of West Bengal</div>
                      <div className="form-id">Form PW-01</div>
                      <h2 className="report-main-title">
                        Mother Health & Tracking Card
                      </h2>
                    </div>

                    <div className="report-section">
                      <div className="report-section-title">
                        <span>👤 Personal & Identification Details</span>
                      </div>
                      <div className="report-grid">
                        {PF("hhNo", "Household No. (HH#)")}
                        {PF("name", "Full Name")}
                        {PF("dob", "Date of Birth", "date")}
                        {PF("husbandName", "Husband's Name")}
                        {PF("mobile", "Mobile Number")}
                        {PF("mcpCardUwn", "MCP Card / UWN (RCH ID)")}
                        <div className="report-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "12px", gridColumn: "span 2" }}>
                          {PF("lmp", "LMP Date", "date")}
                          <div className="report-field">
                            <label>Expected Delivery (EDD)</label>
                            <input type="date" value={editingP.edd || ""} readOnly />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="report-section">
                      <div className="report-section-title">
                        <span>💉 TD Vaccination (Maternal Immunity)</span>
                      </div>
                      <div className="report-grid">
                        {PF("td1", "TD-1 Date", "date")}
                        {PF("td2", "TD-2 Date", "date")}
                        {PF("tdBooster", "TD Booster", "date")}
                        {PF("tdDue", "TD Due / Next", "date")}
                      </div>
                    </div>

                    <div className="report-section">
                      <div className="report-section-title">
                        <span>🏥 Ante Natal Checkup (ANC)</span>
                      </div>
                      <div className="anc-status-grid">
                        {[
                          { label: "1st ANC", key: "anc1" },
                          { label: "2nd ANC", key: "anc2" },
                          { label: "3rd ANC", key: "anc3" },
                          { label: "4th ANC", key: "anc4" },
                          { label: "Next Due", key: "ancDue" },
                        ].map((v) => (
                          <div key={v.key} className={`anc-status-card ${editingP[v.key] ? "active" : ""}`}>
                            <div className="anc-num">{v.label}</div>
                            <input
                              type="date"
                              value={editingP[v.key] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditingP((p) => ({ ...p, [v.key]: val }));
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer no-print">
                    <button className="btn-cancel" onClick={() => setEditingP(null)}>
                      Close
                    </button>
                    <button className="btn-print" onClick={handlePrint}>
                      Print Report
                    </button>
                    <button className="btn-save btn-save-pink" onClick={savePregnant}>
                      ✓ Save Changes
                    </button>
                  </div>
                </Modal>
              )}
            </div>
          )}

          {/* ── CHILDREN TAB ─────────────────────────────────────────────── */}
          {tab === "children" && (
            <div className="linked-section">
              <div className="linked-section-toolbar">
                <span className="section-hint">
                  Age group is auto-detected from Date of Birth
                </span>
                <button className="btn-add btn-amber btn-sm" onClick={addChild}>
                  + Add Child
                </button>
              </div>

              {childrenList.length === 0 && !editingC && (
                <div className="empty-state">
                  No children recorded for this house.
                </div>
              )}

              {childrenList.map((c) => {
                const grp = getAgeGroupFromDOB(c.dob);
                const col = AGE_GROUP_COLORS[grp] || "dim";
                return (
                  <div key={c._id} className="record-card amber-card">
                    <div className="record-card-header">
                      <div>
                        <span className="record-name">{c.name}</span>
                        <span
                          className={`badge-${col}`}
                          style={{ marginLeft: 8, fontSize: 11 }}
                        >
                          {AGE_GROUP_LABELS[grp] || grp}
                        </span>
                        <span className="record-meta">
                          {" "}
                          · {c.gender === "F" ? "Female" : "Male"} · Age:{" "}
                          {calcAgeFull(c.dob)} · Guardian: {c.guardianName}
                        </span>
                      </div>
                      <div className="action-btns">
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => editChild(c)}
                          title="Edit Record"
                        >
                          ✏
                        </button>
                        <button
                          className="btn-icon btn-del"
                          onClick={() => deleteChild(c)}
                          title="Delete Record"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="record-tags">
                      {c.BCG && <span className="tag green">BCG ✓</span>}
                      {c.Penta1 && <span className="tag green">Penta-1 ✓</span>}
                      {c.Penta2 && <span className="tag green">Penta-2 ✓</span>}
                      {c.Penta3 && <span className="tag green">Penta-3 ✓</span>}
                      {c.MR1 && <span className="tag green">MR-1 ✓</span>}
                      {c.MR2 && <span className="tag green">MR-2 ✓</span>}
                      {c.missedVaccine && (
                        <span className="tag red">Missed Vacc !</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Child form */}
              {editingC && (
                <div className="inline-form">
                  <div className="inline-form-title">
                    {childrenList.find((c) => c._id === editingC._id)
                      ? "Edit Child Record"
                      : "New Child"}
                  </div>

                  {/* Age group preview */}
                  {editingC.dob && (
                    <div className="age-preview">
                      Detected Age Group:{" "}
                      <strong>
                        {AGE_GROUP_LABELS[getAgeGroupFromDOB(editingC.dob)] ||
                          "—"}
                      </strong>
                      &nbsp;·&nbsp; Age:{" "}
                      <strong>{calcAgeFull(editingC.dob)}</strong>
                      &nbsp;→ Main sheet counts will update automatically on
                      save
                    </div>
                  )}

                  <div className="form-section-title">Child Details</div>
                  <div className="form-grid">
                    {CF("name", "Full Name")}{" "}
                    {CF("dob", "Date of Birth", "date")}
                    {CF("gender", "Gender")}{" "}
                    {CF("guardianName", "Guardian Name")}
                    {CF("mobile", "Mobile")}{" "}
                    {CF("mcpCardUwn", "MCP Card / UWN ID")}
                    {CF("missedVaccine")}
                  </div>

                  {VACC_GROUPS.map((g) => (
                    <div key={g.label}>
                      <div className="form-section-title">
                        Vaccines — {g.label}
                      </div>
                      <div className="form-grid">
                        {g.fields.map(([key, label]) => (
                          <div key={key} className="form-field">
                            <label>{label}</label>
                            <input
                              type="date"
                              value={editingC[key] ?? ""}
                              onChange={(e) =>
                                setEditingC((p) => ({
                                  ...p,
                                  [key]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="modal-footer">
                    <button
                      className="btn-cancel"
                      onClick={() => setEditingC(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-save btn-save-amber"
                      onClick={saveChild}
                    >
                      ✓ Save Record
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {confirmDelete && (
        <ConfirmModal
          title={`Confirm ${confirmDelete.type === "child" ? "Child" : "Pregnant"} Deletion`}
          message={`Are you sure you want to delete the record for ${confirmDelete.item.name}? It will be moved to the Recycle Bin.`}
          onConfirm={confirmDeleteAction}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
