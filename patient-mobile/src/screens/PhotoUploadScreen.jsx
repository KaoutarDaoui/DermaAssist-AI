import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  ChevronLeft,
  Camera,
  Upload,
  Image as ImageIcon,
  CircleCheck as CheckCircle,
  Lightbulb,
  CircleAlert as AlertCircle,
  Send,
  X,
} from "lucide-react-native/icons";
import patientDataService from "../services/patientDataService";

const COLORS = {
  primary: "#2D4A85",
  secondary: "#7A869A",
  accent: "#4A90E2",
  background: "#F9FBFF",
  white: "#FFFFFF",
  textDark: "#333333",
  textLight: "#8E9AAF",
  success: "#10B981",
  lightBg: "#EBF2FF",
  warning: "#F59E0B",
  border: "#E5E7EB",
};

export default function PhotoUploadScreen({ navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de sélectionner l'image");
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de prendre une photo");
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert("Erreur", "Veuillez sélectionner une image");
      return;
    }

    setUploading(true);
    try {
      await patientDataService.uploadSkinImage(selectedImage);
      Alert.alert("Succès", "Photo enregistrée avec succès dans votre suivi");
      setSelectedImage(null);
      setNotes("");
      setTimeout(() => navigation.goBack(), 500);
    } catch (error) {
      Alert.alert("Erreur", error?.message || "Échec de l'envoi");
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Envoyer une Photo</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Instructions Card */}
        <View style={styles.instructionsCard}>
          <View style={styles.instructionHeader}>
            <View style={styles.instructionIconBg}>
              <Lightbulb size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.instructionTitle}>Instructions</Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <CheckCircle size={16} color={COLORS.success} />
            </View>
            <Text style={styles.instructionText}>
              Prenez une photo claire de la zone affectée
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <CheckCircle size={16} color={COLORS.success} />
            </View>
            <Text style={styles.instructionText}>
              Assurez-vous d'un bon éclairage naturel
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <CheckCircle size={16} color={COLORS.success} />
            </View>
            <Text style={styles.instructionText}>
              Évitez les ombres et les reflets lumineux
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <CheckCircle size={16} color={COLORS.success} />
            </View>
            <Text style={styles.instructionText}>
              Ajoutez des notes si nécessaire
            </Text>
          </View>
        </View>

        {/* Image Preview or Upload Prompt */}
        {selectedImage ? (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Aperçu</Text>
              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                style={styles.removeButton}
              >
                <X size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            <TouchableOpacity style={styles.changeButton} onPress={pickImage}>
              <ImageIcon size={18} color={COLORS.accent} />
              <Text style={styles.changeButtonText}>Changer l'image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.uploadPrompt}>
            <View style={styles.uploadIconBg}>
              <Camera size={48} color={COLORS.accent} />
            </View>
            <Text style={styles.uploadPromptTitle}>Aucune image sélectionnée</Text>
            <Text style={styles.uploadPromptSubtitle}>
              Sélectionnez ou prenez une photo pour débuter
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={takePhoto}
            activeOpacity={0.85}
          >
            <Camera size={20} color={COLORS.accent} />
            <Text style={styles.actionButtonText}>Appareil photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={pickImage}
            activeOpacity={0.85}
          >
            <Upload size={20} color={COLORS.accent} />
            <Text style={styles.actionButtonText}>Galerie</Text>
          </TouchableOpacity>
        </View>

        {/* Notes Section */}
        <View style={styles.notesCard}>
          <View style={styles.notesHeader}>
            <View style={styles.notesIconBg}>
              <AlertCircle size={18} color={COLORS.accent} />
            </View>
            <Text style={styles.notesTitle}>Notes supplémentaires</Text>
          </View>
          <Text style={styles.notesDescription}>
            Décrivez vos symptômes ou observations (optionnel)
          </Text>
          {/* Notes input would be a text field in production */}
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendButton, !selectedImage && styles.sendButtonDisabled]}
          onPress={handleUpload}
          disabled={!selectedImage || uploading}
          activeOpacity={0.85}
        >
          {uploading ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <>
              <Send size={18} color={COLORS.white} />
              <Text style={styles.sendButtonText}>
                {uploading ? "Envoi en cours..." : "Envoyer au médecin"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={uploading}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.lightBg,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  instructionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  instructionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    marginLeft: 2,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  instructionText: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 18,
    flex: 1,
  },
  previewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    marginBottom: 12,
  },
  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.accent,
  },
  uploadPrompt: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  uploadIconBg: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: COLORS.lightBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  uploadPromptTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 6,
  },
  uploadPromptSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: COLORS.accent,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.accent,
  },
  notesCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  notesIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.lightBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  notesTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  notesDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.accent,
  },
});
