import householdsData from "../data/households.json";
import pregnantData from "../data/pregnant.json";
import childrenData from "../data/children.json";

const KEYS = {
  households: "hs_households",
  pregnant: "hs_pregnant",
  children: "hs_children",
  recycleBin: "hs_recycle_bin",
};

export function getAgeGroupFromDOB(dob) {
  if (!dob) return null;
  const now = new Date();
  const birth = new Date(dob);
  const days = Math.floor((now - birth) / 86400000);
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    now.getMonth() -
    birth.getMonth();
  if (days < 30) return "under1Month";
  if (months < 12) return "1monthTo1year";
  if (months < 24) return "1to2years";
  if (months < 60) return "2to5years";
  if (months < 228) return "6to18years";
  return "above18years";
}

export function calcAgeYears(dob) {
  if (!dob) return "—";
  return (
    Math.floor((new Date() - new Date(dob)) / (365.25 * 86400000)) + " yrs"
  );
}

export function calcAgeFull(dob) {
  if (!dob) return "—";
  const months = Math.floor(
    (new Date() - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.44),
  );
  return months < 12
    ? `${months}m`
    : `${Math.floor(months / 12)}y ${months % 12}m`;
}

function get(key) {
  return JSON.parse(localStorage.getItem(key) || "[]");
}
function set(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Recompute summary for ONE household from linked records.
// If linked records exist for that house, those counts WIN (override manual).
// If no linked records at all, keep whatever was manually entered.
function computeSummary(hhNo, pregnant, children) {
  const hhPregnant = pregnant.filter((p) => Number(p.hhNo) === Number(hhNo));
  const hhChildren = children.filter((c) => Number(c.hhNo) === Number(hhNo));

  // Only override if there are actual linked records
  const hasLinked = hhPregnant.length > 0 || hhChildren.length > 0;
  if (!hasLinked) return null; // null = keep manual values

  return {
    pregnantWomen: hhPregnant.length,
    childUnder1Month: hhChildren.filter(
      (c) => getAgeGroupFromDOB(c.dob) === "under1Month",
    ).length,
    child1MonthTo1Year: hhChildren.filter(
      (c) => getAgeGroupFromDOB(c.dob) === "1monthTo1year",
    ).length,
    child1To2Years: hhChildren.filter(
      (c) => getAgeGroupFromDOB(c.dob) === "1to2years",
    ).length,
    child2To5Years: hhChildren.filter(
      (c) => getAgeGroupFromDOB(c.dob) === "2to5years",
    ).length,
    child6To18Years: hhChildren.filter(
      (c) => getAgeGroupFromDOB(c.dob) === "6to18years",
    ).length,
    childMissedVaccine: hhChildren.filter((c) => c.missedVaccine).length,
  };
}

function syncAllHouseholds() {
  const households = get(KEYS.households);
  const pregnant = get(KEYS.pregnant);
  const children = get(KEYS.children);
  const updated = households.map((h) => {
    const summary = computeSummary(h.id, pregnant, children);
    return summary ? { ...h, ...summary } : h; // only override if linked records exist
  });
  set(KEYS.households, updated);
}

// ── Auto-migrate pregnant → children when EDD has passed ─────────────────────
function calcEDDFromLMP(lmp) {
  if (!lmp) return null;
  const d = new Date(lmp);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 280);
  return d;
}

function migrateDeliveredPregnant() {
  const pregnant = get(KEYS.pregnant);
  const children = get(KEYS.children);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toMigrate = [];
  const remaining = [];

  pregnant.forEach((p) => {
    const edd = calcEDDFromLMP(p.lmp);
    if (edd && edd <= today) {
      toMigrate.push(p);
    } else {
      remaining.push(p);
    }
  });

  if (toMigrate.length === 0) return; // nothing to migrate

  // Create child records from delivered pregnant women, sorted by hhNo
  toMigrate
    .sort((a, b) => Number(a.hhNo) - Number(b.hhNo))
    .forEach((p) => {
      const edd = calcEDDFromLMP(p.lmp);
      const newChild = {
        _id: Date.now() + Math.random(),
        hhNo: p.hhNo,
        name: `Baby of ${p.name}`,
        dob: edd ? edd.toISOString().split("T")[0] : "",
        gender: "M",
        guardianName: p.name,
        mobile: p.mobile || "",
        mcpCard: p.mcpCard || p.mcpCardUwn || "",
        // All vaccinations start as null
        bOPV_birth: null,
        BCG: null,
        HepB: null,
        bOPV1: null,
        RVV1: null,
        fIPV1: null,
        PCV1: null,
        Penta1: null,
        bOPV2: null,
        RVV2: null,
        Penta2: null,
        bOPV3: null,
        RVV3: null,
        fIPV2: null,
        PCV2: null,
        Penta3: null,
        fIPV3: null,
        MR1: null,
        PCVBooster: null,
        JE1: null,
        VitA1: null,
        bOPV_booster: null,
        MR2: null,
        DPT_booster: null,
        JE2: null,
        VitA2: null,
      };
      children.push(newChild);
    });

  set(KEYS.pregnant, remaining);
  set(KEYS.children, children);
  syncAllHouseholds();
}

