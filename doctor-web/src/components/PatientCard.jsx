import React from "react";

export default function PatientCard() {
  const patient = {
    name: "Fatima Hassan",
    age: 28,
    fitzpatrickType: "Fitzpatrick Type III",
    lastConsultation: "Mar 28 2026",
    avatar: "FH",
  };

  return (
    <div className="bg-white border border-gray-300 rounded-3xl p-6">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {patient.avatar}
        </div>

        {/* Patient Info */}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-800">{patient.name}</h3>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-gray-600 text-sm">Age {patient.age}</span>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
              {patient.fitzpatrickType}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            Last consultation {patient.lastConsultation}
          </p>
        </div>
      </div>
    </div>
  );
}
