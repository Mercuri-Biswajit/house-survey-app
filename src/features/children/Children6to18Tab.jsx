/* eslint-disable no-unused-vars */
import { useState, useMemo } from "react";
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
  // Relevant vaccines/health checks for 6-18
  TT_10yr: "",
  TT_16yr: "",
  Deworming_1: "",
  Deworming_2: "",
};


const HEALTH_CHECKS = [
  {
    label: "Routine Checks",
    fields: [
      ["TT_10yr", "TT (10 Yrs)"],
      ["TT_16yr", "TT (16 Yrs)"],
      ["Deworming_1", "Deworming 1"],
      ["Deworming_2", "Deworming 2"],
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

const allCheckFields = HEALTH_CHECKS.flatMap((g) => g.fields.map((f) => f[0]));

export default function Children6to18Tab({ data, households, onRefresh }) {
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [expand, setExpand] = useState(null);
  const [showCard, setShowCard] = useState(null);

  // Filter only 6-18 year children
  const filtered = useMemo(() => {
    const only6to18 = data.filter(
      (c) => getAgeGroupFromDOB(c.dob) === "6to18years",
    );
    const q = search.toLowerCase();
    return q
      ? only6to18.filter(
          (c) =>
            c.name?.toLowerCase().includes(q) ||
            c.guardianName?.toLowerCase().includes(q) ||
            String(c.hhNo).includes(q),
        )
      : only6to18;
  }, [data, search]);

  function openEdit(c) {
    setForm({ ...c });
    setModal("edit");
  }

  async function handleSave() {
    if (!form.name?.trim()) {
      showToast("Name required", "error");
      return;
    }
    if (!form.hhNo) {
      showToast("House No. is required", "error");
      return;
    }

    await db.saveChild(form);
    await onRefresh();
    setModal(null);
    showToast("Updated! Main sheet updated ⟳");

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
          placeholder="Search name, guardian, HH no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="result-count">
          {filtered.length} children aged 6–18 years
        </span>
      </div>

      <div className="info-banner info-dim">
        ⟳ Use the <strong>Household Tab (🔗)</strong> to add or delete records.
        Age is auto-detected from DOB. Showing only children aged{" "}
        <strong>6–18 years</strong>.
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
              <th>Health Checks</th>
              <th>Coverage</th>
              <th className="center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="empty-state">
                  No children aged 6–18 years found.
                </td>
              </tr>
            )}
            {filtered.map((c, i) => {
              const done = allCheckFields.filter((f) => c[f]).length;
              const pct = Math.round((done / allCheckFields.length) * 100);
              const isExp = expand === (c._id || i);
              return (
                <tr key={c._id || i}>
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
                      {allCheckFields.map((f) => (
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
              );
            })}
          </tbody>
        </table>
      </div>

      {showCard && (
        <Modal
          title={`Health Card: ${showCard.name}`}
          onClose={() => setShowCard(null)}
          wide
        >
          <VaccinationCard 
            child={showCard} 
            household={households?.find((h) => Number(h.id) === Number(showCard.hhNo))}
          />
        </Modal>
      )}

      {modal && (
        <Modal title={`Edit: ${form.name}`} onClose={() => setModal(null)} wide>
          <div className="form-section-title">Child/Adolescent Details</div>
          {form.dob && (
            <div className="age-preview">
              Age: <strong>{calcAgeFull(form.dob)}</strong>
            </div>
          )}
          <div className="form-grid">
            {CF("hhNo", "House No.")} {CF("name", "Name")}{" "}
            {CF("dob", "Date of Birth", "date")}
            {CF("gender")} {CF("guardianName", "Guardian Name")}{" "}
            {CF("mobile", "Mobile")}
          </div>
          {HEALTH_CHECKS.map((g) => (
            <div key={g.label}>
              <div className="form-section-title">{g.label}</div>
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
    </div>
  );
}
