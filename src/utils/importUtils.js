import * as XLSX from "xlsx";
import { db } from "../services/db";

// Helper to normalize headers (fuzzy matching)
function getMapping(headers, map) {
  const result = {};
  headers.forEach((h, index) => {
    const cleanH = String(h).toLowerCase().trim();
    for (const [key, aliases] of Object.entries(map)) {
      if (aliases.some(alias => cleanH.includes(alias.toLowerCase()))) {
        result[key] = index;
        break;
      }
    }
  });
  return result;
}

const HH_MAP = {
  id: ["house no", "hh no", "house #", "hh #", "id"],
  headName: ["head of family", "head name", "name of head"],
  guardianName: ["guardian name", "guardian"],
  address: ["address"],
  landmark: ["landmark"],
  contact: ["contact", "mobile", "phone"],
  familyMembers: ["family members", "total members", "family"],
  pregnantWomen: ["pregnant women", "pregnant"],
  childUnder1Month: ["child <1 month", "child < 1 month", "u1m", "<1m"],
  child1MonthTo1Year: ["child 1m", "1m-1y", "1m to 1y"],
  child1To2Years: ["child 1-2", "1-2y", "1 to 2y"],
  child2To5Years: ["child 2-5", "2-5y", "2 to 5y"],
  child6To18Years: ["child 6-18", "6-18y", "6 to 18y"],
  childMissedVaccine: ["missed vaccine", "missed"],
};

const PW_MAP = {
  hhNo: ["hh no", "house no", "hh #", "house #"],
  name: ["name"],
  dob: ["dob", "date of birth"],
  husbandName: ["husband name", "husband"],
  mobile: ["mobile", "contact", "phone"],
  mcpCardUwn: ["mcp card", "uwn id", "mcp/uwn"],
  lmp: ["lmp"],
  td1: ["td-1", "td1"],
  td2: ["td-2", "td2"],
  tdBooster: ["td-booster", "td booster", "tdb"],
  anc1: ["1st anc", "anc1", "anc 1"],
  anc2: ["2nd anc", "anc2", "anc 2"],
  anc3: ["3rd anc", "anc3", "anc 3"],
  anc4: ["4th anc", "anc4", "anc 4"],
  tdDue: ["td due"],
  ancDue: ["anc due"],
};

const CH_MAP = {
  hhNo: ["hh no", "house no", "hh #", "house #"],
  name: ["name"],
  dob: ["dob", "date of birth"],
  gender: ["gender", "sex"],
  guardianName: ["guardian", "father", "mother"],
  mobile: ["mobile", "contact", "phone"],
  mcpCardUwn: ["mcp card", "uwn id", "mcp/uwn"],
  bOPV_birth: ["bopv(b)", "bopv birth", "bopv 0"],
  BCG: ["bcg"],
  HepB: ["hepb", "hep b"],
  bOPV1: ["bopv1", "bopv 1"],
  RVV1: ["rvv1", "rvv 1"],
  fIPV1: ["f-ipv 1", "fipv1", "fipv 1"],
  PCV1: ["pcv-1", "pcv1", "pcv 1"],
  Penta1: ["penta-1", "penta1", "penta 1"],
  bOPV2: ["bopv2", "bopv 2"],
  RVV2: ["rvv2", "rvv 2"],
  Penta2: ["penta-2", "penta2", "penta 2"],
  bOPV3: ["bopv3", "bopv 3"],
  RVV3: ["rvv3", "rvv 3"],
  fIPV2: ["f-ipv 2", "fipv2", "fipv 2"],
  PCV2: ["pcv-2", "pcv2", "pcv 2"],
  Penta3: ["penta-3", "penta3", "penta 3"],
  fIPV3: ["f-ipv 3", "fipv3", "fipv 3"],
  MR1: ["mr-1", "mr1", "mr 1"],
  PCVBooster: ["pcv-b", "pcv booster", "pcv bo"],
  JE1: ["je-1", "je1", "je 1"],
  VitA1: ["vita-1", "vita 1", "vita1"],
  bOPV_booster: ["bopv-b", "bopv booster", "bopv bo"],
  MR2: ["mr-2", "mr2", "mr 2"],
  DPT_booster: ["dpt-b", "dpt booster", "dpt bo"],
  JE2: ["je-2", "je2", "je 2"],
  VitA2: ["vita-2", "vita 2", "vita2"],
  fIPV_booster: ["f-ipv-b", "fipv booster", "fipv bo"],
};

