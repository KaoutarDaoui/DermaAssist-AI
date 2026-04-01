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
  Image,
  SafeAreaView,
  ActivityIndicator
} from "react-native";
import authService from '../services/authService';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#1565D8',
  textDark: '#2D3748',
  textGray: '#718096',
  border: '#E2E8F0',
  white: '#FFFFFF',
  background: '#F0F4F8',
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
        // Navigation will be replaced by the app's auth state management
        // The app should check for stored token on startup
        navigation.replace("MainApp");
      } else {
        Alert.alert("Erreur", "Login failed");
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert("Erreur", error.message || "Échec de la connexion");
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
        <View style={styles.card}>
          <Text style={styles.title}>Connexion</Text>

          {/* Doctor Visual */}
          <View style={styles.visualContainer}>
            <Image 
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2785/2785482.png' }}
              style={styles.visualImage}
              resizeMode="contain"
            />
          </View>

          {/* Input Fields */}
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.input} 
              placeholder="Nom d'utilisateur" 
              placeholderTextColor={COLORS.textGray}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!loading}
            />
            <TextInput 
              style={styles.input} 
              placeholder="Mot de passe" 
              placeholderTextColor={COLORS.textGray}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotPass}>
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity 
            style={[styles.loginButton, loading && { opacity: 0.7 }]} 
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Se Connecter</Text>
            )}
          </TouchableOpacity>

          

      
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  card: {
    width: width * 0.88,
    backgroundColor: COLORS.white,
    borderRadius: 28,
    paddingVertical: 40,
    paddingHorizontal: 25,
    alignItems: 'center',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.12,
    shadowRadius: 25,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 24,
  },
  visualContainer: {
    width: 120,
    height: 120,
    marginBottom: 24,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visualImage: {
    width: 100,
    height: 100,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    color: COLORS.textDark,
    backgroundColor: COLORS.background,
  },
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  socialSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  socialText: {
    marginHorizontal: 12,
    color: COLORS.textGray,
    fontSize: 12,
    fontWeight: '500',
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerText: {
    color: COLORS.textGray,
    fontSize: 14,
  },
  registerLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});