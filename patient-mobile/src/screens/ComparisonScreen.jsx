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
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  CheckCircle,
  GitCompare,
  Minus,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
  ZoomIn,
} from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import patientDataService from "../services/patientDataService";

const COLORS = {
  background: "#F2F7F6",
  surface: "#FFFFFF",
  primary: "#0F6E56",
  primaryDark: "#0B5A47",
  textDark: "#1F2A33",
  textMuted: "#6B7A85",
  border: "#E3ECEA",
  softPrimary: "#E8F6F2",
  success: "#149B65",
  successSoft: "#DFF5EB",
  danger: "#DB4A4A",
  dangerSoft: "#FAE4E4",
  warning: "#D98B18",
  warningSoft: "#FEF2DD",
};

const formatDate = (value) => {
  if (!value) {
    return "Date inconnue";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getTrendTone = (delta) => {
  if (delta === null || delta === undefined) {
    return "stable";
  }

  if (delta > 3) {
    return "aggravation";
  }

  if (delta < -3) {
    return "amelioration";
  }

  return "stable";
};

const getVerdictTone = (verdict) => {
  const normalized = String(verdict || "").toLowerCase();
  if (normalized.includes("ameli")) {
    return {
      background: COLORS.successSoft,
      border: "#A8E5CB",
      text: COLORS.success,
      badgeBg: "#C9F0DD",
      badgeText: "#0F7D50",
    };
  }

  if (normalized.includes("aggrav")) {
    return {
      background: COLORS.dangerSoft,
      border: "#F4B9B9",
      text: COLORS.danger,
      badgeBg: "#F8D3D3",
      badgeText: "#B83A3A",
    };
  }

  return {
    background: COLORS.warningSoft,
    border: "#F8D9A3",
    text: COLORS.warning,
    badgeBg: "#FBE5BA",
    badgeText: "#9B630B",
  };
};

const normalizeOverlayImage = (overlayImage) => {
  if (!overlayImage) {
    return null;
  }

  const rawValue = String(overlayImage);
  if (rawValue.startsWith("data:image") || rawValue.startsWith("http")) {
    return rawValue;
  }

  return `data:image/png;base64,${rawValue}`;
};

const getProgressionColor = (scorePct) => {
  if (scorePct < 30) {
    return COLORS.success;
  }

  if (scorePct < 60) {
    return COLORS.warning;
  }

  return COLORS.danger;
};

const createTemporaryImageItem = (uri) => ({
  id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  base64: uri,
  minio_url: uri,
  source: "patient",
  uploaded_at: new Date().toISOString(),
  cnn_label: null,
  isTemporary: true,
});

const toFiniteNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeCompareResult = (payload) => {
  const source = payload && typeof payload === "object" ? payload : {};

  return {
    verdict: source.verdict ? String(source.verdict) : "Résultat de comparaison",
    confiance: source.confiance ? String(source.confiance) : "-",
    explication: source.explication
      ? String(source.explication)
      : "Aucune explication fournie.",
    similarite_cosine: toFiniteNumber(source.similarite_cosine, 0),
    score_reference: toFiniteNumber(source.score_reference, 0),
    score_nouveau: toFiniteNumber(source.score_nouveau, 0),
    delta_pct: toFiniteNumber(source.delta_pct, 0),
    overlay_image: source.overlay_image || null,
  };
};

export default function ComparisonScreen() {
  const [images, setImages] = useState([]);
  const [progression, setProgression] = useState([]);
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(true);
  const [progLoading, setProgLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [loadingPreviewId, setLoadingPreviewId] = useState(null);
  const [zoomedImageUri, setZoomedImageUri] = useState(null);

  const selectableImageIds = useMemo(() => {
    return new Set(
      images
        .filter((image) => image && image.id && !String(image.id).startsWith("local-"))
        .map((image) => String(image.id)),
    );
  }, [images]);

  const selectedReadyIds = useMemo(() => {
    return selected.filter((id) => selectableImageIds.has(String(id))).slice(0, 2);
  }, [selected, selectableImageIds]);

  const loadImages = useCallback(async () => {
    try {
      setLoading(true);
      const fetched = await patientDataService.getSkinImagesWithData();
      setImages(Array.isArray(fetched) ? fetched.filter((item) => item && item.id) : []);
    } catch (error) {
      console.error("Error loading skin images:", error);
      Alert.alert("Erreur", "Impossible de charger les photos.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProgression = useCallback(async () => {
    try {
      setProgLoading(true);
      const progressionData = await patientDataService.getSkinProgression();
      setProgression(Array.isArray(progressionData) ? progressionData : []);
    } catch (error) {
      console.error("Error loading progression:", error);
      setProgression([]);
    } finally {
      setProgLoading(false);
    }
  }, []);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadImages(), loadProgression()]);
  }, [loadImages, loadProgression]);

  useFocusEffect(
    useCallback(() => {
      reloadAll();
    }, [reloadAll]),
  );

  React.useEffect(() => {
    setSelected((previousSelected) =>
      previousSelected.filter((id) => selectableImageIds.has(String(id))).slice(0, 2),
    );
  }, [selectableImageIds]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await reloadAll();
    } finally {
      setRefreshing(false);
    }
  }, [reloadAll]);

  const toggleSelect = useCallback((id) => {
    try {
      if (!id) {
        Alert.alert("Erreur", "Image invalide, réessayez.");
        return;
      }

      const normalizedId = String(id);
      const imageItem = images.find((item) => String(item.id) === normalizedId);

      if (normalizedId.startsWith("local-")) {
        Alert.alert(
          "Photo non prête",
          imageItem?.uploadError
            ? "L'envoi a échoué. Utilisez le bouton Réessayer."
            : "Attendez la fin de l'envoi pour comparer cette photo.",
        );
        return;
      }

      setResult(null);

      setSelected((prev) => {
        if (prev.includes(normalizedId)) {
          return prev.filter((item) => item !== normalizedId);
        }

        if (prev.length >= 2) {
          Alert.alert("Sélection", "Veuillez sélectionner exactement 2 photos.");
          return prev;
        }

        return [...prev, normalizedId];
      });
    } catch (selectionError) {
      console.error("Selection error:", selectionError);
      Alert.alert("Erreur", "Impossible de sélectionner la photo.");
    }
  }, [images]);

  const uploadImageUri = useCallback(async (uri) => {
    if (!uri) {
      return;
    }

    const temporaryImage = createTemporaryImageItem(uri);
    setImages((previousImages) => [temporaryImage, ...previousImages]);

    try {
      setUploading(true);
      const savedImage = await patientDataService.uploadSkinImage(uri);

      setImages((previousImages) =>
        previousImages.map((image) =>
          image.id === temporaryImage.id
            ? {
                ...savedImage,
                id: String(savedImage?.id || temporaryImage.id),
                base64: uri,
                minio_url: savedImage?.minio_url || null,
                source: savedImage?.source || "patient",
                uploaded_at: savedImage?.uploaded_at || new Date().toISOString(),
                isTemporary: false,
                uploadError: false,
              }
            : image,
        ),
      );

      await reloadAll();
    } catch (error) {
      console.error("Upload error:", error);
      setImages((previousImages) =>
        previousImages.map((image) =>
          image.id === temporaryImage.id
            ? { ...image, uploadError: true }
            : image,
        ),
      );
      Alert.alert(
        "Upload impossible",
        error?.message
          ? `La photo est affichée mais pas encore enregistrée. Détail: ${error.message}`
          : "La photo est affichée mais pas encore enregistrée.",
      );
    } finally {
      setUploading(false);
    }
  }, [reloadAll]);

  const retryUpload = useCallback(async (image) => {
    const previewUri = image?.base64 || image?.minio_url;
    if (!previewUri) {
      Alert.alert("Réessai impossible", "Aucune image locale trouvée pour réessayer l'envoi.");
      return;
    }

    setImages((previousImages) => previousImages.filter((item) => item.id !== image.id));
    await uploadImageUri(previewUri);
  }, [uploadImageUri]);

  const openGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission refusée", "Autorisez l'accès à la galerie pour continuer.");
      return;
    }

    const pickResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!pickResult.canceled && pickResult.assets?.length) {
      await uploadImageUri(pickResult.assets[0].uri);
    }
  }, [uploadImageUri]);

  const openCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission refusée", "Autorisez l'accès à la caméra pour continuer.");
      return;
    }

    const cameraResult = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (!cameraResult.canceled && cameraResult.assets?.length) {
      await uploadImageUri(cameraResult.assets[0].uri);
    }
  }, [uploadImageUri]);

  const handleUploadPicker = useCallback(() => {
    Alert.alert("Ajouter une photo", "Choisissez la source", [
      { text: "Annuler", style: "cancel" },
      { text: "Caméra", onPress: () => openCamera() },
      { text: "Galerie", onPress: () => openGallery() },
    ]);
  }, [openCamera, openGallery]);

  const handleCompare = useCallback(async () => {
    if (selectedReadyIds.length !== 2) {
      Alert.alert("Sélection incomplète", "Sélectionnez exactement 2 photos.");
      return;
    }

    try {
      setComparing(true);
      setResult(null);
      const compareResult = await patientDataService.compareSkinImages(selectedReadyIds[0], selectedReadyIds[1]);
      setResult(normalizeCompareResult(compareResult));
    } catch (error) {
      console.error("Compare error:", error);
      Alert.alert("Comparaison impossible", error.message || "Erreur lors de la comparaison.");
    } finally {
      setComparing(false);
    }
  }, [selectedReadyIds]);

  const openZoomPreview = useCallback((imageUri) => {
    if (!imageUri) {
      Alert.alert("Aperçu indisponible", "Cette photo ne contient pas de prévisualisation.");
      return;
    }

    setZoomedImageUri(imageUri);
  }, []);

  const openZoomPreviewForImage = useCallback(async (image) => {
    const currentPreviewUri = image?.base64 || image?.minio_url;
    if (currentPreviewUri) {
      setZoomedImageUri(currentPreviewUri);
      return;
    }

    const imageId = image?.id ? String(image.id) : null;
    if (!imageId || imageId.startsWith("local-")) {
      Alert.alert("Aperçu indisponible", "Cette photo n'est pas encore prête.");
      return;
    }

    try {
      setLoadingPreviewId(imageId);
      const previewData = await patientDataService.getSkinImagePreview(imageId);
      if (!previewData) {
        Alert.alert("Aperçu indisponible", "Impossible de charger l'image.");
        return;
      }

      setImages((previousImages) =>
        previousImages.map((item) =>
          String(item.id) === imageId
            ? { ...item, base64: previewData }
            : item,
        ),
      );
      setZoomedImageUri(previewData);
    } catch (previewError) {
      console.error("Preview load error:", previewError);
      Alert.alert("Erreur", "Impossible de charger l'aperçu de la photo.");
    } finally {
      setLoadingPreviewId(null);
    }
  }, []);

  const progressionSorted = useMemo(() => {
    return [...progression].sort((a, b) => {
      const firstDate = a?.date ? new Date(a.date).getTime() : 0;
      const secondDate = b?.date ? new Date(b.date).getTime() : 0;
      return firstDate - secondDate;
    });
  }, [progression]);

  const first = progressionSorted[0]?.score_pct ?? null;
  const last = progressionSorted[progressionSorted.length - 1]?.score_pct ?? null;
  const delta = first !== null && last !== null ? last - first : null;
  const trend = getTrendTone(delta);

  const trendBlock = useMemo(() => {
    if (delta === null) {
      return {
        text: "Stable",
        color: COLORS.textMuted,
        background: "#EEF2F3",
        icon: Minus,
      };
    }

    if (trend === "amelioration") {
      return {
        text: `-${Math.abs(delta).toFixed(1)}%`,
        color: COLORS.success,
        background: COLORS.successSoft,
        icon: TrendingDown,
      };
    }

    if (trend === "aggravation") {
      return {
        text: `+${delta.toFixed(1)}%`,
        color: COLORS.danger,
        background: COLORS.dangerSoft,
        icon: TrendingUp,
      };
    }

    return {
      text: "Stable",
      color: COLORS.textMuted,
      background: "#EEF2F3",
      icon: Minus,
    };
  }, [delta, trend]);

  const overlayImage = useMemo(() => normalizeOverlayImage(result?.overlay_image), [result]);
  const verdictTone = useMemo(() => getVerdictTone(result?.verdict), [result]);

  const formatPct = (value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return "-";
    }
    return `${numeric.toFixed(1)}%`;
  };

  const similarityPct = toFiniteNumber(result?.similarite_cosine, 0);
  const scoreReferencePct = toFiniteNumber(result?.score_reference, 0) * 100;
  const scoreNewPct = toFiniteNumber(result?.score_nouveau, 0) * 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#F6FCFA", "#EEF4F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerSubtitle}>Suivi photo</Text>
              <Text style={styles.headerTitle}>Comparaison</Text>
            </View>

            <TouchableOpacity
              style={[styles.uploadButton, uploading && styles.disabledButton]}
              onPress={handleUploadPicker}
              activeOpacity={0.85}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Upload size={16} color="#FFFFFF" />
              )}
              <Text style={styles.uploadButtonText}>{uploading ? "Upload..." : "Ajouter"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Sélectionnez 2 photos</Text>
            <Text style={styles.infoText}>
              La 1ère photo devient la référence (R) et la 2ème la nouvelle (N), comme sur le web.
            </Text>

            <View style={styles.infoActions}>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={openCamera}
                activeOpacity={0.85}
                disabled={uploading}
              >
                <Camera size={15} color={COLORS.primary} />
                <Text style={styles.outlineButtonText}>Caméra</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={openGallery}
                activeOpacity={0.85}
                disabled={uploading}
              >
                <Upload size={15} color={COLORS.primary} />
                <Text style={styles.outlineButtonText}>Galerie</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Photos ({images.length})</Text>
                <Text style={styles.sectionSubTitle}>{selectedReadyIds.length}/2 sélectionnée(s)</Text>
              </View>
              {selectedReadyIds.length === 2 ? (
                <TouchableOpacity
                  style={[styles.compareButton, comparing && styles.disabledButton]}
                  onPress={handleCompare}
                  activeOpacity={0.85}
                  disabled={comparing}
                >
                  {comparing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <GitCompare size={14} color="#FFFFFF" />
                  )}
                  <Text style={styles.compareButtonText}>{comparing ? "Analyse..." : "Comparer"}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {loading ? (
              <View style={styles.centerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Chargement des photos...</Text>
              </View>
            ) : images.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Aucune photo disponible.</Text>
                <Text style={styles.emptyStateSubText}>Ajoutez une photo pour commencer la comparaison.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesList}>
                {images.map((item) => {
                  const itemId = String(item.id);
                  const isSelected = selectedReadyIds.includes(itemId);
                  const selectedIndex = selectedReadyIds.indexOf(itemId);
                  const previewUri = item.base64 || item.minio_url || null;
                  const isTemporary = Boolean(item.isTemporary) || itemId.startsWith("local-");
                  const hasUploadError = Boolean(item.uploadError);

                  return (
                    <View
                      key={itemId}
                      style={[styles.imageCard, isSelected && styles.imageCardSelected]}
                    >
                      <TouchableOpacity
                        style={styles.imageThumbWrap}
                        onPress={() => openZoomPreviewForImage(item)}
                        activeOpacity={0.9}
                      >
                        {previewUri ? (
                          <Image source={{ uri: previewUri }} style={styles.imageThumb} />
                        ) : loadingPreviewId === itemId ? (
                          <View style={styles.imageFallback}>
                            <ActivityIndicator size="small" color={COLORS.primary} />
                            <Text style={styles.imageFallbackText}>Chargement...</Text>
                          </View>
                        ) : (
                          <View style={styles.imageFallback}>
                            <Text style={styles.imageFallbackText}>No preview</Text>
                          </View>
                        )}

                        {isSelected ? (
                          <View style={styles.imageTag}>
                            <Text style={styles.imageTagText}>{selectedIndex === 0 ? "R" : "N"}</Text>
                          </View>
                        ) : null}

                        <View style={styles.imageZoomHint}>
                          <ZoomIn size={11} color="#FFFFFF" />
                        </View>
                      </TouchableOpacity>

                      <View style={styles.imageMeta}>
                        <Text style={styles.imageSourceText} numberOfLines={1}>
                          {String(item.source || "source inconnue")}
                        </Text>
                        <Text style={styles.imageDateText} numberOfLines={2}>
                          {formatDate(item.uploaded_at)}
                        </Text>

                        {isTemporary ? (
                          <View style={[styles.localChip, hasUploadError && styles.localChipError]}>
                            <Text style={[styles.localChipText, hasUploadError && styles.localChipTextError]}>
                              {hasUploadError ? "En attente d'envoi" : "Ajoutée"}
                            </Text>
                          </View>
                        ) : null}

                        {hasUploadError ? (
                          <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => retryUpload(item)}
                            activeOpacity={0.85}
                          >
                            <Upload size={11} color="#FFFFFF" />
                            <Text style={styles.retryButtonText}>Réessayer</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.selectButton,
                          isSelected && styles.selectButtonActive,
                          isTemporary && styles.selectButtonDisabled,
                        ]}
                        onPress={() => toggleSelect(itemId)}
                        activeOpacity={0.85}
                        disabled={isTemporary}
                      >
                        {isSelected ? <CheckCircle size={13} color="#FFFFFF" /> : <CheckCircle size={13} color={COLORS.primary} />}
                        <Text style={[styles.selectButtonText, isSelected && styles.selectButtonTextActive]}>
                          {isTemporary
                            ? "Upload..."
                            : isSelected
                              ? `Sélectionnée (${selectedIndex === 0 ? "R" : "N"})`
                              : "Choisir"}
                        </Text>
                      </TouchableOpacity>
                      </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Progression de la sévérité</Text>
                <Text style={styles.sectionSubTitle}>
                  {progressionSorted.length} photo{progressionSorted.length > 1 ? "s" : ""} analysée
                  {progressionSorted.length > 1 ? "s" : ""}
                </Text>
              </View>

              <View style={[styles.trendBadge, { backgroundColor: trendBlock.background }]}> 
                <trendBlock.icon size={13} color={trendBlock.color} />
                <Text style={[styles.trendBadgeText, { color: trendBlock.color }]}>{trendBlock.text}</Text>
              </View>
            </View>

            {progLoading ? (
              <View style={styles.centerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Chargement de la progression...</Text>
              </View>
            ) : progressionSorted.length < 2 ? (
              <View style={styles.emptyStateCompact}>
                <Text style={styles.emptyStateText}>Au moins 2 photos sont nécessaires pour afficher la progression.</Text>
              </View>
            ) : (
              <>
                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Premier score</Text>
                    <Text style={styles.metricValue}>{formatPct(first)}</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Score actuel</Text>
                    <Text style={styles.metricValue}>{formatPct(last)}</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Évolution</Text>
                    <Text
                      style={[
                        styles.metricValue,
                        delta > 3
                          ? { color: COLORS.danger }
                          : delta < -3
                            ? { color: COLORS.success }
                            : { color: COLORS.textDark },
                      ]}
                    >
                      {delta > 0 ? `+${delta.toFixed(1)}%` : `${(delta || 0).toFixed(1)}%`}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressRowsWrap}>
                  {progressionSorted.map((item) => {
                    const score = Number(item?.score_pct) || 0;
                    const boundedScore = Math.max(0, Math.min(score, 100));
                    const barColor = getProgressionColor(boundedScore);

                    return (
                      <View key={item.image_id || item.date} style={styles.progressRow}>
                        <Text style={styles.progressDate}>{formatDate(item.date)}</Text>
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${boundedScore}%`,
                                backgroundColor: barColor,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressScore}>{boundedScore.toFixed(1)}%</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>

          {result ? (
            <View
              style={[
                styles.resultCard,
                {
                  backgroundColor: verdictTone.background,
                  borderColor: verdictTone.border,
                },
              ]}
            >
              <View style={styles.resultHeader}>
                <Text style={[styles.resultTitle, { color: verdictTone.text }]}>
                  {result.verdict || "Résultat de comparaison"}
                </Text>
                <View style={[styles.confidenceBadge, { backgroundColor: verdictTone.badgeBg }]}> 
                  <Text style={[styles.confidenceText, { color: verdictTone.badgeText }]}>
                    Confiance: {result.confiance || "-"}
                  </Text>
                </View>
              </View>

              <Text style={styles.resultExplanation}>{result.explication || "Aucune explication fournie."}</Text>

              <View style={styles.metricsGrid}>
                <View style={styles.metricGridCard}>
                  <Text style={styles.metricGridLabel}>Similarité</Text>
                  <Text style={styles.metricGridValue}>{formatPct(similarityPct * 100)}</Text>
                </View>

                <View style={styles.metricGridCard}>
                  <Text style={styles.metricGridLabel}>Sévérité réf.</Text>
                  <Text style={styles.metricGridValue}>{formatPct(scoreReferencePct)}</Text>
                </View>

                <View style={styles.metricGridCard}>
                  <Text style={styles.metricGridLabel}>Sévérité nouv.</Text>
                  <Text style={styles.metricGridValue}>{formatPct(scoreNewPct)}</Text>
                </View>

                <View style={styles.metricGridCard}>
                  <Text style={styles.metricGridLabel}>Évolution</Text>
                  <Text
                    style={[
                      styles.metricGridValue,
                      Number(result.delta_pct) < 0
                        ? { color: COLORS.success }
                        : Number(result.delta_pct) > 0
                          ? { color: COLORS.danger }
                          : { color: COLORS.warning },
                    ]}
                  >
                    {`${Number(result.delta_pct) > 0 ? "+" : ""}${Number(result.delta_pct || 0).toFixed(1)}%`}
                  </Text>
                </View>
              </View>

              {overlayImage ? (
                <View style={styles.overlayWrap}>
                  <View style={styles.overlayHeader}>
                    <Text style={styles.overlayTitle}>Zones d'évolution</Text>
                    <View style={styles.zoomHint}>
                      <ZoomIn size={12} color="#FFFFFF" />
                      <Text style={styles.zoomHintText}>Agrandir</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.overlayCta}
                    onPress={() => openZoomPreview(overlayImage)}
                    activeOpacity={0.88}
                  >
                    <ZoomIn size={14} color="#FFFFFF" />
                    <Text style={styles.overlayCtaText}>Ouvrir l'image de comparaison</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setResult(null);
                  setSelected([]);
                }}
                activeOpacity={0.8}
              >
                <X size={13} color={COLORS.textMuted} />
                <Text style={styles.resetButtonText}>Nouvelle comparaison</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </LinearGradient>

      <Modal visible={Boolean(zoomedImageUri)} transparent animationType="fade" onRequestClose={() => setZoomedImageUri(null)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setZoomedImageUri(null)}>
            <X size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {zoomedImageUri ? <Image source={{ uri: zoomedImageUri }} style={styles.modalImage} resizeMode="contain" /> : null}
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
  backgroundGradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
  },
  contentContainer: {
    paddingTop: 18,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerTitle: {
    marginTop: 2,
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  uploadButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.7,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
  },
  infoTitle: {
    color: COLORS.textDark,
    fontWeight: "700",
    fontSize: 15,
  },
  infoText: {
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  infoActions: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  outlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flex: 1,
    borderWidth: 1,
    borderColor: "#D4EAE4",
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: "#F8FCFB",
  },
  outlineButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: "800",
  },
  sectionSubTitle: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  compareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 106,
  },
  compareButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  centerLoader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  loadingText: {
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  emptyState: {
    borderWidth: 1,
    borderColor: "#E8EFEE",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  emptyStateCompact: {
    borderWidth: 1,
    borderColor: "#E8EFEE",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  emptyStateText: {
    color: COLORS.textDark,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyStateSubText: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  imagesList: {
    gap: 10,
    paddingBottom: 2,
  },
  imageCard: {
    width: 182,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4ECEA",
    backgroundColor: "#FCFEFD",
    padding: 9,
    gap: 8,
  },
  imageCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#F2FBF8",
  },
  imageThumbWrap: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
  },
  imageThumb: {
    width: "100%",
    height: 116,
    borderRadius: 10,
    backgroundColor: "#E6ECEA",
  },
  imageFallback: {
    width: "100%",
    height: 116,
    borderRadius: 10,
    backgroundColor: "#E8EFEE",
    alignItems: "center",
    justifyContent: "center",
  },
  imageFallbackText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  imageTag: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: COLORS.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  imageTagText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 10,
  },
  imageZoomHint: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(15, 110, 86, 0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageMeta: {
    gap: 3,
  },
  imageSourceText: {
    color: COLORS.textDark,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  imageDateText: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  labelChip: {
    alignSelf: "flex-start",
    marginTop: 4,
    borderRadius: 20,
    backgroundColor: COLORS.softPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  labelChipText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  selectButton: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CEE6DE",
    backgroundColor: "#F4FBF9",
    paddingVertical: 7,
  },
  selectButtonDisabled: {
    opacity: 0.7,
  },
  selectButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  selectButtonText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  selectButtonTextActive: {
    color: "#FFFFFF",
  },
  localChip: {
    alignSelf: "flex-start",
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: "#E6F7F1",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  localChipError: {
    backgroundColor: "#FCE9E9",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: COLORS.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  trendBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#F7FAF9",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: "#ECF1F0",
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricValue: {
    marginTop: 4,
    color: COLORS.textDark,
    fontSize: 15,
    fontWeight: "800",
  },
  progressRowsWrap: {
    gap: 8,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressDate: {
    width: 90,
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  progressTrack: {
    flex: 1,
    height: 9,
    borderRadius: 999,
    backgroundColor: "#E6ECEB",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressScore: {
    width: 45,
    textAlign: "right",
    color: COLORS.textDark,
    fontSize: 11,
    fontWeight: "700",
  },
  resultCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  resultTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
  },
  confidenceBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: "700",
  },
  resultExplanation: {
    marginTop: 10,
    color: "#3B4952",
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 10,
    padding: 10,
  },
  metricsGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricGridCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E9EFED",
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  metricGridLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricGridValue: {
    marginTop: 3,
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: "800",
  },
  overlayWrap: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7EFED",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  overlayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F0",
    backgroundColor: "#F7FBFA",
  },
  overlayTitle: {
    color: COLORS.textDark,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  zoomHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  zoomHintText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  overlayImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#0F1518",
  },
  overlayCta: {
    margin: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  overlayCtaText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  resetButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E0E7E5",
  },
  resetButtonText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 14, 18, 0.93)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  modalCloseButton: {
    position: "absolute",
    top: 46,
    right: 24,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalImage: {
    width: "100%",
    height: "78%",
  },
});