function parseExcelDate(val) {
  if (!val) return "";
  if (typeof val === "number") {
    // Excel serial date
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().split("T")[0];
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  
  // Handle dd-mm-yyyy or dd/mm/yyyy
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const [_, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  return str; // Fallback to raw string
}

export async function importFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        
        const counts = { households: 0, pregnant: 0, children: 0 };
        
        // Load current data from Firestore
        let hhList = await db.getHouseholds();
        let pwList = await db.getPregnant();
        let chList = await db.getChildren();

        workbook.SheetNames.forEach((sheetName, index) => {
          const ws = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (rows.length < 2) return;

          // Find header row (usually first row containing data)
          let headerIdx = 0;
          while (headerIdx < rows.length && rows[headerIdx].length < 3) headerIdx++;
          if (headerIdx >= rows.length) return;

          const headers = rows[headerIdx];
          const dataRows = rows.slice(headerIdx + 1);

          const sn = sheetName.toLowerCase();
          
          // Identify Sheet Type
          let type = "";
          if (sn.includes("household") || sn.includes("main") || index === 0) type = "hh";
          else if (sn.includes("pregnant")) type = "pw";
          else if (sn.includes("child")) type = "ch";
          
          if (!type) {
             // Second attempt: check headers
             const hStr = headers.join(" ").toLowerCase();
             if (hStr.includes("pregnant")) type = "pw";
             else if (hStr.includes("vaccine") || hStr.includes("child")) type = "ch";
             else if (hStr.includes("house") || hStr.includes("head")) type = "hh";
          }

          if (type === "hh") {
            const map = getMapping(headers, HH_MAP);
            dataRows.forEach(row => {
              const id = row[map.id];
              if (!id) return;
              
              const item = {
                id: String(id),
                headName: row[map.headName] || "",
                guardianName: row[map.guardianName] || "",
                address: row[map.address] || "",
                landmark: row[map.landmark] || "",
                contact: String(row[map.contact] || ""),
                familyMembers: Number(row[map.familyMembers] || 0),
                pregnantWomen: Number(row[map.pregnantWomen] || 0),
                childUnder1Month: Number(row[map.childUnder1Month] || 0),
                child1MonthTo1Year: Number(row[map.child1MonthTo1Year] || 0),
                child1To2Years: Number(row[map.child1To2Years] || 0),
                child2To5Years: Number(row[map.child2To5Years] || 0),
                child6To18Years: Number(row[map.child6To18Years] || 0),
                childMissedVaccine: Number(row[map.childMissedVaccine] || 0),
                createdAt: new Date().toISOString(),
                _internalId: `imp-${id}-${Date.now()}-${Math.random()}`
              };

              const existingIdx = hhList.findIndex(h => String(h.id) === String(item.id));
              if (existingIdx >= 0) {
                hhList[existingIdx] = { ...hhList[existingIdx], ...item, _internalId: hhList[existingIdx]._internalId || item._internalId };
              } else {
                hhList.push(item);
                counts.households++;
              }
            });
          } else if (type === "pw") {
            const map = getMapping(headers, PW_MAP);
            dataRows.forEach(row => {
              const name = row[map.name];
              const hhNo = row[map.hhNo];
              if (!name || !hhNo) return;

              const item = {
                _id: Date.now() + Math.random(),
                hhNo: String(hhNo),
                name: String(name),
                dob: parseExcelDate(row[map.dob]),
                husbandName: row[map.husbandName] || "",
                mobile: String(row[map.mobile] || ""),
                mcpCardUwn: String(row[map.mcpCardUwn] || ""),
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
                createdAt: new Date().toISOString()
              };

              const existingIdx = pwList.findIndex(p => 
                String(p.hhNo) === String(item.hhNo) && 
                String(p.name).toLowerCase() === String(item.name).toLowerCase()
              );

              if (existingIdx >= 0) {
                pwList[existingIdx] = { ...pwList[existingIdx], ...item, _id: pwList[existingIdx]._id };
              } else {
                pwList.push(item);
                counts.pregnant++;
              }
            });
          } else if (type === "ch") {
            const map = getMapping(headers, CH_MAP);
            dataRows.forEach(row => {
              const name = row[map.name];
              const hhNo = row[map.hhNo];
              if (!name || !hhNo) return;

              const item = {
                _id: Date.now() + Math.random(),
                hhNo: String(hhNo),
                name: String(name),
                dob: parseExcelDate(row[map.dob]),
                gender: row[map.gender] || "M",
                guardianName: row[map.guardianName] || "",
                mobile: String(row[map.mobile] || ""),
                mcpCardUwn: String(row[map.mcpCardUwn] || ""),
                createdAt: new Date().toISOString()
              };

              // Add vaccination fields
              Object.keys(CH_MAP).forEach(key => {
                if (!["hhNo", "name", "dob", "gender", "guardianName", "mobile", "mcpCardUwn"].includes(key)) {
                  item[key] = parseExcelDate(row[map[key]]) || null;
                }
              });

              const existingIdx = chList.findIndex(c => 
                String(c.hhNo) === String(item.hhNo) && 
                String(c.name).toLowerCase() === String(item.name).toLowerCase() &&
                String(c.dob) === String(item.dob)
              );

              if (existingIdx >= 0) {
                chList[existingIdx] = { ...chList[existingIdx], ...item, _id: chList[existingIdx]._id };
              } else {
                chList.push(item);
                counts.children++;
              }
            });
          }
        });

        // Save back to Firestore
        await db.saveBulkData({
          households: hhList,
          pregnant: pwList,
          children: chList
        });
        
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
