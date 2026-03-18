/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "./services/db";
import { exportToExcel, exportToPDF } from "./utils/exportUtils";
import Modal from "./components/Modal";
import AppRoutes, { NAV_ITEMS } from "./routes/AppRoutes";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import defaultAreaConfig from "./config/areaConfig";
import "./styles/variables.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/tabs.css";
import "./styles/print.css";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab from current URL path
  const activeTab = location.pathname.replace("/", "") || "dashboard";

  const [households, setHouseholds] = useState([]);
  const [pregnant, setPregnant] = useState([]);
  const [children, setChildren] = useState([]);
  const [recycleBin, setRecycleBin] = useState([]);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [area, setArea] = useState(() => {
    const saved = localStorage.getItem("survey_area");
    return saved ? JSON.parse(saved) : defaultAreaConfig;
  });

  useEffect(() => {
    db.init();
    refresh();
  }, []);

  function refresh() {
    db.migrateDeliveredPregnant(); // auto-migrate delivered pregnant → children
    setHouseholds(db.getHouseholds());
    setPregnant(db.getPregnant());
    setChildren(db.getChildren());
    setRecycleBin(db.getRecycleBin());
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  const stats = useMemo(() => {
    const getGroup = (dob) => (db.getAgeGroup ? db.getAgeGroup(dob) : null);
    return {
      totalHouses: households.length,
      totalMembers: households.reduce((s, h) => s + (h.familyMembers || 0), 0),
      totalPregnant: pregnant.length,
      countU1m: children.filter((c) => getGroup(c.dob) === "under1Month")
        .length,
      count1m1y: children.filter((c) => getGroup(c.dob) === "1monthTo1year")
        .length,
      count1y2y: children.filter((c) => getGroup(c.dob) === "1to2years").length,
      totalChildren25: children.filter((c) => getGroup(c.dob) === "2to5years")
        .length,
      totalChildren618: children.filter((c) => getGroup(c.dob) === "6to18years")
        .length,
      totalDeleted: recycleBin.length,
      missedVaccine: households.reduce(
        (s, h) => s + (h.childMissedVaccine || 0),
        0,
      ),
    };
  }, [households, pregnant, children]);

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

    const match = (val) =>
      String(val || "")
        .toLowerCase()
        .includes(q);

    return {
      households: households.filter(
        (h) => match(h.id) || match(h.headName) || match(h.mobile),
      ),
      pregnant: pregnant.filter(
        (p) => match(p.hhNo) || match(p.name) || match(p.mobile),
      ),
      children: children.filter(
        (c) => match(c.hhNo) || match(c.name) || match(c.guardianName),
      ),
    };
  }, [searchQuery, households, pregnant, children]);

  const currentLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label || "";

  return (
    <div className={`app ${!isSidebarOpen ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        activeTab={activeTab}
        navigate={navigate}
        stats={stats}
        area={area}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        todayStats={todayStats}
      />

      <main className="main">
        <Header
          currentLabel={currentLabel}
          area={area}
          households={households}
          pregnant={pregnant}
          children={children}
          showToast={showToast}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <div className="content">
          <AppRoutes
            stats={stats}
            households={filteredData.households}
            pregnant={filteredData.pregnant}
            children={filteredData.children}
            recycleBin={recycleBin}
            refresh={refresh}
            showToast={showToast}
          />
        </div>
      </main>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}
    </div>
  );
}
