import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import {
  BookOpen,
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle,
  Pill,
} from "lucide-react-native";
import patientDataService from "../services/patientDataService";

const COLORS = {
  primary: "#16634D",
  secondary: "#6F7F78",
  accent: "#1B8F6B",
  background: "#F3FBF7",
  white: "#FFFFFF",
  textDark: "#333333",
  textLight: "#7E8F88",
  success: "#17996E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

export default function TreatmentScreen() {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tips = [
    "Appliquez la crème sur peau propre et sèche",
    "Évitez l'exposition au soleil pendant le traitement",
    "Utilisez un SPF 30 minimum quotidiennement",
    "Consultez votre médecin si irritation persiste",
  ];

  useEffect(() => {
    let isActive = true;

    const loadMedications = async () => {
      try {
        setLoading(true);
        setError(null);

        const aiMedications = await patientDataService.getAIMedications();
        if (!isActive) {
          return;
        }

        setMedications(Array.isArray(aiMedications) ? aiMedications : []);
      } catch (fetchError) {
        console.error("Error loading AI medications:", fetchError);
        if (!isActive) {
          return;
        }
        setError("Impossible de charger les médicaments proposés.");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadMedications();

    return () => {
      isActive = false;
    };
  }, []);

  const treatmentRows = useMemo(() => {
    return medications.map((medication) => {
      const rawStatus = String(medication?.status || "propose").toLowerCase();
      const mappedStatus =
        rawStatus === "completed"
          ? "completed"
          : rawStatus === "pending"
            ? "pending"
            : "active";

      return {
        id: medication.id,
        name: medication.name || "Médicament",
        status: mappedStatus,
        duration: medication.drug_class || "Prescription issue de AI results",
        dosage: medication.dosage || "Posologie non précisée",
        indication: medication.indication || "Indication non précisée",
        icon: mappedStatus === "completed" ? CheckCircle : Pill,
        color:
          mappedStatus === "completed"
            ? COLORS.success
            : mappedStatus === "pending"
              ? COLORS.warning
              : COLORS.accent,
      };
    });
  }, [medications]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Plans de Traitement</Text>
            <Text style={styles.subtitle}>Votre suivi personnalisé</Text>
          </View>
          <View style={styles.headerIcon}>
            <BookOpen size={28} color={COLORS.accent} />
          </View>
        </View>

        {/* Active Treatments */}
        <Text style={styles.sectionTitle}>
          Médicaments proposés par le médecin
        </Text>

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.loadingText}>
              Chargement des traitements...
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && !error && treatmentRows.length === 0 ? (
          <View style={styles.emptyTreatmentsCard}>
            <Text style={styles.emptyTreatmentsText}>
              Aucun médicament trouvé dans la base AI Results pour ce patient.
            </Text>
          </View>
        ) : null}

        {!loading && !error
          ? treatmentRows.map((treatment) => (
              <TouchableOpacity
                key={treatment.id}
                style={styles.treatmentCard}
                activeOpacity={0.9}
              >
                <View style={styles.treatmentHeader}>
                  <View
                    style={[
                      styles.statusIcon,
                      { backgroundColor: `${treatment.color}20` },
                    ]}
                  >
                    <treatment.icon size={20} color={treatment.color} />
                  </View>
                  <View style={styles.treatmentInfo}>
                    <Text style={styles.treatmentName}>{treatment.name}</Text>
                    <Text style={styles.treatmentDuration}>
                      {treatment.duration}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${treatment.color}20` },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: treatment.color }]}
                    >
                      {treatment.status === "active"
                        ? "Actif"
                        : treatment.status === "completed"
                          ? "✓ Fait"
                          : "Attente"}
                    </Text>
                  </View>
                </View>

                <View style={styles.dosageInfo}>
                  <Text style={styles.dosageLabel}>Posologie:</Text>
                  <Text style={styles.dosageValue}>{treatment.dosage}</Text>
                </View>

                <View style={styles.indicationRow}>
                  <Text style={styles.indicationLabel}>Indication:</Text>
                  <Text style={styles.indicationValue}>
                    {treatment.indication}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          : null}

        {/* Treatment Tips */}
        <Text style={styles.sectionTitle}>Conseils Importants</Text>
        <View style={styles.tipsContainer}>
          {tips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Contact Doctor */}
        <TouchableOpacity style={styles.contactCard}>
          <AlertCircle
            size={24}
            color={COLORS.white}
            style={{ marginRight: 12 }}
          />
          <View style={styles.contactText}>
            <Text style={styles.contactTitle}>Avez des questions?</Text>
            <Text style={styles.contactSubtitle}>Contactez votre médecin</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.textDark,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  headerIcon: {
    backgroundColor: "#E6F6EF",
    padding: 12,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: COLORS.textDark,
    marginBottom: 15,
    marginTop: 10,
  },
  loadingBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  loadingText: {
    marginTop: 8,
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: "500",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  emptyTreatmentsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  emptyTreatmentsText: {
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  treatmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  treatmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  treatmentInfo: {
    flex: 1,
  },
  treatmentName: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.textDark,
  },
  treatmentDuration: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dosageInfo: {
    flexDirection: "row",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F7",
  },
  dosageLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  dosageValue: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textDark,
    marginLeft: 8,
  },
  indicationRow: {
    flexDirection: "row",
    paddingTop: 8,
  },
  indicationLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  indicationValue: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textDark,
    marginLeft: 8,
    lineHeight: 17,
  },
  tipsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginTop: 6,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 19,
  },
  contactCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  contactText: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.white,
  },
  contactSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
});
