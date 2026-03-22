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
  const [children, setChildren] = useState([]);
  const [recycleBin, setRecycleBin] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [area, setArea] = useState(() => {
    const saved = localStorage.getItem("survey_area");
    return saved ? JSON.parse(saved) : defaultAreaConfig;
  });

  // Debounce search for performance
  const debouncedSearch = useDebounce(searchQuery, 250);

  const refresh = useCallback(() => {
    db.migrateDeliveredPregnant();
    setHouseholds(db.getHouseholds());
    setPregnant(db.getPregnant());
    setChildren(db.getChildren());
    setRecycleBin(db.getRecycleBin());
    // Refresh area from localStorage in case settings changed
    const savedArea = localStorage.getItem("survey_area");
    if (savedArea) setArea(JSON.parse(savedArea));
  }, []);

  useEffect(() => {
    db.init();
    refresh();
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
    const overdueCount = countOverdue(children);
    return {
      totalHouses: households.length,
      totalMembers: households.reduce((s, h) => s + (h.familyMembers || 0), 0),
      totalPregnant: pregnant.length,
      countU1m: children.filter((c) => getAgeGroupFromDOB(c.dob) === "under1Month").length,
      count1m1y: children.filter((c) => getAgeGroupFromDOB(c.dob) === "1monthTo1year").length,
      count1y2y: children.filter((c) => getAgeGroupFromDOB(c.dob) === "1to2years").length,
      totalChildren25: children.filter((c) => getAgeGroupFromDOB(c.dob) === "2to5years").length,
      totalChildren618: children.filter((c) => getAgeGroupFromDOB(c.dob) === "6to18years").length,
      totalDeleted: recycleBin.length,
      missedVaccine: households.reduce((s, h) => s + (h.childMissedVaccine || 0), 0),
      overdueCount,
    };
  }, [households, pregnant, children, recycleBin]);

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const isToday = (d) => d && d.startsWith(today);
    return {
      surveys: households.filter((h) => isToday(h.createdAt)).length,
      pregnant: pregnant.filter((p) => isToday(p.createdAt)).length,
      children: children.filter((c) => isToday(c.createdAt)).length,
    };
  }, [households, pregnant, children]);

  // Use debouncedSearch for filtering to avoid excessive re-renders
  const filteredData = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return { households, pregnant, children };

    const match = (val) => String(val || "").toLowerCase().includes(q);

    return {
      households: households.filter(
        (h) => match(h.id) || match(h.headName) || match(h.guardianName) || match(h.contact)
      ),
      pregnant: pregnant.filter(
        (p) => match(p.hhNo) || match(p.name) || match(p.husbandName) || match(p.mobile)
      ),
      children: children.filter(
        (c) => match(c.hhNo) || match(c.name) || match(c.guardianName) || match(c.mobile)
      ),
    };
  }, [debouncedSearch, households, pregnant, children]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  return {
    households,
    pregnant,
    children,
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