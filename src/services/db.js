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
  children: (uid) => collection(firestore, getPath('children', uid)),
  recycleBin: (uid) => collection(firestore, getPath('recycleBin', uid)),
};

const docRefs = {
  household: (id, uid) => doc(firestore, getPath('households', uid, String(id))),
  pregnant: (id, uid) => doc(firestore, getPath('pregnant', uid, String(id))),
  child: (id, uid) => doc(firestore, getPath('children', uid, String(id))),
  recycleBin: (id, uid) => doc(firestore, getPath('recycleBin', uid, String(id))),
};

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
function computeSummary(hhNo, pregnant, children) {
  const hhPregnant = pregnant.filter((p) => Number(p.hhNo) === Number(hhNo));
  const hhChildren = children.filter((c) => Number(c.hhNo) === Number(hhNo));

  const hasLinked = hhPregnant.length > 0 || hhChildren.length > 0;
  if (!hasLinked) return null; // null = keep manual values

  return {
    pregnantWomen: hhPregnant.length,
    childUnder1Month: hhChildren.filter((c) => getAgeGroupFromDOB(c.dob) === "under1Month").length,
    child1MonthTo1Year: hhChildren.filter((c) => getAgeGroupFromDOB(c.dob) === "1monthTo1year").length,
    child1To2Years: hhChildren.filter((c) => getAgeGroupFromDOB(c.dob) === "1to2years").length,
    child2To5Years: hhChildren.filter((c) => getAgeGroupFromDOB(c.dob) === "2to5years").length,
    child6To18Years: hhChildren.filter((c) => getAgeGroupFromDOB(c.dob) === "6to18years").length,
    childMissedVaccine: hhChildren.filter((c) => c.missedVaccine).length,
  };
}

