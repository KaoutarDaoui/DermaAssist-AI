import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { Camera, CircleCheck as CheckCircle, GitCompare, Upload, X, ZoomIn } from "lucide-react-native/icons";
import patientDataService from "../services/patientDataService";

const COLORS = {
  background: "#F3F7F6",
  surface: "#FFFFFF",
  primary: "#0F6E56",
  primaryDark: "#0B5A47",
  textDark: "#1C2730",
  textMuted: "#6A7882",
  border: "#E2ECEA",
  successSoft: "#E6F7F1",
  danger: "#DB4A4A",
  dangerSoft: "#FCE9E9",
};

const makeTemporaryImage = (uri) => ({
  id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  source: "patient",
  uploaded_at: new Date().toISOString(),
  base64: uri,
  minio_url: uri,
  isTemporary: true,
  uploadError: false,
});

const formatDate = (value) => {
  if (!value) {
    return "Date inconnue";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Date inconnue";
  }

  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toPercentLabel = (value, fromUnit = false) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }

  const pct = fromUnit ? numeric * 100 : numeric;
  return `${pct.toFixed(1)}%`;
};

const normalizeCompareResult = (payload) => {
  const source = payload && typeof payload === "object" ? payload : {};

  return {
    verdict: source.verdict ? String(source.verdict) : "Resultat de comparaison",
    explication: source.explication
      ? String(source.explication)
      : "Aucune explication fournie.",
    confiance: source.confiance ? String(source.confiance) : "-",
    similariteCosine: Number(source.similarite_cosine),
    scoreReference: Number(source.score_reference),
    scoreNouveau: Number(source.score_nouveau),
    deltaPct: Number(source.delta_pct),
  };
};

