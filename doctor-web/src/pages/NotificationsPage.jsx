import { useState } from "react";
import {
  AlertCircle,
  Bell,
  Trash2,
  CheckCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import NavBar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import toast from "react-hot-toast";

export default function NotificationsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "alert",
      title: "High Confidence Analysis Complete",
      message:
        "Patient Maria Garcia's skin analysis is complete with 92% confidence for Acne Vulgaire",
      timestamp: "2 hours ago",
      read: false,
    },
    {
      id: 2,
      type: "system",
      title: "System Update Available",
      message: "A new version of DermaAssist is available. Please update soon.",
      timestamp: "5 hours ago",
      read: false,
    },
    {
      id: 3,
      type: "analysis",
      title: "Analysis Results Ready",
      message:
        "John Doe's dermatology analysis has been processed and is ready for review.",
      timestamp: "1 day ago",
      read: true,
    },
    {
      id: 4,
      type: "info",
      title: "Scheduled Maintenance",
      message:
        "Scheduled maintenance on March 31, 2026 from 2:00 AM to 4:00 AM UTC.",
      timestamp: "2 days ago",
      read: true,
    },
    {
      id: 5,
      type: "alert",
      title: "Urgent Medical Alert",
      message:
        "Patient Sarah Johnson requires urgent attention based on analysis results.",
      timestamp: "3 days ago",
      read: true,
    },
    {
      id: 6,
      type: "success",
      title: "Account Verification Complete",
      message: "Your medical license has been verified successfully.",
      timestamp: "1 week ago",
      read: true,
    },
  ]);

  const [filter, setFilter] = useState("all");

  const getNotificationIcon = (type) => {
    switch (type) {
      case "alert":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "system":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "analysis":
        return <Bell className="w-5 h-5 text-blue-500" />;
      case "info":
        return <Info className="w-5 h-5 text-teal-500" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationBG = (type, read) => {
    if (read) return "bg-gray-50";
    switch (type) {
      case "alert":
        return "bg-red-50";
      case "system":
        return "bg-orange-50";
      case "analysis":
        return "bg-blue-50";
      case "info":
        return "bg-teal-50";
      case "success":
        return "bg-green-50";
      default:
        return "bg-gray-50";
    }
  };

  const handleMarkAsRead = (id) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, read: !notif.read } : notif,
      ),
    );
    toast.success("Notification updated");
  };

  const handleDelete = (id) => {
    setNotifications(notifications.filter((notif) => notif.id !== id));
    toast.success("Notification deleted");
  };

  const handleClearAll = () => {
    if (filteredNotifications.length > 0) {
      setNotifications(
        notifications.filter((notif) => {
          if (filter === "all") return false;
          return notif.type !== filter;
        }),
      );
      toast.success("Notifications cleared");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications =
    filter === "all"
      ? notifications
      : notifications.filter((n) => n.type === filter);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar open={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <NavBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex-1 overflow-auto">
          <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                  <Bell className="w-8 h-8 text-[#0F6E56]" />
                  Notifications
                </h1>
                <p className="text-gray-600">
                  {unreadCount > 0 ? (
                    <>
                      You have <span className="font-bold">{unreadCount}</span>{" "}
                      unread notifications
                    </>
                  ) : (
                    "All notifications read"
                  )}
                </p>
              </div>
              {filteredNotifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  Clear {filter === "all" ? "All" : "Filter"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main Notifications */}
              <div className="lg:col-span-3">
                {filteredNotifications.length > 0 ? (
                  <div className="space-y-3">
                    {filteredNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`rounded-lg shadow-sm border border-gray-200 p-4 transition-all hover:shadow-md ${getNotificationBG(
                          notif.type,
                          notif.read,
                        )} ${!notif.read ? "border-l-4 border-l-[#0F6E56]" : ""}`}
                      >
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 pt-1">
                            {getNotificationIcon(notif.type)}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3
                                  className={`font-semibold ${
                                    notif.read
                                      ? "text-gray-600"
                                      : "text-gray-800"
                                  }`}
                                >
                                  {notif.title}
                                </h3>
                                <p className="text-gray-600 text-sm mt-1">
                                  {notif.message}
                                </p>
                                <p className="text-gray-500 text-xs mt-2">
                                  {notif.timestamp}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {!notif.read && (
                                  <button
                                    onClick={() => handleMarkAsRead(notif.id)}
                                    className="px-3 py-1 bg-[#0F6E56] text-white rounded text-xs hover:bg-teal-700 transition-colors font-medium"
                                  >
                                    Mark Read
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(notif.id)}
                                  className="p-1 hover:bg-gray-300 rounded transition-colors"
                                >
                                  <X size={18} className="text-gray-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      No Notifications
                    </h3>
                    <p className="text-gray-500">
                      {filter === "all"
                        ? "You're all caught up!"
                        : `No ${filter} notifications`}
                    </p>
                  </div>
                )}
              </div>

              {/* Sidebar Filters */}
              <div className="space-y-4">
                {/* Filter Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Filter
                  </h3>

                  <div className="space-y-2">
                    <button
                      onClick={() => setFilter("all")}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        filter === "all"
                          ? "bg-[#0F6E56] text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilter("alert")}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        filter === "alert"
                          ? "bg-red-100 text-red-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <AlertCircle size={16} />
                      Alerts
                    </button>
                    <button
                      onClick={() => setFilter("analysis")}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        filter === "analysis"
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Bell size={16} />
                      Analysis
                    </button>
                    <button
                      onClick={() => setFilter("system")}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        filter === "system"
                          ? "bg-orange-100 text-orange-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <AlertTriangle size={16} />
                      System
                    </button>
                    <button
                      onClick={() => setFilter("success")}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        filter === "success"
                          ? "bg-green-100 text-green-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <CheckCircle size={16} />
                      Success
                    </button>
                    <button
                      onClick={() => setFilter("info")}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        filter === "info"
                          ? "bg-teal-100 text-teal-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Info size={16} />
                      Info
                    </button>
                  </div>
                </div>

                {/* Statistics Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Statistics
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total</span>
                      <span className="font-bold text-gray-800">
                        {notifications.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unread</span>
                      <span className="font-bold text-red-600">
                        {unreadCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Read</span>
                      <span className="font-bold text-green-600">
                        {notifications.length - unreadCount}
                      </span>
                    </div>

                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Alerts</span>
                        <span className="font-bold">
                          {
                            notifications.filter((n) => n.type === "alert")
                              .length
                          }
                        </span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-gray-600">Analysis</span>
                        <span className="font-bold">
                          {
                            notifications.filter((n) => n.type === "analysis")
                              .length
                          }
                        </span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-gray-600">System</span>
                        <span className="font-bold">
                          {
                            notifications.filter((n) => n.type === "system")
                              .length
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
