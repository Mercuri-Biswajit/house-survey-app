/* eslint-disable no-unused-vars */
import React, { useState, useMemo } from "react";
import { db, getAgeGroupFromDOB, calcAgeFull } from "../../services/db";
import { Badge } from "../../components/common";
import Modal from "../../components/common/Modal";
import ConfirmModal from "../../components/common/ConfirmModal";
import VaccinationCard from "./VaccinationCard";
import { useToast } from "../../contexts/ToastContext";


const AGE_GROUP_LABELS = {
  under1Month: "< 1 Month",
  "1monthTo1year": "1M – 1 Year",
  "1to2years": "1 – 2 Years",
  "2to5years": "2 – 5 Years",
  "6to18years": "6 – 18 Years",
};
const AGE_GROUP_COLORS = {
  under1Month: "blue",
  "1monthTo1year": "teal",
  "1to2years": "purple",
  "2to5years": "amber",
  "6to18years": "dim",
};

const VACC_GROUPS = [
  {
    label: "At Birth",
    fields: [
      ["bOPV_birth", "bOPV(B)"],
      ["BCG", "BCG"],
      ["HepB", "HepB"],
    ],
  },
  {
    label: "6 Weeks",
    fields: [
      ["bOPV1", "bOPV-1"],
      ["RVV1", "RVV-1"],
      ["fIPV1", "fIPV-1"],
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
      ["fIPV2", "fIPV-2"],
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

const EMPTY = {
  hhNo: "",
  name: "",
  dob: "",
  gender: "M",
  guardianName: "",
  mobile: "",
  mcpCardUwn: "",
  missedVaccine: false,
};


function VaccDot({ done }) {
  return (
    <span
      className={`vacc-dot ${done ? "done" : "miss"}`}
      title={done || "Not given"}
    />
  );
}

const allVaccFields = VACC_GROUPS.flatMap((g) => g.fields.map((f) => f[0]));

export default function ChildrenTab({ data, filterGroup, households, onRefresh }) {
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [expand, setExpand] = useState(null);
  const [showCard, setShowCard] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const listWithPending = useMemo(() => {
    const combined = [...data.map(c => ({ ...c, _type: 'actual' }))];
    
    // Mapping from filterGroup to household count field
    const groupToField = {
      under1Month: 'childUnder1Month',
      '1monthTo1year': 'child1MonthTo1Year',
      '1to2years': 'child1To2Years',
      '2to5years': 'child2To5Years',
      '6to18years': 'child6To18Years'
    };

    if (filterGroup && groupToField[filterGroup]) {
      const field = groupToField[filterGroup];
      households.forEach(h => {
        const target = Number(h[field] || 0);
        // Data is already pre-filtered for this age group, so count directly
        const actual = data.filter(c => String(c.hhNo) === String(h.id)).length;
        if (target > actual) {
          for (let i = actual + 1; i <= target; i++) {
            combined.push({
              _id: `pending-c-${h.id}-${filterGroup}-${i}`,
              hhNo: String(h.id),
              name: `[Pending] Child ${i} (House #${h.id})`,
              guardianName: h.headName || "Unknown",
              dob: "", 
              _type: 'pending'
            });
          }
        }
      });
    }
    return combined;
  }, [data, households, filterGroup]);

  const filtered = useMemo(() => {
    let list = listWithPending;
    // Data is already pre-filtered by age group, just filter by search
    const q = search.toLowerCase();
    return q
      ? list.filter(
          (c) =>
            c.name?.toLowerCase().includes(q) ||
            c.guardianName?.toLowerCase().includes(q) ||
            String(c.hhNo).includes(q),
        )
      : list;
  }, [listWithPending, search]);

  function openAdd() {
    setForm({ ...EMPTY, _id: Date.now() });
    setModal("add");
  }
  function openEdit(c) {
    setForm({ ...c });
    setModal("edit");
  }

  async function handleSave() {
    if (!form.name?.trim()) {
      showToast("Child name required", "error");
      return;
    }
    if (!form.hhNo) {
      showToast("House No. is required", "error");
      return;
    }

    const isDuplicate = await db.checkDuplicateChild(form.hhNo, form.name, form.dob, form._id);
    if (isDuplicate) {
      showToast(`A record for ${form.name} in House #${form.hhNo} with the same DOB already exists.`, "error");
      return;
    }

    await db.saveChildToGroup(form, filterGroup);
    await onRefresh();
    setModal(null);
    showToast(
      modal === "add"
        ? "Child added! Main sheet updated ⟳"
        : "Updated! Main sheet updated ⟳",
    );

  }

  function handleDelete(c) {
    setConfirmDelete(c);
  }

  async function confirmDeleteAction() {
    if (!confirmDelete) return;
    await db.deleteChild(confirmDelete._id, confirmDelete.dob);
    await onRefresh();
    setConfirmDelete(null);
    showToast("Record moved to Recycle Bin ⟳", "error");

  }

  function CF(key, label, type = "text") {
    if (key === "gender")
      return (
        <div className="form-field">
          <label>Gender</label>
          <select
            value={form.gender || "M"}
            onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
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
              checked={!!form.missedVaccine}
              onChange={(e) =>
                setForm((p) => ({ ...p, missedVaccine: e.target.checked }))
              }
            />
            &nbsp;Missed Vaccine
          </label>
        </div>
      );
    return (
      <div className="form-field">
        <label>{label}</label>
        <input
          type={type}
          value={form[key] ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        />
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search child name, guardian, HH no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="result-count">
          {filtered.length}{" "}
          {filterGroup ? AGE_GROUP_LABELS[filterGroup] : "total"} records
        </span>
        <button className="btn-add btn-amber" onClick={openAdd} style={{ marginLeft: "auto" }}>
          + Add Child
        </button>
      </div>

      <div
        className={`info-banner info-${filterGroup ? AGE_GROUP_COLORS[filterGroup] : "amber"}`}
        style={{ marginBottom: 0 }}
      >
        🏠 <strong>Data Picking Active</strong>: Households with counts for this age group but no records are shown as <em>[Pending]</em>.
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="center">House #</th>
              <th>Child Name</th>
              <th>DOB</th>
              <th>Age</th>
              <th className="center">Sex</th>
              <th>Age Group</th>
              <th>Guardian</th>
              <th>Vaccines</th>
              <th>Coverage</th>
              <th className="center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              const grp = getAgeGroupFromDOB(c.dob);
              const col = AGE_GROUP_COLORS[grp] || "dim";
              const done = allVaccFields.filter((f) => c[f]).length;
              const pct = Math.round((done / allVaccFields.length) * 100);
              const isExp = expand === (c._id || i);
              return (
                <React.Fragment key={c._id || i}>
                <tr key={c._id || i} className={isExp ? "row-expanded" : ""}>
                  <td className="center">
                    <span className="house-no">{c.hhNo || "—"}</span>
                  </td>
                  <td className="name-cell">{c.name}</td>
                  <td>{c.dob || "—"}</td>
                  <td className="mono">{calcAgeFull(c.dob)}</td>
                  <td className="center">{c.gender}</td>
                  <td>
                    <Badge variant={col}>
                      {AGE_GROUP_LABELS[grp] || "—"}
                    </Badge>
                  </td>
                  <td>{c.guardianName}</td>
                  <td>
                    <div className="vacc-dots">
                      {allVaccFields.slice(0, 8).map((f) => (
                        <VaccDot key={f} done={c[f]} />
                      ))}
                      {allVaccFields.length > 8 && (
                        <span className="vacc-more">
                          +{allVaccFields.length - 8}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="cov-wrap">
                      <div className="cov-track">
                        <div
                          className="cov-fill"
                          style={{
                            width: `${pct}%`,
                            background:
                              pct >= 80
                                ? "#16a34a"
                                : pct >= 50
                                  ? "#d97706"
                                  : "#dc2626",
                          }}
                        />
                      </div>
                      <span className="cov-pct">{pct}%</span>
                    </div>
                  </td>
                  <td className="center">
                    <div className="action-btns" style={{ justifyContent: "center" }}>
                      {c._type === 'actual' ? (
                        <>
                          <button
                            className="btn-icon btn-view"
                            onClick={() => setShowCard(c)}
                            title="View Full Card"
                          >
                            📇
                          </button>
                          <button
                            className="btn-icon btn-edit"
                            onClick={() => openEdit(c)}
                            title="Edit"
                          >
                            ✏
                          </button>
                          <button
                            className="btn-icon btn-del"
                            onClick={() => handleDelete(c)}
                            title="Delete"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <Badge variant="amber" onClick={() => openEdit(c)} style={{ cursor: 'pointer' }}>➕ Pending Detail</Badge>
                      )}
                    </div>
                  </td>
                </tr>
                  {isExp && (
                    <tr key={`exp-${c._id || i}`} className="expand-row">
                      <td colSpan={9}>
                        <div className="vacc-expand">
                          {VACC_GROUPS.map((g) => (
                            <div key={g.label} className="vacc-group">
                              <div className="vacc-group-label">{g.label}</div>
                              {g.fields.map(([f, lbl]) => (
                                <div
                                  key={f}
                                  className={`vacc-item ${c[f] ? "vacc-given" : "vacc-miss"}`}
                                >
                                  <span>{lbl}</span>
                                  <span>{c[f] || "—"}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={`Edit: ${form.name}`} onClose={() => setModal(null)} wide>
          <div className="form-section-title">Child Details</div>
          {form.dob && (
            <div className="age-preview">
              Detected Age Group:{" "}
              <strong>{AGE_GROUP_LABELS[getAgeGroupFromDOB(form.dob)]}</strong>
              &nbsp;·&nbsp; Age: <strong>{calcAgeFull(form.dob)}</strong>
              &nbsp;→ Main sheet counts update on save
            </div>
          )}
          <div className="form-grid">
            {CF("hhNo", "House No.")} {CF("name", "Child Name")}{" "}
            {CF("dob", "Date of Birth", "date")}
            {CF("gender")} {CF("guardianName", "Guardian Name")}{" "}
            {CF("mobile", "Mobile")}
            {CF("mcpCardUwn", "MCP Card / UWN ID")} {CF("missedVaccine")}
          </div>
          {VACC_GROUPS.map((g) => (
            <div key={g.label}>
              <div className="form-section-title">Vaccines — {g.label}</div>
              <div className="form-grid">
                {g.fields.map(([key, label]) => (
                  <div key={key} className="form-field">
                    <label>{label}</label>
                    <input
                      type="date"
                      value={form[key] ?? ""}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, [key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="modal-footer">
            <button className="btn-cancel" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button className="btn-save btn-save-amber" onClick={handleSave}>
              ✓ Save Changes
            </button>
          </div>
        </Modal>
      )}
      {showCard && (
        <VaccinationCard
          child={showCard}
          household={households.find((h) => Number(h.id) === Number(showCard.hhNo))}
          onClose={() => setShowCard(null)}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Confirm Deletion"
          message={`Are you sure you want to delete the record for ${confirmDelete.name}? It will be moved to the Recycle Bin.`}
          onConfirm={confirmDeleteAction}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
