import Sidebar from "./Sidebar";
import Header from "./Header";

export default function MainLayout({ 
  children, 
  isSidebarOpen, 
  toggleSidebar, 
  activeTab, 
  navigate, 
  stats, 
  area, 
  todayStats,
  currentLabel,
  households,
  pregnant,
  allChildren,

  searchQuery,
  setSearchQuery
}) {
  return (
    <div className={`app ${!isSidebarOpen ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        activeTab={activeTab}
        navigate={navigate}
        stats={stats}
        area={area}
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        todayStats={todayStats}
      />

      <main className="main">
        <Header
          currentLabel={currentLabel}
          area={area}
          households={households}
          pregnant={pregnant}
          children={allChildren}

          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          toggleSidebar={toggleSidebar}
        />

        <div className="content">
          {children}
        </div>
      </main>
    </div>
  );
}
