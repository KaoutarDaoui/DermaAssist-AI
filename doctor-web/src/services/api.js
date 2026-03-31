import axios from 'axios'
import { useAuthStore } from './authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Intercepteur pour ajouter le JWT aux requêtes
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercepteur pour gérer les erreurs d'authentification
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const auth = {
  register: (email, password, fullName, role) =>
    apiClient.post('/auth/register', { email, password, full_name: fullName, role }),
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }),
  refresh: (refreshToken) =>
    apiClient.post('/auth/refresh', { refresh_token: refreshToken }),
}

export const patients = {
  list: () => apiClient.get('/patients'),
  get: (patientId) => apiClient.get(`/patients/${patientId}`),
  create: (data) => apiClient.post('/patients', data),
  update: (patientId, data) => apiClient.patch(`/patients/${patientId}`, data),
}

export const consultations = {
  create: (patientId) => apiClient.post('/consultations', { patient_id: patientId }),
  get: (consultationId) => apiClient.get(`/consultations/${consultationId}`),
  getPatientHistory: (patientId) =>
    apiClient.get(`/consultations/by-patient/${patientId}`),
  updateNotes: (consultationId, notes) =>
    apiClient.patch(`/consultations/${consultationId}/notes`, { notes }),
}

export const images = {
  upload: (consultationId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post(`/consultations/${consultationId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  list: (consultationId) => apiClient.get(`/consultations/${consultationId}/images`),
}

export const ai = {
  analyze: (consultationId) =>
    apiClient.post(`/ai/analyze/${consultationId}`),
  getResult: (consultationId) =>
    apiClient.get(`/ai/result/${consultationId}`),
  getResultByConsultation: (patientId, consultationId) =>
    apiClient.get(
      `/patients/${patientId}/consultations/${consultationId}/ai-results`
    ),
  getPatientHistory: (patientId) =>
    apiClient.get(`/patients/${patientId}/ai-results-history`),
  getEnvSnapshot: (city) =>
    apiClient.get('/ai/env-snapshot', { params: { city } }),
}

export const advice = {
  create: (consultationId, data) =>
    apiClient.post(`/consultations/${consultationId}/advice`, data),
  get: (adviceId) => apiClient.get(`/advice/${adviceId}`),
  update: (adviceId, data) =>
    apiClient.patch(`/advice/${adviceId}`, data),
}

export default apiClient
