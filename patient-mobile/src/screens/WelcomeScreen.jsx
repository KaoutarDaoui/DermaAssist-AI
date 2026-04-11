import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Shield,
  Stethoscope,
  Camera,
  ChevronRight,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

const COLORS = {
  accent: "#0F6E56",
  accentDark: "#0A4D3D",
  accentSoft: "#D6EFE8",
  textPrimary: "#10202D",
  textSecondary: "#5D6A74",
  white: "#FFFFFF",
  background: "#EEF4F6",
  border: "#DCE6EB",
};

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#F6FBFA", "#EAF2F4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <View style={styles.decorCircleTop} />
        <View style={styles.decorCircleBottom} />

        <View style={styles.heroCard}>
          <View style={styles.brandPill}>
            <Text style={styles.brandText}>Skin+</Text>
          </View>

          <Text style={styles.title}>Bienvenue</Text>
          <Text style={styles.subtitle}>
            Suivez votre peau avec une experience dermatologique claire, moderne
            et personnalisée.
          </Text>

          <View style={styles.featureList}>
            <FeatureItem
              icon={<Stethoscope size={16} color={COLORS.accent} />}
              text="Consultations intelligentes"
            />
            <FeatureItem
              icon={<Shield size={16} color={COLORS.accent} />}
              text="Recommandations sécurisées"
            />
            <FeatureItem
              icon={<Camera size={16} color={COLORS.accent} />}
              text="Suivi photo simplifié"
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>Se connecter</Text>
            <ChevronRight size={16} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("Register")}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryButtonText}>Créer un compte</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

function FeatureItem({ icon, text }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconBox}>{icon}</View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradientBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  decorCircleTop: {
    position: "absolute",
    top: -70,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(15, 110, 86, 0.09)",
  },
  decorCircleBottom: {
    position: "absolute",
    bottom: -90,
    left: -50,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(15, 110, 86, 0.08)",
  },
  heroCard: {
    width: width * 0.9,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 8,
  },
  brandPill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 14,
  },
  brandText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  featureList: {
    marginBottom: 18,
    gap: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  featureText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    width: "100%",
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FBFC",
  },
  secondaryButtonText: {
    color: COLORS.accentDark,
    fontWeight: "700",
    fontSize: 14,
  },
});

export default WelcomeScreen;