export default function ComparisonScreen() {
  const [images, setImages] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState(null);
  const [zoomUri, setZoomUri] = useState(null);

  const selectableIds = useMemo(() => {
    return new Set(
      images
        .filter((item) => item && item.id && !String(item.id).startsWith("local-"))
        .map((item) => String(item.id)),
    );
  }, [images]);

  const selectedReadyIds = useMemo(() => {
    return selectedIds.filter((id) => selectableIds.has(String(id))).slice(0, 2);
  }, [selectedIds, selectableIds]);

  const loadImages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await patientDataService.getSkinImagesWithData();
      const normalized = Array.isArray(response)
        ? response
            .filter((item) => item && item.id)
            .map((item) => ({
              ...item,
              id: String(item.id),
            }))
        : [];

      setImages(normalized);
      setSelectedIds((previous) =>
        previous.filter((id) => normalized.some((img) => String(img.id) === String(id))).slice(0, 2),
      );
    } catch (error) {
      console.error("Failed to load images:", error);
      Alert.alert("Erreur", "Impossible de charger les photos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadImages();
    }, [loadImages]),
  );

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadImages();
    } finally {
      setRefreshing(false);
    }
  }, [loadImages]);

  const uploadImageUri = useCallback(async (uri) => {
    if (!uri) {
      return;
    }

    const temporary = makeTemporaryImage(uri);
    setImages((previous) => [temporary, ...previous]);

    try {
      setUploading(true);
      await patientDataService.uploadSkinImage(uri);
      await loadImages();
    } catch (error) {
      console.error("Upload failed:", error);
      setImages((previous) =>
        previous.map((item) =>
          item.id === temporary.id
            ? { ...item, uploadError: true }
            : item,
        ),
      );
      Alert.alert(
        "Upload impossible",
        error?.message
          ? `La photo est visible localement. Détail: ${error.message}`
          : "La photo est visible localement mais non enregistree.",
      );
    } finally {
      setUploading(false);
    }
  }, [loadImages]);

  const openGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission", "Autorisez l'acces a la galerie.");
      return;
    }

    const picker = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!picker.canceled && picker.assets?.length) {
      await uploadImageUri(picker.assets[0].uri);
    }
  }, [uploadImageUri]);

  const openCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission", "Autorisez l'acces a la camera.");
      return;
    }

    const camera = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (!camera.canceled && camera.assets?.length) {
      await uploadImageUri(camera.assets[0].uri);
    }
  }, [uploadImageUri]);

  const openUploadPicker = useCallback(() => {
    Alert.alert("Ajouter une photo", "Choisissez la source", [
      { text: "Annuler", style: "cancel" },
      { text: "Camera", onPress: () => openCamera() },
      { text: "Galerie", onPress: () => openGallery() },
    ]);
  }, [openCamera, openGallery]);

  const retryUpload = useCallback(async (item) => {
    const uri = item?.base64 || item?.minio_url;
    if (!uri) {
      Alert.alert("Erreur", "Aucune image locale pour reessayer.");
      return;
    }

    setImages((previous) => previous.filter((candidate) => candidate.id !== item.id));
    await uploadImageUri(uri);
  }, [uploadImageUri]);

  const toggleSelection = useCallback((imageId) => {
    if (!imageId) {
      return;
    }

    const id = String(imageId);
    const isTemporary = id.startsWith("local-");
    const image = images.find((item) => String(item.id) === id);

    if (isTemporary) {
      Alert.alert(
        "Photo non prete",
        image?.uploadError
          ? "L'envoi a echoue. Utilisez Reessayer."
          : "Attendez la fin de l'envoi pour la comparer.",
      );
      return;
    }

    setResult(null);
    setSelectedIds((previous) => {
      if (previous.includes(id)) {
        return previous.filter((current) => current !== id);
      }

      if (previous.filter((current) => selectableIds.has(String(current))).length >= 2) {
        Alert.alert("Selection", "Veuillez choisir exactement 2 photos.");
        return previous;
      }

      return [...previous, id];
    });
  }, [images, selectableIds]);

  const openPreview = useCallback(async (item) => {
    const previewUri = item?.base64 || item?.minio_url;
    if (previewUri) {
      setZoomUri(previewUri);
      return;
    }

    const imageId = item?.id ? String(item.id) : null;
    if (!imageId || imageId.startsWith("local-")) {
      Alert.alert("Apercu", "Image non disponible.");
      return;
    }

    try {
      setPreviewLoadingId(imageId);
      const previewData = await patientDataService.getSkinImagePreview(imageId);
      if (!previewData) {
        Alert.alert("Apercu", "Impossible de charger l'image.");
        return;
      }

      setImages((previous) =>
        previous.map((candidate) =>
          String(candidate.id) === imageId
            ? { ...candidate, base64: previewData }
            : candidate,
        ),
      );
      setZoomUri(previewData);
    } catch (error) {
      console.error("Preview failed:", error);
      Alert.alert("Erreur", "Echec du chargement de l'image.");
    } finally {
      setPreviewLoadingId(null);
    }
  }, []);

  const handleCompare = useCallback(async () => {
    if (selectedReadyIds.length !== 2) {
      Alert.alert("Selection", "Choisissez 2 photos avant de comparer.");
      return;
    }

    try {
      setComparing(true);
      setResult(null);
      const response = await patientDataService.compareSkinImages(selectedReadyIds[0], selectedReadyIds[1]);
      setResult(normalizeCompareResult(response));
    } catch (error) {
      console.error("Compare failed:", error);
      Alert.alert("Comparaison", error?.message || "Echec de la comparaison.");
    } finally {
      setComparing(false);
    }
  }, [selectedReadyIds]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerKicker}>Suivi photo</Text>
          <Text style={styles.headerTitle}>Comparaison</Text>
        </View>

        <TouchableOpacity
          style={[styles.addButton, uploading && styles.buttonDisabled]}
          onPress={openUploadPicker}
          activeOpacity={0.88}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Upload size={15} color="#FFFFFF" />
          )}
          <Text style={styles.addButtonText}>{uploading ? "Envoi..." : "Ajouter"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.counterText}>{selectedReadyIds.length}/2 selectionnee(s)</Text>
        <TouchableOpacity
          style={[
            styles.compareButton,
            (selectedReadyIds.length !== 2 || comparing) && styles.buttonDisabled,
          ]}
          onPress={handleCompare}
          activeOpacity={0.88}
          disabled={selectedReadyIds.length !== 2 || comparing}
        >
          {comparing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <GitCompare size={14} color="#FFFFFF" />
          )}
          <Text style={styles.compareButtonText}>{comparing ? "Analyse..." : "Comparer"}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.stateText}>Chargement des photos...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageList}
          >
            {images.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Aucune photo</Text>
                <Text style={styles.emptyText}>Ajoutez une photo pour commencer.</Text>
              </View>
            ) : (
              images.map((item) => {
                const itemId = String(item.id);
                const isSelected = selectedReadyIds.includes(itemId);
                const selectedIndex = selectedReadyIds.indexOf(itemId);
                const isTemporary = itemId.startsWith("local-");
                const previewUri = item.base64 || item.minio_url || null;

                return (
                  <View
                    key={itemId}
                    style={[styles.imageCard, isSelected && styles.imageCardSelected]}
                  >
                    <TouchableOpacity
                      style={styles.previewBox}
                      onPress={() => openPreview(item)}
                      activeOpacity={0.9}
                    >
                      {previewUri ? (
                        <Image source={{ uri: previewUri }} style={styles.previewImage} />
                      ) : (
                        <View style={styles.previewFallback}>
                          {previewLoadingId === itemId ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                          ) : (
                            <Text style={styles.previewFallbackText}>Apercu</Text>
                          )}
                        </View>
                      )}

                      {isSelected ? (
                        <View style={styles.selectedTag}>
                          <Text style={styles.selectedTagText}>{selectedIndex === 0 ? "R" : "N"}</Text>
                        </View>
                      ) : null}

                      <View style={styles.zoomHint}>
                        <ZoomIn size={11} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>

                    <Text style={styles.metaSource}>{String(item.source || "patient")}</Text>
                    <Text style={styles.metaDate}>{formatDate(item.uploaded_at)}</Text>

                    {isTemporary ? (
                      <View style={[styles.localChip, item.uploadError && styles.localChipError]}>
                        <Text style={[styles.localChipText, item.uploadError && styles.localChipTextError]}>
                          {item.uploadError ? "En attente d'envoi" : "Ajoutee"}
                        </Text>
                      </View>
                    ) : null}

                    {item.uploadError ? (
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => retryUpload(item)}
                        activeOpacity={0.85}
                      >
                        <Upload size={11} color="#FFFFFF" />
                        <Text style={styles.retryButtonText}>Reessayer</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={[
                        styles.selectButton,
                        isSelected && styles.selectButtonActive,
                        isTemporary && styles.buttonDisabled,
                      ]}
                      onPress={() => toggleSelection(itemId)}
                      activeOpacity={0.88}
                      disabled={isTemporary}
                    >
                      <CheckCircle size={13} color={isSelected ? "#FFFFFF" : COLORS.primary} />
                      <Text style={[styles.selectButtonText, isSelected && styles.selectButtonTextActive]}>
                        {isTemporary
                          ? "Upload..."
                          : isSelected
                            ? `Selectionnee (${selectedIndex === 0 ? "R" : "N"})`
                            : "Choisir"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>

          {result ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>{result.verdict}</Text>
              <Text style={styles.resultSubtitle}>Confiance: {result.confiance}</Text>
              <Text style={styles.resultText}>{result.explication}</Text>

              <View style={styles.metricRow}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Similarite</Text>
                  <Text style={styles.metricValue}>{toPercentLabel(result.similariteCosine, true)}</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Ref</Text>
                  <Text style={styles.metricValue}>{toPercentLabel(result.scoreReference, true)}</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Nouv</Text>
                  <Text style={styles.metricValue}>{toPercentLabel(result.scoreNouveau, true)}</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Delta</Text>
                  <Text style={styles.metricValue}>{toPercentLabel(result.deltaPct, false)}</Text>
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      <Modal visible={Boolean(zoomUri)} transparent animationType="fade" onRequestClose={() => setZoomUri(null)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setZoomUri(null)}>
            <X size={18} color="#FFFFFF" />
          </TouchableOpacity>
          {zoomUri ? <Image source={{ uri: zoomUri }} style={styles.modalImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerKicker: {
    color: COLORS.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  headerTitle: {
    marginTop: 2,
    color: COLORS.textDark,
    fontSize: 26,
    fontWeight: "800",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counterText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  compareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  compareButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stateText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  imageList: {
    paddingBottom: 8,
  },
  emptyCard: {
    width: 240,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  emptyTitle: {
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: "700",
  },
  emptyText: {
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  imageCard: {
    width: 184,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 10,
    marginRight: 10,
  },
  imageCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#F2FBF8",
  },
  previewBox: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#E8EFEE",
  },
  previewImage: {
    width: "100%",
    height: 116,
  },
  previewFallback: {
    width: "100%",
    height: 116,
    alignItems: "center",
    justifyContent: "center",
  },
  previewFallbackText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  selectedTag: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  zoomHint: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(15,110,86,0.86)",
    alignItems: "center",
    justifyContent: "center",
  },
  metaSource: {
    marginTop: 8,
    color: COLORS.textDark,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  metaDate: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  localChip: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: COLORS.successSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  localChipError: {
    backgroundColor: COLORS.dangerSoft,
  },
  localChipText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  localChipTextError: {
    color: COLORS.danger,
  },
  retryButton: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: COLORS.danger,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },
  selectButton: {
    marginTop: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#CEE6DE",
    backgroundColor: "#F4FBF9",
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  selectButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  selectButtonText: {
    marginLeft: 5,
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  selectButtonTextActive: {
    color: "#FFFFFF",
  },
  resultCard: {
    marginTop: 10,
    marginBottom: 22,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  resultTitle: {
    color: COLORS.textDark,
    fontSize: 18,
    fontWeight: "800",
  },
  resultSubtitle: {
    marginTop: 6,
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  resultText: {
    marginTop: 10,
    color: COLORS.textDark,
    fontSize: 13,
    lineHeight: 19,
  },
  metricRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  metricBox: {
    width: "48%",
    marginBottom: 8,
    backgroundColor: "#F8FBFA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8EFED",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricValue: {
    marginTop: 3,
    color: COLORS.textDark,
    fontSize: 15,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10,14,18,0.92)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  modalClose: {
    position: "absolute",
    top: 44,
    right: 22,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  modalImage: {
    width: "100%",
    height: "80%",
  },
});
