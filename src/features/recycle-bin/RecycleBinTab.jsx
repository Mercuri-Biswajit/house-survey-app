/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useMemo, useEffect } from "react";
import { db } from "../../services/db";
import { StatCard, Badge } from "../../components/common";
import ConfirmModal from "../../components/common/ConfirmModal";
import { useToast } from "../../contexts/ToastContext";


export default function RecycleBinTab({ onRefresh }) {
  const { showToast } = useToast();

  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState(null); // { type, item, message }

  useEffect(() => {
    setData(db.getRecycleBin());
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? data.filter(
          (item) =>
            item.name?.toLowerCase().includes(q) ||
            item.guardianName?.toLowerCase().includes(q) ||
            String(item.hhNo).includes(q),
        )
      : data;
  }, [data, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort(
      (a, b) => new Date(b._deletedAt) - new Date(a._deletedAt),
    );
  }, [filtered]);

  function handleRestore(item) {
    setConfirmAction({
      type: "restore",
      item,
      message: `Restore ${item.name} to Household #${item.hhNo}?`,
    });
  }

  function handleDeletePermanent(item) {
    setConfirmAction({
      type: "permanent",
      item,
      message: `Permanently delete ${item.name}? This action cannot be undone.`,
    });
  }

  function handleEmptyBin() {
    setConfirmAction({
      type: "empty",
      item: null,
      message: "Are you sure you want to empty the Recycle Bin? All deleted records will be lost forever.",
    });
  }

  function executeConfirmedAction() {
    if (!confirmAction) return;

    const { type, item } = confirmAction;

    if (type === "restore") {
      db.restoreRecord(item);
      showToast(`${item.name} restored successfully!`);

    } else if (type === "permanent") {
      db.deletePermanently(item._id);
      showToast(`Record for ${item.name} erased permanently.`, "error");

    } else if (type === "empty") {
      data.forEach((i) => db.deletePermanently(i._id));
      showToast("Recycle Bin emptied.", "error");

    }

    const updated = db.getRecycleBin();
    setData(updated);
    onRefresh();
    setConfirmAction(null);
  }

  return (
    <div className="tab-content">
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search deleted records..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="result-count">{sorted.length} records</span>
        <button
          className="btn-add btn-red"
          onClick={handleEmptyBin}
          disabled={data.length === 0}
        >
          🗑 Empty Bin
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th className="center">House #</th>
              <th>Deleted On</th>
              <th className="center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="center"
                  style={{ padding: 40, color: "#94a89e" }}
                >
                  {search ? "No matching records found." : "Recycle Bin is empty."}
                </td>
              </tr>
            )}
            {sorted.map((item) => (
              <tr key={item._id}>
                <td>
                  <Badge variant={item._type === "pregnant" ? "teal" : "blue"}>
                    {item._type === "pregnant" ? "🤰 Pregnant" : "👶 Child"}
                  </Badge>
                </td>
                <td className="name-cell">
                  <strong>{item.name}</strong>
                  <div style={{ fontSize: "0.85em", color: "#64748b" }}>
                    Guardian: {item.guardianName || "—"}
                  </div>
                </td>
                <td className="center">
                  <span className="house-no">{item.hhNo || "—"}</span>
                </td>
                <td style={{ fontSize: "0.9em" }}>
                  {new Date(item._deletedAt).toLocaleString()}
                </td>
                <td className="center">
                  <div className="action-btns" style={{ justifyContent: "center" }}>
                    <button
                      className="btn-icon btn-view"
                      title="Restore"
                      onClick={() => handleRestore(item)}
                    >
                      ↺
                    </button>
                    <button
                      className="btn-icon btn-del"
                      title="Delete Permanently"
                      onClick={() => handleDeletePermanent(item)}
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

      {confirmAction && (
        <ConfirmModal
          title="Confirm Action"
          message={confirmAction.message}
          onConfirm={executeConfirmedAction}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
