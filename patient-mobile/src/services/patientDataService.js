import authService from './authService';
import { Platform } from 'react-native';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');

class PatientDataService {
  async getCurrentPatientId() {
    try {
      const profile = await this.getPatientProfile();
      if (!profile?.id) {
        throw new Error('Patient ID not found');
      }

      return profile.id;
    } catch (error) {
      throw error;
    }
  }

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

  async getAIMedications() {
    try {
      const headers = await authService.getAuthHeaders();
      const response = await fetch(`${API_URL}/mobile/patient/ai-medications`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI medications');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getAIResultsHistory() {
    try {
      const headers = await authService.getAuthHeaders();
      const response = await fetch(`${API_URL}/mobile/patient/ai-results-history`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI results history');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getAIResultDetails(aiResultId) {
    try {
      const headers = await authService.getAuthHeaders();
      const response = await fetch(`${API_URL}/mobile/patient/ai-results/${aiResultId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI result details');
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

  async getSkinImages(patientIdOverride = null) {
    try {
      const headers = await authService.getAuthHeaders();
      const patientId = patientIdOverride || await this.getCurrentPatientId();

      const response = await fetch(`${API_URL}/patients/${patientId}/skin-images`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch skin images');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getSkinImage(imageId, patientIdOverride = null) {
    try {
      const headers = await authService.getAuthHeaders();
      const patientId = patientIdOverride || await this.getCurrentPatientId();

      const response = await fetch(`${API_URL}/patients/${patientId}/skin-images/${imageId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch skin image detail');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getSkinImagesWithData() {
    try {
      const patientId = await this.getCurrentPatientId();
      const images = await this.getSkinImages(patientId);
      if (!Array.isArray(images) || images.length === 0) {
        return [];
      }

      const normalizedImages = images
        .filter((image) => image && image.id)
        .map((image) => ({
          ...image,
          id: String(image.id),
          // Load only lightweight data on screen entry to avoid web white-screen crashes.
          base64: image?.minio_url || null,
        }));

      return normalizedImages.sort((first, second) => {
        const firstDate = first?.uploaded_at ? new Date(first.uploaded_at).getTime() : 0;
        const secondDate = second?.uploaded_at ? new Date(second.uploaded_at).getTime() : 0;
        return secondDate - firstDate;
      });
    } catch (error) {
      throw error;
    }
  }

  async getSkinImagePreview(imageId) {
    try {
      const detail = await this.getSkinImage(imageId);
      return detail?.image_data || null;
    } catch (error) {
      throw error;
    }
  }

  async getSkinProgression() {
    try {
      const [headers, patientId] = await Promise.all([
        authService.getAuthHeaders(),
        this.getCurrentPatientId(),
      ]);

      const response = await fetch(`${API_URL}/patients/${patientId}/skin-images/progression`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch skin progression');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async uploadSkinImage(imageUri) {
    try {
      const [patientId, token] = await Promise.all([
        this.getCurrentPatientId(),
        authService.getAccessToken(),
      ]);

      if (!token) {
        throw new Error('No access token available');
      }

      const fileName = imageUri?.split('/').pop() || `photo-${Date.now()}.jpg`;
      const lowerName = fileName.toLowerCase();
      const mimeType = lowerName.endsWith('.png') ? 'image/png' : 'image/jpeg';

      const formData = new FormData();

      // Expo web needs a Blob/File, while native expects the { uri, name, type } object.
      if (Platform.OS === 'web') {
        const imageResponse = await fetch(imageUri);
        if (!imageResponse.ok) {
          throw new Error('Unable to read selected image');
        }

        const imageBlob = await imageResponse.blob();
        formData.append('file', imageBlob, fileName);
      } else {
        formData.append('file', {
          uri: imageUri,
          name: fileName,
          type: mimeType,
        });
      }

      const response = await fetch(`${API_URL}/patients/${patientId}/skin-images`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let detail = 'Failed to upload skin image';
        try {
          const errorData = await response.json();
          detail = errorData?.detail || detail;
        } catch {
          // noop
        }
        throw new Error(detail);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async compareSkinImages(referenceImageId, newImageId) {
    try {
      const [headers, patientId] = await Promise.all([
        authService.getAuthHeaders(),
        this.getCurrentPatientId(),
      ]);

      const query = `image_ref_id=${encodeURIComponent(referenceImageId)}&image_new_id=${encodeURIComponent(newImageId)}&include_overlay=false`;

      const response = await fetch(`${API_URL}/patients/${patientId}/skin-images/compare?${query}`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        let detail = 'Failed to compare skin images';
        try {
          const errorData = await response.json();
          detail = errorData?.detail || detail;
        } catch {
          // noop
        }
        throw new Error(detail);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }
}

export default new PatientDataService();
