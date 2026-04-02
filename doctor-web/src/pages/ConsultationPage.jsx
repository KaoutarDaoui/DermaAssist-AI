import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import NavBar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import toast from "react-hot-toast";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { ai, patients } from "../services/api";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function ConsultationPage() {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const patientId = location.state?.patientId;
  const consultationNumber = location.state?.consultationId;
  const sequentialNumber = location.state?.sequentialNumber;
  const routedPatientName =
    typeof location.state?.patientName === "string"
      ? location.state.patientName.trim()
      : "";

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [consultationData, setConsultationData] = useState(null);
  const [aiResults, setAiResults] = useState(null);
  const [skinImage, setSkinImage] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizePatientName = (value) => {
    if (typeof value !== "string") {
      return "";
    }

    return value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  };

  const isGenericPatientLabel = (value) => {
    const normalized = normalizePatientName(value);

    if (!normalized) {
      return true;
    }

    return [
      "patient",
      "patient inconnu",
      "inconnu",
      "unknown patient",
      "non disponible",
      "n/a",
      "na",
      "null",
      "undefined",
    ].includes(normalized);
  };

  const getFirstValidPatientName = (values = []) => {
    const normalizedValues = values
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value && !isGenericPatientLabel(value));

    return normalizedValues[0] || "";
  };

  const getPatientDisplayName = (patientData, fallback = "Non disponible") => {
    if (!patientData) return fallback;

    const rootFirstName = patientData.first_name || patientData.firstName;
    const rootLastName = patientData.last_name || patientData.lastName;
    const userFirstName = patientData.user?.first_name || patientData.user?.firstName;
    const userLastName = patientData.user?.last_name || patientData.user?.lastName;

    const candidates = [
      rootFirstName && rootLastName ? `${rootFirstName} ${rootLastName}` : "",
      userFirstName && userLastName ? `${userFirstName} ${userLastName}` : "",
      patientData.user?.full_name,
      patientData.user?.fullName,
      patientData.full_name,
      patientData.fullName,
      patientData.patient_name,
      patientData.patientFullName,
    ];

    return getFirstValidPatientName(candidates) || fallback;
  };

  const getResolvedPatientName = () => {
    const fromPatient = getPatientDisplayName(patient, "");
    if (fromPatient) {
      return fromPatient;
    }

    if (routedPatientName && !isGenericPatientLabel(routedPatientName)) {
      return routedPatientName;
    }

    const aiCandidates = [
      aiResults?.patient_name,
      aiResults?.patient_full_name,
      aiResults?.env_snapshot?.patient_name,
      aiResults?.env_snapshot?.full_name,
      aiResults?.env_snapshot?.patient_full_name,
    ];

    const fromAi = getFirstValidPatientName(aiCandidates);

    if (fromAi) {
      return fromAi;
    }

    return "Non disponible";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (!patientId || !consultationNumber) {
          toast.error(
            "Patient ID or Consultation ID not found. Please go back and try again.",
          );
          return;
        }

        // Fetch AI results for this consultation
        const aiResultsResponse = await ai.getResultByConsultation(
          patientId,
          consultationNumber,
        );

        setAiResults(aiResultsResponse.data);
        setConsultationData({
          consultation_id: consultationNumber,
          id: consultationId,
          date: aiResultsResponse.data.generated_at,
        });

        // Fetch patient data
        try {
          const patientResponse = await patients.get(patientId);
          setPatient(patientResponse.data);
          console.log("Patient loaded:", patientResponse.data);
        } catch (patientError) {
          console.error("Error fetching patient data:", patientError);
        }

        // Fetch skin image for this consultation
        try {
          const skinImageResponse = await ai.getSkinImage(
            patientId,
            consultationNumber,
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

  const buildConsultationPdf = () => {
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 10;
    const margin = 10;
    const maxWidth = pageWidth - 2 * margin;

    // Title
    pdf.setFontSize(22);
    pdf.setTextColor(15, 110, 86); // #0F6E56
    pdf.text("Skin+", margin, yPosition);

    yPosition += 10;
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text("Rapport de Consultation Dermatologique", margin, yPosition);

    yPosition += 15;
    pdf.setDrawColor(15, 110, 86);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Reset to black for content
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);

    // Helper function to add text with wrapping
    const addText = (label, value) => {
      const labelWidth = 55;
      pdf.setFont(undefined, "bold");
      pdf.text(label + ":", margin, yPosition);
      pdf.setFont(undefined, "normal");

      if (!value) value = "Non disponible";
      const lines = pdf.splitTextToSize(String(value), maxWidth - labelWidth);
      pdf.text(lines, margin + labelWidth, yPosition);

      yPosition += Math.max(lines.length * 5, 5) + 5;

      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 10;
      }
    };

    // Add data
    const dateStr = consultationData?.date
      ? new Date(consultationData.date).toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Non disponible";

    addText("Date", dateStr);

    const patientName = getResolvedPatientName();

    addText("Nom Complet", patientName);

    addText("La Maladie", aiResults?.diagnosis || "Non disponible");

    const confidence =
      aiResults?.confidence?.percentage || aiResults?.confidence?.score || "—";
    addText("Taux de Confiance", `${confidence}%`);

    // Analysis section
    yPosition += 5;
    pdf.setFont(undefined, "bold");
    pdf.text("L'Analyse:", margin, yPosition);
    pdf.setFont(undefined, "normal");
    yPosition += 5;

    const analysisLines = pdf.splitTextToSize(
      aiResults?.diagnosis || "Non disponible",
      maxWidth,
    );
    pdf.text(analysisLines, margin, yPosition);
    yPosition += analysisLines.length * 5 + 10;

    // Questions section
    if (aiResults?.suggested_questions && aiResults.suggested_questions.length > 0) {
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 10;
      }

      pdf.setFont(undefined, "bold");
      pdf.text("Les Questions:", margin, yPosition);
      pdf.setFont(undefined, "normal");
      yPosition += 7;

      aiResults.suggested_questions.forEach((q, idx) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 10;
        }

        const qText = `${idx + 1}. ${q.question}`;
        const qLines = pdf.splitTextToSize(qText, maxWidth - 5);
        pdf.text(qLines, margin + 5, yPosition);
        yPosition += qLines.length * 5;

        pdf.setFont(undefined, "italic");
        const aText = `Reponse: ${q.selected_option}`;
        const aLines = pdf.splitTextToSize(aText, maxWidth - 10);
        pdf.text(aLines, margin + 10, yPosition);
        pdf.setFont(undefined, "normal");
        yPosition += aLines.length * 5 + 3;
      });

      yPosition += 5;
    }

    // Treatments section
    if (aiResults?.treatment_options && aiResults.treatment_options.length > 0) {
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 10;
      }

      pdf.setFont(undefined, "bold");
      pdf.text("Les Medicaments Proposes:", margin, yPosition);
      pdf.setFont(undefined, "normal");
      yPosition += 7;

      aiResults.treatment_options.forEach((med, idx) => {
        if (yPosition > pageHeight - 25) {
          pdf.addPage();
          yPosition = 10;
        }

        pdf.setFont(undefined, "bold");
        pdf.text(`${idx + 1}. ${med.nom}`, margin + 5, yPosition);
        yPosition += 5;

        pdf.setFont(undefined, "normal");
        pdf.setFontSize(9);
        const classeLines = pdf.splitTextToSize(
          `Classe: ${med.classe}`,
          maxWidth - 15,
        );
        pdf.text(classeLines, margin + 10, yPosition);
        yPosition += classeLines.length * 4;

        const indicLines = pdf.splitTextToSize(
          `Indication: ${med.indication}`,
          maxWidth - 15,
        );
        pdf.text(indicLines, margin + 10, yPosition);
        yPosition += indicLines.length * 4;

        const posLines = pdf.splitTextToSize(
          `Posologie: ${med.posologie}`,
          maxWidth - 15,
        );
        pdf.text(posLines, margin + 10, yPosition);
        yPosition += posLines.length * 4 + 2;

        pdf.setFontSize(10);
      });
    }

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    const footerText = `Rapport genere par Skin+ le ${new Date().toLocaleDateString("fr-FR")}`;
    pdf.text(footerText, pageWidth / 2, pageHeight - 5, { align: "center" });

    return pdf;
  };

  const downloadReport = () => {
    console.log("🔴 downloadReport called!");
    console.log("Current state:", {
      consultationData: !!consultationData,
      aiResults: !!aiResults,
      patient: !!patient,
    });

    if (!consultationData || !aiResults) {
      console.log("❌ Data missing:", { consultationData, aiResults });
      toast.error("Donnees manquantes pour generer le PDF");
      return;
    }

    try {
      console.log("✅ Generating PDF with data:", {
        consultationData,
        aiResults,
        patient,
      });
      toast.loading("Generation du PDF en cours...");

      const pdf = buildConsultationPdf();
      const filename = `consultation-skinplus-${Date.now()}.pdf`;
      pdf.save(filename);

      toast.dismiss();
      toast.success("PDF telecharge avec succes!");
      console.log("✅ PDF saved as:", filename);
    } catch (error) {
      console.error("❌ Erreur PDF complete:", error);
      toast.dismiss();
      toast.error("Erreur PDF: " + error.message);
    }
  };

  const printReport = () => {
    if (!consultationData || !aiResults) {
      toast.error("Donnees manquantes pour imprimer le rapport");
      return;
    }

    try {
      toast.loading("Preparation de l'impression...");
      const pdf = buildConsultationPdf();
      const pdfBlob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);

      const printFrame = document.createElement("iframe");
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
      printFrame.src = blobUrl;

      const cleanup = () => {
        URL.revokeObjectURL(blobUrl);
        if (printFrame.parentNode) {
          printFrame.parentNode.removeChild(printFrame);
        }
      };

      const handleAfterPrint = () => {
        window.removeEventListener("afterprint", handleAfterPrint);
        cleanup();
      };

      window.addEventListener("afterprint", handleAfterPrint);

      printFrame.onload = () => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (error) {
          cleanup();
          throw error;
        }
      };

      document.body.appendChild(printFrame);
      toast.dismiss();
      toast.success("Boite d'impression ouverte.");
    } catch (error) {
      console.error("❌ Erreur impression complete:", error);
      toast.dismiss();
      toast.error("Erreur impression: " + error.message);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <NavBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex-1 overflow-auto">
          <div
            id="consultation-screen-content"
            className="p-8 space-y-6 max-w-7xl mx-auto pb-12"
          >
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
                      <h1 className="text-4xl font-bold mb-2">Consultation</h1>
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
                              },
                            )
                          : "Date non disponible"}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={printReport}
                        className="flex items-center gap-2 bg-white text-[#0F6E56] px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                      >
                        <Printer size={18} />
                        Imprimer
                      </button>
                      <button
                        onClick={downloadReport}
                        className="flex items-center gap-2 bg-white text-[#0F6E56] px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                      >
                        <Download size={18} />
                        Télécharger
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
                        <span>
                          Source:{" "}
                          <strong>
                            {skinImage.source === "doctor"
                              ? "Médecin"
                              : "Patient"}
                          </strong>
                        </span>
                        {skinImage.uploaded_at && (
                          <span>
                            • Uploadée le:{" "}
                            <strong>
                              {new Date(
                                skinImage.uploaded_at,
                              ).toLocaleDateString("fr-FR")}
                            </strong>
                          </span>
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
                                    "Type ",
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
                              ),
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

                          <div className="space-y-6">
                            {aiResults.treatment_options.map(
                              (treatment, idx) => {
                                // Extrait les alertes pour ce médicament
                                const medicationAlerts = (
                                  aiResults.rag?.alertes_patient || []
                                ).filter((a) => a.medicament === treatment.nom);

                                return (
                                  <div
                                    key={idx}
                                    className="border border-gray-200 rounded-lg p-6"
                                  >
                                    <div className="flex items-start justify-between mb-4">
                                      <div>
                                        <div className="flex items-center gap-3 mb-2">
                                          <span className="inline-block w-8 h-8 bg-[#0F6E56] text-white rounded-full text-center font-bold">
                                            {idx + 1}
                                          </span>
                                          <h3 className="text-lg font-bold text-gray-900">
                                            {treatment.nom || "—"}
                                          </h3>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                          <span className="font-semibold">
                                            Classe:
                                          </span>{" "}
                                          {treatment.classe || "—"}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                      <div>
                                        <p className="text-gray-600">
                                          <span className="font-semibold">
                                            Indication:
                                          </span>{" "}
                                          {treatment.indication || "—"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-gray-600">
                                          <span className="font-semibold">
                                            Posologie:
                                          </span>{" "}
                                          {treatment.posologie || "—"}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Alertes du médicament */}
                                    {medicationAlerts.length > 0 && (
                                      <div className="space-y-2">
                                        {medicationAlerts.map(
                                          (alert, alertIdx) => (
                                            <div
                                              key={alertIdx}
                                              className={`p-3 rounded-lg border-l-4 ${
                                                alert.severite === "danger"
                                                  ? "bg-red-50 border-red-400"
                                                  : "bg-amber-50 border-amber-400"
                                              }`}
                                            >
                                              <div className="flex items-start gap-2">
                                                <span
                                                  className={`text-lg font-bold ${
                                                    alert.severite === "danger"
                                                      ? "text-red-600"
                                                      : "text-amber-600"
                                                  }`}
                                                >
                                                  {alert.severite === "danger"
                                                    ? "⛔"
                                                    : "⚠️"}
                                                </span>
                                                <div>
                                                  <p
                                                    className={`text-sm font-semibold ${
                                                      alert.severite ===
                                                      "danger"
                                                        ? "text-red-700"
                                                        : "text-amber-700"
                                                    }`}
                                                  >
                                                    {alert.type ===
                                                    "question_requise"
                                                      ? "Question requise:"
                                                      : "Alerte:"}
                                                  </p>
                                                  <p
                                                    className={`text-sm ${
                                                      alert.severite ===
                                                      "danger"
                                                        ? "text-red-600"
                                                        : "text-amber-600"
                                                    }`}
                                                  >
                                                    {alert.message}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* PDF/Print Report Section */}
          <div
            id="pdf-report"
            style={{ display: "none" }}
            className="print:block p-12 bg-white"
          >
            <style>{`
              @media print {
                body {
                  margin: 0;
                  padding: 0;
                }
                .print\\:block {
                  display: block !important;
                }
                #pdf-report {
                  display: block !important;
                }
                #consultation-screen-content {
                  display: none !important;
                }
                nav {
                  display: none !important;
                }
              }
            `}</style>

            {/* Logo / Header */}
            <div className="text-center mb-8 border-b-2 border-[#0F6E56] pb-6">
              <h1 className="text-5xl font-bold text-[#0F6E56] mb-2">
                Skin+
              </h1>
              <p className="text-gray-600 text-sm">
                Rapport de Consultation Dermatologique
              </p>
            </div>

            {/* Report Content */}
            <div className="space-y-6 text-sm">
              {/* Date */}
              <div className="border-b border-gray-300 pb-3">
                <p className="font-semibold text-gray-900">
                  Date:{" "}
                  <span className="font-normal text-gray-700">
                    {consultationData?.date
                      ? new Date(consultationData.date).toLocaleDateString(
                          "fr-FR",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "Non disponible"}
                  </span>
                </p>
              </div>

              {/* Nom Complet */}
              <div className="border-b border-gray-300 pb-3">
                <p className="font-semibold text-gray-900">
                  Nom Complet:{" "}
                  <span className="font-normal text-gray-700">
                    {getResolvedPatientName()}
                  </span>
                </p>
              </div>

              {/* La Maladie */}
              <div className="border-b border-gray-300 pb-3">
                <p className="font-semibold text-gray-900">
                  La Maladie:{" "}
                  <span className="font-normal text-gray-700">
                    {aiResults?.diagnosis || "Non disponible"}
                  </span>
                </p>
              </div>

              {/* Taux de Confiance */}
              <div className="border-b border-gray-300 pb-3">
                <p className="font-semibold text-gray-900">
                  Taux de Confiance:{" "}
                  <span className="font-normal text-gray-700">
                    {aiResults?.confidence?.percentage ||
                      aiResults?.confidence?.score ||
                      "—"}
                    %
                  </span>
                </p>
              </div>

              {/* L'Analyse */}
              <div className="border-b border-gray-300 pb-3">
                <p className="font-semibold text-gray-900 mb-2">L'Analyse:</p>
                <p className="text-gray-700 ml-4">
                  {aiResults?.diagnosis || "Non disponible"}
                </p>
              </div>

              {/* Les Questions */}
              {aiResults?.suggested_questions &&
                aiResults.suggested_questions.length > 0 && (
                  <div className="border-b border-gray-300 pb-3">
                    <p className="font-semibold text-gray-900 mb-2">
                      Les Questions:
                    </p>
                    <div className="ml-4 space-y-2">
                      {aiResults.suggested_questions.map((q, idx) => (
                        <div key={idx} className="text-gray-700">
                          <p className="font-semibold">
                            {idx + 1}. {q.question}
                          </p>
                          <p className="ml-4 text-gray-600">
                            Reponse: {q.selected_option}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Les Medicaments Proposes */}
              {aiResults?.treatment_options &&
                aiResults.treatment_options.length > 0 && (
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">
                      Les Medicaments Proposes:
                    </p>
                    <div className="ml-4 space-y-3">
                      {aiResults.treatment_options.map((med, idx) => (
                        <div
                          key={idx}
                          className="text-gray-700 border-l-2 border-[#0F6E56] pl-3"
                        >
                          <p className="font-semibold">
                            {idx + 1}. {med.nom}
                          </p>
                          <p className="text-sm text-gray-600">
                            Classe: {med.classe}
                          </p>
                          <p className="text-sm text-gray-600">
                            Indication: {med.indication}
                          </p>
                          <p className="text-sm text-gray-600">
                            Posologie: {med.posologie}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center mt-12 pt-6 border-t-2 border-[#0F6E56] text-xs text-gray-600">
              <p>Rapport genere par Skin+</p>
              <p>{new Date().toLocaleDateString("fr-FR")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
