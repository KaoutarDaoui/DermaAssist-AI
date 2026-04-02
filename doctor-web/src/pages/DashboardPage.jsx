import React, { useState } from "react";
import NavBar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import EnvironmentalBanner from "../components/EnvironmentalBanner";
import QuickStatsCards from "../components/QuickStatsCards";
import RecentPatients from "../components/RecentPatients";
import SystemStatus from "../components/SystemStatus";

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-[#F8F9FA]">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} />

      {/* Main Content - flex-1 makes it take remaining space */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Navigation Bar */}
        <NavBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          {/* Main Dashboard Content */}
          <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Main Layout: Left (Welcome + Stats) and Right (Environment) */}
            <div className="flex gap-6">
              {/* Left Column */}
              <div className="flex-1 flex flex-col gap-10">
                {/* Welcome Section */}
                <div>
                  <h1 className="text-4xl font-black text-emerald-950 tracking-tight">
                    Bonjour,{" "}
                    <span className="text-emerald-600">Dr. Ahmed Medina</span>
                  </h1>
                  <p className="text-emerald-600 font-medium mt-2">
                    Voici ce qui se passe dans votre cabinet aujourd'hui
                  </p>
                </div>

                {/* Quick Stats Cards */}
                <QuickStatsCards />
              </div>

              {/* Right Column - Environment Info */}
              <div className="w-56">
                <EnvironmentalBanner />
              </div>
            </div>

            {/* Recent Patients & System Status Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Recent Patients */}
              <div>
                <RecentPatients />
              </div>

              {/* System Status */}
              <div>
                <SystemStatus />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
