import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../services/authStore";
import { Menu, Search, Bell, User } from "lucide-react";

export default function NavBar({ onMenuClick }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const doctor = {
    name: user?.fullName || "Dr. Ahmed Medina",
    avatar:
      user?.fullName
        ?.split(" ")
        .map((n) => n[0])
        .join("") || "DR",
  };

  return (
    <div className="bg-[#0A3F34] border-b border-emerald-600/30 px-8 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-sm shadow-lg">
      {/* Left - Menu Toggle & Search */}
      <div className="flex items-center gap-6 flex-1">
        {/* Menu Toggle */}
        <button
          onClick={onMenuClick}
          className="w-10 h-10 rounded-xl border border-emerald-500/30 flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300 group"
          title="Afficher/Masquer la barre latérale"
        >
          <Menu
            size={20}
            className="group-hover:scale-110 transition-transform"
          />
        </button>

        {/* Search Input */}
        <div className="flex-1 max-w-md flex items-center gap-3 px-5 py-3 rounded-xl border border-emerald-500/20 bg-emerald-950/40 backdrop-blur-md hover:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:border-emerald-500/50 transition-all duration-300">
          <Search
            size={18}
            className="text-emerald-500/70 group-focus-within:text-emerald-400 transition-colors"
          />
          <input
            type="text"
            placeholder="Rechercher un patient, une condition..."
            className="flex-1 bg-transparent text-emerald-100 placeholder-emerald-500/50 focus:outline-none font-medium"
          />
        </div>
      </div>

      {/* Right - Notifications & Profile */}
      <div className="flex items-center gap-5">
        {/* Notification Bell */}
        <button
          onClick={() => navigate("/notifications")}
          className="relative w-10 h-10 rounded-xl border border-emerald-500/30 flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300 group"
          title="Voir les notifications"
        >
          <Bell
            size={20}
            className="group-hover:scale-110 transition-transform"
          />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></span>
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-emerald-500/20"></div>

        {/* Doctor Profile */}
        <div
          onClick={() => navigate("/profile")}
          className="flex items-center gap-3 px-3 cursor-pointer group transition-all duration-300 hover:bg-emerald-500/15 rounded-xl py-2 -mr-2"
        >
          {/* Avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-sm group-hover:shadow-emerald-500/50 transition-all">
            <User size={18} />
          </div>

          {/* Name */}
          <span className="font-semibold text-emerald-100 text-sm group-hover:text-emerald-50 transition-colors">
            {doctor.name}
          </span>
        </div>
      </div>
    </div>
  );
}
