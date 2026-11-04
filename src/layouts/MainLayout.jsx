import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar.jsx";
import Topbar from "../components/layout/Topbar.jsx";
import { CallProvider } from "../context/CallContext.jsx";
import IncomingCallPopup from "../components/ui/IncomingCallPopup.jsx";
import FloatingAssistant from "../components/assistant/FloatingAssistant.jsx";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <CallProvider>
      <div className="app">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="main">
          <Topbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

          <div className="content">
            <Outlet />
          </div>
        </main>
        
        <IncomingCallPopup />
        <FloatingAssistant />
      </div>
    </CallProvider>
  );
}
