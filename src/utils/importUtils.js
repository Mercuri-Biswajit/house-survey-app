import * as XLSX from "xlsx";
import { db } from "../services/db";

// ─── Safe string conversion ────────────────────────────────────────────────────
// Bug 4 fix: ArrayFormula objects from XLSX.js return as [object Object].
// Detect them and return "" so they are treated as blank.
function safeStr(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return ""; // catches ArrayFormula { t, r, ... }
  const s = String(val).trim();
  // Also discard bare formula strings that slipped through
  if (s.startsWith("=") || s.startsWith("{=")) return "";
  return s;
}

// ─── Header mapping helpers ────────────────────────────────────────────────────
function getMapping(headers, map) {
  const result = {};
  headers.forEach((h, index) => {
    const cleanH = safeStr(h).toLowerCase();
    for (const [key, aliases] of Object.entries(map)) {
      if (aliases.some((alias) => cleanH.includes(alias.toLowerCase()))) {
        if (!(key in result)) result[key] = index; // first match wins
        break;
      }
    }
  });
  return result;
}

const HH_MAP = {
  id: ["house no", "hh no", "house #", "hh #", "sl no", "sl.", "id"],
  headName: ["head of family", "head name", "name of head", "head"],
  guardianName: ["guardian name", "guardian", "father name", "father"],
  address: ["address"],
  landmark: ["landmark"],
  contact: ["contact", "mobile", "phone"],
  familyMembers: ["family members", "total members", "family", "members"],
  pregnantWomen: ["pregnant women", "pregnant"],
  childUnder1Month: ["<1 month", "< 1 month", "u1m", "<1m", "under 1 month"],
  child1MonthTo1Year: ["1m-1y", "1m to 1y", "1 month to 1", "1m–1y"],
  child1To2Years: ["1-2y", "1 to 2y", "1–2y", "1 - 2"],
  child2To5Years: ["2-5y", "2 to 5y", "2–5y", "2 - 5"],
  child6To18Years: ["6-18y", "6 to 18y", "6–18y", "6 - 18"],
  childMissedVaccine: ["missed vaccine", "missed vacc", "missed"],
};

const PW_MAP = {
  hhNo: ["hh no", "house no", "hh #", "house #", "sl no", "sl."],
  name: ["name of pregnant", "name", "mother name"],
  dob: ["date of birth", "dob"],
  husbandName: ["husband name", "husband", "father name"],
  mobile: ["mobile", "contact", "phone"],
  mcpCardUwn: ["mcp card", "uwn id", "mcp/uwn", "rch id"],
  lmp: ["lmp"],
  td1: ["td-1", "td1", "tt-1", "tt1"],
  td2: ["td-2", "td2", "tt-2", "tt2"],
  tdBooster: ["td-booster", "td booster", "tt booster"],
  anc1: ["1st anc", "anc1", "anc 1"],
  anc2: ["2nd anc", "anc2", "anc 2"],
  anc3: ["3rd anc", "anc3", "anc 3"],
  anc4: ["4th anc", "anc4", "anc 4"],
  tdDue: ["td due", "tt due"],
  ancDue: ["anc due"],
};

