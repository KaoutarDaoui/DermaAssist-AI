import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  SafeAreaView,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { 
  Camera, 
  Upload, 
  Bell, 
  GitCompare, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  User
} from "lucide-react-native";
import { colors, typography, spacing, borderRadius, shadows } from "../constants/theme";
import { skinComparison } from "../services/api";
import patientDataService from "../services/patientDataService";

const { width } = Dimensions.get("window");

export default function AnalyseScreen({ navigation }) {
  const [patientId, setPatientId] = useState(null);
  const [lastImage, setLastImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await patientDataService.getPatientProfile();
      setPatientId(profile.id);
      
      // Fetch images to find the reference one
      const res = await skinComparison.getImages(profile.id);
      if (res.data && res.data.length > 0) {
        // Sort by date desc to get the latest
        const sorted = res.data.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
        setLastImage(sorted[0]);
      }
    } catch (error) {
      console.error("Error loading profile/images:", error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (useCamera = false) => {
    const permissionResult = useCamera 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission refusée", `L'accès ${useCamera ? "à la caméra" : "aux photos"} est requis.`);
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setResult(null); // Clear previous results
    }
  };

  const startAnalysis = async () => {
    if (!selectedImage || !patientId) return;

    try {
      setComparing(true);
      
      // 1. Upload the new photo
      const uploadRes = await skinComparison.upload(patientId, selectedImage);
      const newImageId = uploadRes.data.id;

      // 2. Compare if we have a reference image
      if (lastImage) {
        const compareRes = await skinComparison.compare(patientId, lastImage.id, newImageId);
        setResult(compareRes.data);
      } else {
        Alert.alert("Première analyse", "Ceci est votre première photo. Elle servira de référence pour la prochaine comparaison.");
        // Refresh to show this photo as reference
        loadProfile();
      }
    } catch (error) {
      console.error("Analysis error:", error);
      Alert.alert("Erreur", "L'analyse a échoué. Veuillez réessayer.");
    } finally {
      setComparing(false);
    }
  };

  const getVerdictStyle = (verdict) => {
    if (!verdict) return { bg: colors.bgStable, text: colors.textStable, border: colors.borderStable };
    const v = verdict.toLowerCase();
    if (v.includes("amélioration") || v.includes("amelior")) 
      return { bg: colors.bgAmelioration, text: colors.textAmelioration, border: colors.borderAmelioration };
    if (v.includes("aggravation") || v.includes("aggrav")) 
      return { bg: colors.bgAggravation, text: colors.textAggravation, border: colors.borderAggravation };
    return { bg: colors.bgStable, text: colors.textStable, border: colors.borderStable };
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Évaluer mon état</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.bellBtn}>
              <Bell size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileBtn}
              onPress={() => navigation.navigate("Profile")}
            >
              <User size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.subtitle}>Analyse comparative IA de votre peau</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Step 1: Reference vs New Selection */}
        <View style={styles.comparisonContainer}>
          <View style={styles.photoColumn}>
            <Text style={styles.columnLabel}>Référence (R)</Text>
            <View style={styles.photoPlaceholder}>
              {lastImage ? (
                <Image source={{ uri: lastImage.image_data || "https://via.placeholder.com/150" }} style={styles.previewImage} />
              ) : (
                <View style={styles.emptyPlaceholder}>
                  <Text style={styles.emptyText}>Aucune réf.</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.compareArrow}>
            <ArrowRight size={20} color={colors.gray} />
          </View>

          <View style={styles.photoColumn}>
            <Text style={styles.columnLabel}>Nouvelle (N)</Text>
            <TouchableOpacity 
              style={[styles.photoPlaceholder, !selectedImage && styles.dashedBorder]} 
              onPress={() => pickImage(false)}
            >
              {selectedImage ? (
                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.emptyPlaceholder}>
                  <Camera size={24} color={colors.gray} />
                  <Text style={styles.uploadText}>Ajouter</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => pickImage(true)}
          >
            <Camera size={20} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Appareil</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={startAnalysis}
            disabled={!selectedImage || comparing}
          >
            {comparing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <GitCompare size={20} color={colors.white} />
                <Text style={styles.actionBtnText}>Analyser</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Analysis Result */}
        {result ? (
          <View style={[styles.resultCard, { borderColor: getVerdictStyle(result.verdict).border }]}>
            <View style={[styles.verdictHeader, { backgroundColor: getVerdictStyle(result.verdict).bg }]}>
              <Text style={[styles.verdictTitle, { color: getVerdictStyle(result.verdict).text }]}>
                {result.verdict}
              </Text>
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>Confiance : </Text>
                <Text style={styles.confidenceValue}>{result.confiance}</Text>
              </View>
            </View>

            <View style={styles.resultBody}>
              <Text style={styles.explanation}>{result.explication}</Text>
              
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Similarité</Text>
                  <Text style={styles.metricValue}>{(result.similarite_cosine * 100).toFixed(1)}%</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Évolution</Text>
                  <Text style={[
                      styles.metricValue, 
                      { color: result.delta_pct > 0 ? colors.danger : colors.success }
                    ]}>
                    {result.delta_pct > 0 ? "+" : ""}{result.delta_pct}%
                  </Text>
                </View>
              </View>

              {result.overlay_image && (
                <View style={styles.overlayContainer}>
                  <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Zones d'évolution</Text>
                  <Image source={{ uri: result.overlay_image }} style={styles.overlayImage} />
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.dot, { backgroundColor: colors.danger }]} />
                      <Text style={styles.legendText}>Aggravé</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.dot, { backgroundColor: colors.success }]} />
                      <Text style={styles.legendText}>Amélioré</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : !selectedImage && (
          <View style={styles.infoCard}>
            <View style={styles.infoIconBg}>
              <AlertTriangle size={20} color={colors.warning} />
            </View>
            <Text style={styles.infoText}>
              Prenez une photo bien éclairée pour obtenir la meilleure analyse comparative possible.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.primary,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${colors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${colors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    padding: spacing.lg,
  },
  comparisonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  photoColumn: {
    width: (width - 64 - 40) / 2,
    alignItems: "center",
  },
  columnLabel: {
    ...typography.smallBold,
    color: colors.gray,
    marginBottom: spacing.xs,
  },
  photoPlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.small,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  dashedBorder: {
    borderStyle: "dashed",
    borderWidth: 2,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  emptyPlaceholder: {
    alignItems: "center",
  },
  emptyText: {
    ...typography.small,
    color: colors.lightGray,
  },
  uploadText: {
    ...typography.smallBold,
    color: colors.gray,
    marginTop: 4,
  },
  compareArrow: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.small,
  },
  actionBtnText: {
    ...typography.bodyBold,
    color: colors.white,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: `${colors.warning}10`,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    gap: spacing.md,
  },
  infoIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${colors.warning}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    ...typography.body,
    fontSize: 13,
    color: colors.dark,
  },
  resultCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    overflow: "hidden",
    ...shadows.medium,
    marginBottom: spacing.xl,
  },
  verdictHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  verdictTitle: {
    ...typography.h3,
    fontWeight: "900",
    marginBottom: 4,
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  confidenceLabel: {
    ...typography.small,
    color: colors.gray,
  },
  confidenceValue: {
    ...typography.smallBold,
    color: colors.dark,
  },
  resultBody: {
    padding: spacing.lg,
  },
  explanation: {
    ...typography.body,
    color: colors.dark,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  metricsGrid: {
    flexDirection: "row",
    backgroundColor: colors.listItemBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    ...typography.small,
    color: colors.gray,
    marginBottom: 2,
  },
  metricValue: {
    ...typography.h4,
    fontWeight: "bold",
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.dark,
  },
  overlayContainer: {
    marginTop: spacing.sm,
  },
  overlayImage: {
    width: "100%",
    height: 200,
    borderRadius: borderRadius.lg,
    resizeMode: "contain",
    backgroundColor: "#000",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...typography.smallBold,
    color: colors.gray,
  }
});
