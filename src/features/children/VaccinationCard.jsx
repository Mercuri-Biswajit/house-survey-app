import React, { useRef } from "react";
import { db } from "../../services/db";

const VACC_GROUPS = [
  {
    label: "At Birth",
    fields: [
      ["bOPV_birth", "bOPV (Birth)"],
      ["BCG", "BCG"],
      ["HepB", "HepB (Birth)"],
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
  {
    label: "2–5 Years",
    fields: [
      ["VitA3", "Vit A-3"],
      ["VitA4", "Vit A-4"],
      ["VitA5", "Vit A-5"],
    ],
  },
];

export default function VaccinationCard({ child, household, onClose }) {
  if (!child) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="vacc-card-overlay">
      <div className="vacc-card-container">
        <div className="vacc-card-actions no-print">
          <button className="btn-print" onClick={handlePrint}>
            Print Card
          </button>
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="vacc-card-content printable-area">
          <div className="vacc-card-header">
            <div className="govt-text">Government of West Bengal</div>
            <div className="form-id">Form SC-4B</div>
            <h2>Immunization & Health Card</h2>
          </div>

          <div className="vacc-card-section">
            <div className="section-title">Child Identification</div>
            <div className="info-grid">
              <div className="info-item">
                <span>Name of Child:</span> <strong>{child.name}</strong>
              </div>
              <div className="info-item">
                <span>Sex:</span>{" "}
                <strong>{child.gender === "M" ? "Male" : "Female"}</strong>
              </div>
              <div className="info-item">
                <span>Date of Birth:</span> <strong>{child.dob}</strong>
              </div>
              <div className="info-item">
                <span>House No:</span> <strong>{child.hhNo}</strong>
              </div>
              <div className="info-item">
                <span>Guardian:</span> <strong>{child.guardianName}</strong>
              </div>
              <div className="info-item">
                <span>Mobile:</span> <strong>{child.mobile}</strong>
              </div>
              <div className="info-item">
                <span>MCP Card / UWN:</span> <strong>{child.mcpCardUwn}</strong>
              </div>
              <div className="info-item">
                <span>Address:</span>{" "}
                <strong>{household?.address || "—"}</strong>
              </div>
              <div className="info-item">
                <span>Landmark:</span>{" "}
                <strong>{household?.landmark || "—"}</strong>
              </div>
            </div>
          </div>

          <div className="vacc-card-section">
            <div className="section-title">Immunization Schedule</div>
            <table className="vacc-schedule-table">
              <thead>
                <tr>
                  <th>Age / Group</th>
                  <th>Vaccine</th>
                  <th>Date Given</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {VACC_GROUPS.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    {group.fields.map(([key, label], fIdx) => (
                      <tr key={key}>
                        {fIdx === 0 && (
                          <td
                            rowSpan={group.fields.length}
                            className="group-cell"
                          >
                            {group.label}
                          </td>
                        )}
                        <td>{label}</td>
                        <td className="center mono">{child[key] || "—"}</td>
                        <td className="center">
                          {child[key] ? (
                            <span className="text-success">✓ Done</span>
                          ) : (
                            <span className="text-dim">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="vacc-card-footer">
            <div className="signature-box">
              <div className="sig-line"></div>
              <div>Signature of ANM/Health Worker</div>
            </div>
            <div className="date-stamp">
              <div>Generated Date:</div>
              <strong>{new Date().toLocaleDateString()}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
