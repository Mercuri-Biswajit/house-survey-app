/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo, useCallback } from "react";
import { db, getAgeGroupFromDOB } from "../services/db";
import defaultAreaConfig from "../config/areaConfig";
import { useDebounce } from "./useDebounce";

// Vaccination schedule for overdue calculations
const VACC_SCHEDULE = [
  { key: "bOPV_birth", daysFromBirth: 0 },
  { key: "BCG", daysFromBirth: 0 },
  { key: "bOPV1", daysFromBirth: 42 },
  { key: "Penta1", daysFromBirth: 42 },
  { key: "bOPV2", daysFromBirth: 70 },
  { key: "Penta2", daysFromBirth: 70 },
  { key: "bOPV3", daysFromBirth: 98 },
  { key: "Penta3", daysFromBirth: 98 },
  { key: "MR1", daysFromBirth: 274 },
  { key: "MR2", daysFromBirth: 487 },
];

function countOverdue(children) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let count = 0;
  children.forEach((child) => {
    if (!child.dob) return;
    const dob = new Date(child.dob);
    VACC_SCHEDULE.forEach((vacc) => {
      if (child[vacc.key]) return;
      const dueDate = new Date(dob);
      dueDate.setDate(dob.getDate() + vacc.daysFromBirth);
      if (dueDate < today) count++;
    });
  });
  return count;
}

export function useAppState() {
  const [households, setHouseholds] = useState([]);
  const [pregnant, setPregnant] = useState([]);
  // Per-age-group children state
  const [childrenU1m, setChildrenU1m] = useState([]);
  const [children1mTo1y, setChildren1mTo1y] = useState([]);
  const [children1to2y, setChildren1to2y] = useState([]);
  const [children2to5, setChildren2to5] = useState([]);
  const [children6to18, setChildren6to18] = useState([]);

  const [recycleBin, setRecycleBin] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [area, setArea] = useState(() => {
    const saved = localStorage.getItem("survey_area");
    return saved ? JSON.parse(saved) : defaultAreaConfig;
  });

  // Debounce search for performance
  const debouncedSearch = useDebounce(searchQuery, 250);

  // Combine all children for backward-compat props
  const allChildren = useMemo(
    () => [...childrenU1m, ...children1mTo1y, ...children1to2y, ...children2to5, ...children6to18],
    [childrenU1m, children1mTo1y, children1to2y, children2to5, children6to18]
  );

  const refresh = useCallback(async () => {
    await db.migrateDeliveredPregnant();
    // Sync children who may have aged into a different group
    await db.syncChildAgeGroups();

    const h = await db.getHouseholds();
    const p = await db.getPregnant();
    const cu1m = await db.getChildrenU1m();
    const c1m1y = await db.getChildren1mTo1y();
    const c1to2 = await db.getChildren1to2y();
    const c2to5 = await db.getChildren2to5();
    const c6to18 = await db.getChildren6to18();
    const r = await db.getRecycleBin();

    setHouseholds(h);
    setPregnant(p);
    setChildrenU1m(cu1m);
    setChildren1mTo1y(c1m1y);
    setChildren1to2y(c1to2);
    setChildren2to5(c2to5);
    setChildren6to18(c6to18);
    setRecycleBin(r);

    // Refresh area from localStorage in case settings changed
    const savedArea = localStorage.getItem("survey_area");
    if (savedArea) setArea(JSON.parse(savedArea));
  }, []);

  useEffect(() => {
    db.init().then(() => refresh());
  }, [refresh]);

  // Listen for sidebar toggle on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const stats = useMemo(() => {
    const overdueCount = countOverdue(allChildren);
    return {
      totalHouses: households.length,
      totalMembers: households.reduce((s, h) => s + (h.familyMembers || 0), 0),
      totalPregnant: households.reduce((s, h) => s + (h.pregnantWomen || 0), 0),
      countU1m: households.reduce((s, h) => s + (h.childUnder1Month || 0), 0),
      count1m1y: households.reduce((s, h) => s + (h.child1MonthTo1Year || 0), 0),
      count1y2y: households.reduce((s, h) => s + (h.child1To2Years || 0), 0),
      totalChildren25: households.reduce((s, h) => s + (h.child2To5Years || 0), 0),
      totalChildren618: households.reduce((s, h) => s + (h.child6To18Years || 0), 0),
      totalDeleted: recycleBin.length,
      missedVaccine: households.reduce((s, h) => s + (h.childMissedVaccine || 0), 0),
      overdueCount,
    };
  }, [households, allChildren, recycleBin]);

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const isToday = (d) => d && d.startsWith(today);
    return {
      surveys: households.filter((h) => isToday(h.createdAt)).length,
      pregnant: pregnant.filter((p) => isToday(p.createdAt)).length,
      children: allChildren.filter((c) => isToday(c.createdAt)).length,
    };
  }, [households, pregnant, allChildren]);

  // Use debouncedSearch for filtering to avoid excessive re-renders
  const filteredData = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return { households, pregnant, children: allChildren, childrenU1m, children1mTo1y, children1to2y, children2to5, children6to18 };

    const match = (val) => String(val || "").toLowerCase().includes(q);

    const filterChildren = (list) => list.filter(
      (c) => match(c.hhNo) || match(c.name) || match(c.guardianName) || match(c.mobile)
    );

    return {
      households: households.filter(
        (h) => match(h.id) || match(h.headName) || match(h.guardianName) || match(h.contact)
      ),
      pregnant: pregnant.filter(
        (p) => match(p.hhNo) || match(p.name) || match(p.husbandName) || match(p.mobile)
      ),
      children: filterChildren(allChildren),
      childrenU1m: filterChildren(childrenU1m),
      children1mTo1y: filterChildren(children1mTo1y),
      children1to2y: filterChildren(children1to2y),
      children2to5: filterChildren(children2to5),
      children6to18: filterChildren(children6to18),
    };
  }, [debouncedSearch, households, pregnant, allChildren, childrenU1m, children1mTo1y, children1to2y, children2to5, children6to18]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  return {
    households,
    pregnant,
    children: allChildren,
    childrenU1m,
    children1mTo1y,
    children1to2y,
    children2to5,
    children6to18,
    recycleBin,
    searchQuery,
    setSearchQuery,
    isSidebarOpen,
    toggleSidebar,
    area,
    stats,
    todayStats,
    filteredData,
    refresh,
  };
}