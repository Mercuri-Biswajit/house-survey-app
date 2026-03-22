import { useLocation, useNavigate, Routes, Route } from "react-router-dom";
import { useAppState } from "./hooks/useAppState";
import MainLayout from "./components/layout/MainLayout";
import AppRoutes, { NAV_ITEMS } from "./routes/AppRoutes";
import LoginPage from "./features/auth/LoginPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import "./styles/variables.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/tabs.css";
import "./styles/print.css";

function AppShell() {
  const {
    stats, area, todayStats, isSidebarOpen, toggleSidebar,
    searchQuery, setSearchQuery, filteredData, refresh, recycleBin,
  } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.replace("/", "") || "dashboard";
  const currentLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label || "";
  return (
    <MainLayout
      isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar}
      activeTab={activeTab} navigate={navigate} stats={stats} area={area}
      todayStats={todayStats} currentLabel={currentLabel}
      households={filteredData.households} pregnant={filteredData.pregnant}
      allChildren={filteredData.children} searchQuery={searchQuery}
      setSearchQuery={setSearchQuery} onRefresh={refresh}
    >
      <AppRoutes
        stats={stats} households={filteredData.households}
        pregnant={filteredData.pregnant} children={filteredData.children}
        recycleBin={recycleBin} refresh={refresh}
      />
    </MainLayout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedRoute><AppShell /></ProtectedRoute>} />
    </Routes>
  );
}