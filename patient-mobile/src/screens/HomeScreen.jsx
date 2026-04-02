import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  TriangleAlert as AlertTriangle,
  Bell,
  ChevronRight,
  Clock,
  Droplets,
  GitCompare,
  Stethoscope,
  Sun,
  Wind,
  Upload,
} from "lucide-react-native/icons";
import patientDataService from "../services/patientDataService";

const COLORS = {
  background: "#F2F6F7",
  surface: "#FFFFFF",
  textPrimary: "#14222F",
  textSecondary: "#5E6B76",
  textMuted: "#8D99A4",
  accent: "#0B7D6E",
  accentSoft: "#D5EFEA",
  warning: "#D97706",
  warningSoft: "#FEEFD8",
  info: "#3B82F6",
  infoSoft: "#DDEBFF",
  danger: "#E65B5B",
  dangerSoft: "#FCE4E4",
  success: "#2F9E60",
  successSoft: "#DBF3E4",
};

const adviceItems = [
  {
    id: "a1",
    category: "Médication",
    title: "Appliquer la crème de bétaméthasone",
    subtitle: "Une fois par jour après la douche",
    time: "08:00",
    categoryStyle: "medication",
  },
  {
    id: "a2",
    category: "Mode de vie",
    title: "Éviter les douches chaudes",
    subtitle: "Peut aggraver l'inflammation cutanée",
    time: "À tout moment",
    categoryStyle: "lifestyle",
  },
];

const metrics = [
  { id: "m1", label: "UV ÉLEVÉ 7", icon: Sun, tone: "warning" },
  { id: "m2", label: "IQA 42", icon: Wind, tone: "warning" },
  { id: "m3", label: "Humidité 65%", icon: Droplets, tone: "info" },
];

const getPatientDisplayName = (profile) => {
  if (!profile) {
    return "Patient";
  }

  return profile.full_name || profile.user?.full_name || "Patient";
};

const getPatientInitials = (fullName) => {
  const initials = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "PT";
};

