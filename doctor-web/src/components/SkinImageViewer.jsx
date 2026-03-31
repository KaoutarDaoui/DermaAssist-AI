import React, { useState } from "react";

export default function SkinImageViewer({ imageMode, setImageMode }) {
  const [zoomLevel, setZoomLevel] = useState(100);

  // Real dermatology images
  const mainImage =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Melanoma_-_very_high_mag.jpg/640px-Melanoma_-_very_high_mag.jpg";
  const thumbnails = [
    {
      id: 1,
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Melanoma_-_very_high_mag.jpg/120px-Melanoma_-_very_high_mag.jpg",
      label: "Melanoma - Patient",
    },
    {
      id: 2,
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Nevus_%282%29.jpg/120px-Nevus_%282%29.jpg",
      label: "Mole - Comparison",
    },
  ];

  return (
    <div className="bg-white border border-gray-300 rounded-3xl p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        Skin Image Viewer
      </h3>

      {/* Main Image Container */}
      <div
        className="relative bg-gray-100 rounded-2xl overflow-hidden mb-4"
        style={{ height: "400px" }}
      >
        <img
          src={mainImage}
          alt="Patient Skin"
          className="w-full h-full object-cover"
          style={{ transform: `scale(${zoomLevel / 100})` }}
        />
        {/* Badge */}
        <div className="absolute bottom-4 left-4 bg-gray-700 text-white px-3 py-1 rounded text-xs font-semibold">
          Source: Patient
        </div>
      </div>

      {/* Thumbnail Row */}
      <div className="flex gap-3 mb-4">
        {thumbnails.map((thumb) => (
          <div key={thumb.id} className="relative">
            <img
              src={thumb.src}
              alt={thumb.label}
              className="w-20 h-20 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-teal-500 object-cover"
            />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Zoom Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
            className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
            title="Zoom Out"
          >
            −
          </button>
          <span className="text-sm font-medium text-gray-600 w-12 text-center">
            {zoomLevel}%
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
            className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
            title="Zoom In"
          >
            +
          </button>
        </div>

        {/* Before/After Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setImageMode("main")}
            className={`px-4 py-2 rounded-lg border-2 transition ${
              imageMode === "main"
                ? "border-teal-500 bg-teal-50 text-teal-700"
                : "border-gray-300 text-gray-600 hover:border-gray-400"
            }`}
          >
            Before/After
          </button>
          <button
            onClick={() => {}}
            className="px-4 py-2 rounded-lg bg-teal-500 text-white font-semibold hover:bg-teal-600 transition"
          >
            Upload New Image
          </button>
        </div>
      </div>
    </div>
  );
}
