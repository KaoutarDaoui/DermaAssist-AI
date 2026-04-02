import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import {
  ChevronLeft,
  Calendar,
  Stethoscope,
  FileText,
  AlertCircle,
  Heart,
  Pill,
  Image as ImageIcon,
  User,
} from "lucide-react-native";
import { colors, borderRadius, spacing } from "../constants/theme";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const PRIMARY = colors.primary;

const getStatusStyle = (status) => {
  if (!status) return { bg: "#f3f4f6", text: "#6b7280", label: "Inconnu" };
  const s = status.toLowerCase();
  if (s.includes("complet") || s.includes("terminé"))
    return { bg: "#dcfce7", text: "#15803d", label: "Terminée" };
  if (s.includes("annul"))
    return { bg: "#fee2e2", text: "#b91c1c", label: "Annulée" };
  if (s.includes("plan") || s.includes("schedul"))
    return { bg: "#dbeafe", text: "#1d4ed8", label: "Planifiée" };
  return { bg: "#fef3c7", text: "#b45309", label: status };
};

/**
 * Écran Détail d'une consultation
 * Reçoit `route.params.consultation` — objet renvoyé par /mobile/patient/consultations
 * Affiche : date, médecin, statut, notes (résumé/diagnostic/recommandations)
 */
export default function ConsultationDetailScreen({ route, navigation }) {
  const { consultation } = route.params || {};

  if (!consultation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={colors.danger} />
          <Text style={styles.errorText}>Données de consultation introuvables.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = getStatusStyle(consultation.status);

  const formattedDate = consultation.date
    ? format(new Date(consultation.date), "EEEE dd MMMM yyyy 'à' HH:mm", { locale: fr })
    : "Date inconnue";

  // Les notes peuvent contenir des sections structurées si le médecin a utilisé
  // un format spécifique. Ici on affiche tout le contenu brut de façon lisible.
  const notes = consultation.notes || null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consultation</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card — date + statut */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.dateRow}>
              <View style={styles.iconCircle}>
                <Calendar size={18} color={PRIMARY} />
              </View>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {statusStyle.label}
              </Text>
            </View>
          </View>

          {/* Médecin */}
          <View style={styles.divider} />
          <View style={styles.doctorRow}>
            <View style={[styles.iconCircle, { backgroundColor: `${PRIMARY}15` }]}>
              <Stethoscope size={18} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.doctorLabel}>Médecin</Text>
              <Text style={styles.doctorName}>
                {consultation.doctor?.full_name
                  ? `Dr. ${consultation.doctor.full_name}`
                  : "Non assigné"}
              </Text>
            </View>
          </View>
        </View>

        {/* Résumé / Notes */}
        {notes ? (
          <SectionCard
            icon={<FileText size={18} color={PRIMARY} />}
            title="Résumé de la consultation"
          >
            <Text style={styles.bodyText}>{notes}</Text>
          </SectionCard>
        ) : (
          <SectionCard
            icon={<FileText size={18} color={PRIMARY} />}
            title="Résumé de la consultation"
          >
            <EmptyItem label="Aucune note enregistrée pour cette consultation." />
          </SectionCard>
        )}

        {/* Diagnostic — section dédiée si disponible
            Remarque : le backend ne renvoie pas encore de champ "diagnostic" séparé;
            lorsqu'il sera disponible, remplacer `consultation.diagnostic` ici. */}
        <SectionCard
          icon={<AlertCircle size={18} color="#f59e0b" />}
          title="Diagnostic"
          accentColor="#f59e0b"
        >
          {consultation.diagnostic ? (
            <Text style={styles.bodyText}>{consultation.diagnostic}</Text>
          ) : (
            <EmptyItem label="Diagnostic non renseigné (disponible prochainement)." />
          )}
        </SectionCard>

        {/* Recommandations */}
        <SectionCard
          icon={<Heart size={18} color={colors.success} />}
          title="Recommandations"
          accentColor={colors.success}
        >
          {consultation.recommendations ? (
            <Text style={styles.bodyText}>{consultation.recommendations}</Text>
          ) : (
            <EmptyItem label="Aucune recommandation enregistrée." />
          )}
        </SectionCard>

        {/* Traitements / Médicaments */}
        <SectionCard
          icon={<Pill size={18} color="#8b5cf6" />}
          title="Traitements & Médicaments"
          accentColor="#8b5cf6"
        >
          {consultation.treatment ? (
            <Text style={styles.bodyText}>{consultation.treatment}</Text>
          ) : (
            <EmptyItem label="Aucun traitement renseigné." />
          )}
        </SectionCard>

        {/* Photos associées
            Le backend ne renvoie pas encore d'URL de photos dans /mobile/patient/consultations.
            Ce bloc est prêt à être branché lorsque l'endpoint le supportera. */}
        <SectionCard
          icon={<ImageIcon size={18} color={colors.gray} />}
          title="Photos associées"
          accentColor={colors.gray}
        >
          <EmptyItem label="Les photos seront affichées ici (fonctionnalité à venir)." />
        </SectionCard>

        <Text style={styles.consultationId}>
          Réf : #{consultation.consultation_id || consultation.id}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Composant carte section réutilisable */
function SectionCard({ icon, title, children, accentColor }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View
          style={[
            styles.sectionIconBg,
            { backgroundColor: `${accentColor || colors.primary}18` },
          ]}
        >
          {icon}
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function EmptyItem({ label }) {
  return <Text style={styles.emptyText}>{label}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1f2937",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
    textTransform: "capitalize",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginBottom: 12,
  },
  doctorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  sectionIconBg: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
  },
  sectionBody: {
    padding: 14,
  },
  bodyText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 13,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  consultationId: {
    textAlign: "center",
    fontSize: 11,
    color: "#d1d5db",
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: "#6b7280",
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  backBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
});
