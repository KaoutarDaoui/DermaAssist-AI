import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#1565D8',
  textDark: '#334155',
  textGray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  background: '#F1F5F9', 
};

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        {/* Title & Subtitle */}
        <Text style={styles.title}>Bienvenue!</Text>
        <Text style={styles.subtitle}>
          Prenez soin de votre peau avec un suivi dermatologique intelligent et personnalisé.
        </Text>

        {/* Illustration Area - Kept exactly as your last working version */}
        <View style={styles.illustrationContainer}>
          <Image 
            source={{ uri: 'https://img.freepik.com/free-vector/doctor-examining-patient-clinic_23-2148853675.jpg' }} 
            style={styles.illustration}
            onLoad={() => console.log("Image loaded successfully")}
            onError={(e) => console.log("Image failed to load", e.nativeEvent.error)}
          />
        </View>

        {/* Single Action Button - Full Width */}
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryButtonText}>Se Connecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width * 0.88,
    backgroundColor: COLORS.white,
    borderRadius: 28,
    paddingVertical: 45, // Slightly more padding for the single-button layout
    paddingHorizontal: 25,
    alignItems: 'center',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.12,
    shadowRadius: 25,
    elevation: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textGray,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  illustrationContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  illustration: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  primaryButton: {
    width: '100%', // Made full width
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    // Added a small shadow to the button for depth
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default WelcomeScreen;