const CH_MAP = {
  hhNo: ["hh no", "house no", "hh #", "house #", "sl no", "sl."],
  name: ["name of child", "child name", "name", "sisu", "shishu", "child name", "name of the child"],
  dob: ["date of birth", "dob"],
  gender: ["gender", "sex"],
  guardianName: ["guardian", "father", "mother"],
  mobile: ["mobile", "contact", "phone"],
  mcpCardUwn: ["mcp card", "uwn id", "mcp/uwn", "rch id"],
  bOPV_birth: ["bopv(b)", "bopv birth", "bopv 0", "bopv-0", "opv 0", "opv-0"],
  BCG: ["bcg", "b.c.g", "b c g"],
  HepB: ["hepb", "hep b", "hepatitis b", "hep.b"],
  bOPV1: ["bopv1", "bopv 1", "bopv-1", "opv 1", "opv.1", "opv-1", "opv1"],
  RVV1: ["rvv1", "rvv 1", "rvv-1", "rota 1", "rotavirus 1"],
  fIPV1: ["f-ipv 1", "fipv1", "fipv 1", "ipv 1", "ipv-1", "ipv.1"],
  PCV1: ["pcv-1", "pcv1", "pcv 1", "pcv.1"],
  Penta1: ["penta-1", "penta1", "penta 1", "penta.1"],
  bOPV2: ["bopv2", "bopv 2", "bopv-2", "opv 2", "opv.2", "opv-2", "opv2"],
  RVV2: ["rvv2", "rvv 2", "rvv-2", "rota 2", "rotavirus 2"],
  Penta2: ["penta-2", "penta2", "penta 2", "penta.2"],
  bOPV3: ["bopv3", "bopv 3", "bopv-3", "opv 3", "opv.3", "opv-3", "opv3"],
  RVV3: ["rvv3", "rvv 3", "rvv-3", "rota 3", "rotavirus 3"],
  fIPV2: ["f-ipv 2", "fipv2", "fipv 2", "ipv 2", "ipv-2", "ipv.2"],
  PCV2: ["pcv-2", "pcv2", "pcv 2", "pcv.2"],
  Penta3: ["penta-3", "penta3", "penta 3", "penta.3"],
  fIPV3: ["f-ipv 3", "fipv3", "fipv 3", "ipv 3", "ipv-3", "ipv.3"],
  MR1: ["mr-1", "mr1", "mr 1", "measles 1", "measles-rubella 1"],
  PCVBooster: ["pcv-b", "pcv booster", "pcvb", "pcv.b"],
  JE1: ["je-1", "je1", "je 1", "j.e. 1"],
  VitA1: ["vita-1", "vita 1", "vita1", "vit a-1", "vitamin a 1"],
  bOPV_booster: ["bopv-b", "bopv booster", "bopvb", "opv-b", "opv booster"],
  MR2: ["mr-2", "mr2", "mr 2", "measles 2"],
  DPT_booster: ["dpt-b", "dpt booster", "dptb", "dpt-1", "dpt1"],
  JE2: ["je-2", "je2", "je 2", "j.e. 2"],
  VitA2: ["vita-2", "vita 2", "vita2", "vit a-2", "vitamin a 2"],
  fIPV_booster: ["f-ipv-b", "fipv booster", "fipvb", "ipv booster", "ipv-b"],
};

// ─── Date parser ───────────────────────────────────────────────────────────────
function parseExcelDate(val) {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "object") return null; // ArrayFormula guard

  // Numeric serial date (Excel stores dates as days since 1900-01-00)
  if (typeof val === "number") {
    if (val < 1) return null; // 0 or negative = empty
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0];
  }

  const s = String(val).trim();
  if (!s || s.startsWith("=") || s.startsWith("{=")) return null;

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // dd-mm-yyyy or dd/mm/yyyy
  const dmy = s.match(/^(\d{1,2})[/\-.\\](\d{1,2})[/\-.\\](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // mm/dd/yyyy (US format fallback)
  const mdy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    // Heuristic: if month-candidate > 12, it's actually d/m/y
    const mi = Number(m),
      di = Number(d);
    if (mi > 12 && di <= 12) {
      return `${y}-${d.padStart(2, "0")}-${m.padStart(2, "0")}`;
    }
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Try native Date parse as last resort
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];

  return null;
}

