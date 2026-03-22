import householdsData from "../data/households.json";
import pregnantData from "../data/pregnant.json";
import childrenData from "../data/children.json";

import { auth, db as firestore } from "../firebase";
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc, writeBatch } from "firebase/firestore";

function getUid() {
  if (!auth.currentUser) return null;
  return auth.currentUser.uid;
}

function getPath(collection, uidOverride, recordId = "") {
  const uid = uidOverride || getUid();
  if (!uid) throw new Error("User must be logged in to access cloud database");
  return `users/${uid}/${collection}${recordId ? "/" + recordId : ""}`;
}

// Helper to get collection refs
const cols = {
  households: (uid) => collection(firestore, getPath('households', uid)),
  pregnant: (uid) => collection(firestore, getPath('pregnant', uid)),
  children: (uid) => collection(firestore, getPath('children', uid)),  // legacy
  childrenU1m: (uid) => collection(firestore, getPath('childrenU1m', uid)),
  children1mTo1y: (uid) => collection(firestore, getPath('children1mTo1y', uid)),
  children1to2y: (uid) => collection(firestore, getPath('children1to2y', uid)),
  children2to5: (uid) => collection(firestore, getPath('children2to5', uid)),
  children6to18: (uid) => collection(firestore, getPath('children6to18', uid)),
  recycleBin: (uid) => collection(firestore, getPath('recycleBin', uid)),
};

const docRefs = {
  household: (id, uid) => doc(firestore, getPath('households', uid, String(id))),
  pregnant: (id, uid) => doc(firestore, getPath('pregnant', uid, String(id))),
  child: (id, uid) => doc(firestore, getPath('children', uid, String(id))),  // legacy
  childU1m: (id, uid) => doc(firestore, getPath('childrenU1m', uid, String(id))),
  child1mTo1y: (id, uid) => doc(firestore, getPath('children1mTo1y', uid, String(id))),
  child1to2y: (id, uid) => doc(firestore, getPath('children1to2y', uid, String(id))),
  child2to5: (id, uid) => doc(firestore, getPath('children2to5', uid, String(id))),
  child6to18: (id, uid) => doc(firestore, getPath('children6to18', uid, String(id))),
  recycleBin: (id, uid) => doc(firestore, getPath('recycleBin', uid, String(id))),
};

// Map age group string to collection key
const AGE_GROUP_TO_COL = {
  under1Month: 'childrenU1m',
  '1monthTo1year': 'children1mTo1y',
  '1to2years': 'children1to2y',
  '2to5years': 'children2to5',
  '6to18years': 'children6to18',
};
const AGE_GROUP_TO_DOC = {
  under1Month: 'childU1m',
  '1monthTo1year': 'child1mTo1y',
  '1to2years': 'child1to2y',
  '2to5years': 'child2to5',
  '6to18years': 'child6to18',
};

function getChildColForDOB(dob) {
  const ag = getAgeGroupFromDOB(dob);
  return AGE_GROUP_TO_COL[ag] || 'childrenU1m';
}
function getChildDocRefForDOB(dob) {
  const ag = getAgeGroupFromDOB(dob);
  return AGE_GROUP_TO_DOC[ag] || 'childU1m';
}

