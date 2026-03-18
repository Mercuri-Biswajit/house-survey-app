import { useState, useMemo } from "react";
import { db, getAgeGroupFromDOB, calcAgeFull } from "../../services/db";
import Modal from "../../components/Modal";
import VaccinationCard from "./VaccinationCard";

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
  DPT_booster2: "",
  TD10: "",
  TD15: "",
};

// Map of age group internal IDs to display names
const AGE_GROUP_LABELS = {
  under1Month: "< 1 Month",
  "1monthTo1year": "1 Month – 1 Year",
  "1to2years": "1 – 2 Years",
  "2to5years": "2 – 5 Years",
  "6to18years": "6 – 18 Years",
  above18years: "Above 18 Years",
};

const AGE_GROUP_COLORS = {
  under1Month: "blue",
  "1monthTo1year": "teal",
  "1to2years": "purple",
  "2to5years": "amber",
  "6to18years": "purple",
  above18years: "dim",
};



// Ensure the form groups match the Bengali card layout order
const VACC_GROUPS = [
  {
    label: "জন্ম (At Birth)",
    fields: [
      ["BCG", "বি সি জি"],
      ["bOPV_birth", "ও পি ভি-০"],
      ["HepB", "হেপ বি"],
    ],
  },
  {
    label: "১.৫ মাস (6 Weeks)",
    fields: [
      ["bOPV1", "ও পি ভি-১"],
      ["Penta1", "পেন্টা-১"],
      ["RVV1", "রোটা-১"],
      ["PCV1", "পি সি ভি-১"],
      ["fIPV1", "আই পি ভি-১"],
    ],
  },
  {
    label: "২.৫ মাস (10 Weeks)",
    fields: [
      ["bOPV2", "ও পি ভি-২"],
      ["Penta2", "পেন্টা-২"],
      ["RVV2", "রোটা-২"],
    ],
  },
  {
    label: "৩.৫ মাস (14 Weeks)",
    fields: [
      ["bOPV3", "ও পি ভি-৩"],
      ["Penta3", "পেন্টা-৩"],
      ["RVV3", "রোটা-৩"],
      ["PCV2", "পি সি ভি-২"],
      ["fIPV2", "আই পি ভি-২"],
    ],
  },
  {
    label: "৯ মাস (9 Months)",
    fields: [
      ["MR1", "এম আর-১"],
      ["JE1", "জেই-১"],
      ["VitA1", "ভিটামিন এ-১"],
      ["PCVBooster", "পি সি ভি বুস্টার"],
      ["fIPV3", "আই পি ভি-৩"],
    ],
  },
  {
    label: "১৬-২৪ মাস (16–24 M)",
    fields: [
      ["DPT_booster", "ডি পি টি বুস্টার-১"],
      ["MR2", "এম আর-২"],
      ["JE2", "জেই-২"],
      ["bOPV_booster", "ও পি ভি বুস্টার"],
    ],
  },
  {
    label: "৫-৬ বছর (5-6 Yrs)",
    fields: [["DPT_booster2", "ডি পি টি বুস্টার-২"]],
  }, // Using existing fields or mock, assuming DPT_booster2 mapped or missing
  { label: "১০ বছর (10 Yrs)", fields: [["TD10", "টিটি/টিডি 10"]] }, // Needs mapping or addition to db if not fully modeled. Assuming existing fields might lack these high ages, we represent what we have.
];

