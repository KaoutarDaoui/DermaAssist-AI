import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import NavBar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import toast from "react-hot-toast";
import { ArrowLeft, Upload } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const EMPTY_TREATMENT_DRAFT = {
  nom: "",
  classe: "",
  indication: "",
  posologie: "",
};

export default function PatientDetailsPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [advancedAnalyzing, setAdvancedAnalyzing] = useState(false);
  const [advancedResults, setAdvancedResults] = useState(null);
  const [selectedQuestionOptions, setSelectedQuestionOptions] = useState({});
  const [selectedTreatments, setSelectedTreatments] = useState({});
  const [customTreatments, setCustomTreatments] = useState([]);
  const [newTreatmentDraft, setNewTreatmentDraft] = useState(
    EMPTY_TREATMENT_DRAFT,
  );

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

  const normalizeClinicalQuestions = (questions) => {
    if (!Array.isArray(questions)) return [];

    return questions
      .map((q) => {
        if (
          typeof q === "string" ||
          typeof q === "number" ||
          typeof q === "boolean"
        ) {
          return { text: String(q), options: [] };
        }

        if (q && typeof q === "object") {
          const text = toDisplayText(
            q.texte || q.text || q.question || q.message || q.title,
            "",
          );

          const rawOptions = Array.isArray(q.options)
            ? q.options
            : Array.isArray(q.choices)
              ? q.choices
              : [];

          const options = rawOptions
            .map((opt) => toDisplayText(opt, ""))
            .filter(Boolean);

          if (!text) {
            return null;
          }

          return { text, options };
        }

        return null;
      })
      .filter(Boolean);
  };

  const normalizeTreatmentRows = (medicaments) => {
    if (!Array.isArray(medicaments)) return [];

    return medicaments
      .map((med, idx) => {
        if (
          typeof med === "string" ||
          typeof med === "number" ||
          typeof med === "boolean"
        ) {
          return {
            id: `med-${idx}`,
            nom: String(med),
            classe: "-",
            indication: "-",
            posologie: "-",
          };
        }

        if (med && typeof med === "object") {
          return {
            id: med.id || med.nom || med.name || `med-${idx}`,
            nom: toDisplayText(
              med.nom || med.name || med.medicament || med.label,
              `Médicament ${idx + 1}`,
            ),
            classe: toDisplayText(
              med.classe || med.class || med.categorie,
              "-",
            ),
            indication: toDisplayText(
              med.indication || med.utilisation || med.usage,
              "-",
            ),
            posologie: toDisplayText(
              med.posologie || med.dosage || med.dose,
              "-",
            ),
          };
        }

        return null;
      })
      .filter(Boolean);
  };

  const displayedIllness =
    analysisResults?.stored?.cnn_label ||
    analysisResults?.condition_name ||
    analysisResults?.illness_name ||
    "Unknown";

  const displayedConfidence =
    analysisResults?.stored?.cnn_confidence ??
    analysisResults?.confidence_pct ??
    Math.round((analysisResults?.confidence || 0) * 100);

  const clinicalQuestions = normalizeClinicalQuestions(
    advancedResults?.questions,
  );
  const treatmentRows = normalizeTreatmentRows(advancedResults?.medicaments);
  const allTreatmentRows = [...treatmentRows, ...customTreatments];

  const selectedTreatmentCount = allTreatmentRows.reduce(
    (count, treatment, idx) =>
      count + (selectedTreatments[`${treatment.id}-${idx}`] ? 1 : 0),
    0,
  );

  const handleAddCustomTreatment = () => {
    if (!newTreatmentDraft.nom.trim()) {
      toast.error("Le nom du médicament est requis");
      return;
    }

    const customRow = {
      id: `custom-${Date.now()}-${customTreatments.length}`,
      nom: newTreatmentDraft.nom.trim(),
      classe: newTreatmentDraft.classe.trim() || "-",
      indication: newTreatmentDraft.indication.trim() || "-",
      posologie: newTreatmentDraft.posologie.trim() || "-",
      isCustom: true,
    };

    setCustomTreatments((prev) => [...prev, customRow]);
    setNewTreatmentDraft(EMPTY_TREATMENT_DRAFT);
    toast.success("Médicament ajouté");
  };

  useEffect(() => {
    loadPatient();
  }, [patientId]);

  const loadPatient = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/patients/${patientId}`);
      setPatient(response.data);
    } catch (error) {
      console.error("Error loading patient:", error);
      toast.error("Failed to load patient details");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setImageFile(file);
        setShowAnalysis(false);
        setAdvancedResults(null);
        setSelectedQuestionOptions({});
        setSelectedTreatments({});
        setCustomTreatments([]);
        setNewTreatmentDraft(EMPTY_TREATMENT_DRAFT);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!imagePreview || !imageFile) {
      toast.error("Please upload an image first");
      return;
    }

    setAnalyzing(true);
    try {
      // 1) Upload to skin_images table
      const uploadData = new FormData();
      uploadData.append("file", imageFile);

      const uploadResponse = await axios.post(
        `${API_URL}/patients/${patientId}/skin-images`,
        uploadData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const imageId = uploadResponse?.data?.id;
      if (!imageId) {
        throw new Error("Upload succeeded but image ID is missing");
      }

      // 2) Run Module 1 using stored image and persist cnn_label/cnn_confidence
      const analysisResponse = await axios.post(
        `${API_URL}/patients/${patientId}/analyze-skin-image`,
        { image_id: String(imageId) },
      );

      console.log("Analysis completed:", analysisResponse.data);
      setAnalysisResults(analysisResponse.data);
      setAdvancedResults(null);
      setSelectedQuestionOptions({});
      setSelectedTreatments({});
      setCustomTreatments([]);
      setNewTreatmentDraft(EMPTY_TREATMENT_DRAFT);
      setShowAnalysis(true);
      toast.success("Module 1 analysis completed and saved!");
    } catch (error) {
      console.error("Error during analysis:", error);

      const errorMsg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to analyze image";
      toast.error(errorMsg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAdvancedAnalysis = async () => {
    if (!analysisResults?.image_id) {
      toast.error("Please run Start Analysis first");
      return;
    }

    setAdvancedAnalyzing(true);
    try {
      const response = await axios.post(
        `${API_URL}/patients/${patientId}/advanced-analysis`,
        { image_id: String(analysisResults.image_id) },
      );

      setAdvancedResults(response.data?.rag || null);
      setSelectedQuestionOptions({});
      setSelectedTreatments({});
      setCustomTreatments([]);
      setNewTreatmentDraft(EMPTY_TREATMENT_DRAFT);
      toast.success("Advanced analysis completed!");
    } catch (error) {
      console.error("Error during advanced analysis:", error);
      const errorMsg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to run advanced analysis";
      toast.error(errorMsg);
    } finally {
      setAdvancedAnalyzing(false);
    }
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
              <p className="text-slate-600 font-medium text-sm">Chargement en cours...</p>
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

            {/* Patient Info Card */}
            {patient && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow">
                {/* Top Section */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-gray-900">
                      {patient.user?.full_name || "Patient"}
                    </h1>
                    <p className="text-[#0F6E56] font-medium text-sm">
                      {patient.user?.email}
                    </p>
                  </div>
                  <div className="text-right space-y-4">
                    <div className="inline-block ml-auto">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">
                        Téléphone
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {patient.phone || "—"}
                      </p>
                    </div>
                    <div className="inline-block ml-auto">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">
                        Ville
                      </p>
                      <p className="text-lg font-semibold text-gray-700">
                        {patient.city || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200 mb-8"></div>

                {/* Info Grid */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                      Type Fitzpatrick
                    </p>
                    <p className="text-lg font-bold text-[#0F6E56]">
                      {patient.fitzpatrick_type?.replace("TYPE_", "Type ")}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                      Antécédents Médicaux
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

            {/* Upload and Analysis Section */}
            <div className="grid grid-cols-3 gap-6">
              {/* Left: Upload Section */}
              <div className="col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  {/* Header */}
                  <div className="mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0F6E56] rounded-lg flex items-center justify-center">
                      <Upload size={20} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Analyse d'Images Dermato
                    </h2>
                  </div>

                  {!imagePreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#0F6E56] hover:bg-gray-50 transition-all group">
                      <div className="flex flex-col items-center justify-center pt-8 pb-8">
                        <div className="w-16 h-16 bg-[#0F6E56]/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#0F6E56]/20 transition-colors">
                          <Upload size={32} className="text-[#0F6E56]" />
                        </div>
                        <p className="text-sm text-gray-700 text-center">
                          <span className="font-bold text-[#0F6E56]">
                            Cliquez pour télécharger
                          </span>{" "}
                          ou glissez-déposez
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG, GIF jusqu'à 10MB
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative rounded-xl overflow-hidden shadow-sm">
                        <img
                          src={imagePreview}
                          alt="Aperçu de l'image dermato"
                          className="w-full h-80 object-cover"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setImagePreview(null);
                          setShowAnalysis(false);
                        }}
                        className="text-sm text-[#0F6E56] hover:text-[#0d5a47] font-semibold hover:underline transition-colors"
                      >
                        Changer l'image
                      </button>
                    </div>
                  )}

                  {imagePreview && analyzing && (
                    <button
                      disabled
                      className="w-full mt-6 bg-[#0F6E56] text-white py-3 rounded-lg font-bold uppercase tracking-wider opacity-70 flex items-center justify-center gap-2"
                    >
                      <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Analyse en cours...
                    </button>
                  )}

                  {imagePreview && !analyzing && !showAnalysis && (
                    <div className="space-y-3 mt-6">
                      <button
                        onClick={handleAnalyze}
                        className="w-full bg-[#0F6E56] text-white py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-[#0d5a47] transition-colors"
                      >
                        Démarrer l'Analyse
                      </button>
                      <p className="text-xs text-gray-500 text-center">
                        Lance le Module 1 CNN et enregistre les résultats
                      </p>
                    </div>
                  )}

                  {imagePreview && showAnalysis && (
                    <button
                      onClick={() => setShowAnalysis(false)}
                      className="w-full mt-6 bg-gray-300 text-gray-700 hover:bg-gray-400 py-3 rounded-lg font-semibold uppercase tracking-wider transition-colors"
                    >
                      Masquer les résultats
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Module 1 Results - Enhanced */}
            {showAnalysis && analysisResults && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Illness Name - Cards with gradient */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-[#0F6E56] via-emerald-500 to-teal-500 rounded-2xl shadow-xl p-8 text-white transform hover:scale-105 transition-transform duration-300">
                    <p className="text-xs uppercase tracking-widest font-bold opacity-90 mb-3">
                      🦠 Diagnostic
                    </p>
                    <p className="text-4xl font-black leading-tight mb-4 drop-shadow-lg">
                      {displayedIllness}
                    </p>
                    <div className="h-1 w-20 bg-white/40 rounded-full"></div>
                  </div>

                  {/* Confidence Score - Radial */}
                  <div className="bg-white rounded-2xl shadow-xl p-8 border border-emerald-100">
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">
                      📊 Score de Confiance
                    </p>
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex-1">
                        <span className="text-5xl font-black bg-gradient-to-r from-[#0F6E56] to-emerald-500 bg-clip-text text-transparent">
                          {displayedConfidence}%
                        </span>
                        <div className="w-full h-2 bg-gradient-to-r from-red-300 via-yellow-300 to-green-300 rounded-full mt-4 overflow-hidden shadow-sm">
                          <div
                            className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 shadow-lg"
                            style={{
                              width: `${displayedConfidence}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Alternatives */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center text-lg">
                      🔍
                    </span>
                    Diagnostics Alternatifs
                  </h3>

                  {analysisResults.top_alternatives?.length > 0 ? (
                    <div className="space-y-3">
                      {analysisResults.top_alternatives.map((item, idx) => (
                        <div
                          key={idx}
                          className="group flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200/50 hover:border-orange-300 hover:shadow-md transition-all"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm group-hover:scale-110 transition-transform">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">
                              {typeof item === "string"
                                ? item
                                : item.name ||
                                  item.condition_name ||
                                  item.condition_id ||
                                  item.id ||
                                  "Inconnu"}
                            </p>
                          </div>
                          {typeof item === "object" && item.confidence != null && (
                            <span className="text-xs font-bold px-3 py-1.5 bg-white rounded-full text-orange-600 border border-orange-200">
                              {Math.round(item.confidence * 100)}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-6 italic">
                      Aucune alternative disponible.
                    </p>
                  )}
                </div>

                {/* Advanced Analysis Button */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                  <button
                    onClick={handleAdvancedAnalysis}
                    disabled={advancedAnalyzing}
                    className="w-full bg-gradient-to-r from-[#0F6E56] to-emerald-500 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-lg hover:shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200 flex items-center justify-center gap-3"
                  >
                    <span className="text-xl">🏥</span>
                    {advancedAnalyzing
                      ? "Analyse Avancée en cours..."
                      : "Lancer l'Analyse Avancée (Module 2 - RAG)"}
                  </button>
                </div>

                {advancedResults && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Advanced Analysis Summary */}
                    <div className="bg-gradient-to-br from-white via-emerald-50 to-white rounded-2xl shadow-xl border border-emerald-100 p-8 space-y-6">
                      <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <span className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
                          🏥
                        </span>
                        Analyse Avancée - Résultats RAG
                      </h3>

                      {/* Key Metrics Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          {
                            label: "⚠️ Urgence",
                            value: advancedResults.urgence,
                          },
                          {
                            label: "🎯 Confiance",
                            value: advancedResults.confidence_level,
                          },
                          {
                            label: "🧭 Orientation",
                            value: advancedResults.orientation,
                          },
                        ].map((metric, idx) => (
                          <div
                            key={idx}
                            className="bg-white rounded-xl p-4 border border-emerald-100/50 hover:shadow-md transition-all"
                          >
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">
                              {metric.label}
                            </p>
                            <p className="text-lg font-bold text-[#0F6E56]">
                              {toDisplayText(metric.value)}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Initial Analysis */}
                      {advancedResults.analyse_initiale && (
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200/50 rounded-xl p-6">
                          <p className="text-xs text-blue-600 uppercase tracking-widest font-bold mb-3">
                            📋 Analyse Clinique Initiale
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed text-justify">
                            {toDisplayText(advancedResults.analyse_initiale)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Clinical Questions Section */}
                    {clinicalQuestions.length > 0 && (
                      <div className="rounded-2xl border border-[#0F6E56]/20 bg-gradient-to-br from-white via-emerald-50 to-white overflow-hidden shadow-lg">
                        <div className="px-8 py-5 border-b border-[#0F6E56]/10 bg-gradient-to-r from-[#0F6E56] to-emerald-500">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs tracking-widest uppercase font-bold text-white flex items-center gap-2">
                              <span>❓</span> Questions Cliniques
                            </p>
                            <p className="text-xs tracking-widest uppercase font-semibold text-white/80">
                              {clinicalQuestions.length} questions • Niveau{" "}
                              {toDisplayText(
                                advancedResults.confidence_level,
                                "N/A",
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="p-6 space-y-5">
                          {clinicalQuestions.map((question, questionIdx) => (
                            <div
                              key={questionIdx}
                              className="rounded-xl border border-[#0F6E56]/15 bg-white p-5 hover:shadow-md hover:border-[#0F6E56]/30 transition-all group"
                            >
                              <div className="flex gap-4">
                                <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-[#0F6E56] to-emerald-500 text-white font-bold rounded-lg text-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                                  {questionIdx + 1}
                                </span>
                                <div className="flex-1 space-y-3">
                                  <p className="font-semibold text-gray-800">
                                    {question.text}
                                  </p>

                                  {question.options.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {question.options.map(
                                        (option, optionIdx) => {
                                          const isSelected =
                                            selectedQuestionOptions[
                                              questionIdx
                                            ] === optionIdx;

                                          return (
                                            <button
                                              key={`${questionIdx}-${optionIdx}`}
                                              type="button"
                                              onClick={() =>
                                                setSelectedQuestionOptions(
                                                  (prev) => ({
                                                    ...prev,
                                                    [questionIdx]: optionIdx,
                                                  }),
                                                )
                                              }
                                              className={`px-4 py-2 rounded-full font-medium text-sm transition-all transform hover:scale-105 border-2 ${
                                                isSelected
                                                  ? "border-[#0F6E56] bg-gradient-to-r from-[#0F6E56] to-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                                                  : "border-[#0F6E56]/30 bg-white text-[#0F6E56] hover:border-[#0F6E56] hover:bg-emerald-50"
                                              }`}
                                            >
                                              {option}
                                            </button>
                                          );
                                        },
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Treatments Section */}
                    <div className="rounded-2xl border border-[#0F6E56]/20 bg-white overflow-hidden shadow-lg">
                      <div className="px-8 py-5 border-b border-[#0F6E56]/10 bg-gradient-to-r from-[#0F6E56] to-emerald-500">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs tracking-widest uppercase font-bold text-white flex items-center gap-2">
                            <span>💊</span> Traitements Proposés
                          </p>
                          <p className="text-xs tracking-widest uppercase font-semibold text-white/80">
                            {selectedTreatmentCount}/{allTreatmentRows.length}{" "}
                            sélectionné
                            {allTreatmentRows.length > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr className="text-left text-xs tracking-widest uppercase font-bold text-[#0F6E56]/70">
                              <th className="px-6 py-4">Sélection</th>
                              <th className="px-6 py-4">Médicament</th>
                              <th className="px-6 py-4">Classe</th>
                              <th className="px-6 py-4">Indication</th>
                              <th className="px-6 py-4">Posologie</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-100">
                            {allTreatmentRows.length === 0 && (
                              <tr className="bg-gray-50 hover:bg-gray-100">
                                <td
                                  colSpan={5}
                                  className="px-6 py-6 text-center text-sm text-gray-500 italic"
                                >
                                  Aucun traitement proposé pour le moment.
                                </td>
                              </tr>
                            )}

                            {allTreatmentRows.map((treatment, idx) => {
                              const treatmentKey = `${treatment.id}-${idx}`;
                              const isChecked =
                                !!selectedTreatments[treatmentKey];

                              return (
                                <tr
                                  key={treatmentKey}
                                  className={`transition-all ${
                                    isChecked
                                      ? "bg-emerald-50 hover:bg-emerald-100"
                                      : "bg-white hover:bg-gray-50"
                                  }`}
                                >
                                  <td className="px-6 py-4 align-top">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        setSelectedTreatments((prev) => ({
                                          ...prev,
                                          [treatmentKey]: !prev[treatmentKey],
                                        }))
                                      }
                                      className="w-5 h-5 accent-[#0F6E56] cursor-pointer rounded transition-transform hover:scale-110"
                                    />
                                  </td>
                                  <td className="px-6 py-4 align-top text-gray-800 font-semibold">
                                    {treatment.nom}
                                  </td>
                                  <td className="px-6 py-4 align-top text-gray-600">
                                    {treatment.classe}
                                  </td>
                                  <td className="px-6 py-4 align-top text-gray-600">
                                    {treatment.indication}
                                  </td>
                                  <td className="px-6 py-4 align-top text-gray-600">
                                    {treatment.posologie}
                                  </td>
                                </tr>
                              );
                            })}

                            {/* New Treatment Row */}
                            <tr className="bg-gradient-to-r from-emerald-50 to-transparent border-t-2 border-[#0F6E56]/20">
                              <td className="px-6 py-4 align-top">
                                <p className="text-xs font-bold uppercase tracking-widest text-[#0F6E56]/60">
                                  + Nouveau
                                </p>
                              </td>
                              <td className="px-6 py-4 align-top">
                                <input
                                  type="text"
                                  value={newTreatmentDraft.nom}
                                  onChange={(e) =>
                                    setNewTreatmentDraft((prev) => ({
                                      ...prev,
                                      nom: e.target.value,
                                    }))
                                  }
                                  placeholder="Nom du médicament"
                                  className="w-full px-3 py-2.5 rounded-lg border border-[#0F6E56]/25 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/40 focus:border-transparent transition-all placeholder:text-gray-400"
                                />
                              </td>
                              <td className="px-6 py-4 align-top">
                                <input
                                  type="text"
                                  value={newTreatmentDraft.classe}
                                  onChange={(e) =>
                                    setNewTreatmentDraft((prev) => ({
                                      ...prev,
                                      classe: e.target.value,
                                    }))
                                  }
                                  placeholder="Classe"
                                  className="w-full px-3 py-2.5 rounded-lg border border-[#0F6E56]/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/40 focus:border-transparent transition-all placeholder:text-gray-400"
                                />
                              </td>
                              <td className="px-6 py-4 align-top">
                                <input
                                  type="text"
                                  value={newTreatmentDraft.indication}
                                  onChange={(e) =>
                                    setNewTreatmentDraft((prev) => ({
                                      ...prev,
                                      indication: e.target.value,
                                    }))
                                  }
                                  placeholder="Indication"
                                  className="w-full px-3 py-2.5 rounded-lg border border-[#0F6E56]/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/40 focus:border-transparent transition-all placeholder:text-gray-400"
                                />
                              </td>
                              <td className="px-6 py-4 align-top">
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={newTreatmentDraft.posologie}
                                    onChange={(e) =>
                                      setNewTreatmentDraft((prev) => ({
                                        ...prev,
                                        posologie: e.target.value,
                                      }))
                                    }
                                    placeholder="Posologie"
                                    className="flex-1 px-3 py-2.5 rounded-lg border border-[#0F6E56]/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/40 focus:border-transparent transition-all placeholder:text-gray-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleAddCustomTreatment}
                                    disabled={!newTreatmentDraft.nom.trim()}
                                    className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#0F6E56] to-emerald-500 text-white text-sm font-bold uppercase tracking-wider hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all whitespace-nowrap"
                                  >
                                    + Ajouter
                                  </button>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
