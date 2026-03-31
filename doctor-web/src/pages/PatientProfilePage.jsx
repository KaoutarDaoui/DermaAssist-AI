import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import NavBar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import toast from "react-hot-toast";
import { ArrowLeft, Plus } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function PatientProfilePage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [patient, setPatient] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [consultationsLoading, setConsultationsLoading] = useState(false);

  const toDisplayText = (value, fallback = "N/A") => {
    if (value === null || value === undefined || value === "") return fallback;

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return fallback;
      return value
        .map((item) =>
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean"
            ? String(item)
            : JSON.stringify(item),
        )
        .join(", ");
    }

    if (typeof value === "object") {
      return (
        value.texte ||
        value.text ||
        value.message ||
        value.label ||
        JSON.stringify(value)
      );
    }

    return fallback;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load patient info
        const patientResponse = await axios.get(
          `${API_URL}/patients/${patientId}`
        );
        setPatient(patientResponse.data);

        // Load consultations
        setConsultationsLoading(true);
        const consultationsResponse = await axios.get(
          `${API_URL}/consultations/patients/${patientId}/consultations`
        );
        setConsultations(consultationsResponse.data || []);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load patient details or consultations");
      } finally {
        setLoading(false);
        setConsultationsLoading(false);
      }
    };

    loadData();
  }, [patientId]);

  const handleAddConsultation = () => {
    navigate(`/patients/${patientId}/consultation`);
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="flex h-screen bg-slate-50">
          <Sidebar open={sidebarOpen} />
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-slate-200 border-t-[#0F6E56] rounded-full animate-spin"></div>
              </div>
              <p className="text-slate-600 font-medium text-sm">
                Chargement en cours...
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <NavBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex-1 overflow-auto">
          <div className="p-8 space-y-6 max-w-7xl mx-auto pb-12">
            {/* Back Button */}
            <button
              onClick={() => navigate("/patients")}
              className="flex items-center gap-2 text-[#0F6E56] hover:text-[#0d5a47] transition-colors font-semibold text-sm mb-4"
            >
              <ArrowLeft size={18} />
              Retour aux Patients
            </button>

            {/* Patient Information Card */}
            {patient && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow">
                {/* Top Section */}
                <div className="mb-8">
                  <h1 className="text-4xl font-bold text-gray-900 mb-1">
                    {patient.user?.full_name || "Patient"}
                  </h1>
                  <p className="text-[#0F6E56] font-medium text-sm">
                    {patient.user?.email}
                  </p>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200 mb-8"></div>

                {/* Info Grid */}
                <div className="grid grid-cols-5 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                      Téléphone
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {patient.phone || "—"}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                      Ville
                    </p>
                    <p className="text-sm font-semibold text-gray-700">
                      {patient.city || "—"}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                      Type Fitzpatrick
                    </p>
                    <p className="text-sm font-bold text-[#0F6E56]">
                      {patient.fitzpatrick_type?.replace("TYPE_", "Type ")}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                      Antécédents
                    </p>
                    <p className="text-sm text-gray-700 font-medium">
                      {patient.medical_history || "Aucun"}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col justify-between">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                      Statut
                    </p>
                    <span className="inline-flex items-center gap-2 w-fit">
                      <span className="w-2.5 h-2.5 bg-[#0F6E56] rounded-full"></span>
                      <span className="px-3 py-1 bg-[#0F6E56]/10 text-[#0F6E56] rounded-full text-xs font-semibold uppercase tracking-wider border border-[#0F6E56]/20">
                        Actif
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Consultation History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Historique des Consultations
                </h2>
                <button
                  onClick={handleAddConsultation}
                  className="flex items-center gap-2 bg-[#0F6E56] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#0d5a47] transition-colors"
                >
                  <Plus size={18} />
                  Ajouter une Consultation
                </button>
              </div>

              {consultationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-8 h-8">
                      <div className="absolute inset-0 border-4 border-slate-200 border-t-[#0F6E56] rounded-full animate-spin"></div>
                    </div>
                    <p className="text-slate-600 font-medium text-sm">
                      Chargement des consultations...
                    </p>
                  </div>
                </div>
              ) : consultations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr className="text-left text-xs tracking-widest uppercase font-bold text-[#0F6E56]/70">
                        <th className="px-6 py-4">ID Consultation</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Statut</th>
                        <th className="px-6 py-4">Notes</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {consultations.map((consultation, idx) => (
                        <tr
                          key={consultation.id || idx}
                          className="bg-white hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 align-top text-gray-800 font-bold">
                            #{consultation.consultation_id || consultation.id}
                          </td>
                          <td className="px-6 py-4 align-top text-gray-600">
                            {consultation.created_at
                              ? new Date(
                                  consultation.created_at
                                ).toLocaleDateString("fr-FR")
                              : "—"}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-200 uppercase tracking-wider">
                              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                              {consultation.status || "Complétée"}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top text-gray-600 max-w-xs truncate">
                            {consultation.notes || "—"}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <button
                              onClick={() =>
                                navigate(
                                  `/consultations/${consultation.id}`
                                )
                              }
                              className="text-[#0F6E56] hover:text-[#0d5a47] font-semibold text-sm hover:underline transition-colors"
                            >
                              Voir Détails
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium mb-3">
                    Aucune consultation enregistrée
                  </p>
                  <p className="text-gray-500 text-sm mb-6">
                    Commencez par ajouter une nouvelle consultation pour ce
                    patient.
                  </p>
                  <button
                    onClick={handleAddConsultation}
                    className="flex items-center gap-2 bg-[#0F6E56] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#0d5a47] transition-colors"
                  >
                    <Plus size={18} />
                    Ajouter une Consultation
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
