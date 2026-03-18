import { useState, useMemo } from "react";
import { db, calcAgeYears } from "../../services/db";
import Modal from "../../components/Modal";

const EMPTY = {
  hhNo: "",
  name: "",
  dob: "",
  husbandName: "",
  mobile: "",
  mcpCardUwn: "",
  lmp: "",
  edd: "",
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

function calcEDD(lmp) {
  if (!lmp) return "";
  const d = new Date(lmp);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 280);
  return d.toISOString().split("T")[0];
}


function calcTrimester(lmp) {
  if (!lmp) return null;
  const weeks = Math.floor((new Date() - new Date(lmp)) / (7 * 86400000));
  if (weeks <= 12) return { label: "1st Trimester", color: "#16a34a" };
  if (weeks <= 27) return { label: "2nd Trimester", color: "#0891b2" };
  if (weeks <= 42) return { label: "3rd Trimester", color: "#d97706" };
  return { label: "Overdue?", color: "#dc2626" };
}

export default function PregnantTab({ data, onRefresh, onToast }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? data.filter(
          (p) =>
            p.name?.toLowerCase().includes(q) ||
            p.husbandName?.toLowerCase().includes(q) ||
            String(p.hhNo).includes(q) ||
            p.mobile?.includes(q),
        )
      : data;
  }, [data, search]);

  function openEdit(p) {
    // Sanitize mobile if it contains formula string
    const sanitized = { ...p };
    if (sanitized.mobile && sanitized.mobile.includes("<openpyxl")) {
      sanitized.mobile = "";
    }
    setForm(sanitized);
    setModal("edit");
  }

  function handleSave() {
    if (!form.name?.trim()) {
      onToast("Name is required", "error");
      return;
    }
    if (!form.hhNo) {
      onToast("House No. is required", "error");
      return;
    }
    db.savePregnant(form);
    onRefresh();
    // Keep internal state updated if we don't close modal immediately
    if (modal === "edit") {
      // Refresh current form to match saved state if needed
    }
    setModal(null);
    onToast(
      modal === "add"
        ? "Record added! Main sheet updated ⟳"
        : "Record updated! Main sheet updated ⟳",
    );
  }

  function handlePrint() {
    window.print();
  }

  function F(key, label, type = "text") {
    return (
      <div className="report-field">
        {label && <label>{label}</label>}
        <input
          type={type}
          value={form[key] ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            setForm((p) => {
              const next = { ...p, [key]: val };
              if (key === "lmp") next.edd = calcEDD(val);
              return next;
            });
          }}
        />
      </div>
    );
  }

  function Row(label, key, type = "text") {
    return (
      <tr>
        <td className="row-labels">{label}</td>
        <td className="row-inputs">
          <input
            className="form-input"
            type={type}
            value={form[key] ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setForm((p) => {
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

  return (
    <div className="tab-content">
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search name, husband, HH no., mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="result-count">{filtered.length} records</span>
      </div>

      <div className="info-banner no-margin">
        ⟳ Use the <strong>Household Tab (🔗)</strong> to add or delete records.
        You can only edit existing records here.
      </div>

      <div className="record-cards-list">
        {filtered.map((p, i) => {
          const tri = calcTrimester(p.lmp);
          const ancDone = [p.anc1, p.anc2, p.anc3, p.anc4].filter(Boolean).length;
          const tdDone = [p.td1, p.td2, p.tdBooster].filter(Boolean).length;
          
          // Sanitize display mobile
          const displayMobile = p.mobile && p.mobile.includes("<openpyxl") ? "—" : (p.mobile || "—");

          return (
            <div
              key={p._id || i}
              className="record-card pink-card clickable-card"
              onClick={() => openEdit(p)}
            >
              <div className="record-card-header">
                <div>
                  <div className="record-name">{p.name} 📋</div>
                  <div className="record-meta">
                    <span>HH #{p.hhNo || "—"}</span>
                    <span>•</span>
                    <span>Husband: {p.husbandName || "—"}</span>
                  </div>
                </div>
                {tri && (
                  <span
                    className="badge"
                    style={{
                      backgroundColor: tri.color + "15",
                      color: tri.color,
                      borderColor: tri.color + "30",
                      borderStyle: "solid",
                      borderWidth: "1px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "600"
                    }}
                  >
                    {tri.label}
                  </span>
                )}
              </div>

              <div className="record-tags">
                <span className="tag">Age: {calcAgeYears(p.dob)} yrs</span>
                <span className="tag">Mobile: {displayMobile}</span>
                <span className={`tag ${ancDone >= 4 ? "green" : "teal"}`}>
                  ANC: {ancDone}/4
                </span>
                <span className={`tag ${tdDone >= 3 ? "green" : "teal"}`}>
                  TD: {tdDone}/3
                </span>
                {tri && tri.label === "Overdue?" && (
                  <span className="tag red">Needs Attention</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <Modal
          title={`Pregnant Woman Health Report: ${form.name}`}
          onClose={() => setModal(null)}
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
                {F("hhNo", "Household No. (HH#)")}
                {F("name", "Full Name")}
                {F("dob", "Date of Birth", "date")}
                {F("husbandName", "Husband's Name")}
                {F("mobile", "Mobile Number")}
                {F("mcpCardUwn", "MCP Card / UWN (RCH ID)")}
                <div className="report-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "12px", gridColumn: "span 2" }}>
                  {F("lmp", "LMP Date", "date")}
                  <div className="report-field">
                    <label>Expected Delivery (EDD)</label>
                    <input type="date" value={form.edd || ""} readOnly />
                  </div>
                </div>
              </div>
            </div>

            <div className="report-section">
              <div className="report-section-title">
                <span>💉 TD Vaccination (Maternal Immunity)</span>
              </div>
              <div className="report-grid">
                {F("td1", "TD-1 Date", "date")}
                {F("td2", "TD-2 Date", "date")}
                {F("tdBooster", "TD Booster", "date")}
                {F("tdDue", "TD Due / Next", "date")}
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
                  <div key={v.key} className={`anc-status-card ${form[v.key] ? "active" : ""}`}>
                    <div className="anc-num">{v.label}</div>
                    <input
                      type="date"
                      value={form[v.key] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((p) => ({ ...p, [v.key]: val }));
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer no-print">
            <button className="btn-cancel" onClick={() => setModal(null)}>
              Close
            </button>
            <button className="btn-print" onClick={handlePrint}>
              Print Report
            </button>
            <button className="btn-save btn-save-pink" onClick={handleSave}>
              ✓ Save Changes
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
