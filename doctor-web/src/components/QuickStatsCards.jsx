import React, { useState, useEffect } from "react";
import { Users, Clipboard, Brain } from "lucide-react";
import axios from "axios";
import "../styles/animations.css"; // For pulsing animation

const API_URL = "http://localhost:8000";

export default function QuickStatsCards() {
  const [totalPatients, setTotalPatients] = useState(0);
  const [patientsThisMonth, setPatientsThisMonth] = useState(0);
  const [totalConsultations, setTotalConsultations] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Fetch all patients
      const patientsResponse = await axios.get(`${API_URL}/patients`);
      const allPatients = patientsResponse.data || [];
      setTotalPatients(allPatients.length);

      // Calculate patients this month
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const thisMonth = allPatients.filter((patient) => {
        if (patient.created_at) {
          const createdDate = new Date(patient.created_at);
          return (
            createdDate.getMonth() === currentMonth &&
            createdDate.getFullYear() === currentYear
          );
        }
        return false;
      }).length;
      setPatientsThisMonth(thisMonth);

      // Fetch consultations
      try {
        const consultationsResponse = await axios.get(
          `${API_URL}/consultations`,
        );
        const consultations = consultationsResponse.data || [];
        setTotalConsultations(
          Array.isArray(consultations) ? consultations.length : 0,
        );
      } catch (err) {
        console.log("Consultations endpoint not available, setting to 0");
        setTotalConsultations(0);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const stats = [
    { label: "Total Patients", value: totalPatients.toString(), icon: Users },
    {
      label: "Patients this month",
      value: patientsThisMonth.toString(),
      icon: Clipboard,
    },
    {
      label: "Consultations",
      value: totalConsultations.toString(),
      icon: Brain,
      hasPulse: true,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-6">
      {stats.map((stat, idx) => {
        const IconComponent = stat.icon;
        return (
          <div
            key={idx}
            className={`relative group overflow-hidden rounded-2xl bg-white border-2 border-emerald-200 px-8 py-8 flex items-center justify-between transition-all duration-500 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-100 hover:-translate-y-1`}
          >
            {/* Animated gradient background on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Top accent line */}
            <div className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 w-0 group-hover:w-full transition-all duration-500"></div>
            
            {/* Content */}
            <div className="relative z-10">
              <p className="text-emerald-600 text-sm font-semibold tracking-wider mb-3 uppercase opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                {stat.label}
              </p>
              <p className="text-5xl font-black text-emerald-900 transition-all duration-300 group-hover:text-emerald-700">
                {stat.value}
              </p>
            </div>
            
            {/* Icon */}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 transition-all duration-500 group-hover:shadow-lg group-hover:shadow-emerald-300/30">
                <IconComponent 
                  size={40} 
                  className={`text-emerald-600 transition-all duration-500 group-hover:scale-110`}
                />
              </div>
              {stat.hasPulse && (
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse delay-100"></div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