export const KEYS = {
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

// ── Migration Script (Run once from Settings UI) ─────────────────────────
export async function migrateLocalToFirestore() {
  if (!auth.currentUser) throw new Error("Must be logged in to migrate data");

  const h = JSON.parse(localStorage.getItem(KEYS.households) || "[]");
  const p = JSON.parse(localStorage.getItem(KEYS.pregnant) || "[]");
  const c = JSON.parse(localStorage.getItem(KEYS.children) || "[]");
  const r = JSON.parse(localStorage.getItem(KEYS.recycleBin) || "[]");

  if (h.length === 0 && p.length === 0 && c.length === 0 && r.length === 0) {
    return "No local data to migrate.";
  }

  const batch = writeBatch(firestore);

  // Households (use _internalId or id)
  h.forEach((item) => {
    const docId = String(item._internalId || item.id || Date.now() + Math.random());
    batch.set(docRefs.household(docId), item);
  });

  // Pregnant
  p.forEach((item) => {
    const docId = String(item._id || Date.now() + Math.random());
    batch.set(docRefs.pregnant(docId), item);
  });

  // Children
  c.forEach((item) => {
    const docId = String(item._id || Date.now() + Math.random());
    batch.set(docRefs.child(docId), item);
  });

  // Recycle Bin
  r.forEach((item) => {
    const docId = String(item._id || Date.now() + Math.random());
    batch.set(docRefs.recycleBin(docId), item);
  });

  await batch.commit();

  // Clear local storage so this isn't repeated indefinitely
  localStorage.removeItem(KEYS.households);
  localStorage.removeItem(KEYS.pregnant);
  localStorage.removeItem(KEYS.children);
  localStorage.removeItem(KEYS.recycleBin);

  return "Successfully migrated local browser data to Firebase cloud!";
}


// Recompute summary for ONE household from linked records.
function computeSummary(hh, pregnant, children) {
  const hhNo = hh.id;
  const hhPregnant = pregnant.filter((p) => String(p.hhNo) === String(hhNo));
  const hhChildren = children.filter((c) => String(c.hhNo) === String(hhNo));

  // We only update if actual records exceed manual counts, 
  // or if manual counts are 0 but records exist.
  // Otherwise, we "Keep" the manual count as the target.
  const calc = {
    pregnantWomen: hhPregnant.length,
    childUnder1Month: hhChildren.filter((c) => getAgeGroupFromDOB(c.dob) === "under1Month").length,
    child1MonthTo1Year: hhChildren.filter((c) => getAgeGroupFromDOB(c.dob) === "1monthTo1year").length,
    child1To2Years: hhChildren.filter((c) => getAgeGroupFromDOB(c.dob) === "1to2years").length,
    child2To5Years: hhChildren.filter((c) => getAgeGroupFromDOB(c.dob) === "2to5years").length,
    child6To18Years: hhChildren.filter((c) => getAgeGroupFromDOB(c.dob) === "6to18years").length,
    childMissedVaccine: hhChildren.filter((c) => c.missedVaccine).length,
  };

  return {
    pregnantWomen: Math.max(Number(hh.pregnantWomen || 0), calc.pregnantWomen),
    childUnder1Month: Math.max(Number(hh.childUnder1Month || 0), calc.childUnder1Month),
    child1MonthTo1Year: Math.max(Number(hh.child1MonthTo1Year || 0), calc.child1MonthTo1Year),
    child1To2Years: Math.max(Number(hh.child1To2Years || 0), calc.child1To2Years),
    child2To5Years: Math.max(Number(hh.child2To5Years || 0), calc.child2To5Years),
    child6To18Years: Math.max(Number(hh.child6To18Years || 0), calc.child6To18Years),
    childMissedVaccine: Math.max(Number(hh.childMissedVaccine || 0), calc.childMissedVaccine),
  };
}

export async function syncAllHouseholds() {
  const households = await db.getHouseholds();
  const pregnant = await db.getPregnant();
  const children = await db.getAllChildren();
  
  const batch = writeBatch(firestore);

  households.forEach((h) => {
    const summary = computeSummary(h, pregnant, children);
    if (summary) {
      const updated = { ...h, ...summary };
      const docId = String(h._internalId || h.id);
      batch.set(docRefs.household(docId), updated, { merge: true });
    }
  });

  await batch.commit();
}

function calcEDDFromLMP(lmp) {
  if (!lmp) return null;
  const d = new Date(lmp);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 280);
  return d;
}

// Async Migration wrapper
async function migrateDeliveredPregnant() {
  if (!auth.currentUser) return;

  const pregnant = await db.getPregnant();
  if (!pregnant || pregnant.length === 0) return;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toMigrate = pregnant.filter((p) => {
    const edd = calcEDDFromLMP(p.lmp);
    return edd && edd <= today;
  });

  if (toMigrate.length === 0) return;

  const batch = writeBatch(firestore);

  toMigrate
    .sort((a, b) => Number(a.hhNo) - Number(b.hhNo))
    .forEach((p) => {
      const edd = calcEDDFromLMP(p.lmp);
      const newChild = {
        _id: String(Date.now() + Math.random()),
        hhNo: p.hhNo,
        name: `Baby of ${p.name}`,
        dob: edd ? edd.toISOString().split("T")[0] : "",
        gender: "M",
        guardianName: p.name,
        mobile: p.mobile || "",
        mcpCard: p.mcpCard || p.mcpCardUwn || "",
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
        createdAt: new Date().toISOString(),
      };
      
      // Route newborn to the correct age-group collection
      const newDocKey = getChildDocRefForDOB(newChild.dob);
      batch.set(docRefs[newDocKey](newChild._id), newChild);
      batch.delete(docRefs.pregnant(String(p._id)));
    });

  await batch.commit();
  await syncAllHouseholds();
}

