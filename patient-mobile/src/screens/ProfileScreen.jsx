import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Mail,
  Calendar,
  MapPin,
  Phone,
  FileText,
  CircleCheck as CheckCircle,
  Settings,
  Bell,
  Shield,
  CircleQuestionMark as HelpCircle,
  LogOut,
  Zap,
  ChevronRight,
} from "lucide-react-native";
import authService from "../services/authService";
import patientDataService from "../services/patientDataService";

const COLORS = {
  background: "#F2F6F7",
  surface: "#FFFFFF",
  textPrimary: "#14222F",
  textSecondary: "#5E6B76",
  textMuted: "#8D99A4",
  accent: "#0F6E56",
  accentSoft: "#D5EFEA",
  success: "#2F9E60",
  successSoft: "#DBF3E4",
  danger: "#E65B5B",
  dangerSoft: "#FCE4E4",
  border: "#E2E8EC",
};

const formatValue = (value, fallback = "Non renseigné") => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return fallback;
  }
  return String(value);
};

const formatDate = (value) => {
  if (!value) {
    return "Non renseignée";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("fr-FR");
};

const formatFitzpatrick = (value) => {
  if (!value) {
    return "Non renseigné";
  }

  const raw = String(value).trim();
  if (!raw) {
    return "Non renseigné";
  }

  const cleaned = raw.replace(/^TYPE_/i, "");
  return `Type ${cleaned}`;
};

const getInitials = (fullName) => {
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

const formatMemberSince = (dateValue) => {
  if (!dateValue) {
    return "date inconnue";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "date inconnue";
  }

  return date.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
};

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    checkins: 0,
    consultations: 0,
    photoFollowUps: 0,
    adviceReceived: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [profileData, consultations, checkIns, aiMedications] =
        await Promise.all([
          patientDataService.getPatientProfile(),
          patientDataService.getConsultations(),
          patientDataService.getCheckIns(),
          patientDataService.getAIMedications().catch(() => []),
        ]);

      setUserData(profileData);

      setStats({
        checkins: checkIns?.length || 0,
        consultations: consultations?.length || 0,
        photoFollowUps: 0,
        adviceReceived: Array.isArray(aiMedications) ? aiMedications.length : 0,
      });
    } catch (loadError) {
      console.error("Erreur de chargement du profil:", loadError);
      setError("Impossible de charger les données du profil.");
      Alert.alert("Erreur", "Impossible de charger les données du profil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, []);

  const handleLogout = () => {
    Alert.alert("Se déconnecter", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", onPress: () => {} },
      {
        text: "Se déconnecter",
        onPress: async () => {
          try {
            await authService.logout();
            navigation.reset({
              index: 0,
              routes: [{ name: "Welcome" }],
            });
          } catch (logoutError) {
            Alert.alert("Erreur", "Impossible de se déconnecter.");
          }
        },
        style: "destructive",
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={["#F6FBFA", "#EDF3F5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fullPageCenter}
        >
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error || !userData) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={["#F6FBFA", "#EDF3F5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fullPageCenter}
        >
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Erreur de chargement</Text>
            <Text style={styles.errorSubtitle}>
              Impossible de récupérer les informations du profil.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadPatientData}
            >
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const patientName = formatValue(
    userData.full_name || userData.user?.full_name,
    "Patient",
  );
  const initials = getInitials(patientName);
  const memberSince = formatMemberSince(userData.created_at);
  const isPremium = Boolean(userData.user?.is_premium);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#F6FBFA", "#EDF3F5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.headerCard}>
            <Text style={styles.headerLabel}>Profil patient</Text>

            <View style={styles.headerRow}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>

              <View style={styles.headerInfo}>
                <Text style={styles.profileName}>{patientName}</Text>
                <Text style={styles.profileSubtitle}>
                  Membre depuis {memberSince}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.statusPill,
                isPremium ? styles.statusPremium : styles.statusStandard,
              ]}
            >
              <Shield
                size={14}
                color={isPremium ? COLORS.success : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.statusPillText,
                  isPremium
                    ? styles.statusPremiumText
                    : styles.statusStandardText,
                ]}
              >
                {isPremium ? "Abonnement premium actif" : "Compte standard"}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            <View style={styles.sectionCard}>
              <InfoRow
                icon={<Mail size={18} color={COLORS.accent} />}
                label="Email"
                value={formatValue(userData.user?.email)}
              />
              <InfoRow
                icon={<Calendar size={18} color={COLORS.accent} />}
                label="Date de naissance"
                value={formatDate(userData.birth_date)}
              />
              <InfoRow
                icon={<MapPin size={18} color={COLORS.accent} />}
                label="Ville"
                value={formatValue(userData.city, "Non renseignée")}
              />
              <InfoRow
                icon={<Phone size={18} color={COLORS.accent} />}
                label="Téléphone"
                value={formatValue(userData.phone)}
              />
              <InfoRow
                icon={<Shield size={18} color={COLORS.accent} />}
                label="Type de peau (Fitzpatrick)"
                value={formatFitzpatrick(userData.fitzpatrick_type)}
              />
              <InfoRow
                icon={<FileText size={18} color={COLORS.accent} />}
                label="Antécédents médicaux"
                value={formatValue(userData.medical_history)}
                isLast
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activité</Text>
            <View style={styles.statsGrid}>
              <StatCard
                icon={<CheckCircle size={20} color={COLORS.accent} />}
                value={stats.checkins}
                label="Suivis"
              />
              <StatCard
                icon={<Zap size={20} color={COLORS.accent} />}
                value={stats.consultations}
                label="Consultations"
              />
              <StatCard
                icon={<FileText size={20} color={COLORS.accent} />}
                value={stats.photoFollowUps}
                label="Photos"
              />
              <StatCard
                icon={<Bell size={20} color={COLORS.accent} />}
                value={stats.adviceReceived}
                label="Conseils"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Préférences</Text>
            <View style={styles.sectionCard}>
              <SettingItem
                icon={<Settings size={18} color={COLORS.accent} />}
                title="Paramètres du compte"
                onPress={() => {}}
              />
              <SettingItem
                icon={<Bell size={18} color={COLORS.accent} />}
                title="Notifications"
                onPress={() => navigation.navigate("Notifications")}
              />
              <SettingItem
                icon={<Shield size={18} color={COLORS.accent} />}
                title="Confidentialité et sécurité"
                onPress={() => {}}
              />
              <SettingItem
                icon={<HelpCircle size={18} color={COLORS.accent} />}
                title="Aide et assistance"
                onPress={() => navigation.navigate("HelpSupport")}
                isLast
              />
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={18} color={COLORS.danger} />
            <Text style={styles.logoutButtonText}>Se déconnecter</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Skin+ Mobile v1.0.0</Text>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, isLast = false }) {
  return (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
      <View style={styles.infoIconBox}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconBox}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingItem({ icon, title, onPress, isLast = false }) {
  return (
    <TouchableOpacity
      style={[styles.settingItem, !isLast && styles.settingItemBorder]}
      onPress={onPress}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIconBox}>{icon}</View>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <ChevronRight size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradientBackground: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  fullPageCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  errorCard: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: "center",
  },
  errorTitle: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  errorSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryButtonText: {
    color: COLORS.surface,
    fontWeight: "700",
    fontSize: 13,
  },
  headerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: "800",
  },
  headerInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    lineHeight: 25,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  profileSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  statusPill: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPremium: {
    backgroundColor: COLORS.successSoft,
  },
  statusStandard: {
    backgroundColor: "#EEF2F4",
  },
  statusPillText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  statusPremiumText: {
    color: COLORS.success,
  },
  statusStandardText: {
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#EDF1F4",
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "600",
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    color: COLORS.accent,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 50,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#EDF1F4",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingVertical: 9,
  },
  settingIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.danger,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  logoutButtonText: {
    marginLeft: 8,
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  version: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
});
