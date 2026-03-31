import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import NavBar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import toast from "react-hot-toast";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { ai } from "../services/api";

export default function ConsultationPage() {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const patientId = location.state?.patientId;
  const consultationNumber = location.state?.consultationId;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [consultationData, setConsultationData] = useState(null);
  const [aiResults, setAiResults] = useState(null);
  const [skinImage, setSkinImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (!patientId || !consultationNumber) {
          toast.error(
            "Patient ID or Consultation ID not found. Please go back and try again."
          );
          return;
        }

        // Fetch AI results for this consultation
        const aiResultsResponse = await ai.getResultByConsultation(
          patientId,
          consultationNumber
        );

        setAiResults(aiResultsResponse.data);
        setConsultationData({
          consultation_id: consultationNumber,
          id: consultationId,
          date: aiResultsResponse.data.generated_at,
        });

        // Fetch skin image for this consultation
        try {
          const skinImageResponse = await ai.getSkinImage(
            patientId,
            consultationNumber
          );
          setSkinImage(skinImageResponse.data);
        } catch (imgError) {
          console.log("No skin image found for this consultation:", imgError);
        }
      } catch (error) {
        console.error("Error loading consultation:", error);
        const errorMsg =
          error.response?.data?.detail ||
          error.message ||
          "Failed to load consultation details";
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [consultationId, patientId, consultationNumber]);

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
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-[#0F6E56] hover:text-[#0d5a47] transition-colors font-semibold text-sm mb-4"
            >
              <ArrowLeft size={18} />
              Retour
            </button>

            {!consultationData ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-600">
                  Unable to load consultation. Please go back and try again.
                </p>
              </div>
            ) : (
              <>
                {/* Consultation Header */}
                <div className="bg-gradient-to-r from-[#0F6E56] to-emerald-600 rounded-xl shadow-md p-8 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-4xl font-bold mb-2">
                        Consultation #{consultationData.consultation_id}
                      </h1>
                      <p className="text-white/80 text-sm">
                        {consultationData.date
                          ? new Date(consultationData.date).toLocaleDateString(
                              "fr-FR",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "Date non disponible"}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-white text-[#0F6E56] px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                      >
                        <Printer size={18} />
                        Imprimer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Skin Image Section */}
                {skinImage && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">
                      Photo de la Peau
                    </h2>
                    <div className="flex flex-col items-center">
                      {skinImage.image_data ? (
                        <img
                          src={skinImage.image_data}
                          alt="Skin Image"
                          className="max-w-2xl max-h-96 object-cover rounded-lg border border-gray-300"
                        />
                      ) : skinImage.image_url ? (
                        <img
                          src={skinImage.image_url}
                          alt="Skin Image"
                          className="max-w-2xl max-h-96 object-cover rounded-lg border border-gray-300"
                        />
                      ) : (
                        <p className="text-gray-600">Aucune image disponible</p>
                      )}
                      <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
                        <span>Source: <strong>{skinImage.source === "doctor" ? "Médecin" : "Patient"}</strong></span>
                        {skinImage.uploaded_at && (
                          <span>• Uploadée le: <strong>{new Date(skinImage.uploaded_at).toLocaleDateString("fr-FR")}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {aiResults && (
                  <div className="space-y-6">
                    {/* Diagnostic Section */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">
                          Diagnostic
                        </h2>
                        <div className="space-y-4">
                          <div className="bg-[#0F6E56]/5 border border-[#0F6E56]/20 rounded-lg p-4">
                            <p className="text-sm text-gray-600 uppercase tracking-widest font-semibold mb-2">
                              Diagnostic Principal
                            </p>
                            <p className="text-2xl font-bold text-[#0F6E56]">
                              {aiResults.diagnosis || "—"}
                            </p>
                          </div>

                          {aiResults.confidence && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <p className="text-sm text-gray-600 uppercase tracking-widest font-semibold mb-2">
                                Score de Confiance
                              </p>
                              <div className="space-y-2">
                                <p className="text-2xl font-bold text-blue-600">
                                  {aiResults.confidence.percentage ||
                                    aiResults.confidence.score ||
                                    "—"}
                                  %
                                </p>
                                <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600"
                                    style={{
                                      width: `${
                                        aiResults.confidence.percentage ||
                                        aiResults.confidence.score ||
                                        0
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Environment Snapshot */}
                      {aiResults.env_snapshot && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                          <h2 className="text-lg font-bold text-gray-900 mb-4">
                            Informations du Patient
                          </h2>
                          <div className="space-y-3">
                            {aiResults.env_snapshot.fitzpatrick_type && (
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <span className="text-sm font-semibold text-gray-700">
                                  Type Fitzpatrick:
                                </span>
                                <span className="text-sm font-bold text-[#0F6E56]">
                                  {aiResults.env_snapshot.fitzpatrick_type.replace(
                                    "TYPE_",
                                    "Type "
                                  ) || "—"}
                                </span>
                              </div>
                            )}

                            {aiResults.env_snapshot.city && (
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <span className="text-sm font-semibold text-gray-700">
                                  Ville:
                                </span>
                                <span className="text-sm font-bold text-gray-900">
                                  {aiResults.env_snapshot.city || "—"}
                                </span>
                              </div>
                            )}

                            {aiResults.env_snapshot.medical_history && (
                              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-sm font-semibold text-gray-700 mb-2">
                                  Antécédents Médicaux:
                                </p>
                                <p className="text-sm text-gray-600">
                                  {aiResults.env_snapshot.medical_history ||
                                    "Aucun"}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Clinical Questions Section */}
                    {aiResults.suggested_questions &&
                      aiResults.suggested_questions.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                          <h2 className="text-lg font-bold text-gray-900 mb-6">
                            Questions Cliniques et Réponses
                          </h2>
                          <div className="space-y-4">
                            {aiResults.suggested_questions.map(
                              (question, idx) => (
                                <div
                                  key={idx}
                                  className="border border-[#0F6E56]/20 rounded-lg p-5 bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex gap-4">
                                    <div className="w-8 h-8 bg-[#0F6E56] text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-800 mb-2">
                                        {question.question || "Question"}
                                      </p>
                                      {question.selected_option && (
                                        <div className="bg-[#0F6E56] text-white px-3 py-1 rounded-full text-sm font-medium w-fit">
                                          ✓ {question.selected_option}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Treatment Options Section */}
                    {aiResults.treatment_options &&
                      aiResults.treatment_options.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                          <h2 className="text-lg font-bold text-gray-900 mb-6">
                            Traitements Recommandés
                          </h2>

                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-[#0F6E56] text-white">
                                <tr className="text-left text-xs tracking-widest uppercase font-bold">
                                  <th className="px-6 py-4">#</th>
                                  <th className="px-6 py-4">Médicament</th>
                                  <th className="px-6 py-4">Classe</th>
                                  <th className="px-6 py-4">Indication</th>
                                  <th className="px-6 py-4">Posologie</th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-gray-100">
                                {aiResults.treatment_options.map(
                                  (treatment, idx) => (
                                    <tr
                                      key={idx}
                                      className="bg-white hover:bg-gray-50 transition-colors"
                                    >
                                      <td className="px-6 py-4 align-top text-gray-800 font-bold">
                                        {idx + 1}
                                      </td>
                                      <td className="px-6 py-4 align-top text-gray-800 font-semibold">
                                        {treatment.nom || "—"}
                                      </td>
                                      <td className="px-6 py-4 align-top text-gray-600">
                                        {treatment.classe || "—"}
                                      </td>
                                      <td className="px-6 py-4 align-top text-gray-600">
                                        {treatment.indication || "—"}
                                      </td>
                                      <td className="px-6 py-4 align-top text-gray-600">
                                        {treatment.posologie || "—"}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
