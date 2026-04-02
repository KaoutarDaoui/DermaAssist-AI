import authService from './authService';

// For Android Emulator: 10.0.2.2
// For Physical Device: Use your machine's IP address (e.g., http://192.168.x.x:8000)
//const API_URL = 'http://10.21.138.178:8000';
const API_URL = "https://mean-planes-knock.loca.lt";

class PatientDataService {
  async getPatientProfile() {
    try {
      const headers = await authService.getAuthHeaders();
      const response = await fetch(`${API_URL}/mobile/patient/profile`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch patient profile');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getConsultations() {
    try {
      const headers = await authService.getAuthHeaders();
      const response = await fetch(`${API_URL}/mobile/patient/consultations`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch consultations');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getAdvice() {
    try {
      const headers = await authService.getAuthHeaders();
      const response = await fetch(`${API_URL}/mobile/patient/advice`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch advice');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getCheckIns() {
    try {
      const headers = await authService.getAuthHeaders();
      const response = await fetch(`${API_URL}/mobile/patient/checkins`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch check-ins');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }
}

export default new PatientDataService();
