/* eslint-disable no-unused-vars */
import React, { useState, useMemo } from "react";
import { db, getAgeGroupFromDOB, calcAgeFull } from "../../services/db";
import { Badge } from "../../components/common";
import Modal from "../../components/common/Modal";
import VaccinationCard from "./VaccinationCard";
import { useToast } from "../../contexts/ToastContext";


const EMPTY = {
  hhNo: "",
  name: "",
  dob: "",
  gender: "M",
  guardianName: "",
  mobile: "",
  mcpCard: "",
  missedVaccine: false,
  // Vaccines relevant for 2-5yr: boosters, MR-2, DPT-B, JE-2, VitA doses
  MR1: "",
  MR2: "",
  DPT_booster: "",
  JE1: "",
  JE2: "",
  VitA1: "",
  VitA2: "",
  VitA3: "",
  VitA4: "",
  VitA5: "",
  bOPV_booster: "",
  PCVBooster: "",
  fIPV_booster: "",
};


const VACC_GROUPS_25 = [
  {
    label: "9–12 Months",
    fields: [
      ["MR1", "MR-1"],
      ["JE1", "JE-1"],
      ["VitA1", "Vit A-1"],
      ["PCVBooster", "PCV Booster"],
    ],
  },
  {
    label: "16–24 Months",
    fields: [
      ["MR2", "MR-2"],
      ["DPT_booster", "DPT Booster"],
      ["bOPV_booster", "bOPV Booster"],
      ["JE2", "JE-2"],
      ["VitA2", "Vit A-2"],
      ["fIPV_booster", "f-IPV Booster"],
    ],
  },
  {
    label: "2–5 Years",
    fields: [
      ["VitA3", "Vit A-3"],
      ["VitA4", "Vit A-4"],
      ["VitA5", "Vit A-5"],
    ],
  },
];

function VaccDot({ done }) {
  return (
    <span
      className={`vacc-dot ${done ? "done" : "miss"}`}
      title={done || "Not given"}
    />
  );
}

const allVaccFields = VACC_GROUPS_25.flatMap((g) => g.fields.map((f) => f[0]));

export default function Children2to5Tab({ data, onRefresh }) {
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [expand, setExpand] = useState(null);
  const [showCard, setShowCard] = useState(null);

  // Filter only 2–5 year children
  const filtered = useMemo(() => {
    const only25 = data.filter(
      (c) => getAgeGroupFromDOB(c.dob) === "2to5years",
    );
    const q = search.toLowerCase();
    return q
      ? only25.filter(
          (c) =>
            c.name?.toLowerCase().includes(q) ||
            c.guardianName?.toLowerCase().includes(q) ||
            String(c.hhNo).includes(q),
        )
      : only25;
  }, [data, search]);

  function openAdd() {}
  function openEdit(c) {
    setForm({ ...c });
    setModal("edit");
  }

  function handleSave() {
    if (!form.name?.trim()) {
      showToast("Child name required", "error");
      return;
    }
    if (!form.hhNo) {
      showToast("House No. is required", "error");
      return;
    }

    // force dob to be in 2-5yr range validation hint (not hard block)
    const grp = getAgeGroupFromDOB(form.dob);
    if (form.dob && grp !== "2to5years") {
      if (
        !window.confirm(
          `Age group detected: "${grp}" — not 2–5 years. Save anyway?`,
        )
      )
        return;
    }
    db.saveChild(form);
    onRefresh();
    setModal(null);
    showToast(
      modal === "add"
        ? "Child added! Main sheet updated ⟳"
        : "Updated! Main sheet updated ⟳",
    );

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
            &nbsp;Missed Vaccine (MR-1/MR-2/DPT/OPV)
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
          {filtered.length} children aged 2–5 years
        </span>
      </div>

      <div className="info-banner info-purple">
        ⟳ Use the <strong>Household Tab (🔗)</strong> to add or delete records.
        Age is auto-detected from DOB. Showing only children aged{" "}
        <strong>2–5 years</strong>.
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
              <th>Guardian</th>
              <th>Vaccines</th>
              <th>Coverage</th>
              <th className="center">Status</th>
              <th className="center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="empty-state">
                  No children aged 2–5 years found.
                </td>
              </tr>
            )}
            {filtered.map((c, i) => {
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
                  <td>{c.guardianName}</td>
                  <td>
                    <div className="vacc-dots">
                      {allVaccFields.map((f) => (
                        <VaccDot key={f} done={c[f]} />
                      ))}
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
                    {c.missedVaccine ? (
                      <Badge variant="red">Missed</Badge>
                    ) : (
                      <span className="dim">—</span>
                    )}
                  </td>
                  <td className="center">
                    <div className="action-btns" style={{ justifyContent: "center" }}>
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
                    </div>
                  </td>
                </tr>
                  {isExp && (
                    <tr key={`exp-${c._id || i}`} className="expand-row">
                      <td colSpan={9}>
                        <div className="vacc-expand">
                          {VACC_GROUPS_25.map((g) => (
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
              Age: <strong>{calcAgeFull(form.dob)}</strong>
              &nbsp;·&nbsp; Group:{" "}
              <strong>
                {getAgeGroupFromDOB(form.dob) === "2to5years"
                  ? "✓ 2–5 Years"
                  : "⚠ " + getAgeGroupFromDOB(form.dob)}
              </strong>
            </div>
          )}
          <div className="form-grid">
            {CF("hhNo", "House No.")} {CF("name", "Child Name")}{" "}
            {CF("dob", "Date of Birth", "date")}
            {CF("gender")} {CF("guardianName", "Guardian Name")}{" "}
            {CF("mobile", "Mobile")}
            {CF("mcpCardUwn", "MCP Card / UWN ID")} {CF("missedVaccine")}
          </div>
          {VACC_GROUPS_25.map((g) => (
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
            <button className="btn-save btn-save-purple" onClick={handleSave}>
              ✓ Save Changes
            </button>
          </div>
        </Modal>
      )}
      {showCard && (
        <VaccinationCard
          child={showCard}
          household={db
            .getHouseholds()
            .find((h) => Number(h.id) === Number(showCard.hhNo))}
          onClose={() => setShowCard(null)}
        />
      )}
    </div>
  );
}
