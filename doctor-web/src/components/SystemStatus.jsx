import React from "react";
import { Activity, AlertCircle, CheckCircle, Clock } from "lucide-react";

export default function SystemStatus() {
  const metrics = [
    {
      label: "Active Analyses",
      value: "12",
      icon: Activity,
    },
    {
      label: "Pending Reviews",
      value: "5",
      icon: Clock,
    },
    {
      label: "Completed Today",
      value: "28",
      icon: CheckCircle,
    },
    {
      label: "System Alerts",
      value: "2",
      icon: AlertCircle,
    },
  ];

  return (
    <div className="rounded-2xl bg-white border-2 border-emerald-200 p-6 shadow-sm h-full">
      <h2 className="text-2xl font-black text-emerald-900 mb-5">
        System Status
      </h2>

      <div className="space-y-3">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;

          return (
            <div
              key={idx}
              className={`group relative overflow-hidden rounded-lg bg-emerald-50 border-2 border-emerald-200 p-3 hover:border-emerald-400 hover:shadow-md transition-all duration-300`}
            >
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-all">
                    <Icon className="text-emerald-600" size={22} />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-700 font-bold uppercase tracking-wide">
                      {metric.label}
                    </p>
                    <p className="text-xl font-black text-emerald-900">
                      {metric.value}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
