import { useEffect, useCallback } from "react";
import { X, Download, ZoomIn } from "lucide-react";

/**
 * OverlayModal
 * Affiche l'image d'overlay en plein écran avec :
 *   - Fermeture via Échap, clic sur le fond, ou bouton ×
 *   - Téléchargement direct en JPEG
 *   - Légende rouge/vert
 *
 * Props :
 *   src      : string  — data URI base64 de l'image
 *   onClose  : () => void
 */
export default function OverlayModal({ src, onClose }) {
  // Fermeture avec Échap
  const handleKey = useCallback(
    (e) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  // Téléchargement
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = `evolution_lesion_${Date.now()}.jpg`;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Carte centrale — stoppe la propagation du clic */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ZoomIn size={16} className="text-[#0F6E56]" />
            <span className="text-sm font-semibold text-gray-700">
              Visualisation des zones d'évolution
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Télécharger */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F6E56] text-white text-xs font-semibold hover:bg-[#0d5a47] transition-colors"
            >
              <Download size={14} />
              Télécharger
            </button>
            {/* Fermer */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="bg-gray-950 flex items-center justify-center max-h-[70vh]">
          <img
            src={src}
            alt="Évolution des lésions"
            className="max-h-[70vh] w-full object-contain"
          />
        </div>

        {/* Légende */}
        <div className="flex items-center gap-6 px-5 py-3 bg-gray-50 border-t border-gray-100">
          <span className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            Zone aggravée
          </span>
          <span className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
            Zone améliorée
          </span>
          <span className="ml-auto text-xs text-gray-400 italic">
            Appuie sur Échap pour fermer
          </span>
        </div>
      </div>
    </div>
  );
}