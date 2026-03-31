import { useState } from "react";
import {
  User,
  Edit3,
  Save,
  X,
  Mail,
  Phone,
  MapPin,
  Award,
  Calendar,
  Briefcase,
} from "lucide-react";
import NavBar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState({
    fullName: "Dr. Ahmed Medina",
    email: "dr.ahmed@dermaassist.com",
    phone: "+213 662210203",
    specialization: "Dermatology",
    licenseNumber: "DRS-2025-12345",
    licenseExpiry: "2026-12-31",
    city: "Algiers",
    country: "Algeria",
    bio: "Experienced dermatologist with 10+ years of practice in clinical and cosmetic dermatology.",
    university: "Faculty of Medicine, University of Algiers",
    graduationYear: "2014",
    certifications: [
      "Board Certified in Dermatology",
      "Advanced Skin Cancer Surgery",
      "Cosmetic Dermatology Specialist",
    ],
    experience: "10+ Years",
    avatar: "DA",
  });

  const [editedProfile, setEditedProfile] = useState(profile);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedProfile(profile);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedProfile({ ...editedProfile, [name]: value });
  };

  const handleSaveChanges = () => {
    setProfile(editedProfile);
    setIsEditing(false);
    toast.success("Profile updated successfully!");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile(profile);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar open={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <NavBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex-1 overflow-auto">
          <div className="p-8 max-w-4xl mx-auto">
            {/* Header with Profile Picture and Basic Info */}
            <div className="bg-white rounded-lg shadow-md p-8 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-6">
                  {/* Avatar */}
                  <div className="w-24 h-24 bg-gradient-to-br from-[#0F6E56] to-teal-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {profile.avatar}
                  </div>

                  {/* Profile Info */}
                  <div className="pt-2">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                      {profile.fullName}
                    </h1>
                    <p className="text-[#0F6E56] text-lg font-semibold mb-2">
                      {profile.specialization}
                    </p>
                    <p className="text-gray-600 text-sm mb-3 max-w-md">
                      {profile.bio}
                    </p>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin size={16} />
                        {profile.city}, {profile.country}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase size={16} />
                        {profile.experience}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit Button */}
                {!isEditing && (
                  <button
                    onClick={handleEditClick}
                    className="bg-[#0F6E56] hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Edit3 size={18} />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Contact & Professional Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Contact Information */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Mail className="text-[#0F6E56]" />
                    Contact Information
                  </h2>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={editedProfile.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="text"
                          name="phone"
                          value={editedProfile.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            name="city"
                            value={editedProfile.city}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country
                          </label>
                          <input
                            type="text"
                            name="country"
                            value={editedProfile.country}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 pb-3 border-b">
                        <Mail className="text-[#0F6E56]" size={20} />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="text-gray-800 font-medium">
                            {profile.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pb-3 border-b">
                        <Phone className="text-[#0F6E56]" size={20} />
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="text-gray-800 font-medium">
                            {profile.phone}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="text-[#0F6E56]" size={20} />
                        <div>
                          <p className="text-sm text-gray-600">Location</p>
                          <p className="text-gray-800 font-medium">
                            {profile.city}, {profile.country}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Professional Information */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Briefcase className="text-[#0F6E56]" />
                    Professional Information
                  </h2>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={editedProfile.fullName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Specialization
                        </label>
                        <input
                          type="text"
                          name="specialization"
                          value={editedProfile.specialization}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            License Number
                          </label>
                          <input
                            type="text"
                            name="licenseNumber"
                            value={editedProfile.licenseNumber}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            License Expiry
                          </label>
                          <input
                            type="date"
                            name="licenseExpiry"
                            value={editedProfile.licenseExpiry}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bio
                        </label>
                        <textarea
                          name="bio"
                          value={editedProfile.bio}
                          onChange={handleInputChange}
                          rows="3"
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="pb-3 border-b">
                        <p className="text-sm text-gray-600 mb-1">
                          Specialization
                        </p>
                        <p className="text-gray-800 font-medium">
                          {profile.specialization}
                        </p>
                      </div>
                      <div className="pb-3 border-b flex items-start gap-3">
                        <Award className="text-[#0F6E56] mt-1" size={20} />
                        <div>
                          <p className="text-sm text-gray-600 mb-1">
                            License Number
                          </p>
                          <p className="text-gray-800 font-medium">
                            {profile.licenseNumber}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Expires: {profile.licenseExpiry}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Bio</p>
                        <p className="text-gray-800">{profile.bio}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Education & Experience */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar className="text-[#0F6E56]" />
                    Education & Experience
                  </h2>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          University
                        </label>
                        <input
                          type="text"
                          name="university"
                          value={editedProfile.university}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Graduation Year
                          </label>
                          <input
                            type="text"
                            name="graduationYear"
                            value={editedProfile.graduationYear}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Experience
                          </label>
                          <input
                            type="text"
                            name="experience"
                            value={editedProfile.experience}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F6E56]"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="pb-3 border-b">
                        <p className="text-sm text-gray-600 mb-1">University</p>
                        <p className="text-gray-800 font-medium">
                          {profile.university}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Graduated: {profile.graduationYear}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Experience</p>
                        <p className="text-gray-800 font-medium">
                          {profile.experience}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleSaveChanges}
                      className="flex-1 bg-[#0F6E56] hover:bg-teal-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
                    >
                      <Save size={20} />
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
                    >
                      <X size={20} />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column - Certifications & Stats */}
              <div className="space-y-6">
                {/* Certifications */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Award className="text-[#0F6E56]" />
                    Certifications
                  </h3>

                  <ul className="space-y-3">
                    {profile.certifications.map((cert, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 pb-3 border-b last:border-b-0"
                      >
                        <span className="inline-block w-2 h-2 bg-[#0F6E56] rounded-full mt-1.5 flex-shrink-0"></span>
                        <span className="text-gray-700 text-sm">{cert}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Quick Stats */}
                <div className="bg-gradient-to-br from-[#0F6E56] to-teal-700 rounded-lg shadow-md p-6 text-white">
                  <h3 className="text-lg font-bold mb-4">Quick Stats</h3>

                  <div className="space-y-4">
                    <div>
                      <p className="text-teal-100 text-sm mb-1">
                        License Status
                      </p>
                      <p className="text-xl font-bold">Active</p>
                    </div>
                    <div>
                      <p className="text-teal-100 text-sm mb-1">Member Since</p>
                      <p className="text-xl font-bold">Jan 2025</p>
                    </div>
                    <div>
                      <p className="text-teal-100 text-sm mb-1">
                        Total Consultations
                      </p>
                      <p className="text-xl font-bold">156</p>
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Account Status
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-gray-600">Verification</span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                        Verified
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-gray-600">License</span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">2FA</span>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                        Disabled
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
