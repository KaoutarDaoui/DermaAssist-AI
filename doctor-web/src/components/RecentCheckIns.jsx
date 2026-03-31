import React from "react";

export default function RecentCheckIns() {
  const checkIns = [
    {
      score: 8,
      maxScore: 10,
      note: "Feeling better",
      date: "Mar 16",
      color: "bg-green-100",
      badgeColor: "bg-green-500",
      textColor: "text-green-700",
    },
    {
      score: 5,
      maxScore: 10,
      note: "Itching increased",
      date: "Mar 17",
      color: "bg-red-100",
      badgeColor: "bg-red-500",
      textColor: "text-red-700",
    },
    {
      score: 7,
      maxScore: 10,
      note: "Slight redness",
      date: "Mar 18",
      color: "bg-amber-100",
      badgeColor: "bg-amber-500",
      textColor: "text-amber-700",
    },
  ];

  return (
    <div className="bg-white border border-gray-300 rounded-3xl p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Check-ins</h3>

      <div className="space-y-3">
        {checkIns.map((checkIn, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            {/* Score Badge */}
            <div
              className={`${checkIn.color} ${checkIn.badgeColor} w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0`}
            >
              {checkIn.score}/{checkIn.maxScore}
            </div>

            {/* Notes */}
            <div className="flex-1 ml-4">
              <p className="text-gray-800 font-medium">{checkIn.note}</p>
            </div>

            {/* Date */}
            <div className="text-gray-500 text-sm font-medium">
              {checkIn.date}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
