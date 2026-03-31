import React, { useState } from "react";

export default function AIResultPanel() {
  const [expandedTreatment, setExpandedTreatment] = useState(0);

  const aiResult = {
    diagnosis: "Malignant Melanoma",
    confidence: 86,
    clinicalQuestions: [
      "Duration of change?",
      "History of sunburns?",
      "Family history of skin cancer?",
    ],
    treatments: [
      {
        id: 0,
        title: "Urgent Biopsy Recommended",
        description:
          "Urgent biopsy recommended for counsis and recessing. Surgical excision for skin cancer.",
      },
      {
        id: 1,
        title: "Surgical Excision Planning",
        description:
          "Detailed surgical planning to ensure complete removal with clear margins.",
      },
    ],
  };

  return (
    <div className="bg-white border border-gray-300 rounded-3xl p-6 sticky top-6">
      {/* Diagnosis */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">Diagnosis:</p>
        <h2 className="text-3xl font-bold text-gray-800">
          {aiResult.diagnosis}
        </h2>
      </div>

      {/* Confidence Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Confidence
          </span>
          <span className="text-sm font-bold text-gray-800">
            {aiResult.confidence}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${aiResult.confidence}%`,
              background:
                "linear-gradient(to right, #E24B4A, #EF9F27, #1D9E75)",
            }}
          ></div>
        </div>
      </div>

      {/* Clinical Questions */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Suggested clinical questions
        </p>
        <div className="flex flex-wrap gap-2">
          {aiResult.clinicalQuestions.map((question, idx) => (
            <button
              key={idx}
              className="px-3 py-2 bg-teal-500 text-white rounded-full text-xs font-semibold hover:bg-teal-600 transition"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {/* Treatment Options */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Treatment options
        </p>
        <div className="space-y-2">
          {aiResult.treatments.map((treatment) => (
            <div
              key={treatment.id}
              className="border border-gray-300 rounded-lg overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedTreatment(
                    expandedTreatment === treatment.id ? -1 : treatment.id,
                  )
                }
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-left"
              >
                <span className="font-semibold text-gray-800">
                  {treatment.title}
                </span>
                <span
                  className={`transform transition-transform ${
                    expandedTreatment === treatment.id ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>
              {expandedTreatment === treatment.id && (
                <div className="px-4 pb-4 text-sm text-gray-600 border-t border-gray-300">
                  {treatment.description}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