export async function syncAllHouseholds() {
  const households = await db.getHouseholds();
  const pregnant = await db.getPregnant();
  const children = await db.getChildren();
  
  const batch = writeBatch(firestore);

  households.forEach((h) => {
    const summary = computeSummary(h.id, pregnant, children);
    if (summary) {
      const updated = { ...h, ...summary };
      // Overwrite the specific household doc
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
      
      batch.set(docRefs.child(newChild._id), newChild);
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
    let children = await db.getChildren();

    const oldIdx = item._internalId ? households.findIndex((h) => h._internalId === item._internalId) : -1;
    const newId = Number(item.id);
    const isNew = oldIdx === -1;
    const idChanged = !isNew && Number(households[oldIdx].id) !== newId;

    const batch = writeBatch(firestore);

    if (isNew || idChanged) {
      households.sort((a, b) => Number(a.id) - Number(b.id));

      if (isNew) {
        const conflict = households.some((h) => Number(h.id) === newId);
        if (conflict) {
          households.forEach((h) => {
            if (Number(h.id) >= newId) {
              const oldHId = h.id;
              h.id = Number(h.id) + 1;
              pregnant.forEach((p) => { if (Number(p.hhNo) === Number(oldHId)) p.hhNo = h.id; });
              children.forEach((c) => { if (Number(c.hhNo) === Number(oldHId)) c.hhNo = h.id; });
            }
          });
        }
        item._internalId = String(Date.now() + Math.random());
        item.createdAt = item.createdAt || new Date().toISOString();
        households.push(item);
      } else {
        const oldId = Number(households[oldIdx].id);
        households[oldIdx] = { ...item };

        if (newId < oldId) {
          households.forEach((h, i) => {
            if (i !== oldIdx && Number(h.id) >= newId && Number(h.id) < oldId) {
              const prevId = h.id;
              h.id = Number(h.id) + 1;
              pregnant.forEach((p) => { if (Number(p.hhNo) === Number(prevId)) p.hhNo = h.id; });
              children.forEach((c) => { if (Number(c.hhNo) === Number(prevId)) c.hhNo = h.id; });
            }
          });
        }
        else if (newId > oldId) {
          households.forEach((h, i) => {
            if (i !== oldIdx && Number(h.id) <= newId && Number(h.id) > oldId) {
              const prevId = h.id;
              h.id = Number(h.id) - 1;
              pregnant.forEach((p) => { if (Number(p.hhNo) === Number(prevId)) p.hhNo = h.id; });
              children.forEach((c) => { if (Number(c.hhNo) === Number(prevId)) c.hhNo = h.id; });
            }
          });
        }
      }
    } else {
      households[oldIdx] = { ...item };
    }

    households.sort((a, b) => Number(a.id) - Number(b.id));

    // Calculate summaries and write the batch
    households.forEach((h) => {
      const summary = computeSummary(h.id, pregnant, children);
      const toSave = summary ? { ...h, ...summary } : h;
      batch.set(docRefs.household(String(toSave._internalId)), toSave);
    });

    pregnant.forEach(p => batch.set(docRefs.pregnant(String(p._id)), p));
    children.forEach(c => batch.set(docRefs.child(String(c._id)), c));

    await batch.commit();
  },

  deleteHousehold: async (id) => {
    let households = await db.getHouseholds();
    let pregnant = await db.getPregnant();
    let children = await db.getChildren();

    const delId = Number(id);
    const batch = writeBatch(firestore);

    // Filter out and delete from cloud
    const deletedH = households.find(h => Number(h.id) === delId);
    if (deletedH) batch.delete(docRefs.household(String(deletedH._internalId)));
    
    pregnant.filter((p) => Number(p.hhNo) === delId).forEach(p => Math.abs(batch.delete(docRefs.pregnant(String(p._id)))));
    children.filter((c) => Number(c.hhNo) === delId).forEach(c => Math.abs(batch.delete(docRefs.child(String(c._id)))));

    households = households.filter((h) => Number(h.id) !== delId);
    pregnant = pregnant.filter((p) => Number(p.hhNo) !== delId);
    children = children.filter((c) => Number(c.hhNo) !== delId);

    households.forEach((h) => {
      if (Number(h.id) > delId) {
        const oldHId = h.id;
        h.id = Number(h.id) - 1;
        batch.set(docRefs.household(String(h._internalId)), h);
        
        pregnant.forEach((p) => {
          if (Number(p.hhNo) === Number(oldHId)) {
            p.hhNo = h.id;
            batch.set(docRefs.pregnant(String(p._id)), p);
          }
        });
        children.forEach((c) => {
          if (Number(c.hhNo) === Number(oldHId)) {
            c.hhNo = h.id;
            batch.set(docRefs.child(String(c._id)), c);
          }
        });
      }
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

  // ── Children ────────────────────────────────────────────────────────────────
  getChildren: async () => {
    if (!auth.currentUser) return [];
    return await fetchAll(cols.children());
  },
  
  getChildrenByHH: async (hhNo) => {
    const list = await db.getChildren();
    return list.filter((c) => Number(c.hhNo) === Number(hhNo));
  },

  saveChild: async (item) => {
    const finalItem = {
      ...item,
      _id: String(item._id || Date.now() + Math.random()),
      createdAt: item.createdAt || new Date().toISOString(),
    };
    await setDoc(docRefs.child(finalItem._id), finalItem);
    await syncAllHouseholds();
  },

  deleteChild: async (_id) => {
    const snap = await getDoc(docRefs.child(String(_id)));
    if (snap.exists()) {
      const item = snap.data();
      const binItem = {
        ...item,
        _type: "child",
        _deletedAt: new Date().toISOString(),
      };
      await setDoc(docRefs.recycleBin(String(_id)), binItem);
      await deleteDoc(docRefs.child(String(_id)));
      await syncAllHouseholds();
    }
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
      await setDoc(docRefs.child(_id), item);
    }
    await syncAllHouseholds();
  },

  deletePermanently: async (_id) => {
    await deleteDoc(docRefs.recycleBin(String(_id)));
  },

  saveBulkData: async ({ households, pregnant, children, overrideUid }) => {
    // No auth check if overrideUid is provided, but Firestore rules will still check it
    const batch = writeBatch(firestore);

    if (households) {
      households.forEach((h) => {
        const docId = String(h._internalId || h.id);
        batch.set(docRefs.household(docId, overrideUid), h, { merge: true });
      });
    }

    if (pregnant) {
      pregnant.forEach((p) => {
        const docId = String(p._id);
        batch.set(docRefs.pregnant(docId, overrideUid), p, { merge: true });
      });
    }

    if (children) {
      children.forEach((c) => {
        const docId = String(c._id);
        batch.set(docRefs.child(docId, overrideUid), c, { merge: true });
      });
    }

    await batch.commit();
    // We don't syncAllHouseholds if it's a cross-UID seed, it's safer
    if (!overrideUid) await syncAllHouseholds();
  },

  reset: async () => {
    // Only resetting local variables to avoid dangerous global resets
  },
};
