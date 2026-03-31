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
        <div className="flex h-screen bg-[#F8F9FA]">
          <Sidebar open={sidebarOpen} />
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-8 h-8 border-4 border-[#0F6E56] border-t-transparent rounded-full"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA]">
      <Sidebar open={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <NavBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex-1 overflow-auto">
          <div className="p-8 space-y-6 max-w-7xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => navigate("/patients")}
              className="flex items-center gap-2 text-[#0F6E56] hover:opacity-80 transition-all font-medium"
            >
              <ArrowLeft size={20} />
              Back to Patients
            </button>

            {/* Patient Info Card */}
            {patient && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-1">
                      {patient.user?.full_name || "Patient"}
                    </h1>
                    <p className="text-gray-600">{patient.user?.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Phone</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {patient.phone || "N/A"}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      City: {patient.city || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Fitzpatrick Type
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      {patient.fitzpatrick_type?.replace("TYPE_", "Type ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Medical History
                    </p>
                    <p className="text-sm text-gray-700">
                      {patient.medical_history || "None"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Status
                    </p>
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Upload and Analysis Section */}
            <div className="grid grid-cols-3 gap-6">
              {/* Left: Upload Section */}
              <div className="col-span-2">
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-800">
                      Skin Image Analysis
                    </h2>
                  </div>

                  {!imagePreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-[#0F6E56] rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload size={48} className="text-[#0F6E56] mb-2" />
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Click to upload</span>{" "}
                          or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 10MB
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
                      <img
                        src={imagePreview}
                        alt="Skin image preview"
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setImagePreview(null);
                          setShowAnalysis(false);
                        }}
                        className="text-sm text-[#0F6E56] hover:underline"
                      >
                        Change Image
                      </button>
                    </div>
                  )}

                  {imagePreview && analyzing && (
                    <button
                      disabled
                      className="w-full mt-4 bg-[#0F6E56] text-white py-3 rounded-lg font-semibold opacity-50 flex items-center justify-center gap-2"
                    >
                      <span className="animate-spin">◐</span>
                      Analyzing...
                    </button>
                  )}

                  {imagePreview && !analyzing && !showAnalysis && (
                    <div className="space-y-2">
                      <button
                        onClick={handleAnalyze}
                        className="w-full mt-4 bg-[#0F6E56] text-white py-3 rounded-lg font-semibold hover:bg-[#0d5a47] transition-all flex items-center justify-center gap-2"
                      >
                        Start Analysis
                      </button>
                      <p className="text-xs text-gray-500 text-center">
                        Runs Module 1 and saves illness + confidence in
                        skin_images.
                      </p>
                    </div>
                  )}

                  {imagePreview && showAnalysis && (
                    <button
                      onClick={() => setShowAnalysis(false)}
                      className="w-full mt-4 bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-all"
                    >
                      Hide Analysis
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Module 1 Results */}
            {showAnalysis && analysisResults && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase mb-2 font-semibold">
                    Illness Name
                  </p>
                  <p className="text-2xl font-black text-gray-800">
                    {displayedIllness}
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase mb-2 font-semibold">
                    Confidence Score
                  </p>
                  <div className="mb-2">
                    <span className="text-3xl font-black text-[#0F6E56]">
                      {displayedConfidence}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all"
                      style={{
                        width: `${displayedConfidence}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">
                    Top Alternatives
                  </h3>

                  {analysisResults.top_alternatives?.length > 0 ? (
                    <ul className="space-y-2 text-sm text-gray-700">
                      {analysisResults.top_alternatives.map((item, idx) => (
                        <li key={idx}>
                          •{" "}
                          {typeof item === "string"
                            ? item
                            : item.name ||
                              item.condition_name ||
                              item.condition_id ||
                              item.id ||
                              "Unknown"}
                          {typeof item === "object" && item.confidence != null
                            ? ` (${Math.round(item.confidence * 100)}%)`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No alternatives available.
                    </p>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                  <button
                    onClick={handleAdvancedAnalysis}
                    disabled={advancedAnalyzing}
                    className="w-full bg-[#0F6E56] text-white py-3 rounded-lg font-semibold hover:bg-[#0d5a47] transition-all disabled:opacity-50"
                  >
                    {advancedAnalyzing
                      ? "Running Advanced Analysis..."
                      : "Advances Analysis"}
                  </button>
                </div>

                {advancedResults && (
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 space-y-3">
                    <h3 className="text-lg font-bold text-gray-800">
                      Advanced Analysis (RAG)
                    </h3>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Urgency:</span>{" "}
                      {toDisplayText(advancedResults.urgence)}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Confidence Level:</span>{" "}
                      {toDisplayText(advancedResults.confidence_level)}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Orientation:</span>{" "}
                      {toDisplayText(advancedResults.orientation)}
                    </p>

                    {advancedResults.analyse_initiale && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1 font-semibold">
                          Initial Clinical Analysis
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {toDisplayText(advancedResults.analyse_initiale)}
                        </p>
                      </div>
                    )}

                    {clinicalQuestions.length > 0 && (
                      <div>
                        <div className="rounded-xl border border-[#0F6E56]/20 bg-[#F5FBF8] overflow-hidden">
                          <div className="px-4 py-3 border-b border-[#0F6E56]/15 bg-white flex items-center justify-between gap-3">
                            <p className="text-[11px] tracking-[0.22em] uppercase font-semibold text-[#0F6E56]">
                              Questions Cliniques
                            </p>
                            <p className="text-[11px] tracking-[0.2em] uppercase text-[#0F6E56]/70">
                              {clinicalQuestions.length} questions - niveau{" "}
                              {toDisplayText(
                                advancedResults.confidence_level,
                                "N/A",
                              )}
                            </p>
                          </div>

                          <div className="p-4 space-y-3">
                            {clinicalQuestions.map((question, questionIdx) => (
                              <div
                                key={questionIdx}
                                className="rounded-xl border border-[#0F6E56]/20 bg-white p-4 shadow-sm"
                              >
                                <p className="text-[24px] leading-none font-bold text-[#0F6E56] mb-1">
                                  {questionIdx + 1}.
                                </p>
                                <p className="text-lg font-semibold text-gray-800 leading-snug">
                                  {question.text}
                                </p>

                                {question.options.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
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
                                            className={`px-4 py-1.5 rounded-full border text-sm transition-all ${
                                              isSelected
                                                ? "border-[#0F6E56] bg-[#0F6E56] text-white shadow-md"
                                                : "border-[#0F6E56]/35 bg-[#F2FBF8] text-[#0F6E56] hover:border-[#0F6E56] hover:bg-[#E7F6F0]"
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
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="rounded-xl border border-[#0F6E56]/20 bg-[#F5FBF8] overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#0F6E56]/15 bg-white flex items-center justify-between gap-3">
                          <p className="text-[11px] tracking-[0.22em] uppercase font-semibold text-[#0F6E56]">
                            Traitements Proposés
                          </p>
                          <p className="text-[11px] tracking-[0.2em] uppercase text-[#0F6E56]/70">
                            {selectedTreatmentCount}/{allTreatmentRows.length}{" "}
                            sélectionné
                            {allTreatmentRows.length > 1 ? "s" : ""}
                          </p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-white">
                              <tr className="text-left text-[11px] tracking-[0.15em] uppercase text-[#0F6E56]/80">
                                <th className="px-4 py-3 font-semibold">
                                  Choix
                                </th>
                                <th className="px-4 py-3 font-semibold">
                                  Médicament
                                </th>
                                <th className="px-4 py-3 font-semibold">
                                  Classe
                                </th>
                                <th className="px-4 py-3 font-semibold">
                                  Indication
                                </th>
                                <th className="px-4 py-3 font-semibold">
                                  Posologie
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-[#0F6E56]/10">
                              {allTreatmentRows.length === 0 && (
                                <tr className="bg-[#F9FDFC]">
                                  <td
                                    colSpan={5}
                                    className="px-4 py-3 text-sm text-gray-600"
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
                                    className="bg-[#F9FDFC]"
                                  >
                                    <td className="px-4 py-3 align-top">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() =>
                                          setSelectedTreatments((prev) => ({
                                            ...prev,
                                            [treatmentKey]: !prev[treatmentKey],
                                          }))
                                        }
                                        className="h-4 w-4 accent-[#0F6E56] cursor-pointer"
                                      />
                                    </td>
                                    <td className="px-4 py-3 align-top text-gray-800 font-semibold whitespace-nowrap">
                                      {treatment.nom}
                                    </td>
                                    <td className="px-4 py-3 align-top text-gray-700">
                                      {treatment.classe}
                                    </td>
                                    <td className="px-4 py-3 align-top text-gray-700">
                                      {treatment.indication}
                                    </td>
                                    <td className="px-4 py-3 align-top text-gray-700">
                                      {treatment.posologie}
                                    </td>
                                  </tr>
                                );
                              })}

                              <tr className="bg-white border-t border-[#0F6E56]/20">
                                <td className="px-4 py-3 align-top text-xs font-semibold uppercase tracking-[0.1em] text-[#0F6E56]/70">
                                  Nouveau
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <input
                                    type="text"
                                    value={newTreatmentDraft.nom}
                                    onChange={(e) =>
                                      setNewTreatmentDraft((prev) => ({
                                        ...prev,
                                        nom: e.target.value,
                                      }))
                                    }
                                    placeholder="Médicament"
                                    className="w-full px-3 py-2 rounded-lg border border-[#0F6E56]/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/25"
                                  />
                                </td>
                                <td className="px-4 py-3 align-top">
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
                                    className="w-full px-3 py-2 rounded-lg border border-[#0F6E56]/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/25"
                                  />
                                </td>
                                <td className="px-4 py-3 align-top">
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
                                    className="w-full px-3 py-2 rounded-lg border border-[#0F6E56]/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/25"
                                  />
                                </td>
                                <td className="px-4 py-3 align-top">
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
                                      className="flex-1 px-3 py-2 rounded-lg border border-[#0F6E56]/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/25"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleAddCustomTreatment}
                                      disabled={!newTreatmentDraft.nom.trim()}
                                      className="px-4 py-2 rounded-lg bg-[#0F6E56] text-white text-sm font-semibold hover:bg-[#0d5a47] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Ajouter
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
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
