/* eslint-disable no-unused-vars */
import { useState, useMemo } from "react";
import { db } from "../../services/db";
import Modal from "../../components/Modal";
import ConfirmModal from "../../components/ConfirmModal";
import LinkedRecordsPanel from "./LinkedRecordsPanel";
import { SearchToolbar, Pagination } from "../../components/common";

const EMPTY_HH = {
  id: "",
  headName: "",
  guardianName: "",
  contact: "",
  familyMembers: "",
  address: "",
  landmark: "",
  pregnantWomen: 0,
  childUnder1Month: 0,
  child1MonthTo1Year: 0,
  child1To2Years: 0,
  child2To5Years: 0,
  child6To18Years: 0,
  childMissedVaccine: 0,
};

export default function HouseholdsTab({ data, onRefresh, onToast }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_HH);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [page, setPage] = useState(1);
  const [linkedHH, setLinkedHH] = useState(null);
  const PAGE_SIZE = 20;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? data.filter(
          (h) =>
            String(h.id).includes(q) ||
            h.headName?.toLowerCase().includes(q) ||
            h.guardianName?.toLowerCase().includes(q) ||
            String(h.contact).includes(q),
        )
      : data;
  }, [data, search]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openAdd() {
    const nextId = data.length ? Math.max(...data.map((h) => h.id)) + 1 : 1;
    setForm({ ...EMPTY_HH, id: nextId });
    setModal("add");
  }
  function openEdit(h) {
    setForm({ ...h });
    setModal("edit");
  }
  function openView(h) {
    setForm({ ...h });
    setModal("view");
  }

  function handleSave() {
    if (!form.headName?.trim()) {
      onToast("Head of family name is required", "error");
      return;
    }
    if (!form.id) {
      onToast("House No. is required", "error");
      return;
    }

    const existingIds = data
      .filter((h) => h._internalId !== form._internalId)
      .map((h) => Number(h.id));

    // If adding a new house with an existing ID, we warn but allow (shifting happens in db.js)
    // Actually, shifting is automatic, so no need to block.

    // Save with ALL fields — auto-sync will recalculate children/pregnant from linked records
    // But if user manually entered counts (for houses with no linked records yet), we keep those
    db.saveHousehold({
      ...form,
      id: Number(form.id),
      familyMembers: Number(form.familyMembers) || 0,
      pregnantWomen: Number(form.pregnantWomen) || 0,
      childUnder1Month: Number(form.childUnder1Month) || 0,
      child1MonthTo1Year: Number(form.child1MonthTo1Year) || 0,
      child1To2Years: Number(form.child1To2Years) || 0,
      child2To5Years: Number(form.child2To5Years) || 0,
      child6To18Years: Number(form.child6To18Years) || 0,
      childMissedVaccine: Number(form.childMissedVaccine) || 0,
    });
    onRefresh();
    setModal(null);
    onToast(
      modal === "add"
        ? "Household saved! Add linked records via 🔗"
        : "Household updated!",
    );
  }

  function handleDelete(id) {
    setConfirmDelete(id);
  }

  function confirmDeleteAction() {
    if (!confirmDelete) return;
    db.deleteHousehold(confirmDelete);
    onRefresh();
    setConfirmDelete(null);
    onToast("Household deleted", "error");
  }

  // Field component
  function F(key, label, type = "text", readOnly = false) {
    const isReadOnly = readOnly || modal === "view";
    return (
      <div className="form-field">
        <label>{label}</label>
        <input
          type={type}
          value={form[key] ?? ""}
          readOnly={isReadOnly}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        />
      </div>
    );
  }

  // Number counter field with + / - buttons
  function CounterField(key, label, colorClass) {
    const val = Number(form[key]) || 0;
    const isView = modal === "view";
    return (
      <div className={`counter-field ${colorClass}`}>
        <div className="counter-label">{label}</div>
        <div className="counter-controls">
          {!isView && (
            <button
              className="counter-btn minus"
              onClick={() =>
                setForm((p) => ({ ...p, [key]: Math.max(0, val - 1) }))
              }
            >
              −
            </button>
          )}
          <span className="counter-val">{val}</span>
          {!isView && (
            <button
              className="counter-btn plus"
              onClick={() => setForm((p) => ({ ...p, [key]: val + 1 }))}
            >
              +
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <SearchToolbar
        search={search}
        onSearch={(val) => { setSearch(val); setPage(1); }}
        resultCount={filtered.length}
        placeholder="Search house no., name, contact…"
        addLabel="+ Add Household"
        onAdd={openAdd}
      />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="center">House #</th>
              <th>Head of Family</th>
              <th>Guardian Name</th>
              <th>Contact</th>
              <th className="center">Mbrs</th>
              <th className="center">Preg ⟳</th>
              <th className="center">&lt;1M ⟳</th>
              <th className="center">1M–1Y ⟳</th>
              <th className="center">1–2Y ⟳</th>
              <th className="center">2–5Y ⟳</th>
              <th className="center">6–18Y ⟳</th>
              <th className="center">Missed ⟳</th>
              <th className="center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((h) => (
              <tr key={h.id}>
                <td className="center">
                  <span className="house-no">{h.id}</span>
                </td>
                <td className="name-cell">{h.headName}</td>
                <td>{h.guardianName}</td>
                <td className="mono">{h.contact}</td>
                <td className="center">{h.familyMembers}</td>
                <td className="center">
                  {h.pregnantWomen > 0 ? (
                    <span
                      className="badge-pink"
                      onClick={() => setLinkedHH({ id: h.id, tab: "pregnant" })}
                      style={{ cursor: "pointer" }}
                    >
                      {h.pregnantWomen}
                    </span>
                  ) : (
                    <span className="dim">–</span>
                  )}
                </td>
                <td className="center">
                  {h.childUnder1Month > 0 ? (
                    <span className="badge-blue">{h.childUnder1Month}</span>
                  ) : (
                    <span className="dim">–</span>
                  )}
                </td>
                <td className="center">
                  {h.child1MonthTo1Year > 0 ? (
                    <span className="badge-blue">{h.child1MonthTo1Year}</span>
                  ) : (
                    <span className="dim">–</span>
                  )}
                </td>
                <td className="center">
                  {h.child1To2Years > 0 ? (
                    <span className="badge-teal">{h.child1To2Years}</span>
                  ) : (
                    <span className="dim">–</span>
                  )}
                </td>
                <td className="center">
                  {h.child2To5Years > 0 ? (
                    <span className="badge-purple">{h.child2To5Years}</span>
                  ) : (
                    <span className="dim">–</span>
                  )}
                </td>
                <td className="center">
                  {h.child6To18Years > 0 ? (
                    <span className="badge-purple">{h.child6To18Years}</span>
                  ) : (
                    <span className="dim">–</span>
                  )}
                </td>
                <td className="center">
                  {h.childMissedVaccine > 0 ? (
                    <span className="badge-red">{h.childMissedVaccine}</span>
                  ) : (
                    <span className="dim">–</span>
                  )}
                </td>
                <td className="center">
                  <div className="action-btns" style={{ justifyContent: "center" }}>
                    <button
                      className="btn-icon btn-view"
                      title="View Details"
                      onClick={() => openView(h)}
                    >
                      👁
                    </button>
                    <button
                      className="btn-icon btn-edit"
                      title="Edit Household"
                      onClick={() => openEdit(h)}
                    >
                      ✏
                    </button>
                    <button
                      className="btn-icon btn-link"
                      title="View Linked Records"
                      onClick={() => setLinkedHH({ id: h.id, tab: "pregnant" })}
                    >
                      🔗
                    </button>
                    <button
                      className="btn-icon btn-del"
                      title="Delete Household"
                      onClick={() => handleDelete(h.id)}
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination page={page} totalPages={pages} onPageChange={setPage} />

      {/* ── Modal ── */}
      {modal && (
        <Modal
          title={
            modal === "view"
              ? `House #${form.id} – Details`
              : modal === "add"
                ? "Add New Household"
                : `Edit House #${form.id}`
          }
          onClose={() => setModal(null)}
          wide
        >
          {/* Basic Info */}
          <div className="form-grid">
            {F("id", "House No.", "number")}
            {F("headName", "Head of Family")}
            {F("guardianName", "Guardian Name")}
            {F("contact", "Contact Number")}
            {F("familyMembers", "Total Family Members", "number")}
            {F("address", "Local Address")}
            {F("landmark", "Landmark (e.g. Near Pond)")}
          </div>

          {/* Counts — all directly editable */}
          <div className="form-section-title" style={{ marginTop: 18 }}>
            Household Health Summary
            <span className="section-hint-inline">
              {" "}
              — Enter counts directly, or use 🔗 to add individual records
              (auto-updates)
            </span>
          </div>

          <div className="counters-grid">
            {CounterField("pregnantWomen", "Pregnant Women", "counter-pink")}
            {CounterField(
              "childUnder1Month",
              "Child < 1 Month",
              "counter-blue",
            )}
            {CounterField(
              "child1MonthTo1Year",
              "Child 1M – 1Yr",
              "counter-teal",
            )}
            {CounterField("child1To2Years", "Child 1 – 2 Yr", "counter-blue2")}
            {CounterField("child2To5Years", "Child 2 – 5 Yr", "counter-purple")}
            {CounterField(
              "child6To18Years",
              "Child 6 – 18 Yr",
              "counter-purple",
            )}
            {CounterField(
              "childMissedVaccine",
              "Missed Vaccine",
              "counter-red",
            )}
          </div>

          {modal !== "view" && (
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSave}>
                ✓ {modal === "add" ? "Save Household" : "Save Changes"}
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* Linked Records Side Panel */}
      {linkedHH && (
        <LinkedRecordsPanel
          hhNo={linkedHH.id}
          defaultTab={linkedHH.tab}
          onClose={() => setLinkedHH(null)}
          onRefresh={onRefresh}
          onToast={onToast}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Confirm Household Deletion"
          message={`Are you sure you want to delete House #${confirmDelete} and ALL linked records? This action cannot be undone.`}
          onConfirm={confirmDeleteAction}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