// ─── Detect header row ─────────────────────────────────────────────────────────
// Bug 2 fix: scan all rows to find the one that best matches known headers
// instead of assuming the header is in the first few rows.
function findHeaderRow(rows, map) {
  const allAliases = Object.values(map)
    .flat()
    .map((a) => a.toLowerCase());

  let bestIdx = 0;
  let bestScore = -1;

  rows.forEach((row, i) => {
    if (!Array.isArray(row) || row.length < 2) return;
    const score = row.reduce((s, cell) => {
      const c = safeStr(cell).toLowerCase();
      return s + (allAliases.some((a) => c.includes(a)) ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  });

  return bestIdx;
}

// ─── Detect sheet type ─────────────────────────────────────────────────────────
// Bug 3 fix: add "pregant" (typo), "preg", "mother" as valid matches
function detectSheetType(sheetName, headers) {
  const sn = sheetName.toLowerCase().replace(/[^a-z]/g, ""); // strip non-alpha
  if (
    sn.includes("household") ||
    sn.includes("main") ||
    sn.includes("sc3") ||
    sn.includes("register") ||
    sn.includes("family")
  )
    return "hh";

  if (
    sn.includes("pregnant") ||
    sn.includes("pregant") ||
    sn.includes("preg") ||
    sn.includes("pw") ||
    sn.includes("mother") ||
    sn.includes("maternity")
  )
    return "pw";

  if (
    sn.includes("child") ||
    sn.includes("children") ||
    sn.includes("sisu") ||
    sn.includes("shishu") ||
    sn.includes("vacc") ||
    sn.includes("immun") ||
    sn.includes("immn") ||
    sn.includes("agegroup")
  )
    return "ch";

  // Fallback: check header content (strip punctuation for match)
  const hStr = headers
    .map((h) => safeStr(h).toLowerCase().replace(/[^a-z0-9]/g, ""))
    .join(" ");

  if (hStr.includes("lmp") || hStr.includes("anc") || hStr.includes("husband"))
    return "pw";
  if (
    hStr.includes("bcg") ||
    hStr.includes("penta") ||
    hStr.includes("bopv") ||
    hStr.includes("vaccine") ||
    hStr.includes("rota") ||
    hStr.includes("measles")
  )
    return "ch";
  if (
    hStr.includes("headoffamily") ||
    hStr.includes("headname") ||
    hStr.includes("pregnantwomen") ||
    hStr.includes("guardian")
  )
    return "hh";

  return null;
}

// ─── EXCEL IMPORT ──────────────────────────────────────────────────────────────
export async function importFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {
          type: "array",
          cellFormula: false, // prevent formula objects — forces cached value
          cellDates: false, // keep dates as serial numbers for our parser
        });

        const counts = { households: 0, pregnant: 0, children: 0, householdsUpdated: 0, pregnantUpdated: 0, childrenUpdated: 0 };

        // Load existing Firestore data first
        let hhList = await db.getHouseholds();
        let pwList = await db.getPregnant();
        let chList = await db.getChildren();

        workbook.SheetNames.forEach((sheetName, sheetIndex) => {
          const ws = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          if (rows.length < 2) return;

          // Bug 2 fix: for HH sheet (typically first sheet), scan for header
          // For other sheets, also scan
          const isFirstSheet = sheetIndex === 0;

          // Quick type guess from sheet name before we find headers
          const quickType = detectSheetType(sheetName, []);

          // Choose which map to use for header detection
          const mapForDetection =
            quickType === "pw" ? PW_MAP : quickType === "ch" ? CH_MAP : HH_MAP;
          const hdrIdx = findHeaderRow(rows, mapForDetection);
          const headers = rows[hdrIdx];
          const dataRows = rows.slice(hdrIdx + 1);

          // Final type detection with real headers
          const type =
            detectSheetType(sheetName, headers) || (isFirstSheet ? "hh" : null);
          if (!type) return;

          if (type === "hh") {
            const map = getMapping(headers, HH_MAP);
            let rowNumber = hdrIdx + 2; // 1-indexed position in sheet for Bug 1

            dataRows.forEach((row) => {
              rowNumber++;
              const rawId = row[map.id];
              const rawHead = safeStr(row[map.headName]);
              if (!rawHead) return; // skip empty rows

              // Bug 1 fix: if the ID cell contains a formula string or is blank,
              // derive the logical row number from the sheet position.
              // The first data row after the header is house #1, etc.
              let id;
              const idStr = safeStr(rawId);
              if (!idStr || idStr.startsWith("=") || idStr.startsWith("{")) {
                // Derive from position: dataRow index (0-based) + 1
                id = dataRows.indexOf(row) + 1;
              } else {
                const parsed = parseInt(idStr, 10);
                id = isNaN(parsed) ? dataRows.indexOf(row) + 1 : parsed;
              }

              const item = {
                id: String(id),
                headName: rawHead,
                guardianName: safeStr(row[map.guardianName]),
                address: safeStr(row[map.address]),
                landmark: safeStr(row[map.landmark]),
                contact: safeStr(row[map.contact]),
                familyMembers: Number(safeStr(row[map.familyMembers])) || 0,
                pregnantWomen: Number(safeStr(row[map.pregnantWomen])) || 0,
                childUnder1Month:
                  Number(safeStr(row[map.childUnder1Month])) || 0,
                child1MonthTo1Year:
                  Number(safeStr(row[map.child1MonthTo1Year])) || 0,
                child1To2Years: Number(safeStr(row[map.child1To2Years])) || 0,
                child2To5Years: Number(safeStr(row[map.child2To5Years])) || 0,
                child6To18Years: Number(safeStr(row[map.child6To18Years])) || 0,
                childMissedVaccine:
                  Number(safeStr(row[map.childMissedVaccine])) || 0,
                createdAt: new Date().toISOString(),
                _internalId: `imp-${id}-${Date.now()}-${Math.random()}`,
              };

              const existingIdx = hhList.findIndex(
                (h) => String(h.id) === String(item.id),
              );
              if (existingIdx >= 0) {
                hhList[existingIdx] = {
                  ...hhList[existingIdx],
                  ...item,
                  _internalId:
                    hhList[existingIdx]._internalId || item._internalId,
                };
                counts.householdsUpdated++;
              } else {
                hhList.push(item);
                counts.households++;
              }
            });
          } else if (type === "pw") {
            const map = getMapping(headers, PW_MAP);

            // Bug 5 carry-forward: track last valid hhNo & mobile
            let lastHhNo = "";
            let lastMobile = "";

            dataRows.forEach((row) => {
              // Bug 4+5: use safeStr; carry forward hhNo if blank
              const rawHhNo = safeStr(row[map.hhNo]);
              const rawMobile = safeStr(row[map.mobile]);

              if (rawHhNo) lastHhNo = rawHhNo;
              if (rawMobile) lastMobile = rawMobile;

              const hhNo = lastHhNo;
              const mobile = lastMobile;

              const name = safeStr(row[map.name]);
              if (!name || !hhNo) return;

              const item = {
                _id: String(Date.now() + Math.random()),
                hhNo: String(hhNo),
                name,
                dob: parseExcelDate(row[map.dob]),
                husbandName: safeStr(row[map.husbandName]),
                mobile,
                mcpCardUwn: safeStr(row[map.mcpCardUwn]),
                lmp: parseExcelDate(row[map.lmp]),
                td1: parseExcelDate(row[map.td1]),
                td2: parseExcelDate(row[map.td2]),
                tdBooster: parseExcelDate(row[map.tdBooster]),
                anc1: parseExcelDate(row[map.anc1]),
                anc2: parseExcelDate(row[map.anc2]),
                anc3: parseExcelDate(row[map.anc3]),
                anc4: parseExcelDate(row[map.anc4]),
                tdDue: parseExcelDate(row[map.tdDue]),
                ancDue: parseExcelDate(row[map.ancDue]),
                createdAt: new Date().toISOString(),
              };

              const existingIdx = pwList.findIndex(
                (p) =>
                  String(p.hhNo) === String(item.hhNo) &&
                  String(p.name).toLowerCase() ===
                    String(item.name).toLowerCase(),
              );
              if (existingIdx >= 0) {
                pwList[existingIdx] = {
                  ...pwList[existingIdx],
                  ...item,
                  _id: pwList[existingIdx]._id,
                };
                counts.pregnantUpdated++;
              } else {
                pwList.push(item);
                counts.pregnant++;
              }
            });
          } else if (type === "ch") {
            const map = getMapping(headers, CH_MAP);

            // Bug 5 carry-forward: track last valid hhNo & mobile per household block
            let lastHhNo = "";
            let lastMobile = "";

            dataRows.forEach((row) => {
              // Bug 4+5: use safeStr; carry forward hhNo if blank
              const rawHhNo = safeStr(row[map.hhNo]);
              const rawMobile = safeStr(row[map.mobile]);

              if (rawHhNo) lastHhNo = rawHhNo;
              if (rawMobile) lastMobile = rawMobile;

              const hhNo = lastHhNo;
              const mobile = lastMobile;

              const name = safeStr(row[map.name]);
              if (!name || !hhNo) return;

              const item = {
                _id: String(Date.now() + Math.random()),
                hhNo: String(hhNo),
                name,
                dob: parseExcelDate(row[map.dob]),
                gender: safeStr(row[map.gender]) || "M",
                guardianName: safeStr(row[map.guardianName]),
                mobile,
                mcpCardUwn: safeStr(row[map.mcpCardUwn]),
                createdAt: new Date().toISOString(),
              };

              // Vaccination date fields
              const vaccKeys = Object.keys(CH_MAP).filter(
                (k) =>
                  ![
                    "hhNo",
                    "name",
                    "dob",
                    "gender",
                    "guardianName",
                    "mobile",
                    "mcpCardUwn",
                  ].includes(k),
              );
              vaccKeys.forEach((key) => {
                item[key] = parseExcelDate(row[map[key]]) || null;
              });

              const existingIdx = chList.findIndex(
                (c) =>
                  String(c.hhNo) === String(item.hhNo) &&
                  String(c.name).toLowerCase() ===
                    String(item.name).toLowerCase() &&
                  String(c.dob) === String(item.dob),
              );
              if (existingIdx >= 0) {
                chList[existingIdx] = {
                  ...chList[existingIdx],
                  ...item,
                  _id: chList[existingIdx]._id,
                };
                counts.childrenUpdated++;
              } else {
                chList.push(item);
                counts.children++;
              }
            });
          }
        });

        // Bug 6 fix: wrap the bulk save in try/catch and surface errors
        try {
          await db.saveBulkData({
            households: hhList,
            pregnant: pwList,
            children: chList,
          });
        } catch (saveErr) {
          console.error("Firestore save error during import:", saveErr);
          throw new Error(
            saveErr.code === "permission-denied"
              ? "Permission denied — check your Firestore security rules for users/{uid}/..."
              : `Failed to save imported data: ${saveErr.message}`,
          );
        }

        resolve(counts);
      } catch (err) {
        console.error("Import error:", err);
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ─── JSON IMPORT ───────────────────────────────────────────────────────────────
export async function importFromJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        const counts = { households: 0, pregnant: 0, children: 0 };

        let hhList = await db.getHouseholds();
        let pwList = await db.getPregnant();
        let chList = await db.getChildren();

        const households = json.households || (Array.isArray(json) ? json : []);
        const pregnant = json.pregnant || [];
        const children = json.children || [];

        if (Array.isArray(households)) {
          households.forEach((item) => {
            if (!item.id) return;
            const existingIdx = hhList.findIndex(
              (h) => String(h.id) === String(item.id),
            );
            if (existingIdx >= 0) {
              hhList[existingIdx] = {
                ...hhList[existingIdx],
                ...item,
                _internalId:
                  hhList[existingIdx]._internalId || item._internalId,
              };
            } else {
              if (!item._internalId)
                item._internalId = `imp-json-${item.id}-${Date.now()}`;
              hhList.push(item);
              counts.households++;
            }
          });
        }

        if (Array.isArray(pregnant)) {
          pregnant.forEach((item) => {
            if (!item.name || !item.hhNo) return;
            const existingIdx = pwList.findIndex(
              (p) =>
                String(p.hhNo) === String(item.hhNo) &&
                String(p.name).toLowerCase() ===
                  String(item.name).toLowerCase(),
            );
            if (existingIdx >= 0) {
              pwList[existingIdx] = {
                ...pwList[existingIdx],
                ...item,
                _id: pwList[existingIdx]._id,
              };
            } else {
              if (!item._id)
                item._id = `imp-json-${Date.now()}-${Math.random()}`;
              pwList.push(item);
              counts.pregnant++;
            }
          });
        }

        if (Array.isArray(children)) {
          children.forEach((item) => {
            if (!item.name || !item.hhNo) return;
            const existingIdx = chList.findIndex(
              (c) =>
                String(c.hhNo) === String(item.hhNo) &&
                String(c.name).toLowerCase() ===
                  String(item.name).toLowerCase() &&
                String(c.dob) === String(item.dob),
            );
            if (existingIdx >= 0) {
              chList[existingIdx] = {
                ...chList[existingIdx],
                ...item,
                _id: chList[existingIdx]._id,
              };
            } else {
              if (!item._id)
                item._id = `imp-json-${Date.now()}-${Math.random()}`;
              chList.push(item);
              counts.children++;
            }
          });
        }

        // Bug 6 fix: surface Firestore errors
        try {
          await db.saveBulkData({
            households: hhList,
            pregnant: pwList,
            children: chList,
          });
        } catch (saveErr) {
          console.error("Firestore save error during JSON import:", saveErr);
          throw new Error(
            saveErr.code === "permission-denied"
              ? "Permission denied — check your Firestore security rules for users/{uid}/..."
              : `Failed to save imported data: ${saveErr.message}`,
          );
        }

        resolve({
          ...counts,
          area: json.area,
          asha: json.asha
        });
      } catch (err) {
        console.error("JSON Import error:", err);
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
