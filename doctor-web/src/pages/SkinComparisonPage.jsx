import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, GitCompare, CheckCircle, Loader2, X } from "lucide-react";
import NavBar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import { skinComparison } from "../services/api";
import toast from "react-hot-toast";

export default function SkinComparisonPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── États ─────────────────────────────────────────────────────
  const [images, setImages]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState([]);       // max 2 ids
  const [comparing, setComparing]     = useState(false);
  const [result, setResult]           = useState(null);
  const [uploading, setUploading]     = useState(false);

  // ── Charger les photos du patient ─────────────────────────────
  useEffect(() => {
    loadImages();
  }, [patientId]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const res = await skinComparison.getImages(patientId);
      // Pour chaque image, récupérer le base64
      const imagesWithData = await Promise.all(
        res.data.map(async (img) => {
          try {
            const detail = await skinComparison.getImage(patientId, img.id);
            return { ...img, base64: detail.data.image_data };
          } catch {
            return { ...img, base64: null };
          }
        })
      );
      setImages(imagesWithData);
    } catch (error) {
      toast.error("Impossible de charger les photos");
    } finally {
      setLoading(false);
    }
  };

  // ── Sélectionner / désélectionner une photo ───────────────────
  const toggleSelect = (id) => {
    setResult(null); // reset résultat si on change la sélection
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else {
      if (selected.length >= 2) {
        toast.error("Tu ne peux sélectionner que 2 photos");
        return;
      }
      setSelected([...selected, id]);
    }
  };

  // ── Upload nouvelle photo ─────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      await skinComparison.upload(patientId, file);
      toast.success("Photo uploadée !");
      await loadImages();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur upload");
    } finally {
      setUploading(false);
    }
  };

  // ── Lancer la comparaison ─────────────────────────────────────
  const handleCompare = async () => {
    if (selected.length !== 2) return;
    try {
      setComparing(true);
      setResult(null);
      // La 1ère sélectionnée = référence, la 2ème = nouvelle
      const res = await skinComparison.compare(patientId, selected[0], selected[1]);
      setResult(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la comparaison");
    } finally {
      setComparing(false);
    }
  };

  // ── Couleur du verdict ────────────────────────────────────────
  const getVerdictStyle = (verdict) => {
    if (!verdict) return {};
    if (verdict.includes("Amélioration") || verdict.includes("Amélioré")) {
      return { bg: "bg-green-50", border: "border-green-400", text: "text-green-700", badge: "bg-green-100 text-green-800" };
    }
    if (verdict.includes("Aggravation") || verdict.includes("Empiré")) {
      return { bg: "bg-red-50", border: "border-red-400", text: "text-red-700", badge: "bg-red-100 text-red-800" };
    }
    return { bg: "bg-yellow-50", border: "border-yellow-400", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-800" };
  };

  const verdictStyle = result ? getVerdictStyle(result.verdict) : {};

  // ── Formatter la date ─────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return "Date inconnue";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA]">
      <Sidebar open={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <NavBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex-1 overflow-auto">
          <div className="p-8 space-y-6 max-w-6xl mx-auto">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(`/patients/${patientId}`)}
                className="flex items-center gap-2 text-[#0F6E56] hover:text-[#0d5a47] font-semibold text-sm"
              >
                <ArrowLeft size={18} />
                Retour au patient
              </button>

              {/* Upload bouton */}
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium cursor-pointer transition-all text-sm
                ${uploading ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#0F6E56] text-white hover:bg-[#0d5a47]"}`}>
                {uploading ? (
                  <><Loader2 size={16} className="animate-spin" /> Upload en cours...</>
                ) : (
                  <><Upload size={16} /> Ajouter une photo</>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>

            <div>
              <h1 className="text-3xl font-black text-gray-800">Comparaison de lésions</h1>
              <p className="text-gray-500 text-sm mt-1">
                Sélectionne <span className="font-bold text-[#0F6E56]">2 photos</span> pour comparer l'évolution — la 1ère = référence, la 2ème = nouvelle
              </p>
            </div>

            {/* ── Grille de photos ── */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 size={36} className="animate-spin text-[#0F6E56]" />
              </div>
            ) : images.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
                <p className="text-gray-500 text-lg font-medium">Aucune photo disponible</p>
                <p className="text-gray-400 text-sm mt-1">Utilise le bouton "Ajouter une photo" pour commencer</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((img, idx) => {
                  const isSelected = selected.includes(img.id);
                  const selectionIndex = selected.indexOf(img.id);

                  return (
                    <div
                      key={img.id}
                      onClick={() => toggleSelect(img.id)}
                      className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all
                        ${isSelected ? "border-[#0F6E56] shadow-lg scale-[1.02]" : "border-gray-200 hover:border-gray-400"}`}
                    >
                      {/* Badge de sélection */}
                      {isSelected && (
                        <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-[#0F6E56] text-white flex items-center justify-center font-bold text-sm shadow">
                          {selectionIndex === 0 ? "R" : "N"}
                        </div>
                      )}

                      {/* Checkmark */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10">
                          <CheckCircle size={22} className="text-[#0F6E56] bg-white rounded-full" />
                        </div>
                      )}

                      {/* Image */}
                      {img.base64 ? (
                        <img
                          src={img.base64}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-40 object-cover"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">Image indisponible</span>
                        </div>
                      )}

                      {/* Info bas */}
                      <div className="p-2 bg-white">
                        <p className="text-xs text-gray-500 truncate">{formatDate(img.uploaded_at)}</p>
                        <p className="text-xs font-semibold text-gray-700 capitalize">{img.source || "—"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Bouton Comparer ── */}
            {selected.length === 2 && (
              <div className="flex justify-center">
                <button
                  onClick={handleCompare}
                  disabled={comparing}
                  className="flex items-center gap-3 bg-[#0F6E56] text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-[#0d5a47] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {comparing ? (
                    <><Loader2 size={22} className="animate-spin" /> Analyse en cours...</>
                  ) : (
                    <><GitCompare size={22} /> Lancer la comparaison</>
                  )}
                </button>
              </div>
            )}

            {/* ── Résultats ── */}
            {result && (
              <div className={`rounded-xl border-2 p-6 ${verdictStyle.bg} ${verdictStyle.border}`}>

                {/* Verdict principal */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-2xl font-black ${verdictStyle.text}`}>
                    {result.verdict}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${verdictStyle.badge}`}>
                    Confiance : {result.confiance}
                  </span>
                </div>

                {/* Explication */}
                <p className="text-gray-700 text-sm mb-6 bg-white/60 rounded-lg p-3">
                  {result.explication}
                </p>

                {/* Métriques */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Similarité</p>
                    <p className="text-2xl font-black text-gray-800">
                      {(result.similarite_cosine * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Sévérité réf.</p>
                    <p className="text-2xl font-black text-gray-800">
                      {(result.score_reference * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Sévérité nouv.</p>
                    <p className="text-2xl font-black text-gray-800">
                      {(result.score_nouveau * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Évolution</p>
                    <p className={`text-2xl font-black ${result.delta_pct < 0 ? "text-green-600" : result.delta_pct > 0 ? "text-red-600" : "text-yellow-600"}`}>
                      {result.delta_pct > 0 ? "+" : ""}{result.delta_pct}%
                    </p>
                  </div>
                </div>

                {/* Reset */}
                <button
                  onClick={() => { setResult(null); setSelected([]); }}
                  className="mt-4 flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                  <X size={16} /> Nouvelle comparaison
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}