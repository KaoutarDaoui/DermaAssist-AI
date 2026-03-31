import React, { useState } from "react";
import NavBar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import EnvironmentalBanner from "../components/EnvironmentalBanner";
import QuickStatsCards from "../components/QuickStatsCards";
import PatientCard from "../components/PatientCard";
import SkinImageViewer from "../components/SkinImageViewer";
import AIResultPanel from "../components/AIResultPanel";
import RecentCheckIns from "../components/RecentCheckIns";

export default function DashboardPageNew() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [imageMode, setImageMode] = useState("main");

  return (
    <div className="flex h-screen bg-[#F8F9FA]">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <NavBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          {/* Environmental Banner */}
          <EnvironmentalBanner />

          {/* Main Dashboard Content */}
          <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Quick Stats Cards */}
            <QuickStatsCards />

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column - Patient & Images */}
              <div className="col-span-8 space-y-6">
                {/* Patient Card */}
                <PatientCard />

                {/* Skin Image Viewer */}
                <SkinImageViewer
                  imageMode={imageMode}
                  setImageMode={setImageMode}
                />
              </div>

              {/* Right Column - AI Analysis */}
              <div className="col-span-4">
                <AIResultPanel />
              </div>
            </div>

            {/* Recent Check-ins */}
            <RecentCheckIns />
          </div>
        </div>
      </div>
    </div>
  );
}
