/* eslint-disable react-refresh/only-export-components */
import { Routes, Route, Navigate } from "react-router-dom";
import HouseholdsTab from "../features/households/HouseholdsTab";
import PregnantTab from "../features/pregnant/PregnantTab";
import ChildrenTab from "../features/children/ChildrenTab";
import Children6to18Tab from "../features/children/Children6to18Tab";
import Children2to5Tab from "../features/children/Children2to5Tab";
import AllChildrenTab from "../features/children/AllChildrenTab";
import DashboardTab from "../features/dashboard/DashboardTab";
import RecycleBinTab from "../features/recycle-bin/RecycleBinTab";
import AlertsTab from "../features/alerts/AlertsTab";
import SettingsTab from "../features/settings/SettingsTab";

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "alerts", label: "Alerts & Due Dates", icon: "🔔", badgeKey: "overdueCount", badgeColor: "red" },
  { id: "households", label: "Households", icon: "⌂", badgeKey: "totalHouses" },
  {
    id: "pregnant",
    label: "Pregnant",
    icon: "♀",
    badgeKey: "totalPregnant",
    badgeColor: "teal",
  },
  {
    id: "under1Month",
    label: "< 1 Month",
    icon: "👶",
    badgeKey: "countU1m",
    badgeColor: "blue",
  },
  {
    id: "1monthTo1year",
    label: "1M – 1 Year",
    icon: "🍼",
    badgeKey: "count1m1y",
    badgeColor: "teal",
  },
  {
    id: "1to2years",
    label: "1 – 2 Years",
    icon: "🐥",
    badgeKey: "count1y2y",
    badgeColor: "purple",
  },
  {
    id: "children25",
    label: "2 – 5 Years",
    icon: "❋",
    badgeKey: "totalChildren25",
    badgeColor: "amber",
  },
  {
    id: "children618",
    label: "6 – 18 Years",
    icon: "🎒",
    badgeKey: "totalChildren618",
    badgeColor: "purple",
  },
  { id: "allChildren", label: "All Children", icon: "🧒" },
  {
    id: "recycleBin",
    label: "Recycle Bin",
    icon: "🗑",
    badgeKey: "totalDeleted",
    badgeColor: "red",
  },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export default function AppRoutes({
  stats,
  households,
  pregnant,
  children,
  refresh,
}) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <DashboardTab
            stats={stats}
            households={households}
            pregnant={pregnant}
            children={children}
          />
        }
      />
      <Route
        path="/alerts"
        element={
          <AlertsTab
            children={children}
            pregnant={pregnant}
          />
        }
      />
      <Route
        path="/households"
        element={
          <HouseholdsTab
            data={households}
            allPregnant={pregnant}
            allChildren={children}
            onRefresh={refresh}
          />
        }
      />
      <Route
        path="/pregnant"
        element={
          <PregnantTab
            data={pregnant}
            onRefresh={refresh}
          />
        }
      />
      <Route
        path="/under1Month"
        element={
          <ChildrenTab
            data={children}
            filterGroup="under1Month"
            onRefresh={refresh}
          />
        }
      />
      <Route
        path="/1monthTo1year"
        element={
          <ChildrenTab
            data={children}
            filterGroup="1monthTo1year"
            onRefresh={refresh}
          />
        }
      />
      <Route
        path="/1to2years"
        element={
          <ChildrenTab
            data={children}
            filterGroup="1to2years"
            onRefresh={refresh}
          />
        }
      />
      <Route
        path="/children25"
        element={
          <Children2to5Tab
            data={children}
            onRefresh={refresh}
          />
        }
      />
      <Route
        path="/children618"
        element={
          <Children6to18Tab
            data={children}
            onRefresh={refresh}
          />
        }
      />
      <Route
        path="/allChildren"
        element={
          <AllChildrenTab
            data={children}
            households={households}
            onRefresh={refresh}
          />
        }
      />
      <Route
        path="/recycleBin"
        element={<RecycleBinTab onRefresh={refresh} />}
      />
      <Route
        path="/settings"
        element={<SettingsTab onAreaChange={refresh} />}
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}