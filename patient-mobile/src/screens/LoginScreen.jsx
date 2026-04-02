import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Mail, Shield, ChevronLeft } from "lucide-react-native/icons";
import authService from '../services/authService';

const { width } = Dimensions.get('window');

const COLORS = {
  accent: '#0F6E56',
  accentDark: '#0A4D3D',
  accentSoft: '#D6EFE8',
  textPrimary: '#14222F',
  textSecondary: '#5E6B76',
  textMuted: '#8D99A4',
  border: '#DCE6EB',
  white: '#FFFFFF',
  background: '#EEF4F6',
  danger: '#E65B5B',
};

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      const result = await authService.login(username, password);
      
      if (result && result.access_token) {
        navigation.replace("MainApp");
      } else {
        Alert.alert("Erreur", "Echec de la connexion");
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert("Erreur", error.message || "Echec de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <LinearGradient
          colors={["#F6FBFA", "#EAF2F4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.decorCircleTop} />
          <View style={styles.decorCircleBottom} />

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <ChevronLeft size={18} color={COLORS.accent} />
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>

            <View style={styles.brandPill}>
              <Text style={styles.brandPillText}>Skin+</Text>
            </View>

            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>Accédez a votre espace patient sécurisé.</Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputRow}>
                <View style={styles.inputIconBox}>
                  <Mail size={16} color={COLORS.accent} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email ou nom d'utilisateur"
                  placeholderTextColor={COLORS.textMuted}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputIconBox}>
                  <Shield size={16} color={COLORS.accent} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Mot de passe"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.forgotPass} activeOpacity={0.8}>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.loginButton, loading && { opacity: 0.7 }]} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => navigation.navigate("Register")}
              activeOpacity={0.9}
            >
              <Text style={styles.registerButtonText}>Créer un compte</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
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
  },
  gradientBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  decorCircleTop: {
    position: 'absolute',
    top: -70,
    right: -35,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(15, 110, 86, 0.09)',
  },
  decorCircleBottom: {
    position: 'absolute',
    bottom: -90,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(15, 110, 86, 0.08)',
  },
  card: {
    width: width * 0.9,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 22,
    paddingHorizontal: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F3F8F9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    gap: 4,
  },
  backButtonText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  brandPill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  brandPillText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 18,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 14,
    gap: 10,
  },
  inputRow: {
    width: '100%',
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FBFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  inputIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 18,
  },
  forgotText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    width: '100%',
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 10,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  registerButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FBFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: COLORS.accentDark,
    fontSize: 14,
    fontWeight: '700',
  },
  registerText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  errorInline: {
    color: COLORS.danger,
    fontSize: 12,
    marginBottom: 8,
  },
  socialSection: {
    display: 'none',
  },
  divider: {
    display: 'none',
    backgroundColor: COLORS.border,
  },
  socialText: {
    display: 'none',
  },
  registerSection: {
    display: 'none',
  },
  registerLink: {
    display: 'none',
  },
});