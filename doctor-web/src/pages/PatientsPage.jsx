import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  X,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = "http://localhost:8000";

export default function PatientsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [patientsList, setPatientsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [patientToEdit, setPatientToEdit] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    city: "",
    fitzpatrick_type: "IV",
    phone: "",
    birth_date: "",
    medical_history: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    city: "",
    fitzpatrick_type: "IV",
    phone: "",
    birth_date: "",
    medical_history: "",
    insuf_cardiaque: "undefined",
  });

  // Load patients from database
  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      console.log("Loading patients from:", `${API_URL}/patients`);
      const response = await axios.get(`${API_URL}/patients`);
      console.log("Patients loaded:", response.data);
      setPatientsList(response.data);
    } catch (error) {
      console.error("Error loading patients:", error);
      console.error("Error response:", error.response?.data);
      toast.error("Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    try {
      if (!formData.name || !formData.email) {
        toast.error("Name and email are required");
        return;
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        birth_date: formData.birth_date || null,
        fitzpatrick_type: formData.fitzpatrick_type || "IV",
        city: formData.city || null,
        medical_history: formData.medical_history || "",
      };

      console.log("Sending payload:", payload);

      const response = await axios.post(
        `${API_URL}/patients/create-simple`,
        payload,
      );

      console.log("Response:", response.data);

      setPatientsList([...patientsList, response.data]);
      setFormData({
        name: "",
        email: "",
        city: "",
        fitzpatrick_type: "IV",
        phone: "",
        birth_date: "",
        medical_history: "",
      });
      setShowAddModal(false);
      toast.success("Patient added successfully!");
    } catch (error) {
      console.error("Full error:", error);
      console.error("Error response:", error.response?.data);
      const errorMsg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to add patient";
      toast.error(errorMsg);
    }
  };

  const handleDelete = async (patient) => {
    setPatientToDelete(patient);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!patientToDelete) return;

    try {
      setDeleting(true);
      const deleteUrl = `${API_URL}/patients/${patientToDelete.id}`;
      console.log("=== DELETE REQUEST ===");
      console.log("URL:", deleteUrl);
      console.log("Patient ID:", patientToDelete.id);
      console.log("Patient data:", patientToDelete);
      console.log("Full URL constructed:", deleteUrl);

      const response = await axios.delete(deleteUrl);

      console.log("=== DELETE SUCCESS ===");
      console.log("Response:", response);

      setPatientsList(patientsList.filter((p) => p.id !== patientToDelete.id));
      setShowDeleteConfirm(false);
      setPatientToDelete(null);
      toast.success("Patient deleted successfully");
    } catch (error) {
      console.error("=== DELETE ERROR ===");
      console.error("Full error object:", error);
      console.error("Error config:", error.config);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Response status:", error.response?.status);
      console.error("Response data:", error.response?.data);
      console.error("Request URL:", error.config?.url);
      console.error("Request method:", error.config?.method);

      const errorMsg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to delete patient";
      toast.error(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setPatientToDelete(null);
  };

  const handleEdit = (patient) => {
    // Pre-fill the edit form with patient data
    setPatientToEdit(patient);
    setEditFormData({
      name: patient.user?.full_name || "",
      email: patient.user?.email || "",
      city: patient.city || "",
      fitzpatrick_type: patient.fitzpatrick_type?.replace("TYPE_", "") || "IV",
      phone: patient.phone || "",
      birth_date: patient.birth_date || "",
      medical_history: patient.medical_history || "",
    });
    setShowEditModal(true);
  };

  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    if (!patientToEdit) return;

    try {
      setUpdating(true);
      const payload = {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone || null,
        birth_date: editFormData.birth_date || null,
        fitzpatrick_type: editFormData.fitzpatrick_type || "IV",
        city: editFormData.city || null,
        medical_history: editFormData.medical_history || "",
      };

      console.log("Updating patient with payload:", payload);

      const response = await axios.patch(
        `${API_URL}/patients/${patientToEdit.id}/update-simple`,
        payload,
      );

      console.log("Update response:", response.data);

      // Update the patient in the list
      setPatientsList(
        patientsList.map((p) =>
          p.id === patientToEdit.id ? response.data : p,
        ),
      );

      setShowEditModal(false);
      setPatientToEdit(null);
      setEditFormData({
        name: "",
        email: "",
        city: "",
        fitzpatrick_type: "IV",
        phone: "",
        birth_date: "",
        medical_history: "",
      });
      toast.success("Patient updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      const errorMsg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to update patient";
      toast.error(errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  const cancelEdit = () => {
    setShowEditModal(false);
    setPatientToEdit(null);
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  const getAgeDisplay = (patient) => {
    const age = calculateAge(patient.birth_date);
    return age ? `${age} years` : "N/A";
  };

  const filteredPatients = patientsList.filter((patient) => {
    const user = patient.user || {};
    return (
      (user.full_name &&
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email &&
        user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (patient.city &&
        patient.city.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="flex h-screen bg-[#F8F9FA]">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <NavBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8 space-y-6">
            {/* Header with Title and Action Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#0F6E56] rounded-lg">
                  <Users size={28} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-gray-800">
                    Patients
                  </h1>
                  <p className="text-gray-600 font-medium">
                    Manage and view all patient records
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-[#0F6E56] text-white px-6 py-3 rounded-lg hover:bg-[#0d5a47] transition-all font-medium shadow-md"
              >
                <Plus size={20} />
                Add Patient
              </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="relative">
                <Search
                  size={20}
                  className="absolute left-4 top-3 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search by name, email, or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-gray-600 text-sm mb-1 font-semibold">
                  Total Patients
                </p>
                <p className="text-2xl font-black text-gray-800">
                  {patientsList.length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-gray-600 text-sm mb-1 font-semibold">
                  This Month
                </p>
                <p className="text-2xl font-black text-green-600">
                  {filteredPatients.length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-gray-600 text-sm mb-1 font-semibold">
                  Consultations
                </p>
                <p className="text-2xl font-black text-blue-600">0</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-gray-600 text-sm mb-1 font-semibold">
                  Reports Pending
                </p>
                <p className="text-2xl font-black text-red-600">0</p>
              </div>
            </div>

            {/* Patients List */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin">
                  <div className="w-8 h-8 border-4 border-[#0F6E56] border-t-transparent rounded-full"></div>
                </div>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="bg-white p-12 rounded-lg shadow-sm text-center">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 text-lg">No patients found</p>
                <p className="text-gray-500 text-sm">
                  Try adjusting your search criteria or add a new patient
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredPatients.map((patient) => {
                  const user = patient.user || {};
                  return (
                    <div
                      key={patient.id}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-6 border border-gray-100"
                    >
                      <div className="grid grid-cols-12 gap-6 items-center">
                        {/* Patient Info */}
                        <div className="col-span-5">
                          <h3 className="text-lg font-black text-gray-800 mb-3">
                            {user.full_name || "Unknown Patient"}
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone size={16} className="text-[#0F6E56]" />
                              {patient.phone || "N/A"}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin size={16} className="text-[#0F6E56]" />
                              {patient.city || "N/A"}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 text-xs">
                              <Calendar size={16} className="text-[#0F6E56]" />
                              Age: {getAgeDisplay(patient)}
                            </div>
                            {patient.birth_date && (
                              <div className="flex items-center gap-2 text-gray-600 text-xs">
                                <Calendar
                                  size={16}
                                  className="text-[#0F6E56]"
                                />
                                DOB:{" "}
                                {new Date(
                                  patient.birth_date,
                                ).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Email & Fitzpatrick */}
                        <div className="col-span-3">
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 font-semibold">
                              Email
                            </p>
                            <p className="text-sm font-semibold text-gray-800 break-all">
                              {user.email || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 font-semibold">
                              Fitzpatrick Type
                            </p>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-full border-2 border-gray-300`}
                                style={{
                                  backgroundColor: [
                                    "#FFD89B",
                                    "#F5C69F",
                                    "#D4A795",
                                    "#A8876F",
                                    "#5D4E47",
                                  ][
                                    parseInt(
                                      patient.fitzpatrick_type &&
                                        patient.fitzpatrick_type.replace(
                                          /[^\d]/g,
                                          "",
                                        ),
                                    ) - 1 || 3
                                  ],
                                }}
                              ></div>
                              <span className="text-sm font-semibold text-gray-800">
                                Type {patient.fitzpatrick_type || "IV"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="col-span-2">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            Active
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/patients/${patient.id}`)}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-all text-blue-600 hover:text-blue-700"
                            title="View details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(patient)}
                            className="p-2 hover:bg-yellow-50 rounded-lg transition-all text-yellow-600 hover:text-yellow-700"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(patient)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-all text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-800">
                Add New Patient
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddPatient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none"
                  placeholder="Patient name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none"
                  placeholder="patient@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    if (value.length > 0 && !value.startsWith("0")) {
                      value = "0" + value.slice(0, 9);
                    }
                    setFormData({ ...formData, phone: value });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none"
                  placeholder="0123456789"
                  maxLength="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wilaya (Province)
                </label>
                <select
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none max-h-48"
                >
                  <option value="">Select a wilaya...</option>
                  <option value="Adrar">Adrar</option>
                  <option value="Chlef">Chlef</option>
                  <option value="Laghouat">Laghouat</option>
                  <option value="Oum El Bouaghi">Oum El Bouaghi</option>
                  <option value="Batna">Batna</option>
                  <option value="Béjaïa">Béjaïa</option>
                  <option value="Biskra">Biskra</option>
                  <option value="Béchar">Béchar</option>
                  <option value="Blida">Blida</option>
                  <option value="Bouira">Bouira</option>
                  <option value="Tamanrasset">Tamanrasset</option>
                  <option value="Tlemcen">Tlemcen</option>
                  <option value="Tiaret">Tiaret</option>
                  <option value="Tizi Ouzou">Tizi Ouzou</option>
                  <option value="Algiers">Algiers</option>
                  <option value="Djelfa">Djelfa</option>
                  <option value="Jijel">Jijel</option>
                  <option value="Sétif">Sétif</option>
                  <option value="Saïda">Saïda</option>
                  <option value="Skikda">Skikda</option>
                  <option value="Sidi Bel Abbès">Sidi Bel Abbès</option>
                  <option value="Annaba">Annaba</option>
                  <option value="Guelma">Guelma</option>
                  <option value="Constantine">Constantine</option>
                  <option value="Médéa">Médéa</option>
                  <option value="Mostaganem">Mostaganem</option>
                  <option value="M'Sila">M'Sila</option>
                  <option value="Mascara">Mascara</option>
                  <option value="Ouargla">Ouargla</option>
                  <option value="Oran">Oran</option>
                  <option value="El Bayadh">El Bayadh</option>
                  <option value="Illizi">Illizi</option>
                  <option value="Bordj Bou Arréridj">Bordj Bou Arréridj</option>
                  <option value="Boumerdès">Boumerdès</option>
                  <option value="El Tarf">El Tarf</option>
                  <option value="Tindouf">Tindouf</option>
                  <option value="Tissemsilt">Tissemsilt</option>
                  <option value="El Oued">El Oued</option>
                  <option value="Khenchela">Khenchela</option>
                  <option value="Souk Ahras">Souk Ahras</option>
                  <option value="Tipaza">Tipaza</option>
                  <option value="Mila">Mila</option>
                  <option value="Aïn Defla">Aïn Defla</option>
                  <option value="Naâma">Naâma</option>
                  <option value="Aïn Témouchent">Aïn Témouchent</option>
                  <option value="Ghardaïa">Ghardaïa</option>
                  <option value="Relizane">Relizane</option>
                  <option value="Drâa Ben Khedda">Drâa Ben Khedda</option>
                  <option value="Béni Messous">Béni Messous</option>
                  <option value="Tébessa">Tébessa</option>
                  <option value="Aflou">Aflou</option>
                  <option value="Barika">Barika</option>
                  <option value="El Kantara">El Kantara</option>
                  <option value="Bir El Ater">Bir El Ater</option>
                  <option value="El Aricha">El Aricha</option>
                  <option value="Ksar Chellala">Ksar Chellala</option>
                  <option value="Aïn Oussera">Aïn Oussera</option>
                  <option value="Messaad">Messaad</option>
                  <option value="Ksar El Boukhari">Ksar El Boukhari</option>
                  <option value="Bou Saâda">Bou Saâda</option>
                  <option value="El Abiodh Sidi Cheikh">
                    El Abiodh Sidi Cheikh
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) =>
                    setFormData({ ...formData, birth_date: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fitzpatrick Type
                </label>
                <select
                  value={formData.fitzpatrick_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fitzpatrick_type: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none"
                >
                  <option value="I">Type I</option>
                  <option value="II">Type II</option>
                  <option value="III">Type III</option>
                  <option value="IV">Type IV</option>
                  <option value="V">Type V</option>
                  <option value="VI">Type VI</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical History
                </label>
                <textarea
                  value={formData.medical_history}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      medical_history: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none"
                  placeholder="Any relevant medical history..."
                  rows="2"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#0F6E56] text-white rounded-lg font-medium hover:bg-[#0d5a47] transition-all"
                >
                  Add Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && patientToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>

              <h3 className="text-lg font-bold text-gray-800 text-center mb-2">
                Delete Patient
              </h3>

              <p className="text-gray-600 text-center mb-2">
                Are you sure you want to delete{" "}
                <span className="font-semibold">
                  {patientToDelete.user?.full_name || "this patient"}
                </span>
                ?
              </p>

              <p className="text-gray-500 text-center text-sm mb-6">
                This action cannot be undone. The patient account and all
                associated data will be permanently deleted.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Delete Patient
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {showEditModal && patientToEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-800">Edit Patient</h2>
              <button
                onClick={cancelEdit}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdatePatient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none"
                  placeholder="Patient name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none"
                  placeholder="patient@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    if (value.length > 0 && !value.startsWith("0")) {
                      value = "0" + value.slice(0, 9);
                    }
                    setEditFormData({ ...editFormData, phone: value });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none"
                  placeholder="0123456789"
                  maxLength="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wilaya (Province)
                </label>
                <select
                  value={editFormData.city}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, city: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none max-h-48"
                >
                  <option value="">Select a wilaya...</option>
                  <option value="Adrar">Adrar</option>
                  <option value="Chlef">Chlef</option>
                  <option value="Laghouat">Laghouat</option>
                  <option value="Oum El Bouaghi">Oum El Bouaghi</option>
                  <option value="Batna">Batna</option>
                  <option value="Béjaïa">Béjaïa</option>
                  <option value="Biskra">Biskra</option>
                  <option value="Béchar">Béchar</option>
                  <option value="Blida">Blida</option>
                  <option value="Bouira">Bouira</option>
                  <option value="Tamanrasset">Tamanrasset</option>
                  <option value="Tlemcen">Tlemcen</option>
                  <option value="Tiaret">Tiaret</option>
                  <option value="Tizi Ouzou">Tizi Ouzou</option>
                  <option value="Algiers">Algiers</option>
                  <option value="Djelfa">Djelfa</option>
                  <option value="Jijel">Jijel</option>
                  <option value="Sétif">Sétif</option>
                  <option value="Saïda">Saïda</option>
                  <option value="Skikda">Skikda</option>
                  <option value="Sidi Bel Abbès">Sidi Bel Abbès</option>
                  <option value="Annaba">Annaba</option>
                  <option value="Guelma">Guelma</option>
                  <option value="Constantine">Constantine</option>
                  <option value="Médéa">Médéa</option>
                  <option value="Mostaganem">Mostaganem</option>
                  <option value="M'Sila">M'Sila</option>
                  <option value="Mascara">Mascara</option>
                  <option value="Ouargla">Ouargla</option>
                  <option value="Oran">Oran</option>
                  <option value="El Bayadh">El Bayadh</option>
                  <option value="Illizi">Illizi</option>
                  <option value="Bordj Bou Arréridj">Bordj Bou Arréridj</option>
                  <option value="Boumerdès">Boumerdès</option>
                  <option value="El Tarf">El Tarf</option>
                  <option value="Tindouf">Tindouf</option>
                  <option value="Tissemsilt">Tissemsilt</option>
                  <option value="El Oued">El Oued</option>
                  <option value="Khenchela">Khenchela</option>
                  <option value="Souk Ahras">Souk Ahras</option>
                  <option value="Tipaza">Tipaza</option>
                  <option value="Mila">Mila</option>
                  <option value="Aïn Defla">Aïn Defla</option>
                  <option value="Naâma">Naâma</option>
                  <option value="Aïn Témouchent">Aïn Témouchent</option>
                  <option value="Ghardaïa">Ghardaïa</option>
                  <option value="Relizane">Relizane</option>
                  <option value="Drâa Ben Khedda">Drâa Ben Khedda</option>
                  <option value="Béni Messous">Béni Messous</option>
                  <option value="Tébessa">Tébessa</option>
                  <option value="Aflou">Aflou</option>
                  <option value="Barika">Barika</option>
                  <option value="El Kantara">El Kantara</option>
                  <option value="Bir El Ater">Bir El Ater</option>
                  <option value="El Aricha">El Aricha</option>
                  <option value="Ksar Chellala">Ksar Chellala</option>
                  <option value="Aïn Oussera">Aïn Oussera</option>
                  <option value="Messaad">Messaad</option>
                  <option value="Ksar El Boukhari">Ksar El Boukhari</option>
                  <option value="Bou Saâda">Bou Saâda</option>
                  <option value="El Abiodh Sidi Cheikh">
                    El Abiodh Sidi Cheikh
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={editFormData.birth_date}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      birth_date: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fitzpatrick Type
                </label>
                <select
                  value={editFormData.fitzpatrick_type}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      fitzpatrick_type: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none"
                >
                  <option value="I">Type I</option>
                  <option value="II">Type II</option>
                  <option value="III">Type III</option>
                  <option value="IV">Type IV</option>
                  <option value="V">Type V</option>
                  <option value="VI">Type VI</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical History
                </label>
                <textarea
                  value={editFormData.medical_history}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      medical_history: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F6E56] outline-none"
                  placeholder="Any relevant medical history..."
                  rows="2"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-[#0F6E56] text-white rounded-lg font-medium hover:bg-[#0d5a47] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {updating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
