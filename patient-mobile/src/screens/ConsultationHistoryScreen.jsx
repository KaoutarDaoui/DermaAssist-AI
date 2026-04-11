import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
} from "react-native";
import {
  ChevronLeft,
  FileText,
  Calendar,
  ChevronRight,
} from "lucide-react-native";
import patientDataService from "../services/patientDataService";

const COLORS = {
  primary: "#0F6E56",
  secondary: "#6B7280",
  accent: "#0F6E56",
  background: "#F8FAFC",
  white: "#FFFFFF",
  textDark: "#111827",
  textLight: "#6B7280",
  success: "#10B981",
  lightBg: "#ECFDF5",
  border: "#E5E7EB",
};

const formatLongDate = (value) => {
  if (!value) return "Date non disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date non disponible";
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatConfidence = (confidence) => {
  if (confidence === null || confidence === undefined) {
    return "—";
  }

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

export default function ConsultationHistoryScreen({ navigation }) {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);
  const showBackButton = navigation.canGoBack();

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const history = await patientDataService.getAIResultsHistory();

      if (!isMountedRef.current) {
        return;
      }

      setConsultations(Array.isArray(history) ? history : []);
    } catch (loadError) {
      console.error("Error loading consultation history:", loadError);
      if (!isMountedRef.current) {
        return;
      }
      setError("Impossible de charger l'historique des consultations.");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {showBackButton ? (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft size={22} color={COLORS.accent} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 36 }} />
      )}
      <Text style={styles.headerTitle}>Consultations</Text>
      <View style={{ width: 36 }} />
    </View>
  );

  useEffect(() => {
    isMountedRef.current = true;
    loadHistory();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const normalizedConsultations = useMemo(() => {
    return [...consultations].sort((a, b) => {
      const first = a?.generated_at ? new Date(a.generated_at).getTime() : 0;
      const second = b?.generated_at ? new Date(b.generated_at).getTime() : 0;
      return second - first;
    });
  }, [consultations]);

  const handleViewDetails = (item, index) => {
    if (!item?.id) {
      return;
    }

    navigation.navigate("ConsultationDetails", {
      aiResultId: item.id,
      consultationId: item?.consultation_id,
      sequentialNumber: index + 1,
    });
  };

  const renderConsultationCard = ({ item, index }) => {
    const diagnosis = item?.diagnosis || "Diagnostic non disponible";
    const confidence = formatConfidence(item?.confidence);
    const dateLabel = formatLongDate(item?.generated_at);
    const timeLabel = formatTime(item?.generated_at);

    return (
      <View style={styles.consultationCard}>
        <View style={styles.analysisHeader}>
          <View>
            <Text style={styles.analysisLabel}>Analyse</Text>
            <Text style={styles.analysisNumber}>#{index + 1}</Text>
          </View>
        </View>

        <View style={styles.dateBlock}>
          <Text style={styles.blockTitle}>Date</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateIconBox}>
              <Calendar size={14} color={COLORS.accent} />
            </View>
            <View style={styles.dateTexts}>
              <Text style={styles.dateText}>{dateLabel}</Text>
              {timeLabel ? (
                <Text style={styles.timeText}>{timeLabel}</Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.diagnosisBlock}>
          <Text style={styles.blockTitle}>Diagnostic</Text>
          <Text style={styles.diagnosisText}>{diagnosis}</Text>
          <Text style={styles.confidenceText}>Confiance: {confidence}%</Text>
        </View>

        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => handleViewDetails(item, index)}
          activeOpacity={0.9}
        >
          <Text style={styles.detailsButtonText}>Voir Détails</Text>
          <ChevronRight size={14} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}

        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.stateText}>Chargement des analyses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}

        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadHistory}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <FlatList
        data={normalizedConsultations}
        keyExtractor={(item, index) => item.id || `consultation-${index}`}
        renderItem={renderConsultationCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <FileText size={24} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>Aucune consultation trouvée</Text>
            <Text style={styles.emptySubtitle}>
              Ajoutez une analyse pour voir l'historique ici.
            </Text>
          </View>
        }
      />
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
    paddingHorizontal: 24,
    gap: 12,
  },
  stateText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textLight,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
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
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  consultationCard: {
    backgroundColor: "#FAFBFC",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  analysisHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  analysisLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  analysisNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.accent,
  },
  dateBlock: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  blockTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.lightBg,
    justifyContent: "center",
    alignItems: "center",
  },
  dateTexts: {
    flex: 1,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  timeText: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textLight,
  },
  diagnosisBlock: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  diagnosisText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDark,
    lineHeight: 20,
  },
  confidenceText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textLight,
  },
  detailsButton: {
    width: "100%",
    backgroundColor: COLORS.accent,
    paddingVertical: 11,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  detailsButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.white,
  },
  emptyContainer: {
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 18,
  },
});