async function init() {
  if (!auth.currentUser) return;
  
  // To avoid seeding data constantly to the cloud, check if ANY households exist
  const snapshot = await getDocs(cols.households());
  if (!snapshot.empty) return; // DB is already initialized

  // We only seed if the user has literally 0 households AND they want the dummy data
  // But wait, they'll complain if we upload dummy data to their empty cloud DB.
  // We will NOT auto-seed cloud DBs. Cloud DB is clean by default.
  // Data comes in via the migration script from their local storage!
}

async function fetchAll(colRef) {
  try {
    const snap = await getDocs(colRef);
    return snap.docs.map(doc => doc.data());
  } catch (err) {
    if (err.message.includes("Must be logged in")) return [];
    console.error("Firestore read error:", err);
    return [];
  }
}

export const db = {
  init,
  getAgeGroup: getAgeGroupFromDOB,
  migrateDeliveredPregnant,
  migrateLocalToFirestore,

  // ── Duplicate Checkers ──────────────────────────────────────────────────────
  checkDuplicateHousehold: async (id, excludeInternalId = null) => {
    let households = await fetchAll(cols.households()); // Skip db.getHouseholds to avoid batch rewrite logic mid-save
    return households.some(h => String(h.id) === String(id) && h._internalId !== excludeInternalId);
  },

  checkDuplicatePregnant: async (hhNo, name, excludeId = null) => {
    let pregnant = await fetchAll(cols.pregnant());
    return pregnant.some(p => String(p.hhNo) === String(hhNo) && p.name.toLowerCase() === name.toLowerCase() && p._id !== excludeId);
  },

  checkDuplicateChild: async (hhNo, name, dob, excludeId = null) => {
    const children = await db.getAllChildren();
    return children.some(c => String(c.hhNo) === String(hhNo) && c.name.toLowerCase() === name.toLowerCase() && c.dob === dob && c._id !== excludeId);
  },

  // ── Households ──────────────────────────────────────────────────────────────
  getHouseholds: async () => {
    if (!auth.currentUser) return [];
    let all = await fetchAll(cols.households());
    let changed = false;
    
    // Ensure internal IDs
    all = all.map((h) => {
      if (!h._internalId) {
        h._internalId = `b-${h.id}-${Date.now()}-${Math.random()}`;
        changed = true;
      }
      return h;
    });

    if (changed) {
      const batch = writeBatch(firestore);
      all.forEach(h => batch.set(docRefs.household(h._internalId), h));
      await batch.commit();
    }
    return all.sort((a, b) => Number(a.id) - Number(b.id));
  },

  saveHousehold: async (item) => {
    let households = await db.getHouseholds();
    let pregnant = await db.getPregnant();
    let children = await db.getAllChildren();

    const oldIdx = item._internalId ? households.findIndex((h) => h._internalId === item._internalId) : -1;
    const isNew = oldIdx === -1;

    const batch = writeBatch(firestore);

    if (isNew) {
      item._internalId = String(Date.now() + Math.random());
      item.createdAt = item.createdAt || new Date().toISOString();
      households.push(item);
    } else {
      households[oldIdx] = { ...item };
    }

    households.sort((a, b) => Number(a.id) - Number(b.id));

    // Calculate summaries and write the batch
    households.forEach((h) => {
      const summary = computeSummary(h, pregnant, children);
      const toSave = summary ? { ...h, ...summary } : h;
      batch.set(docRefs.household(String(toSave._internalId)), toSave);
    });

    pregnant.forEach(p => batch.set(docRefs.pregnant(String(p._id)), p));
    // Re-save children to their correct age-group collections
    children.forEach(c => {
      const dRef = getChildDocRefForDOB(c.dob);
      batch.set(docRefs[dRef](String(c._id)), c);
    });

    await batch.commit();
  },

  deleteHousehold: async (id) => {
    let households = await db.getHouseholds();
    let pregnant = await db.getPregnant();
    let children = await db.getAllChildren();

    const delId = Number(id);
    const batch = writeBatch(firestore);

    const deletedH = households.find(h => Number(h.id) === delId);
    if (deletedH) batch.delete(docRefs.household(String(deletedH._internalId)));
    
    pregnant.filter((p) => Number(p.hhNo) === delId).forEach(p => batch.delete(docRefs.pregnant(String(p._id))));
    children.filter((c) => Number(c.hhNo) === delId).forEach(c => {
      const dRef = getChildDocRefForDOB(c.dob);
      batch.delete(docRefs[dRef](String(c._id)));
    });

    await batch.commit();
  },

  // ── Pregnant ────────────────────────────────────────────────────────────────
  getPregnant: async () => {
    if (!auth.currentUser) return [];
    return await fetchAll(cols.pregnant());
  },
  
  getPregnantByHH: async (hhNo) => {
    const list = await db.getPregnant();
    return list.filter((p) => Number(p.hhNo) === Number(hhNo));
  },

  savePregnant: async (item) => {
    const isNew = !item._id;
    const finalItem = {
      ...item,
      _id: String(item._id || Date.now() + Math.random()),
      createdAt: item.createdAt || new Date().toISOString(),
    };
    await setDoc(docRefs.pregnant(finalItem._id), finalItem);
    await syncAllHouseholds();
  },

  deletePregnant: async (_id) => {
    const snap = await getDoc(docRefs.pregnant(String(_id)));
    if (snap.exists()) {
      const item = snap.data();
      const binItem = {
        ...item,
        _type: "pregnant",
        _deletedAt: new Date().toISOString(),
      };
      await setDoc(docRefs.recycleBin(String(_id)), binItem);
      await deleteDoc(docRefs.pregnant(String(_id)));
      await syncAllHouseholds();
    }
  },

  // ── Children (per-age-group collections) ────────────────────────────────────
  // Individual age-group getters
  getChildrenU1m: async () => {
    if (!auth.currentUser) return [];
    return await fetchAll(cols.childrenU1m());
  },
  getChildren1mTo1y: async () => {
    if (!auth.currentUser) return [];
    return await fetchAll(cols.children1mTo1y());
  },
  getChildren1to2y: async () => {
    if (!auth.currentUser) return [];
    return await fetchAll(cols.children1to2y());
  },
  getChildren2to5: async () => {
    if (!auth.currentUser) return [];
    return await fetchAll(cols.children2to5());
  },
  getChildren6to18: async () => {
    if (!auth.currentUser) return [];
    return await fetchAll(cols.children6to18());
  },

  // Combined getter — merges all 5 age-group collections
  getAllChildren: async () => {
    if (!auth.currentUser) return [];
    const [a, b, c, d, e] = await Promise.all([
      fetchAll(cols.childrenU1m()),
      fetchAll(cols.children1mTo1y()),
      fetchAll(cols.children1to2y()),
      fetchAll(cols.children2to5()),
      fetchAll(cols.children6to18()),
    ]);
    return [...a, ...b, ...c, ...d, ...e];
  },

  // Legacy alias
  getChildren: async () => db.getAllChildren(),
  
  getChildrenByHH: async (hhNo) => {
    const list = await db.getAllChildren();
    return list.filter((c) => Number(c.hhNo) === Number(hhNo));
  },

  // Save to the correct age-group collection based on DOB
  saveChild: async (item) => {
    const finalItem = {
      ...item,
      _id: String(item._id || Date.now() + Math.random()),
      createdAt: item.createdAt || new Date().toISOString(),
    };
    const docKey = getChildDocRefForDOB(finalItem.dob);
    await setDoc(docRefs[docKey](finalItem._id), finalItem);
    await syncAllHouseholds();
  },

  // Save to a SPECIFIC age-group collection (used by tabs that know their group)
  saveChildToGroup: async (item, ageGroup) => {
    const finalItem = {
      ...item,
      _id: String(item._id || Date.now() + Math.random()),
      createdAt: item.createdAt || new Date().toISOString(),
    };
    const docKey = AGE_GROUP_TO_DOC[ageGroup] || getChildDocRefForDOB(finalItem.dob);
    await setDoc(docRefs[docKey](finalItem._id), finalItem);
    await syncAllHouseholds();
  },

  deleteChild: async (_id, dob) => {
    // Try to find in the DOB-based collection first
    const docKey = dob ? getChildDocRefForDOB(dob) : null;
    let found = false;
    
    if (docKey) {
      const snap = await getDoc(docRefs[docKey](String(_id)));
      if (snap.exists()) {
        const item = snap.data();
        await setDoc(docRefs.recycleBin(String(_id)), { ...item, _type: "child", _deletedAt: new Date().toISOString() });
        await deleteDoc(docRefs[docKey](String(_id)));
        found = true;
      }
    }
    
    // Fallback: search all 5 collections
    if (!found) {
      for (const agDocKey of Object.values(AGE_GROUP_TO_DOC)) {
        const snap = await getDoc(docRefs[agDocKey](String(_id)));
        if (snap.exists()) {
          const item = snap.data();
          await setDoc(docRefs.recycleBin(String(_id)), { ...item, _type: "child", _deletedAt: new Date().toISOString() });
          await deleteDoc(docRefs[agDocKey](String(_id)));
          found = true;
          break;
        }
      }
    }

    // Also check legacy collection
    if (!found) {
      const snap = await getDoc(docRefs.child(String(_id)));
      if (snap.exists()) {
        const item = snap.data();
        await setDoc(docRefs.recycleBin(String(_id)), { ...item, _type: "child", _deletedAt: new Date().toISOString() });
        await deleteDoc(docRefs.child(String(_id)));
      }
    }
    
    await syncAllHouseholds();
  },

  // ── Recycle Bin ─────────────────────────────────────────────────────────────
  getRecycleBin: async () => {
    if (!auth.currentUser) return [];
    return await fetchAll(cols.recycleBin());
  },

  restoreRecord: async (item) => {
    const _id = String(item._id);
    await deleteDoc(docRefs.recycleBin(_id));

    if (item._type === "pregnant") {
      await setDoc(docRefs.pregnant(_id), item);
    } else if (item._type === "child") {
      // Route restored child to the correct age-group collection
      const docKey = getChildDocRefForDOB(item.dob);
      await setDoc(docRefs[docKey](_id), item);
    }
    await syncAllHouseholds();
  },

  deletePermanently: async (_id) => {
    await deleteDoc(docRefs.recycleBin(String(_id)));
  },

  saveBulkData: async ({ households, pregnant, children, overrideUid }) => {
    const CHUNK_SIZE = 400;

    async function pushChunked(data, colType) {
      if (!data || data.length === 0) return;
      console.log(`Pushing ${data.length} to ${colType}...`);
      
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const batch = writeBatch(firestore);
        const chunk = data.slice(i, i + CHUNK_SIZE);
        
        chunk.forEach(item => {
          let docId;
          if (colType === 'households') {
            docId = String(item._internalId || item.id);
            batch.set(docRefs.household(docId, overrideUid), item, { merge: true });
          } else if (colType === 'pregnant') {
            docId = String(item._id);
            batch.set(docRefs.pregnant(docId, overrideUid), item, { merge: true });
          } else {
            // Route children to the correct age-group collection
            docId = String(item._id);
            const docKey = getChildDocRefForDOB(item.dob);
            batch.set(docRefs[docKey](docId, overrideUid), item, { merge: true });
          }
        });
        
        await batch.commit();
        console.log(` - Chunk ${i}-${i+chunk.length} committed`);
      }
    }

    try {
      if (households) await pushChunked(households, 'households');
      if (pregnant) await pushChunked(pregnant, 'pregnant');
      if (children) await pushChunked(children, 'children');

      if (!overrideUid) await syncAllHouseholds();
    } catch (err) {
      console.error("Bulk save error:", err);
      throw err;
    }
  },

  // ── Migration: Split legacy children → age-group collections ────────────────
  migrateChildrenToAgeGroups: async () => {
    if (!auth.currentUser) return 'Not logged in';
    const legacy = await fetchAll(cols.children());
    if (legacy.length === 0) return 'No legacy children to migrate.';

    const batch = writeBatch(firestore);
    let count = 0;

    legacy.forEach(child => {
      const docKey = getChildDocRefForDOB(child.dob);
      const _id = String(child._id);
      batch.set(docRefs[docKey](_id), child);
      batch.delete(docRefs.child(_id));  // Remove from legacy
      count++;
    });

    await batch.commit();
    await syncAllHouseholds();
    return `Migrated ${count} children records to age-group collections.`;
  },

  // ── Sync: Move children between age-group collections if DOB changed group ──
  syncChildAgeGroups: async () => {
    if (!auth.currentUser) return;
    const allColKeys = Object.keys(AGE_GROUP_TO_COL);
    const batch = writeBatch(firestore);
    let moves = 0;

    for (const ageGroup of allColKeys) {
      const colKey = AGE_GROUP_TO_COL[ageGroup];
      const docKey = AGE_GROUP_TO_DOC[ageGroup];
      const records = await fetchAll(cols[colKey]());

      for (const child of records) {
        const currentAG = getAgeGroupFromDOB(child.dob);
        if (currentAG && currentAG !== ageGroup && AGE_GROUP_TO_COL[currentAG]) {
          // This child has aged out — move to the new collection
          const newDocKey = AGE_GROUP_TO_DOC[currentAG];
          batch.set(docRefs[newDocKey](String(child._id)), child);
          batch.delete(docRefs[docKey](String(child._id)));
          moves++;
        }
      }
    }

    if (moves > 0) {
      await batch.commit();
      await syncAllHouseholds();
    }
    return moves;
  },

  seedPlaceholdersFromHouseholds: async () => {
    // Removed as per user request
  },

  reset: async () => {
    // Only resetting local variables to avoid dangerous global resets
  },
};
