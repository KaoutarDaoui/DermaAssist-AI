import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Calendar,
  MapPin,
  ChevronLeft,
} from "lucide-react-native";

const COLORS = {
  primary: "#2D4A85",
  secondary: "#7A869A",
  accent: "#4A90E2",
  background: "#F9FBFF",
  white: "#FFFFFF",
  textDark: "#333333",
  textLight: "#8E9AAF",
  success: "#10B981",
  lightBg: "#EBF2FF",
  border: "#E5E7EB",
};

const skinTypes = ["I", "II", "III", "IV", "V", "VI"];
const fitzpatrickColors = ["#F4C4B4", "#E8B8A8", "#D0956E", "#A67C52", "#8B6F47", "#713E38"];

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [skinType, setSkinType] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !dateOfBirth || !skinType || !city) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Erreur", "Email invalide");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      Alert.alert("Succès", "Inscription réussie! Connectez-vous maintenant.");
      navigation.navigate("Login");
    } catch (error) {
      Alert.alert("Erreur", "Échec de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <ChevronLeft size={24} color={COLORS.accent} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Créer un Compte</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Welcome Message */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>
              Rejoignez notre communauté pour un suivi dermatologique optimal
            </Text>
          </View>

          {/* Full Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom Complet</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <User size={18} color={COLORS.accent} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Jean Dupont"
                placeholderTextColor={COLORS.textLight}
                value={fullName}
                onChangeText={setFullName}
                editable={!loading}
              />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <Mail size={18} color={COLORS.accent} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                placeholderTextColor={COLORS.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <Lock size={18} color={COLORS.accent} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Minimum 6 caractères"
                placeholderTextColor={COLORS.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                {showPassword ? (
                  <Eye size={18} color={COLORS.textLight} />
                ) : (
                  <EyeOff size={18} color={COLORS.textLight} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Date of Birth Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date de Naissance</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <Calendar size={18} color={COLORS.accent} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={COLORS.textLight}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                editable={!loading}
              />
            </View>
          </View>

          {/* Skin Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type de Peau (Fitzpatrick)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.skinTypeContainer}
              contentContainerStyle={styles.skinTypeContent}
            >
              {skinTypes.map((type, index) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.skinTypeButton,
                    {
                      borderColor:
                        skinType === type ? COLORS.accent : COLORS.border,
                      borderWidth: skinType === type ? 3 : 1,
                      backgroundColor: fitzpatrickColors[index],
                    },
                  ]}
                  onPress={() => setSkinType(type)}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.skinTypeLabel,
                      skinType === type && styles.skinTypeLabelActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* City Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ville</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <MapPin size={18} color={COLORS.accent} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Paris"
                placeholderTextColor={COLORS.textLight}
                value={city}
                onChangeText={setCity}
                editable={!loading}
              />
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.registerButtonText}>S'inscrire</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginLinkText}>Déjà inscrit?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Login")}
              disabled={loading}
            >
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  welcomeSection: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  inputGroup: {
    marginHorizontal: 20,
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDark,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingRight: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.lightBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textDark,
  },
  eyeIcon: {
    padding: 8,
  },
  skinTypeContainer: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  skinTypeContent: {
    gap: 10,
    paddingRight: 20,
  },
  skinTypeButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  skinTypeLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  skinTypeLabelActive: {
    color: COLORS.white,
    fontWeight: "800",
  },
  registerButton: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  registerButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },
  loginLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  loginLinkText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginRight: 4,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.accent,
  },
});
