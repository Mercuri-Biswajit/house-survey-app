import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "../services/db";
import defaultAreaConfig from "../config/areaConfig";

export function useAppState() {
  const [households, setHouseholds] = useState([]);
  const [pregnant, setPregnant] = useState([]);
  const [children, setChildren] = useState([]);
  const [recycleBin, setRecycleBin] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [area, setArea] = useState(() => {
    const saved = localStorage.getItem("survey_area");
    return saved ? JSON.parse(saved) : defaultAreaConfig;
  });

  const refresh = useCallback(() => {
    db.migrateDeliveredPregnant();
    setHouseholds(db.getHouseholds());
    setPregnant(db.getPregnant());
    setChildren(db.getChildren());
    setRecycleBin(db.getRecycleBin());
  }, []);

  useEffect(() => {
    db.init();
    refresh();
  }, [refresh]);

  const stats = useMemo(() => {
    const getGroup = (dob) => (db.getAgeGroup ? db.getAgeGroup(dob) : null);
    return {
      totalHouses: households.length,
      totalMembers: households.reduce((s, h) => s + (h.familyMembers || 0), 0),
      totalPregnant: pregnant.length,
      countU1m: children.filter((c) => getGroup(c.dob) === "under1Month").length,
      count1m1y: children.filter((c) => getGroup(c.dob) === "1monthTo1year").length,
      count1y2y: children.filter((c) => getGroup(c.dob) === "1to2years").length,
      totalChildren25: children.filter((c) => getGroup(c.dob) === "2to5years").length,
      totalChildren618: children.filter((c) => getGroup(c.dob) === "6to18years").length,
      totalDeleted: recycleBin.length,
      missedVaccine: households.reduce((s, h) => s + (h.childMissedVaccine || 0), 0),
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

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return { households, pregnant, children };

    const match = (val) => String(val || "").toLowerCase().includes(q);

    return {
      households: households.filter(
        (h) => match(h.id) || match(h.headName) || match(h.mobile)
      ),
      pregnant: pregnant.filter(
        (p) => match(p.hhNo) || match(p.name) || match(p.mobile)
      ),
      children: children.filter(
        (c) => match(c.hhNo) || match(c.name) || match(c.guardianName)
      ),
    };
  }, [searchQuery, households, pregnant, children]);

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
