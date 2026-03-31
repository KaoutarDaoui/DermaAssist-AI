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
  const [showTreatmentAlerts, setShowTreatmentAlerts] = useState(false);

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

  const handleValidateAndSave = async () => {
    if (!analysisResults) {
      toast.error("Veuillez d'abord effectuer une analyse");
      return;
    }

    if (!patient) {
      toast.error("Données du patient non chargées");
      return;
    }

    // Collect selected questions with their options
    const selectedQuestions = clinicalQuestions
      .map((question, idx) => {
        if (selectedQuestionOptions[idx] !== undefined) {
          return {
            index: idx,
            question: question.text,
            selected_option: question.options[selectedQuestionOptions[idx]],
          };
        }
        return null;
      })
      .filter(Boolean);

    // Collect selected treatments
    const selectedTreatmentsList = allTreatmentRows
      .map((treatment, idx) => {
        const treatmentKey = `${treatment.id}-${idx}`;
        if (selectedTreatments[treatmentKey]) {
          return {
            nom: treatment.nom,
            classe: treatment.classe,
            indication: treatment.indication,
            posologie: treatment.posologie,
          };
        }
        return null;
      })
      .filter(Boolean);

    try {
      const payload = {
        consultation_id: analysisResults?.consultation_id,
        patient_id: patientId,
        skin_image_id: analysisResults?.image_id,
        diagnosis: displayedIllness,
        confidence: {
          score: displayedConfidence,
          percentage: displayedConfidence,
        },
        suggested_questions: selectedQuestions,
        treatment_options: selectedTreatmentsList,
        env_snapshot: {
          fitzpatrick_type: patient.fitzpatrick_type,
          city: patient.city,
          medical_history: patient.medical_history,
        },
      };

      const response = await axios.post(
        `${API_URL}/patients/${patientId}/ai-results`,
        payload,
      );

      if (response.status === 201 || response.status === 200) {
        toast.success("Analyse et recommandations enregistrées avec succès!");
        // Optional: Reset or navigate
        setTimeout(() => {
          navigate(`/patients/${patientId}`);
        }, 1500);
      }
    } catch (error) {
      console.error("Error saving AI results:", error);
      const errorMsg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Erreur lors de l'enregistrement";
      toast.error(errorMsg);
    }
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
      toast.success("Analyse effectuée et enregistrée!");
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

            {/* Patient Info Card */}
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
                        Analyse l'image pour détecter les maladies de peau
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

              {/* Right: Information Panel */}
              <div className="col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">
                    Guide d'Utilisation
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                      <span className="w-8 h-8 flex-shrink-0 bg-[#0F6E56] text-white rounded-full flex items-center justify-center font-bold text-sm">
                        1
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">
                          Télécharger
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Sélectionnez une image dermato claire
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                      <span className="w-8 h-8 flex-shrink-0 bg-[#0F6E56] text-white rounded-full flex items-center justify-center font-bold text-sm">
                        2
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">
                          Analyser
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Lancez l'analyse automatique
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                      <span className="w-8 h-8 flex-shrink-0 bg-[#0F6E56] text-white rounded-full flex items-center justify-center font-bold text-sm">
                        3
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">
                          Résultats
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Diagnostic avec alternatives
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                      <span className="w-8 h-8 flex-shrink-0 bg-[#0F6E56] text-white rounded-full flex items-center justify-center font-bold text-sm">
                        4
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">
                          Recommandations
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Questions cliniques et traitements
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-[#0F6E56]/5 border border-[#0F6E56]/20 rounded-lg">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      <span className="font-semibold text-[#0F6E56]">
                        Remarque:
                      </span>{" "}
                      Cet outil assiste le diagnostic. Une validation clinique
                      est recommandée.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Analyse Results */}
            {showAnalysis && analysisResults && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Illness Name - Cards with gradient */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-[#0F6E56] rounded-xl shadow-sm border border-gray-200 p-5 text-white">
                    <p className="text-xs uppercase tracking-widest font-bold opacity-90 mb-2">
                      Diagnostic
                    </p>
                    <p className="text-2xl font-bold leading-tight drop-shadow-lg">
                      {displayedIllness}
                    </p>
                  </div>

                  {/* Confidence Score */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">
                      Score de Confiance
                    </p>
                    <div className="space-y-2">
                      <span className="text-3xl font-bold text-[#0F6E56]">
                        {displayedConfidence}%
                      </span>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0F6E56]"
                          style={{
                            width: `${displayedConfidence}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Alternatives */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Diagnostics Alternatifs
                  </h3>

                  {analysisResults.top_alternatives?.length > 0 ? (
                    <div className="space-y-2">
                      {analysisResults.top_alternatives.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                          <div className="w-6 h-6 bg-[#0F6E56] text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-sm">
                              {typeof item === "string"
                                ? item
                                : item.name ||
                                  item.condition_name ||
                                  item.condition_id ||
                                  item.id ||
                                  "Inconnu"}
                            </p>
                          </div>
                          {typeof item === "object" &&
                            item.confidence != null && (
                              <span className="text-xs font-bold px-2.5 py-1 bg-white rounded-full text-[#0F6E56] border border-gray-200 flex-shrink-0">
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
                <button
                  onClick={handleAdvancedAnalysis}
                  disabled={advancedAnalyzing}
                  className="w-full bg-[#0F6E56] text-white py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-[#0d5a47] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {advancedAnalyzing
                    ? "Analyse Détaillée en cours..."
                    : "Lancer l'Analyse Détaillée"}
                </button>

                {advancedResults && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Advanced Analysis Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
                      <h3 className="text-xl font-bold text-gray-900">
                        Recommandations Cliniques
                      </h3>

                      {/* Key Metrics Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          {
                            label: "Urgence",
                            value: advancedResults.urgence,
                          },
                          {
                            label: "Confiance",
                            value: advancedResults.confidence_level,
                          },
                          {
                            label: "Orientation",
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
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                          <p className="text-xs text-gray-600 uppercase tracking-widest font-bold mb-3">
                            Analyse Clinique Initiale
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed text-justify">
                            {toDisplayText(advancedResults.analyse_initiale)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Clinical Questions Section */}
                    {clinicalQuestions.length > 0 && (
                      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                        <div className="px-8 py-4 border-b border-gray-200 bg-[#0F6E56]">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs tracking-widest uppercase font-bold text-white">
                              Questions Cliniques
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
                    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                      <div className="px-8 py-4 border-b border-gray-200 bg-[#0F6E56]">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs tracking-widest uppercase font-bold text-white">
                            Traitements Proposés
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

                      {/* Validate Treatment Button */}
                      <div className="mt-6 flex justify-end pr-6 pb-4">
                        <button
                          onClick={() =>
                            setShowTreatmentAlerts(!showTreatmentAlerts)
                          }
                          className="px-6 py-2.5 bg-[#0F6E56] text-white font-bold uppercase tracking-wider text-sm rounded-lg hover:bg-[#0d5a47] transition-colors"
                        >
                          Valider les Traitements
                        </button>
                      </div>

                      {/* Treatment Alerts Section - From RAG */}
                      {showTreatmentAlerts && (
                        <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
                          <h4 className="text-lg font-bold text-gray-900 mb-4">
                            Alertes et Contre-indications
                          </h4>

                          {/* Warnings from RAG */}
                          {advancedResults?.alertes &&
                            advancedResults.alertes.length > 0 && (
                              <div className="space-y-3">
                                {advancedResults.alertes.map((alerte, idx) => (
                                  <div
                                    key={idx}
                                    className="p-4 border-l-4 border-red-400 bg-red-50 rounded-lg"
                                  >
                                    <p className="font-bold text-red-800 mb-2">
                                      Alerte Importante
                                    </p>
                                    <p className="text-sm text-red-700">
                                      {alerte}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                          {/* Contraindications from RAG */}
                          {advancedResults?.contre_indications &&
                            advancedResults.contre_indications.length > 0 && (
                              <div className="space-y-3">
                                {advancedResults.contre_indications.map(
                                  (contraindi, idx) => (
                                    <div
                                      key={idx}
                                      className="p-4 border-l-4 border-orange-400 bg-orange-50 rounded-lg"
                                    >
                                      <p className="font-bold text-orange-800 mb-2">
                                        Contre-indication
                                      </p>
                                      <p className="text-sm text-orange-700">
                                        {contraindi}
                                      </p>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}

                          {/* Dangers from RAG */}
                          {advancedResults?.dangers &&
                            advancedResults.dangers.length > 0 && (
                              <div className="space-y-3">
                                {advancedResults.dangers.map((danger, idx) => (
                                  <div
                                    key={idx}
                                    className="p-4 border-l-4 border-yellow-400 bg-yellow-50 rounded-lg"
                                  >
                                    <p className="font-bold text-yellow-800 mb-2">
                                      Danger Potentiel
                                    </p>
                                    <p className="text-sm text-yellow-700">
                                      {danger}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                          {/* Interactions from RAG */}
                          {advancedResults?.interactions &&
                            advancedResults.interactions.length > 0 && (
                              <div className="space-y-3">
                                {advancedResults.interactions.map(
                                  (interaction, idx) => (
                                    <div
                                      key={idx}
                                      className="p-4 border-l-4 border-amber-400 bg-amber-50 rounded-lg"
                                    >
                                      <p className="font-bold text-amber-800 mb-2">
                                        Interaction Médicamenteuse
                                      </p>
                                      <p className="text-sm text-amber-700">
                                        {interaction}
                                      </p>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}

                          {/* Default message if no alerts from RAG */}
                          {(!advancedResults?.alertes ||
                            advancedResults.alertes.length === 0) &&
                            (!advancedResults?.contre_indications ||
                              advancedResults.contre_indications.length ===
                                0) &&
                            (!advancedResults?.dangers ||
                              advancedResults.dangers.length === 0) &&
                            (!advancedResults?.interactions ||
                              advancedResults.interactions.length === 0) && (
                              <div className="p-4 border-l-4 border-green-400 bg-green-50 rounded-lg">
                                <p className="text-green-800 text-sm font-medium">
                                  Aucune alerte majeure détectée dans la base de
                                  connaissances.
                                </p>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Validate Button */}
            <div className="mt-12 flex justify-end">
              <button
                onClick={handleValidateAndSave}
                className="px-8 py-3 bg-[#0F6E56] text-white font-bold uppercase tracking-wider rounded-lg hover:bg-[#0d5a47] transition-colors shadow-sm"
              >
                Valider et Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
