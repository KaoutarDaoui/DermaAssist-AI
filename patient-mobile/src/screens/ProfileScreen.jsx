import React, { useState, useEffect } from "react";
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
  User,
  Mail,
  Calendar,
  MapPin,
  CheckCircle,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  Edit2,
  Zap,
} from "lucide-react-native";
import authService from '../services/authService';
import patientDataService from '../services/patientDataService';

const COLORS = {
  primary: "#0F6E56",    // Skin+ Green
  secondary: "#6b7280",
  accent: "#0F6E56",
  background: "#F9FBFF",
  white: "#FFFFFF",
  textDark: "#1f2937",
  textLight: "#8E9AAF",
  success: "#10B981",
  danger: "#EF4444",
  lightBg: "#EBF2FF",
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

  useEffect(() => {
    loadPatientData();
  }, []);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const profileData = await patientDataService.getPatientProfile();
      const consultations = await patientDataService.getConsultations();
      const checkIns = await patientDataService.getCheckIns();
      
      setUserData(profileData);
      
      // Update stats
      setStats({
        checkins: checkIns?.length || 0,
        consultations: consultations?.length || 0,
        photoFollowUps: 0, // TODO: fetch from consultations with photos
        adviceReceived: 0, // TODO: count from treatments/advice
      });
    } catch (error) {
      console.error('Error loading patient data:', error);
      setError(error.message);
      Alert.alert("Erreur", "Impossible de charger les données du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Êtes-vous sûr?", [
      { text: "Annuler", onPress: () => {} },
      {
        text: "Déconnexion",
        onPress: async () => {
          try {
            await authService.logout();
            navigation.reset({
              index: 0,
              routes: [{ name: "Welcome" }],
            });
          } catch (error) {
            Alert.alert("Erreur", "Impossible de se déconnecter");
          }
        },
        style: "destructive",
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: COLORS.danger, marginBottom: 16 }}>Erreur de chargement</Text>
          <TouchableOpacity 
            style={{ padding: 12, backgroundColor: COLORS.accent, borderRadius: 8 }}
            onPress={loadPatientData}
          >
            <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Gradient Header with Profile Info */}
        <LinearGradient
          colors={[COLORS.accent, COLORS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <User size={40} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{userData.full_name}</Text>
              <Text style={styles.profileSubtitle}>
                Depuis {userData.created_at ? new Date(userData.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }) : 'Membre'}
              </Text>
            </View>
            <TouchableOpacity style={styles.editIconButton}>
              <Edit2 size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Profile Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <Mail size={20} color={COLORS.accent} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{userData.user?.email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <Calendar size={20} color={COLORS.accent} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date de Naissance</Text>
              <Text style={styles.detailValue}>{userData.birth_date || "Non renseignée"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <MapPin size={20} color={COLORS.accent} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Ville</Text>
              <Text style={styles.detailValue}>{userData.city || "Non renseignée"}</Text>
            </View>
          </View>
        </View>

        {/* Activity Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Votre Activité</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconBg}>
                <CheckCircle size={24} color={COLORS.accent} />
              </View>
              <Text style={styles.statNumber}>{stats.checkins}</Text>
              <Text style={styles.statLabel}>Check-ins</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconBg}>
                <Zap size={24} color={COLORS.accent} />
              </View>
              <Text style={styles.statNumber}>{stats.consultations}</Text>
              <Text style={styles.statLabel}>Consultations</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconBg}>
                <Mail size={24} color={COLORS.accent} />
              </View>
              <Text style={styles.statNumber}>{stats.photoFollowUps}</Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconBg}>
                <Bell size={24} color={COLORS.accent} />
              </View>
              <Text style={styles.statNumber}>{stats.adviceReceived}</Text>
              <Text style={styles.statLabel}>Conseils</Text>
            </View>
          </View>
        </View>

        {/* Premium Subscription */}
        {userData.user?.is_premium ? (
          <LinearGradient
            colors={[COLORS.success, "#0DA373"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumCard}
          >
            <View style={styles.premiumContent}>
              <View style={styles.premiumBadge}>
                <CheckCircle size={20} color={COLORS.white} />
              </View>
              <Text style={styles.premiumTitle}>Premium Actif</Text>
              <Text style={styles.premiumSubtitle}>
                Accès complet aux fonctionnalités
              </Text>
            </View>
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={["#9CA3AF", "#6B7280"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumCard}
          >
            <View style={styles.premiumContent}>
              <View style={styles.premiumBadge}>
                <Shield size={20} color={COLORS.white} />
              </View>
              <Text style={styles.premiumTitle}>Compte Standard</Text>
              <Text style={styles.premiumSubtitle}>
                Améliorez votre plan pour plus de fonctionnalités
              </Text>
            </View>
          </LinearGradient>
        )}

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres</Text>

          <SettingItem
            icon={<Settings size={20} color={COLORS.accent} />}
            title="Paramètres de compte"
            onPress={() => {}}
          />
          <SettingItem
            icon={<Bell size={20} color={COLORS.accent} />}
            title="Notifications"
            onPress={() => {}}
          />
          <SettingItem
            icon={<Shield size={20} color={COLORS.accent} />}
            title="Confidentialité et sécurité"
            onPress={() => {}}
          />
          <SettingItem
            icon={<HelpCircle size={20} color={COLORS.accent} />}
            title="Aide et assistance"
            onPress={() => {}}
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <LogOut size={20} color={COLORS.danger} />
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>

        <Text style={styles.version}>DermAssist AI v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingItem({ icon, title, onPress }) {
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingIconBg}>{icon}</View>
      <Text style={styles.settingTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
  },
  editIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  detailsCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.lightBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F3F7",
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.lightBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.accent,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  premiumCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  premiumContent: {
    flex: 1,
  },
  premiumBadge: {
    marginBottom: 8,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  settingIconBg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.lightBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDark,
    flex: 1,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.danger,
    marginLeft: 10,
  },
  version: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 20,
  },
});
