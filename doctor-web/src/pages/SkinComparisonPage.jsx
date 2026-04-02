import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  GitCompare,
  CheckCircle,
  Loader2,
  X,
  ZoomIn,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);
import NavBar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import OverlayModal from "../components/OverlayModal";
import { skinComparison } from "../services/api";
import toast from "react-hot-toast";

export default function SkinComparisonPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [progression, setProgression] = useState([]);
  const [progLoading, setProgLoading] = useState(true);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    loadImages();
    loadProgression();
  }, [patientId]);

  useEffect(() => {
    if (!canvasRef.current || progression.length < 2) return;

    // Détruire le graphe précédent si existant
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext("2d");

    const labels = progression.map((p) =>
      new Date(p.date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      }),
    );

    const data = progression.map((p) => p.score_pct);

    const pointColors = data.map((v) =>
      v < 30 ? "#22c55e" : v < 60 ? "#f59e0b" : "#ef4444",
    );

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Sévérité (%)",
            data,
            borderColor: "#0F6E56",
            backgroundColor: "rgba(15, 110, 86, 0.08)",
            borderWidth: 2.5,
            pointBackgroundColor: pointColors,
            pointBorderColor: pointColors,
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Sévérité : ${ctx.parsed.y.toFixed(1)}%`,
            },
          },
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              callback: (v) => `${v}%`,
              font: { size: 11 },
            },
            grid: { color: "rgba(0,0,0,0.05)" },
          },
          x: {
            ticks: { font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    });

    // Cleanup
    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [progression]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const res = await skinComparison.getImages(patientId);
      const imagesWithData = await Promise.all(
        res.data.map(async (img) => {
          try {
            const detail = await skinComparison.getImage(patientId, img.id);
            return { ...img, base64: detail.data.image_data };
          } catch {
            return { ...img, base64: null };
          }
        }),
      );
      setImages(imagesWithData);
    } catch {
      toast.error("Impossible de charger les photos");
    } finally {
      setLoading(false);
    }
  };

  const loadProgression = async () => {
    try {
      setProgLoading(true);
      const res = await skinComparison.getProgression(patientId);
      setProgression(res.data || []);
    } catch {
      setProgression([]);
    } finally {
      setProgLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setResult(null);
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else {
      if (selected.length >= 2) {
        toast.error("Sélectionne exactement 2 photos");
        return;
      }
      setSelected([...selected, id]);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      await skinComparison.upload(patientId, file);
      toast.success("Photo uploadée !");
      await loadImages();
      await loadProgression();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur upload");
    } finally {
      setUploading(false);
    }
  };

  const handleCompare = async () => {
    if (selected.length !== 2) return;
    try {
      setComparing(true);
      setResult(null);
      const res = await skinComparison.compare(
        patientId,
        selected[0],
        selected[1],
      );
      setResult(res.data);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Erreur lors de la comparaison",
      );
    } finally {
      setComparing(false);
    }
  };

  const getVerdictStyle = (verdict) => {
    if (!verdict) return {};
    const v = verdict.toLowerCase();
    if (v.includes("amélioration") || v.includes("amelior"))
      return {
        bg: "bg-green-50",
        border: "border-green-400",
        text: "text-green-700",
        badge: "bg-green-100 text-green-800",
      };
    if (v.includes("aggravation") || v.includes("aggrav"))
      return {
        bg: "bg-red-50",
        border: "border-red-400",
        text: "text-red-700",
        badge: "bg-red-100 text-red-800",
      };
    return {
      bg: "bg-yellow-50",
      border: "border-yellow-400",
      text: "text-yellow-700",
      badge: "bg-yellow-100 text-yellow-800",
    };
  };

  const verdictStyle = result ? getVerdictStyle(result.verdict) : {};

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const first = progression[0]?.score_pct ?? null;
  const last = progression[progression.length - 1]?.score_pct ?? null;
  const delta = first !== null && last !== null ? last - first : null;
  const trend =
    delta === null ? null : delta > 3 ? "agg" : delta < -3 ? "amel" : "stable";

  return (
    <div className="flex h-screen bg-[#F8F9FA]">
      <Sidebar open={sidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <NavBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(`/patients/${patientId}`)}
                className="flex items-center gap-2 text-[#0F6E56] hover:text-[#0d5a47] font-semibold text-sm"
              >
                <ArrowLeft size={16} /> Retour au patient
              </button>
              <label
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium cursor-pointer text-sm transition-all
                ${uploading ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#0F6E56] text-white hover:bg-[#0d5a47]"}`}
              >
                {uploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Upload...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> Ajouter une photo
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            <div>
              <h1 className="text-2xl font-black text-gray-800">Suivi photo</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Sélectionne{" "}
                <span className="font-bold text-[#0F6E56]">2 photos</span> —{" "}
                <span className="font-bold">(R)</span> référence ·{" "}
                <span className="font-bold">(N)</span> nouvelle
              </p>
            </div>

            {/* ── Layout split ── */}
            <div className="flex gap-5 items-start">
              {/* ── GAUCHE — liste photos ── */}
              <div className="w-72 flex-shrink-0">
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      Photos{" "}
                      <span className="text-gray-400 font-normal">
                        ({images.length})
                      </span>
                    </span>
                    {selected.length === 2 && (
                      <button
                        onClick={handleCompare}
                        disabled={comparing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F6E56] text-white text-xs font-semibold rounded-lg hover:bg-[#0d5a47] disabled:opacity-50 transition-colors"
                      >
                        {comparing ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <GitCompare size={11} />
                        )}
                        {comparing ? "Analyse..." : "Comparer"}
                      </button>
                    )}
                  </div>

                  <div
                    className="overflow-y-auto"
                    style={{ maxHeight: "calc(100vh - 260px)" }}
                  >
                    {loading ? (
                      <div className="flex justify-center py-10">
                        <Loader2
                          size={22}
                          className="animate-spin text-[#0F6E56]"
                        />
                      </div>
                    ) : images.length === 0 ? (
                      <div className="py-10 text-center">
                        <p className="text-gray-400 text-sm">
                          Aucune photo disponible
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {images.map((img, idx) => {
                          const isSel = selected.includes(img.id);
                          const selIdx = selected.indexOf(img.id);
                          return (
                            <div
                              key={img.id}
                              onClick={() => toggleSelect(img.id)}
                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all
                                ${
                                  isSel
                                    ? "bg-[#0F6E56]/5 border-l-[3px] border-[#0F6E56]"
                                    : "hover:bg-gray-50 border-l-[3px] border-transparent"
                                }`}
                            >
                              {/* Miniature */}
                              <div className="relative flex-shrink-0">
                                {img.base64 ? (
                                  <img
                                    src={img.base64}
                                    alt={`Photo ${idx + 1}`}
                                    className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-100 rounded-lg" />
                                )}
                                {isSel && (
                                  <div className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-[#0F6E56] text-white flex items-center justify-center font-bold text-[9px] shadow">
                                    {selIdx === 0 ? "R" : "N"}
                                  </div>
                                )}
                              </div>

                              {/* Infos */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-700 capitalize truncate">
                                  {img.source || "—"}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                  {formatDate(img.uploaded_at)}
                                </p>
                                {img.cnn_label && (
                                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-[#0F6E56]/10 text-[#0F6E56] rounded font-medium">
                                    {img.cnn_label}
                                  </span>
                                )}
                              </div>

                              {isSel && (
                                <CheckCircle
                                  size={14}
                                  className="text-[#0F6E56] flex-shrink-0"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── DROITE — graphe + résultats ── */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Graphe */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Progression de la sévérité
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {progression.length} photo
                        {progression.length > 1 ? "s" : ""} analysée
                        {progression.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    {trend && (
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                        ${trend === "amel" ? "bg-green-50 text-green-700" : trend === "agg" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-500"}`}
                      >
                        {trend === "amel" && <TrendingDown size={12} />}
                        {trend === "agg" && <TrendingUp size={12} />}
                        {trend === "stable" && <Minus size={12} />}
                        {trend === "amel"
                          ? `−${Math.abs(delta).toFixed(1)}%`
                          : trend === "agg"
                            ? `+${delta.toFixed(1)}%`
                            : "Stable"}
                      </div>
                    )}
                  </div>

                  {progression.length >= 2 && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        {
                          label: "Premier score",
                          value: `${first.toFixed(1)}%`,
                        },
                        { label: "Score actuel", value: `${last.toFixed(1)}%` },
                        {
                          label: "Évolution totale",
                          value:
                            delta >= 0
                              ? `+${delta.toFixed(1)}%`
                              : `${delta.toFixed(1)}%`,
                          cls:
                            delta > 3
                              ? "text-red-600"
                              : delta < -3
                                ? "text-green-600"
                                : "text-gray-600",
                        },
                      ].map(({ label, value, cls }) => (
                        <div
                          key={label}
                          className="bg-gray-50 rounded-lg px-3 py-2.5"
                        >
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                            {label}
                          </p>
                          <p
                            className={`text-lg font-bold ${cls || "text-gray-800"}`}
                          >
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {progLoading ? (
                    <div className="h-48 flex items-center justify-center">
                      <Loader2
                        size={22}
                        className="animate-spin text-[#0F6E56]"
                      />
                    </div>
                  ) : progression.length < 2 ? (
                    <div className="h-48 flex items-center justify-center">
                      <p className="text-sm text-gray-400">
                        Au moins 2 photos nécessaires pour afficher le graphe
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="relative" style={{ height: 200 }}>
                        <canvas ref={canvasRef} />
                      </div>
                      <div className="flex gap-4 mt-3">
                        {[
                          { cls: "bg-green-500", label: "Faible < 30%" },
                          { cls: "bg-amber-500", label: "Modéré 30–60%" },
                          { cls: "bg-red-500", label: "Élevé > 60%" },
                        ].map(({ cls, label }) => (
                          <span
                            key={label}
                            className="flex items-center gap-1.5 text-[11px] text-gray-400"
                          >
                            <span className={`w-2 h-2 rounded-full ${cls}`} />{" "}
                            {label}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Résultats comparaison */}
                {result && (
                  <div
                    className={`rounded-xl border-2 p-5 ${verdictStyle.bg} ${verdictStyle.border}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h2 className={`text-xl font-black ${verdictStyle.text}`}>
                        {result.verdict}
                      </h2>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${verdictStyle.badge}`}
                      >
                        Confiance : {result.confiance}
                      </span>
                    </div>

                    <p className="text-gray-700 text-sm mb-4 bg-white/60 rounded-lg p-3">
                      {result.explication}
                    </p>

                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[
                        {
                          label: "Similarité",
                          value: `${(result.similarite_cosine * 100).toFixed(1)}%`,
                        },
                        {
                          label: "Sévérité réf.",
                          value: `${(result.score_reference * 100).toFixed(1)}%`,
                        },
                        {
                          label: "Sévérité nouv.",
                          value: `${(result.score_nouveau * 100).toFixed(1)}%`,
                        },
                        {
                          label: "Évolution",
                          value: `${result.delta_pct > 0 ? "+" : ""}${result.delta_pct}%`,
                          cls:
                            result.delta_pct < 0
                              ? "text-green-600"
                              : result.delta_pct > 0
                                ? "text-red-600"
                                : "text-yellow-600",
                        },
                      ].map(({ label, value, cls }) => (
                        <div
                          key={label}
                          className="bg-white rounded-lg p-3 text-center shadow-sm"
                        >
                          <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">
                            {label}
                          </p>
                          <p
                            className={`text-lg font-black ${cls || "text-gray-800"}`}
                          >
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {result.overlay_image && (
                      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 mb-3">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Zones d'évolution
                          </span>
                          <button
                            onClick={() => setModalOpen(true)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0F6E56] text-white text-xs font-semibold hover:bg-[#0d5a47]"
                          >
                            <ZoomIn size={11} /> Agrandir
                          </button>
                        </div>
                        <div
                          className="relative cursor-zoom-in bg-gray-950 group"
                          onClick={() => setModalOpen(true)}
                        >
                          <img
                            src={result.overlay_image}
                            alt="Évolution"
                            className="w-full object-contain max-h-48 group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                              <ZoomIn size={12} /> Cliquer pour agrandir
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-5 px-4 py-2 bg-gray-50 border-t border-gray-100">
                          <span className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />{" "}
                            Zone aggravée
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />{" "}
                            Zone améliorée
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setResult(null);
                        setSelected([]);
                      }}
                      className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-xs font-medium"
                    >
                      <X size={12} /> Nouvelle comparaison
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && result?.overlay_image && (
        <OverlayModal
          src={result.overlay_image}
          onClose={() => setModalOpen(false)}
        />
      )}

      <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js" />
    </div>
  );
}