const formatConsultationDate = (dateValue) => {
  if (!dateValue) {
    return "Date inconnue";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
};

const formatConsultationStatus = (status) => {
  if (!status) {
    return "Statut inconnu";
  }

  return String(status)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
};

export default function HomeScreen({ navigation }) {
  const [patientProfile, setPatientProfile] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [dashboardError, setDashboardError] = useState(null);

  useEffect(() => {
    let isActive = true;

    const loadDashboardData = async () => {
      try {
        const [profile, consultationsData] = await Promise.all([
          patientDataService.getPatientProfile(),
          patientDataService.getConsultations(),
        ]);

        if (!isActive) {
          return;
        }

        setPatientProfile(profile);
        setConsultations(Array.isArray(consultationsData) ? consultationsData : []);
        setDashboardError(null);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        if (!isActive) {
          return;
        }
        setDashboardError("Impossible de charger les données du patient.");
      }
    };

    loadDashboardData();

    return () => {
      isActive = false;
    };
  }, []);

  const patientFullName = useMemo(() => getPatientDisplayName(patientProfile), [patientProfile]);
  const patientInitials = useMemo(() => getPatientInitials(patientFullName), [patientFullName]);

  const recentConsultations = useMemo(() => {
    return [...consultations]
      .sort((a, b) => {
        const firstDate = a?.date ? new Date(a.date).getTime() : 0;
        const secondDate = b?.date ? new Date(b.date).getTime() : 0;
        return secondDate - firstDate;
      })
      .slice(0, 6);
  }, [consultations]);

  const handleOpenTreatment = () => {
    navigation.navigate("Treatment");
  };

  const handleOpenConsultationHistory = () => {
    navigation.navigate("Consultations");
  };

  const handleOpenComparison = () => {
    navigation.navigate("Comparison");
  };

  const handleOpenNotifications = () => {
    navigation.navigate("Notifications");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#F6FBFA", "#EDF3F5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerGreeting}>Bonjour,</Text>
              <Text style={styles.headerName}>{patientFullName}</Text>
            </View>
            <View style={styles.headerActions}>
              <View style={styles.avatarBadge}>
                <Text style={styles.avatarText}>{patientInitials}</Text>
              </View>
              <TouchableOpacity
                style={styles.notificationButton}
                activeOpacity={0.8}
                onPress={handleOpenNotifications}
              >
                <Bell size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {dashboardError ? <Text style={styles.dataErrorText}>{dashboardError}</Text> : null}

          <View style={styles.alertCard}>
            <View style={styles.alertPill}>
              <Text style={styles.alertPillText}>Du Dr Karim Benali</Text>
            </View>
            <View style={styles.alertTitleRow}>
              <Text style={styles.alertTitle}>Évitez l'exposition au soleil aujourd'hui</Text>
              <AlertTriangle size={18} color={COLORS.accent} />
            </View>
            <Text style={styles.alertSubtitle}>L'indice UV est ÉLEVÉ à Boumerdès - appliquez SPF 50+</Text>
            <Text style={styles.alertDate}>Mis à jour aujourd'hui</Text>
          </View>

          <View style={styles.metricRow}>
            {metrics.map((metric) => {
              const Icon = metric.icon;
              const chipStyle = metric.tone === "warning" ? styles.metricWarning : styles.metricInfo;
              return (
                <View key={metric.id} style={[styles.metricChip, chipStyle]}>
                  <Icon size={14} color={metric.tone === "warning" ? COLORS.warning : COLORS.info} />
                  <Text
                    style={[
                      styles.metricChipText,
                      { color: metric.tone === "warning" ? "#9A5A0A" : "#1F5FB8" },
                    ]}
                  >
                    {metric.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Comparaison photo</Text>
          <TouchableOpacity
            style={styles.comparisonCard}
            activeOpacity={0.9}
            onPress={handleOpenComparison}
          >
            <View style={styles.comparisonIconWrap}>
              <GitCompare size={20} color={COLORS.accent} />
            </View>
            <View style={styles.comparisonBody}>
              <Text style={styles.comparisonTitle}>Comparer mes photos de suivi</Text>
              <Text style={styles.comparisonSubtitle}>Sélectionnez 2 photos et lancez une comparaison</Text>
            </View>
            <ChevronRight size={16} color={COLORS.accent} />
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Mes conseils</Text>
            <TouchableOpacity onPress={handleOpenTreatment}>
              <Text style={styles.sectionAction}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {adviceItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.adviceCard}
              activeOpacity={0.9}
              onPress={handleOpenTreatment}
            >
              <View style={styles.adviceHeader}>
                <View
                  style={[
                    styles.adviceTag,
                    item.categoryStyle === "medication"
                      ? styles.adviceTagMedication
                      : styles.adviceTagLifestyle,
                  ]}
                >
                  <Text
                    style={[
                      styles.adviceTagText,
                      item.categoryStyle === "medication"
                        ? styles.adviceTagTextMedication
                        : styles.adviceTagTextLifestyle,
                    ]}
                  >
                    {item.category}
                  </Text>
                </View>
                <View style={styles.adviceTimeRow}>
                  <Clock size={14} color={COLORS.textMuted} />
                  <Text style={styles.adviceTime}>{item.time}</Text>
                </View>
              </View>
              <Text style={styles.adviceTitle}>{item.title}</Text>
              <Text style={styles.adviceSubtitle}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Mes consultations</Text>
            <View style={styles.recentLegend}>
              <Stethoscope size={13} color={COLORS.textMuted} />
              <Text style={styles.recentLegendText}>{recentConsultations.length} résultat(s)</Text>
            </View>
          </View>

          <View style={styles.recentCard}>
            {recentConsultations.length === 0 ? (
              <Text style={styles.emptyStateText}>Aucune consultation disponible pour le moment.</Text>
            ) : (
              recentConsultations.map((consultation, index) => {
                const doctorName = consultation?.doctor?.full_name || "Médecin";
                const status = formatConsultationStatus(consultation?.status);
                const dateLabel = formatConsultationDate(consultation?.date);
                const noteText = consultation?.notes || "Sans note clinique";
                const rowKey = consultation?.id || consultation?.consultation_id || `consultation-${index}`;

                return (
                  <TouchableOpacity
                    key={rowKey}
                    style={styles.recentRow}
                    activeOpacity={0.85}
                    onPress={handleOpenConsultationHistory}
                  >
                    <View style={[styles.scoreBadge, styles.consultationBadge]}>
                      <Stethoscope size={14} color="#FFFFFF" />
                    </View>

                    <View style={styles.consultationInfo}>
                      <Text style={styles.recentNote} numberOfLines={1}>
                        {doctorName}
                      </Text>
                      <Text style={styles.consultationSubtext} numberOfLines={1}>
                        {noteText}
                      </Text>
                    </View>

                    <View style={styles.consultationMeta}>
                      <Text style={styles.recentDate}>{dateLabel}</Text>
                      <Text style={styles.consultationStatus}>{status}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <TouchableOpacity style={styles.footerCta} activeOpacity={0.9} onPress={handleOpenTreatment}>
            <Upload size={16} color={COLORS.accent} />
            <Text style={styles.footerCtaText}>Ouvrir le plan de traitement</Text>
            <ChevronRight size={14} color={COLORS.accent} />
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
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
    paddingHorizontal: 16,
  },
  contentContainer: {
    paddingTop: 12,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerGreeting: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  headerName: {
    marginTop: 2,
    fontSize: 30,
    lineHeight: 34,
    color: COLORS.textPrimary,
    fontWeight: "800",
  },
  dataErrorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3FA08E",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3EBEE",
  },
  alertCard: {
    backgroundColor: "#CFEAE5",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#B7DDD6",
  },
  alertPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(11,125,110,0.12)",
    marginBottom: 10,
  },
  alertPillText: {
    color: "#236A60",
    fontWeight: "600",
    fontSize: 12,
  },
  alertTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  alertTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 28,
    lineHeight: 31,
    fontWeight: "800",
  },
  alertSubtitle: {
    marginTop: 6,
    color: "#315A55",
    fontSize: 15,
    fontWeight: "500",
  },
  alertDate: {
    marginTop: 4,
    color: "#6B837F",
    fontSize: 12,
    fontWeight: "500",
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metricWarning: {
    backgroundColor: COLORS.warningSoft,
  },
  metricInfo: {
    backgroundColor: COLORS.infoSoft,
  },
  metricChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 33,
    lineHeight: 35,
    color: COLORS.textPrimary,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 8,
  },
  sectionAction: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 14,
  },
  comparisonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8EC",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  comparisonIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  comparisonBody: {
    flex: 1,
  },
  comparisonTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
  },
  comparisonSubtitle: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  adviceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8EC",
    padding: 12,
    marginBottom: 10,
  },
  adviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  adviceTag: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  adviceTagMedication: {
    backgroundColor: "#D8F2EA",
  },
  adviceTagLifestyle: {
    backgroundColor: "#FBE8B6",
  },
  adviceTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  adviceTagTextMedication: {
    color: "#187E6D",
  },
  adviceTagTextLifestyle: {
    color: "#9A6808",
  },
  adviceTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  adviceTime: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  adviceTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "800",
  },
  adviceSubtitle: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: "500",
  },
  recentLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  recentLegendText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  recentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8EC",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    borderBottomColor: "#EEF2F4",
    borderBottomWidth: 1,
    gap: 8,
    paddingVertical: 6,
  },
  scoreBadge: {
    minWidth: 48,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  consultationBadge: {
    minWidth: 34,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
  },
  scoreGood: {
    backgroundColor: COLORS.success,
  },
  scoreBad: {
    backgroundColor: COLORS.danger,
  },
  scoreAverage: {
    backgroundColor: "#C58A12",
  },
  scoreBadgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  recentNote: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  consultationInfo: {
    flex: 1,
  },
  consultationSubtext: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  consultationMeta: {
    alignItems: "flex-end",
    gap: 2,
  },
  recentDate: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  consultationStatus: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  emptyStateText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 14,
  },
  footerCta: {
    marginTop: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8F5F2",
    borderColor: "#B8DCD5",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  footerCtaText: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 13,
  },
});