export default function AllChildrenTab({ data, onRefresh, onToast }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_CHILD);
  const [showCard, setShowCard] = useState(null);

  function handlePrint() {
    window.print();
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const children = data.filter((item) => item.dob); // Ensure they have dob
    return q
      ? children.filter(
          (c) =>
            String(c.hhNo).includes(q) ||
            c.name?.toLowerCase().includes(q) ||
            c.guardianName?.toLowerCase().includes(q),
        )
      : children;
  }, [data, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => Number(a.hhNo) - Number(b.hhNo));
  }, [filtered]);

  function openAdd() {
    setForm({ ...EMPTY_CHILD, _id: Date.now() });
    setModal("add");
  }
  function openEdit(c) {
    setForm({ ...c });
    setModal("edit");
  }
  function openView(c) {
    setForm({ ...c });
    setModal("view");
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

    // Validate Household exists
    const hhNum = Number(form.hhNo);
    const households = db.getHouseholds();
    const existingHouse = households.find((h) => Number(h.id) === hhNum);

    if (!existingHouse) {
      onToast(
        `Error: Household #${hhNum} does not exist. Please add the household first.`,
        "error",
      );
      return;
    }

    db.saveChild(form);
    onRefresh();
    setModal(null);
    onToast(
      modal === "add" ? `Child added to HH #${hhNum} ⟳` : `Child updated ⟳`,
    );
  }

  function handleDelete(c) {
    if (!window.confirm(`Delete record for ${c.name}?`)) return;
    db.deleteChild(c._id);
    onRefresh();
    onToast("Record deleted. Main sheet updated ⟳", "error");
  }

  function F(key, label, type = "text") {
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
          placeholder="Search name, guardian, HH no., mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="result-count">{filtered.length} records</span>
        <button className="btn-add btn-amber" onClick={openAdd}>
          + Add Child
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="center">House #</th>
              <th>Child Name</th>
              <th className="center">Sex</th>
              <th className="center">Age & Category</th>
              <th>Guardian Name</th>
              <th className="center">Mobile</th>
              <th className="center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  className="center"
                  style={{ padding: 24, color: "#94a89e" }}
                >
                  No children found.
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const grp = getAgeGroupFromDOB(c.dob);
              const ageStr = calcAgeFull(c.dob);
              const col = AGE_GROUP_COLORS[grp] || "dim";
              return (
                <tr key={c._id}>
                  <td className="center">
                    <span className="house-no">{c.hhNo || "—"}</span>
                  </td>
                  <td className="name-cell">
                    <span
                      onClick={() => openView(c)}
                      style={{
                        cursor: "pointer",
                        color: "#0ea5e9",
                        textDecoration: "underline",
                      }}
                    >
                      {c.name}
                    </span>
                  </td>
                  <td className="center">{c.gender === "F" ? "F" : "M"}</td>
                  <td className="center">
                    {calcAgeFull(c.dob)}
                    <span
                      className={`badge-${col}`}
                      style={{ marginLeft: 8, fontSize: 10 }}
                    >
                      {AGE_GROUP_LABELS[grp] || grp}
                    </span>
                  </td>
                  <td>{c.guardianName}</td>
                  <td className="mono center">{c.mobile || "—"}</td>
                  <td className="center">
                    <div className="action-btns" style={{ justifyContent: "center" }}>
                      <button
                        className="btn-icon btn-view"
                        title="Card View"
                        onClick={() => openView(c)}
                      >
                        📇
                      </button>
                      <button
                        className="btn-icon btn-edit"
                        title="Edit"
                        onClick={() => openEdit(c)}
                      >
                        ✏
                      </button>
                      <button
                        className="btn-icon btn-del"
                        title="Delete"
                        onClick={() => handleDelete(c)}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Add New Child" : `Edit: ${form.name}`}
          onClose={() => setModal(null)}
          wide
        >
          {/* Age group preview */}
          {form.dob && (
            <div className="age-preview">
              Detected Age Group:{" "}
              <strong>
                {AGE_GROUP_LABELS[getAgeGroupFromDOB(form.dob)] || "—"}
              </strong>
              &nbsp;·&nbsp; Age: <strong>{calcAgeFull(form.dob)}</strong>
            </div>
          )}

          <div className="form-section-title">Personal Details</div>
          <div className="form-grid">
            {F("hhNo", "House No.")} {F("name", "Full Name")}{" "}
            {F("dob", "Date of Birth", "date")}
            {F("gender", "Gender")} {F("guardianName", "Guardian Name")}{" "}
            {F("mobile", "Mobile")}
            {F("mcpCardUwn", "MCP Card / UWN ID")}
            {F("missedVaccine")}
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

          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button className="btn-cancel" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button className="btn-save btn-save-amber" onClick={handleSave}>
              ✓ {modal === "add" ? "Save New Child" : "Save Changes"}
            </button>
          </div>
        </Modal>
      )}

      {/* VIEW MODAL (Vaccination Card Grid) */}
      {modal === "view" && (
        <Modal
          title={`Vaccination Details: ${form.name}`}
          onClose={() => setModal(null)}
          wide
        >
          <div className="printable-area">
            <div className="report-doc-header">
              <div className="govt-text">Government of West Bengal</div>
              <div className="form-id">Form SC-4B</div>
              <h2 className="report-main-title">
                Child Vaccination Card
              </h2>
            </div>

            <div className="bengali-card-header">
              <div className="bc-name">{form.name}</div>
              <div className="bc-meta">
                Guardian: {form.guardianName} | DOB: {form.dob} | HH#:{" "}
                {form.hhNo} | Age: {calcAgeFull(form.dob)}
              </div>
            </div>

            <table className="bengali-vacc-table">
              <thead>
                <tr>
                  <th style={{ background: "#6a3287" }}>At Birth</th>
                  <th style={{ background: "#6a3287" }}>
                    1.5 Months
                    <br />
                    (6 Weeks)
                  </th>
                  <th style={{ background: "#6a3287" }}>
                    2.5 Months
                    <br />
                    (10 Weeks)
                  </th>
                  <th style={{ background: "#6a3287" }}>
                    3.5 Months
                    <br />
                    (14 Weeks)
                  </th>
                  <th style={{ background: "#6a3287" }}>9 Months</th>
                </tr>
              </thead>
              <tbody>
                {/* We map specific elements row by row for the layout */}
                <tr>
                  <td className="vc-blue">
                    <span>BCG</span>{" "}
                    <span className="vacc-date">
                      {form.BCG || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-yellow">
                    <span>bOPV-1</span>{" "}
                    <span className="vacc-date">
                      {form.bOPV1 || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-yellow">
                    <span>bOPV-2</span>{" "}
                    <span className="vacc-date">
                      {form.bOPV2 || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-yellow">
                    <span>bOPV-3</span>{" "}
                    <span className="vacc-date">
                      {form.bOPV3 || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-orange">
                    <span>MR-1</span>{" "}
                    <span className="vacc-date">
                      {form.MR1 || "--/--/----"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="vc-green">
                    <span>Hep B</span>{" "}
                    <span className="vacc-date">
                      {form.HepB || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-pink">
                    <span>Penta-1</span>{" "}
                    <span className="vacc-date">
                      {form.Penta1 || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-pink">
                    <span>Penta-2</span>{" "}
                    <span className="vacc-date">
                      {form.Penta2 || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-pink">
                    <span>Penta-3</span>{" "}
                    <span className="vacc-date">
                      {form.Penta3 || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-blue">
                    <span>JE-1</span>{" "}
                    <span className="vacc-date">
                      {form.JE1 || "--/--/----"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="vc-yellow">
                    <span>bOPV-0</span>{" "}
                    <span className="vacc-date">
                      {form.bOPV_birth || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-lightpink">
                    <span>RVV-1</span>{" "}
                    <span className="vacc-date">
                      {form.RVV1 || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-lightpink">
                    <span>RVV-2</span>{" "}
                    <span className="vacc-date">
                      {form.RVV2 || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-lightpink">
                    <span>RVV-3</span>{" "}
                    <span className="vacc-date">
                      {form.RVV3 || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-teal">
                    <span>Vit A-1</span>{" "}
                    <span className="vacc-date">
                      {form.VitA1 || "--/--/----"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td></td>
                  <td className="vc-gray">
                    <span>PCV-1</span>{" "}
                    <span className="vacc-date">
                      {form.PCV1 || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-gray"></td>
                  <td className="vc-gray">
                    <span>PCV-2</span>{" "}
                    <span className="vacc-date">
                      {form.PCV2 || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-lightyellow">
                    <span>PCV Booster</span>{" "}
                    <span className="vacc-date">
                      {form.PCVBooster || "--/--/----"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td></td>
                  <td className="vc-lightblue">
                    <span>fIPV-1</span>{" "}
                    <span className="vacc-date">
                      {form.fIPV1 || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-lightblue"></td>
                  <td className="vc-lightblue">
                    <span>fIPV-2</span>{" "}
                    <span className="vacc-date">
                      {form.fIPV2 || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-lightblue">
                    <span>fIPV-3</span>{" "}
                    <span className="vacc-date">
                      {form.fIPV3 || "--/--/----"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="bengali-vacc-table" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th style={{ background: "#6a3287" }}>16-24 Months</th>
                  <th style={{ background: "#6a3287" }}>5-6 Years</th>
                  <th style={{ background: "#6a3287" }}>10 Years</th>
                  <th style={{ background: "#6a3287" }}>15 Years</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="vc-green">
                    <span>DPT Booster-1</span>{" "}
                    <span className="vacc-date">
                      {form.DPT_booster || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-green">
                    <span>DPT Booster-2</span>{" "}
                    <span className="vacc-date">
                      {form.DPT_booster2 || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-orange">
                    <span>TD-10</span>{" "}
                    <span className="vacc-date">
                      {form.TD10 || "--/--/----"}
                    </span>
                  </td>
                  <td className="vc-orange">
                    <span>TD-15</span>{" "}
                    <span className="vacc-date">
                      {form.TD15 || "--/--/----"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="vc-orange">
                    <span>MR-2</span>{" "}
                    <span className="vacc-date">
                      {form.MR2 || "--/--/----"}
                    </span>
                  </td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td className="vc-blue">
                    <span>JE-2</span>{" "}
                    <span className="vacc-date">
                      {form.JE2 || "--/--/----"}
                    </span>
                  </td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td className="vc-yellow">
                    <span>bOPV Booster</span>{" "}
                    <span className="vacc-date">
                      {form.bOPV_booster || "--/--/----"}
                    </span>
                  </td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="modal-footer no-print">
            <button className="btn-cancel" onClick={() => setModal(null)}>
              Close
            </button>
            <button className="btn-print btn-amber" onClick={handlePrint}>
              Print Card
            </button>
            <button
              className="btn-save btn-save-amber"
              onClick={() => {
                /* Transition to Edit */ setModal("edit");
              }}
            >
              ✏ Edit Record
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