function init() {
  if (!localStorage.getItem(KEYS.households)) {
    const children = childrenData.map((c, i) => ({ ...c, _id: i + 1 }));
    const pregnant = pregnantData.map((p, i) => ({ ...p, _id: i + 1 }));
    // For seed data: compute summaries where linked records exist, keep original otherwise
    const households = householdsData.map((h, i) => {
      // Ensure seed households have internal ID and address/landmark if missing
      const base = {
        _internalId: `seed-${i + 1}-${Date.now()}`,
        address: "",
        landmark: "",
        ...h,
      };
      const summary = computeSummary(h.id, pregnant, children);
      return summary ? { ...base, ...summary } : base;
    });
    set(KEYS.households, households);
    set(KEYS.pregnant, pregnant);
    set(KEYS.children, children);
  }
}

export const db = {
  init,
  getAgeGroup: getAgeGroupFromDOB,
  migrateDeliveredPregnant,

  // ── Households ──────────────────────────────────────────────────────────────
  getHouseholds: () => {
    let all = get(KEYS.households);
    let changed = false;
    all = all.map((h) => {
      if (!h._internalId) {
        h._internalId = `b-${h.id}-${Date.now()}-${Math.random()}`;
        changed = true;
      }
      return h;
    });
    if (changed) set(KEYS.households, all);
    return all.sort((a, b) => Number(a.id) - Number(b.id));
  },

  saveHousehold: (item) => {
    let households = get(KEYS.households);
    let pregnant = get(KEYS.pregnant);
    let children = get(KEYS.children);

    // CRITICAL: Only match if _internalId is present and valid
    const oldIdx = item._internalId
      ? households.findIndex((h) => h._internalId === item._internalId)
      : -1;
    const newId = Number(item.id);

    // If this is a NEW household or the ID has CHANGED
    const isNew = oldIdx === -1;
    const idChanged = !isNew && Number(households[oldIdx].id) !== newId;

    if (isNew || idChanged) {
      // SHIFT LOGIC: Move existing houses from newId onwards up by 1
      households.sort((a, b) => Number(a.id) - Number(b.id));

      // If we are changing an existing ID, we might have a gap or conflict.
      // Simplest approach: Sort, insert/update, then ensure sequence is gapless and unique.
      if (isNew) {
        // Find if target ID is taken
        const conflict = households.some((h) => Number(h.id) === newId);
        if (conflict) {
          // Push everything from newId upwards by 1
          households.forEach((h) => {
            if (Number(h.id) >= newId) {
              const oldHId = h.id;
              h.id = Number(h.id) + 1;
              // Sync linked records
              pregnant.forEach((p) => {
                if (Number(p.hhNo) === Number(oldHId)) p.hhNo = h.id;
              });
              children.forEach((c) => {
                if (Number(c.hhNo) === Number(oldHId)) c.hhNo = h.id;
              });
            }
          });
        }
        households.push({ ...item, _internalId: Date.now() + Math.random() });
      } else {
        // Existing household changing its number.
        const oldId = Number(households[oldIdx].id);
        households[oldIdx] = { ...item };

        // If moved to a smaller number, push middle ones up
        if (newId < oldId) {
          households.forEach((h, i) => {
            if (i !== oldIdx && Number(h.id) >= newId && Number(h.id) < oldId) {
              const prevId = h.id;
              h.id = Number(h.id) + 1;
              pregnant.forEach((p) => {
                if (Number(p.hhNo) === Number(prevId)) p.hhNo = h.id;
              });
              children.forEach((c) => {
                if (Number(c.hhNo) === Number(prevId)) c.hhNo = h.id;
              });
            }
          });
        }
        // If moved to a larger number, push middle ones down
        else if (newId > oldId) {
          households.forEach((h, i) => {
            if (i !== oldIdx && Number(h.id) <= newId && Number(h.id) > oldId) {
              const prevId = h.id;
              h.id = Number(h.id) - 1;
              pregnant.forEach((p) => {
                if (Number(p.hhNo) === Number(prevId)) p.hhNo = h.id;
              });
              children.forEach((c) => {
                if (Number(c.hhNo) === Number(prevId)) c.hhNo = h.id;
              });
            }
          });
        }
      }
    } else {
      // Just a name update or similar, no ID change
      households[oldIdx] = { ...item };
    }

    // Final Sort and Sync
    households.sort((a, b) => Number(a.id) - Number(b.id));

    // Auto-compute summaries
    const updatedWithSummaries = households.map((h) => {
      const summary = computeSummary(h.id, pregnant, children);
      return summary ? { ...h, ...summary } : h;
    });

    set(KEYS.households, updatedWithSummaries);
    set(KEYS.pregnant, pregnant);
    set(KEYS.children, children);
  },

  deleteHousehold: (id) => {
    let households = get(KEYS.households);
    let pregnant = get(KEYS.pregnant);
    let children = get(KEYS.children);

    const delId = Number(id);

    // 1. Remove the household and its direct records
    households = households.filter((h) => Number(h.id) !== delId);
    pregnant = pregnant.filter((p) => Number(p.hhNo) !== delId);
    children = children.filter((c) => Number(c.hhNo) !== delId);

    // 2. SHIFT: Close the gap for all houses AFTER deleted one
    households.forEach((h) => {
      if (Number(h.id) > delId) {
        const oldHId = h.id;
        h.id = Number(h.id) - 1;
        // Sync linked records to the new shifted house number
        pregnant.forEach((p) => {
          if (Number(p.hhNo) === Number(oldHId)) p.hhNo = h.id;
        });
        children.forEach((c) => {
          if (Number(c.hhNo) === Number(oldHId)) c.hhNo = h.id;
        });
      }
    });

    set(KEYS.households, households);
    set(KEYS.pregnant, pregnant);
    set(KEYS.children, children);
  },

  // ── Pregnant ────────────────────────────────────────────────────────────────
  getPregnant: () => get(KEYS.pregnant),
  getPregnantByHH: (hhNo) =>
    get(KEYS.pregnant).filter((p) => Number(p.hhNo) === Number(hhNo)),

  savePregnant: (item) => {
    const all = get(KEYS.pregnant);
    const idx = all.findIndex((p) => String(p._id) === String(item._id));
    if (idx >= 0) all[idx] = item;
    else all.push({ ...item, _id: item._id || Date.now() });
    set(KEYS.pregnant, all);
    syncAllHouseholds();
  },

  deletePregnant: (_id) => {
    const all = get(KEYS.pregnant);
    const item = all.find((p) => String(p._id) === String(_id));
    if (item) {
      const bin = get(KEYS.recycleBin);
      bin.push({
        ...item,
        _type: "pregnant",
        _deletedAt: new Date().toISOString(),
      });
      set(KEYS.recycleBin, bin);
    }
    set(
      KEYS.pregnant,
      all.filter((p) => String(p._id) !== String(_id)),
    );
    syncAllHouseholds();
  },

  // ── Children ────────────────────────────────────────────────────────────────
  getChildren: () => get(KEYS.children),
  getChildrenByHH: (hhNo) =>
    get(KEYS.children).filter((c) => Number(c.hhNo) === Number(hhNo)),

  saveChild: (item) => {
    const all = get(KEYS.children);
    const idx = all.findIndex((c) => String(c._id) === String(item._id));
    if (idx >= 0) all[idx] = item;
    else all.push({ ...item, _id: item._id || Date.now() });
    set(KEYS.children, all);
    syncAllHouseholds();
  },

  deleteChild: (_id) => {
    const all = get(KEYS.children);
    const item = all.find((c) => String(c._id) === String(_id));
    if (item) {
      const bin = get(KEYS.recycleBin);
      bin.push({
        ...item,
        _type: "child",
        _deletedAt: new Date().toISOString(),
      });
      set(KEYS.recycleBin, bin);
    }
    set(
      KEYS.children,
      all.filter((c) => String(c._id) !== String(_id)),
    );
    syncAllHouseholds();
  },

  // ── Recycle Bin ─────────────────────────────────────────────────────────────
  getRecycleBin: () => get(KEYS.recycleBin),

  restoreRecord: (item) => {
    const bin = get(KEYS.recycleBin);
    const updatedBin = bin.filter((i) => String(i._id) !== String(item._id));
    set(KEYS.recycleBin, updatedBin);

    if (item._type === "pregnant") {
      const pregnant = get(KEYS.pregnant);
      pregnant.push(item);
      set(KEYS.pregnant, pregnant);
    } else if (item._type === "child") {
      const children = get(KEYS.children);
      children.push(item);
      set(KEYS.children, children);
    }
    syncAllHouseholds();
  },

  deletePermanently: (_id) => {
    set(
      KEYS.recycleBin,
      get(KEYS.recycleBin).filter((i) => String(i._id) !== String(_id)),
    );
  },

  reset: () => {
    [KEYS.households, KEYS.pregnant, KEYS.children, KEYS.recycleBin].forEach(
      (k) => localStorage.removeItem(k),
    );
    init();
  },
};
