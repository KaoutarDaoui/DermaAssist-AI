import React from "react";
import { Sun, Wind, Droplets, MapPin } from "lucide-react";

export default function EnvironmentalBanner() {
  const envData = {
    uvIndex: {
      label: "Indice UV",
      value: "ÉLEVÉ 7",
      gradientFrom: "from-orange-500/20",
      gradientTo: "to-yellow-500/20",
      textColor: "text-orange-300",
      borderColor: "border-orange-400/30",
      iconColor: "text-orange-400",
    },
    aqi: {
      label: "AQI",
      value: "MODÉRÉ 42",
      gradientFrom: "from-cyan-500/20",
      gradientTo: "to-blue-500/20",
      textColor: "text-cyan-300",
      borderColor: "border-cyan-400/30",
      iconColor: "text-cyan-400",
    },
    humidity: {
      label: "Humidité",
      value: "65%",
      gradientFrom: "from-teal-500/20",
      gradientTo: "to-emerald-500/20",
      textColor: "text-teal-300",
      borderColor: "border-teal-400/30",
      iconColor: "text-teal-400",
    },
    location: "Boumerdes, Algérie",
  };

  return (
    <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 h-fit">
      <div className="flex flex-col gap-2.5">
        {/* UV Index */}
        <div className="group bg-emerald-50 border-2 border-emerald-300 px-3 py-2 rounded-lg flex items-start gap-2 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-300 hover:-translate-y-0.5">
          <Sun size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-xs text-emerald-600 font-semibold">
              {envData.uvIndex.label}
            </span>
            <span className="text-sm font-black text-emerald-950 leading-tight">
              {envData.uvIndex.value}
            </span>
          </div>
        </div>

        {/* AQI */}
        <div className="group bg-emerald-50 border-2 border-emerald-300 px-3 py-2 rounded-lg flex items-start gap-2 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-300 hover:-translate-y-0.5">
          <Wind size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-xs text-emerald-600 font-semibold">
              {envData.aqi.label}
            </span>
            <span className="text-sm font-black text-emerald-950 leading-tight">
              {envData.aqi.value}
            </span>
          </div>
        </div>

        {/* Humidity */}
        <div className="group bg-emerald-50 border-2 border-emerald-300 px-3 py-2 rounded-lg flex items-start gap-2 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-300 hover:-translate-y-0.5">
          <Droplets
            size={14}
            className="text-emerald-600 mt-0.5 flex-shrink-0"
          />
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-xs text-emerald-600 font-semibold">
              {envData.humidity.label}
            </span>
            <span className="text-sm font-black text-emerald-950 leading-tight">
              {envData.humidity.value}
            </span>
          </div>
        </div>

        {/* Location */}
        <div className="group bg-emerald-50 border-2 border-emerald-300 px-3 py-2 rounded-lg flex items-center gap-2 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-300 hover:-translate-y-0.5">
          <MapPin size={14} className="text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-emerald-900">
            {envData.location}
          </span>
        </div>
      </div>
    </div>
  );
}
