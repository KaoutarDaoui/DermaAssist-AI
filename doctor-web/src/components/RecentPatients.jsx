import React, { useState, useEffect } from "react";
import {
  ChevronRight,
  User,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8000";

export default function RecentPatients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/patients`);
      // Get the last 3 patients
      const lastThree = response.data.slice(-3).reverse();
      setPatients(lastThree);
    } catch (error) {
      console.error("Error loading patients:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-emerald-200 p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-black text-emerald-900">
            Patients récents
          </h2>
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-300 uppercase tracking-wide">
            <TrendingUp size={14} />
            Récents
          </span>
        </div>
        <button
          onClick={() => navigate("/patients")}
          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-all font-semibold text-sm group"
        >
          Voir tout
          <ChevronRight
            size={18}
            className="group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-emerald-500">Chargement des patients...</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-emerald-500">Aucun patient pour le moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {patients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => navigate(`/patients/${patient.id}`)}
              className="group relative overflow-hidden rounded-xl bg-emerald-50 border border-emerald-200 p-5 hover:border-emerald-400 hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md">
                    {patient.user?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "P"}
                  </div>

                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-emerald-900 text-lg">
                      {patient.user?.full_name || "Patient"}
                    </h3>
                    <div className="space-y-1 mt-2 text-sm text-emerald-600">
                      {patient.user?.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={14} />
                          <span className="truncate">{patient.user.email}</span>
                        </div>
                      )}
                      {patient.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} />
                          <span>{patient.phone}</span>
                        </div>
                      )}
                      {patient.city && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} />
                          <span>{patient.city}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight
                  className="text-emerald-400 group-hover:text-emerald-600 flex-shrink-0 mt-1 transition-colors group-hover:translate-x-1 transition-transform"
                  size={20}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
