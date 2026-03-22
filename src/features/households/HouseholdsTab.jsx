import { useState, useMemo } from "react";
import { db } from "../../services/db";
import Modal from "../../components/common/Modal";
import ConfirmModal from "../../components/common/ConfirmModal";
import LinkedRecordsPanel from "./LinkedRecordsPanel";
import { SearchToolbar, Pagination, Badge, CounterField } from "../../components/common";
import { useToast } from "../../contexts/ToastContext";

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

export default function HouseholdsTab({ data, onRefresh }) {
  const { showToast } = useToast();
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

  async function handleSave() {
    if (!form.headName?.trim()) {
      showToast("Head of family name is required", "error");
      return;
    }
    if (!form.id) {
      showToast("House No. is required", "error");
      return;
    }

    await db.saveHousehold({
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
    await onRefresh();
    setModal(null);
    showToast(
      modal === "add"
        ? "Household saved! Add linked records via 🔗"
        : "Household updated!",
    );
  }

  function handleDelete(id) {
    setConfirmDelete(id);
  }

  async function confirmDeleteAction() {
    if (!confirmDelete) return;
    await db.deleteHousehold(confirmDelete);
    await onRefresh();
    setConfirmDelete(null);
    showToast("Household deleted", "error");
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
                    <Badge 
                      variant="pink" 
                      onClick={() => setLinkedHH({ id: h.id, tab: "pregnant" })}
                    >
                      {h.pregnantWomen}
                    </Badge>
                  ) : (
                    <span className="dim">–</span>
                  )}
                </td>
                <td className="center">
                  {h.childUnder1Month > 0 ? (
                    <Badge variant="blue">{h.childUnder1Month}</Badge>
                  ) : (
                    <span className="dim">–</span>
                  )}
                </td>
                <td className="center">
                  {h.child1MonthTo1Year > 0 ? (
                    <Badge variant="blue">{h.child1MonthTo1Year}</Badge>
                  ) : (
                    <span className="dim">–</span>
                  )}
                </td>
                <td className="center">
                  {h.child1To2Years > 0 ? (
                    <Badge variant="teal">{h.child1To2Years}</Badge>
                  ) : (
                    <span className="dim">–</span>
                  )}
                </td>
                <td className="center">
                  {h.child2To5Years > 0 ? (
                    <Badge variant="purple">{h.child2To5Years}</Badge>
                  ) : (
                    <span className="dim">–</span>
                  )}
                </td>
                <td className="center">
                  {h.child6To18Years > 0 ? (
                    <Badge variant="purple">{h.child6To18Years}</Badge>
                  ) : (
                    <span className="dim">–</span>
                  )}
                </td>
                <td className="center">
                  {h.childMissedVaccine > 0 ? (
                    <Badge variant="red">{h.childMissedVaccine}</Badge>
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

      <Pagination page={page} totalPages={pages} onPageChange={setPage} />

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
          <div className="form-grid">
            {F("id", "House No.", "number")}
            {F("headName", "Head of Family")}
            {F("guardianName", "Guardian Name")}
            {F("contact", "Contact Number")}
            {F("familyMembers", "Total Family Members", "number")}
            {F("address", "Local Address")}
            {F("landmark", "Landmark (e.g. Near Pond)")}
          </div>

          <div className="form-section-title" style={{ marginTop: 18 }}>
            Household Health Summary
            <span className="section-hint-inline">
              {" "}
              — Enter counts directly, or use 🔗 to add individual records
              (auto-updates)
            </span>
          </div>

          <div className="counters-grid">
            <CounterField
              label="Pregnant Women"
              value={form.pregnantWomen}
              onChange={(v) => setForm((p) => ({ ...p, pregnantWomen: v }))}
              colorClass="counter-pink"
              readOnly={modal === "view"}
            />
            <CounterField
              label="Child < 1 Month"
              value={form.childUnder1Month}
              onChange={(v) => setForm((p) => ({ ...p, childUnder1Month: v }))}
              colorClass="counter-blue"
              readOnly={modal === "view"}
            />
            <CounterField
              label="Child 1M – 1Yr"
              value={form.child1MonthTo1Year}
              onChange={(v) => setForm((p) => ({ ...p, child1MonthTo1Year: v }))}
              colorClass="counter-teal"
              readOnly={modal === "view"}
            />
            <CounterField
              label="Child 1 – 2 Yr"
              value={form.child1To2Years}
              onChange={(v) => setForm((p) => ({ ...p, child1To2Years: v }))}
              colorClass="counter-blue2"
              readOnly={modal === "view"}
            />
            <CounterField
              label="Child 2 – 5 Yr"
              value={form.child2To5Years}
              onChange={(v) => setForm((p) => ({ ...p, child2To5Years: v }))}
              colorClass="counter-purple"
              readOnly={modal === "view"}
            />
            <CounterField
              label="Child 6 – 18 Yr"
              value={form.child6To18Years}
              onChange={(v) => setForm((p) => ({ ...p, child6To18Years: v }))}
              colorClass="counter-purple"
              readOnly={modal === "view"}
            />
            <CounterField
              label="Missed Vaccine"
              value={form.childMissedVaccine}
              onChange={(v) => setForm((p) => ({ ...p, childMissedVaccine: v }))}
              colorClass="counter-red"
              readOnly={modal === "view"}
            />
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

      {linkedHH && (
        <LinkedRecordsPanel
          hhNo={linkedHH.id}
          defaultTab={linkedHH.tab}
          onClose={() => setLinkedHH(null)}
          onRefresh={onRefresh}
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
