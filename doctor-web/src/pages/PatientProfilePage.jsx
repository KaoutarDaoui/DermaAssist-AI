import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import NavBar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import toast from "react-hot-toast";
import { ArrowLeft, Plus } from "lucide-react";
import { patients, ai } from "../services/api";

export default function PatientProfilePage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [patient, setPatient] = useState(null);
  const [consultationsList, setConsultationsList] = useState([]);
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
        const patientResponse = await patients.get(patientId);
        setPatient(patientResponse.data);

        // Load AI results history
        setConsultationsLoading(true);
        const aiResultsResponse = await ai.getPatientHistory(patientId);
        console.log("AI Results Response:", aiResultsResponse);
        const aiResultsData = Array.isArray(aiResultsResponse.data)
          ? aiResultsResponse.data
          : Array.isArray(aiResultsResponse)
            ? aiResultsResponse
            : [];
        setConsultationsList(aiResultsData);
      } catch (error) {
        console.error("Error loading data:", error);
        console.error("Error details:", {
          status: error.response?.status,
          message: error.response?.data?.detail || error.message,
          data: error.response?.data,
        });
        toast.error(
          error.response?.data?.detail ||
            error.message ||
            "Failed to load patient details or AI results",
        );
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
                  Historique des Analyses
                </h2>
                <button
                  onClick={handleAddConsultation}
                  className="flex items-center gap-2 bg-[#0F6E56] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#0d5a47] transition-colors"
                >
                  <Plus size={18} />
                  Ajouter une Analyse
                </button>
              </div>

              {consultationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-8 h-8">
                      <div className="absolute inset-0 border-4 border-slate-200 border-t-[#0F6E56] rounded-full animate-spin"></div>
                    </div>
                    <p className="text-slate-600 font-medium text-sm">
                      Chargement des analyses...
                    </p>
                  </div>
                </div>
              ) : consultationsList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {consultationsList.map((result, idx) => (
                    <div
                      key={result.id || idx}
                      className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-[#0F6E56]/30 transition-all p-6 flex flex-col"
                    >
                      {/* Header with Analysis Number */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">
                            Analyse
                          </p>
                          <h3 className="text-2xl font-bold text-[#0F6E56]">
                            #{idx + 1}
                          </h3>
                        </div>
                      </div>

                      {/* Date Section */}
                      <div className="mb-5 pb-5 border-b border-gray-200">
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">
                          Date
                        </p>
                        <p className="text-sm font-semibold text-gray-800">
                          {result.generated_at
                            ? new Date(result.generated_at).toLocaleDateString(
                                "fr-FR",
                                {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                },
                              )
                            : "Date non disponible"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {result.generated_at
                            ? new Date(result.generated_at).toLocaleTimeString(
                                "fr-FR",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : ""}
                        </p>
                      </div>

                      {/* Diagnosis Preview */}
                      {result.diagnosis && (
                        <div className="mb-4 pb-4 border-b border-gray-200">
                          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">
                            Diagnostic
                          </p>
                          <p className="text-sm font-semibold text-gray-800">
                            {result.diagnosis}
                          </p>
                          {result.confidence && (
                            <p className="text-xs text-gray-600 mt-1">
                              Confiance:{" "}
                              {result.confidence.percentage ||
                                result.confidence.score ||
                                "—"}
                              %
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action Button */}
                      <div className="mt-auto">
                        <button
                          onClick={() =>
                            navigate(`/consultations/${result.id}`, {
                              state: {
                                patientId,
                                consultationId: result.consultation_id,
                                sequentialNumber: idx + 1,
                              },
                            })
                          }
                          className="w-full bg-[#0F6E56] hover:bg-[#0d5a47] text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                          Voir Détails
                        </button>
                      </div>
                    </div>
                  ))}
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
