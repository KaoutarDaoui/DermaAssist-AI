import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ChevronLeft,
  Pill,
  Stethoscope,
  Image as ImageIcon,
} from "lucide-react-native/icons";
import patientDataService from "../services/patientDataService";

const COLORS = {
  accent: "#0F6E56",
  background: "#F8FAFC",
  white: "#FFFFFF",
  textDark: "#111827",
  textLight: "#6B7280",
  border: "#E5E7EB",
  lightBg: "#ECFDF5",
  success: "#10B981",
  danger: "#DC2626",
};

const formatFullDateTime = (value) => {
  if (!value) return "Date non disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date non disponible";
  return date.toLocaleString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatConfidence = (confidence) => {
  if (confidence === null || confidence === undefined) return "—";

  if (typeof confidence === "number") {
    return String(Math.round(confidence * (confidence <= 1 ? 100 : 1)));
  }

  if (typeof confidence === "string") {
    return confidence;
  }

  if (typeof confidence === "object") {
    const preferred =
      confidence.percentage ?? confidence.score ?? confidence.value;
    if (preferred !== null && preferred !== undefined && preferred !== "") {
      return String(preferred);
    }
  }

  return "—";
};

export default function ConsultationDetailsScreen({ navigation, route }) {
  const aiResultId = route?.params?.aiResultId;
  const sequentialNumber = route?.params?.sequentialNumber;

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;

    const loadDetails = async () => {
      if (!aiResultId) {
        setError("Identifiant de consultation invalide.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response =
          await patientDataService.getAIResultDetails(aiResultId);

        if (!isActive) {
          return;
        }

        setDetails(response);
      } catch (fetchError) {
        console.error("Error loading consultation details:", fetchError);
        if (!isActive) {
          return;
        }
        setError("Impossible de charger les détails de la consultation.");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      isActive = false;
    };
  }, [aiResultId]);

  const medications = useMemo(() => {
    if (!Array.isArray(details?.medications)) {
      return [];
    }
    return details.medications;
  }, [details]);

  const diagnosis = details?.diagnosis || "Maladie non disponible";
  const confidence = formatConfidence(details?.confidence);
  const dateLabel = formatFullDateTime(details?.generated_at);
  const skinPhotoUri =
    details?.skin_photo?.image_url || details?.skin_photo?.image_data;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft size={22} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails Consultation</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.stateText}>Chargement des détails...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() =>
              navigation.replace("ConsultationDetails", {
                aiResultId,
                sequentialNumber,
              })
            }
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Analyse</Text>
            <Text style={styles.cardTitle}>#{sequentialNumber || "—"}</Text>
            <Text style={styles.metaText}>{dateLabel}</Text>
            <Text style={styles.metaText}>Confiance: {confidence}%</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.rowTitle}>
              <Stethoscope size={18} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Maladie</Text>
            </View>
            <Text style={styles.diagnosisText}>{diagnosis}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.rowTitle}>
              <Pill size={18} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Traitement</Text>
            </View>

            {medications.length === 0 ? (
              <Text style={styles.emptyText}>
                Aucun médicament proposé pour cette consultation.
              </Text>
            ) : (
              medications.map((med, index) => (
                <View
                  key={`${med.name || "med"}-${index}`}
                  style={styles.medicationItem}
                >
                  <Text style={styles.medicationName}>
                    {med.name || "Médicament"}
                  </Text>
                  <Text style={styles.medicationMeta}>
                    Classe: {med.drug_class || "—"}
                  </Text>
                  <Text style={styles.medicationMeta}>
                    Posologie: {med.dosage || "—"}
                  </Text>
                  <Text style={styles.medicationMeta}>
                    Indication: {med.indication || "—"}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.rowTitle}>
              <ImageIcon size={18} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Photo de la peau</Text>
            </View>

            {skinPhotoUri ? (
              <Image
                source={{ uri: skinPhotoUri }}
                style={styles.skinImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.emptyText}>
                  Aucune photo disponible pour cette consultation.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
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
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  stateText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textLight,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.danger,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 30,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
  },
  cardLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    color: COLORS.textLight,
    letterSpacing: 1,
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.accent,
    marginTop: 2,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  rowTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  diagnosisText: {
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: "600",
    lineHeight: 21,
  },
  medicationItem: {
    borderWidth: 1,
    borderColor: "#E8ECEF",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#FAFCFD",
  },
  medicationName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.accent,
    marginBottom: 4,
  },
  medicationMeta: {
    fontSize: 12,
    color: COLORS.textDark,
    marginTop: 2,
  },
  skinImage: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: "#EEF2F4",
  },
  photoPlaceholder: {
    width: "100%",
    height: 150,
    borderRadius: 10,
    backgroundColor: "#F5F7F9",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
});
