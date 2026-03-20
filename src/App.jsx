import { useLocation, useNavigate } from "react-router-dom";
import { useAppState } from "./hooks/useAppState";
import MainLayout from "./components/layout/MainLayout";
import AppRoutes, { NAV_ITEMS } from "./routes/AppRoutes";
import "./styles/variables.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/tabs.css";
import "./styles/print.css";

export default function App() {
  const {
    stats,
    area,
    todayStats,
    isSidebarOpen,
    toggleSidebar,
    searchQuery,
    setSearchQuery,
    filteredData,
    refresh,
    recycleBin,
  } = useAppState();

  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab from current URL path
  const activeTab = location.pathname.replace("/", "") || "dashboard";
  const currentLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label || "";

  return (
    <MainLayout
      isSidebarOpen={isSidebarOpen}
      toggleSidebar={toggleSidebar}
      activeTab={activeTab}
      navigate={navigate}
      stats={stats}
      area={area}
      todayStats={todayStats}
      currentLabel={currentLabel}
      households={filteredData.households}
      pregnant={filteredData.pregnant}
      allChildren={filteredData.children}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      onRefresh={refresh}
    >
      <AppRoutes
        stats={stats}
        households={filteredData.households}
        pregnant={filteredData.pregnant}
        children={filteredData.children}
        recycleBin={recycleBin}
        refresh={refresh}
      />
    </MainLayout>
  );
}
