import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Phone, Settings } from "lucide-react";
import Logo from "./Logo";

export default function Sidebar({ open }) {
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: "Tableau de bord", path: "/dashboard" },
    { icon: Users, label: "Patients", path: "/patients" },
    { icon: Phone, label: "Contact", path: "/contact" },
    { icon: Settings, label: "Paramètres", path: "/settings" },
  ];

  return (
    <div
      className={`w-60 bg-[#0A3F34] text-white flex flex-col transition-all duration-300 ${
        !open ? "hidden" : ""
      }`}
    >
      {/* Logo */}
      <Logo />

      {/* Menu Items */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item, idx) => {
          const IconComponent = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path === "/dashboard" && location.pathname === "/");

          return (
            <Link
              key={idx}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-all duration-300 group ${
                isActive
                  ? "bg-gradient-to-r from-emerald-500/40 to-teal-500/40 text-white border border-emerald-400/50 shadow-lg shadow-emerald-500/20"
                  : "text-white/70 hover:text-white hover:bg-white/10 border border-transparent"
              }`}
            >
              <IconComponent
                size={20}
                className={
                  isActive
                    ? "text-emerald-400"
                    : "group-hover:text-emerald-400 transition-colors"
                }
              />
              <span className="font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 text-center text-xs text-white/50 font-semibold uppercase tracking-wider">
        <p>© 2026 Skin+</p>
      </div>
    </div>
  );
}
