import { useState } from "react";
import { Save, Eye, EyeOff, Bell, Lock, User, Palette } from "lucide-react";
import NavBar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settings, setSettings] = useState({
    fullName: "Dr. Ahmed Medina",
    email: "dr.ahmed@dermaassist.com",
    phone: "+213 662210203",
    specialization: "Dermatology",
    licenseNumber: "DRS-2025-12345",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    notifications: {
      emailAlerts: true,
      smsAlerts: false,
      pushNotifications: true,
      weeklyReport: true,
    },
    darkMode: false,
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
  };

  const handleNotificationChange = (key) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    });
  };

  const handleToggleDarkMode = () => {
    setSettings({ ...settings, darkMode: !settings.darkMode });
  };

  const handleSaveSettings = () => {
    // Validate passwords if changing
    if (
      settings.newPassword &&
      settings.newPassword !== settings.confirmPassword
    ) {
      toast.error("New passwords do not match");
      return;
    }

    toast.success("Settings saved successfully!");
    setIsEditing(false);
    setSettings({
      ...settings,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  return (
    <div
      className={`flex h-screen ${
        settings.darkMode ? "bg-gray-900" : "bg-gray-100"
      }`}
    >
      <Sidebar open={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <NavBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="mb-8">
              <h1
                className={`text-4xl font-bold mb-2 ${
                  settings.darkMode ? "text-white" : "text-gray-800"
                }`}
              >
                Settings
              </h1>
              <p
                className={`${
                  settings.darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Manage your account and preferences
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Settings */}
              <div className="lg:col-span-2 space-y-6">
                {/* Profile Information */}
                <div
                  className={`rounded-lg shadow-md p-6 ${
                    settings.darkMode ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2
                      className={`text-2xl font-bold flex items-center gap-2 ${
                        settings.darkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      <User size={24} className="text-[#0F6E56]" />
                      Profile Information
                    </h2>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        isEditing
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-[#0F6E56] hover:bg-teal-700 text-white"
                      }`}
                    >
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          className={`block text-sm font-medium mb-2 ${
                            settings.darkMode
                              ? "text-gray-300"
                              : "text-gray-700"
                          }`}
                        >
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={settings.fullName}
                          disabled={!isEditing}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            settings.darkMode
                              ? "bg-gray-700 border-gray-600 text-white"
                              : "bg-gray-50 border-gray-300"
                          } focus:outline-none focus:border-[#0F6E56] disabled:opacity-75`}
                        />
                      </div>
                      <div>
                        <label
                          className={`block text-sm font-medium mb-2 ${
                            settings.darkMode
                              ? "text-gray-300"
                              : "text-gray-700"
                          }`}
                        >
                          Specialization
                        </label>
                        <input
                          type="text"
                          name="specialization"
                          value={settings.specialization}
                          disabled={!isEditing}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            settings.darkMode
                              ? "bg-gray-700 border-gray-600 text-white"
                              : "bg-gray-50 border-gray-300"
                          } focus:outline-none focus:border-[#0F6E56] disabled:opacity-75`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          className={`block text-sm font-medium mb-2 ${
                            settings.darkMode
                              ? "text-gray-300"
                              : "text-gray-700"
                          }`}
                        >
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={settings.email}
                          disabled={!isEditing}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            settings.darkMode
                              ? "bg-gray-700 border-gray-600 text-white"
                              : "bg-gray-50 border-gray-300"
                          } focus:outline-none focus:border-[#0F6E56] disabled:opacity-75`}
                        />
                      </div>
                      <div>
                        <label
                          className={`block text-sm font-medium mb-2 ${
                            settings.darkMode
                              ? "text-gray-300"
                              : "text-gray-700"
                          }`}
                        >
                          Phone
                        </label>
                        <input
                          type="text"
                          name="phone"
                          value={settings.phone}
                          disabled={!isEditing}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            settings.darkMode
                              ? "bg-gray-700 border-gray-600 text-white"
                              : "bg-gray-50 border-gray-300"
                          } focus:outline-none focus:border-[#0F6E56] disabled:opacity-75`}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          settings.darkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        License Number
                      </label>
                      <input
                        type="text"
                        name="licenseNumber"
                        value={settings.licenseNumber}
                        disabled={!isEditing}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          settings.darkMode
                            ? "bg-gray-700 border-gray-600 text-white"
                            : "bg-gray-50 border-gray-300"
                        } focus:outline-none focus:border-[#0F6E56] disabled:opacity-75`}
                      />
                    </div>
                  </div>

                  {isEditing && (
                    <button
                      onClick={handleSaveSettings}
                      className="w-full mt-6 bg-[#0F6E56] hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Save size={20} />
                      Save Changes
                    </button>
                  )}
                </div>

                {/* Password Change */}
                {isEditing && (
                  <div
                    className={`rounded-lg shadow-md p-6 ${
                      settings.darkMode ? "bg-gray-800" : "bg-white"
                    }`}
                  >
                    <h2
                      className={`text-2xl font-bold flex items-center gap-2 mb-6 ${
                        settings.darkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      <Lock size={24} className="text-[#0F6E56]" />
                      Change Password
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <label
                          className={`block text-sm font-medium mb-2 ${
                            settings.darkMode
                              ? "text-gray-300"
                              : "text-gray-700"
                          }`}
                        >
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.current ? "text" : "password"}
                            name="currentPassword"
                            value={settings.currentPassword}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2 rounded-lg border ${
                              settings.darkMode
                                ? "bg-gray-700 border-gray-600 text-white"
                                : "bg-gray-50 border-gray-300"
                            } focus:outline-none focus:border-[#0F6E56]`}
                          />
                          <button
                            onClick={() =>
                              setShowPasswords({
                                ...showPasswords,
                                current: !showPasswords.current,
                              })
                            }
                            className="absolute right-3 top-2.5 text-gray-500"
                          >
                            {showPasswords.current ? (
                              <EyeOff size={20} />
                            ) : (
                              <Eye size={20} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label
                          className={`block text-sm font-medium mb-2 ${
                            settings.darkMode
                              ? "text-gray-300"
                              : "text-gray-700"
                          }`}
                        >
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.new ? "text" : "password"}
                            name="newPassword"
                            value={settings.newPassword}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2 rounded-lg border ${
                              settings.darkMode
                                ? "bg-gray-700 border-gray-600 text-white"
                                : "bg-gray-50 border-gray-300"
                            } focus:outline-none focus:border-[#0F6E56]`}
                          />
                          <button
                            onClick={() =>
                              setShowPasswords({
                                ...showPasswords,
                                new: !showPasswords.new,
                              })
                            }
                            className="absolute right-3 top-2.5 text-gray-500"
                          >
                            {showPasswords.new ? (
                              <EyeOff size={20} />
                            ) : (
                              <Eye size={20} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label
                          className={`block text-sm font-medium mb-2 ${
                            settings.darkMode
                              ? "text-gray-300"
                              : "text-gray-700"
                          }`}
                        >
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.confirm ? "text" : "password"}
                            name="confirmPassword"
                            value={settings.confirmPassword}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2 rounded-lg border ${
                              settings.darkMode
                                ? "bg-gray-700 border-gray-600 text-white"
                                : "bg-gray-50 border-gray-300"
                            } focus:outline-none focus:border-[#0F6E56]`}
                          />
                          <button
                            onClick={() =>
                              setShowPasswords({
                                ...showPasswords,
                                confirm: !showPasswords.confirm,
                              })
                            }
                            className="absolute right-3 top-2.5 text-gray-500"
                          >
                            {showPasswords.confirm ? (
                              <EyeOff size={20} />
                            ) : (
                              <Eye size={20} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications */}
                <div
                  className={`rounded-lg shadow-md p-6 ${
                    settings.darkMode ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <h2
                    className={`text-2xl font-bold flex items-center gap-2 mb-6 ${
                      settings.darkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    <Bell size={24} className="text-[#0F6E56]" />
                    Notifications
                  </h2>

                  <div className="space-y-4">
                    {Object.entries(settings.notifications).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <label
                            className={`${
                              settings.darkMode
                                ? "text-gray-300"
                                : "text-gray-700"
                            }`}
                          >
                            {key === "emailAlerts"
                              ? "Email Alerts"
                              : key === "smsAlerts"
                                ? "SMS Alerts"
                                : key === "pushNotifications"
                                  ? "Push Notifications"
                                  : "Weekly Report"}
                          </label>
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={() => handleNotificationChange(key)}
                            className="w-5 h-5 cursor-pointer accent-[#0F6E56]"
                          />
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Appearance */}
                <div
                  className={`rounded-lg shadow-md p-6 ${
                    settings.darkMode ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <h3
                    className={`text-lg font-bold flex items-center gap-2 mb-4 ${
                      settings.darkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    <Palette size={20} className="text-[#0F6E56]" />
                    Appearance
                  </h3>

                  <div className="flex items-center justify-between">
                    <label
                      className={`${
                        settings.darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Dark Mode
                    </label>
                    <input
                      type="checkbox"
                      checked={settings.darkMode}
                      onChange={handleToggleDarkMode}
                      className="w-5 h-5 cursor-pointer accent-[#0F6E56]"
                    />
                  </div>
                </div>

                {/* Account Status */}
                <div
                  className={`rounded-lg shadow-md p-6 ${
                    settings.darkMode ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <h3
                    className={`text-lg font-bold mb-4 ${
                      settings.darkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    Account Status
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span
                        className={`${
                          settings.darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Status
                      </span>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`${
                          settings.darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Member Since
                      </span>
                      <span
                        className={`${
                          settings.darkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Jan 2025
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`${
                          settings.darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Last Login
                      </span>
                      <span
                        className={`${
                          settings.darkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Today
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
  );
}
