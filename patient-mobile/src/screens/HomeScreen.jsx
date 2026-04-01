import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Home, MessageSquare, Activity, User, Camera, Video, ChevronRight } from 'lucide-react-native';

const COLORS = {
  primary: "#2D4A85",
  secondary: "#7A869A",
  accent: "#4A90E2",
  background: "#F9FBFF",
  white: "#FFFFFF",
  textDark: "#333333",
  textLight: "#8E9AAF",
  cardShadow: "rgba(0, 0, 0, 0.05)",
};

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Bonjour, Sarah 👋</Text>
            <Text style={styles.subGreeting}>Suivi Dermatologique</Text>
          </View>
          <Image 
            source={{ uri: 'https://randomuser.me/api/portraits/women/44.jpg' }} 
            style={styles.profileImage} 
          />
        </View>

        {/* --- APPOINTMENT CARD --- */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <View style={styles.videoIconContainer}>
              <Video size={20} color={COLORS.accent} fill={COLORS.accent} fillOpacity={0.1} />
            </View>
            <Text style={styles.cardHeaderTitle}>Prochain Rendez-vous</Text>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.doctorInfoRow}>
            <View style={styles.doctorTextContainer}>
              <Text style={styles.consultType}>Consultation à Distance</Text>
              <Text style={styles.doctorName}>Dr. Benali</Text>
              <Text style={styles.appointmentTime}>Lundi 28 Mars • 14:30</Text>
            </View>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
              style={styles.doctorThumb} 
            />
          </View>

          <TouchableOpacity style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>Voir Détails</Text>
            <ChevronRight size={14} color={COLORS.accent} />
          </TouchableOpacity>
        </View>

        {/* --- TREATMENT HISTORY SECTION --- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Historique de Traitement</Text>
          <TouchableOpacity><Text style={styles.viewAllText}>Voir tout ›</Text></TouchableOpacity>
        </View>

        <View style={styles.historyRow}>
          {/* Diagnosis Card */}
          <View style={styles.smallCard}>
            <Text style={styles.smallCardTitle}>Diagnostic</Text>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?q=80&w=200&auto=format&fit=crop' }} 
              style={styles.skinImageMain} 
            />
            <Text style={styles.diagnosisName}>Eczéma</Text>
            <Text style={styles.lastConsult}>Dernière consultation: 12 Mars</Text>
          </View>

          {/* Photos Suivi Card */}
          <View style={styles.smallCard}>
            <Text style={styles.smallCardTitle}>Photos de Suivi</Text>
            <View style={styles.photoGrid}>
              <Image source={{ uri: 'https://picsum.photos/id/100/50' }} style={styles.gridThumb} />
              <Image source={{ uri: 'https://picsum.photos/id/101/50' }} style={styles.gridThumb} />
              <Image source={{ uri: 'https://picsum.photos/id/102/50' }} style={styles.gridThumb} />
            </View>
            <Text style={styles.photoCount}>3 Photos ajoutées</Text>
          </View>
        </View>

        {/* --- PREMIUM BANNER --- */}
        <LinearGradient
          colors={['#4A90E2', '#357ABD']}
          start={{x: 0, y: 0}} end={{x: 1, y: 0}}
          style={styles.premiumBanner}
        >
          <View style={styles.premiumLeft}>
            <Text style={styles.premiumTitle}>Télédermatologie Premium</Text>
            <Text style={styles.premiumSub}>Envoyez une photo à votre médecin</Text>
            <TouchableOpacity style={styles.uploadButton}>
              <Camera size={18} color={COLORS.accent} style={{marginRight: 8}} />
              <Text style={styles.uploadText}>Envoyer une Image</Text>
            </TouchableOpacity>
          </View>
          {/* Background illustration effect */}
          <View style={styles.bottleContainer}>
             <View style={[styles.bottle, {height: 60, width: 25, right: 30, opacity: 0.6}]} />
             <View style={[styles.bottle, {height: 80, width: 30, right: 0}]} />
          </View>
        </LinearGradient>
      </ScrollView>

     
    </SafeAreaView>
  );
}

// Helper component for Tabs
const TabItem = ({ icon, label, active }) => (
  <TouchableOpacity style={styles.tabItem}>
    {icon}
    <Text style={[styles.tabLabel, active && {color: COLORS.accent}]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
  },
  greetingText: { fontSize: 22, fontWeight: "bold", color: COLORS.textDark },
  subGreeting: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  profileImage: { width: 55, height: 55, borderRadius: 27.5, borderWidth: 2, borderColor: '#fff' },
  
  // Appointment Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 30,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  videoIconContainer: { backgroundColor: '#EBF2FF', padding: 10, borderRadius: 12, marginRight: 12 },
  cardHeaderTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textDark },
  divider: { height: 1, backgroundColor: '#F1F3F7', width: '100%', marginBottom: 15 },
  doctorInfoRow: { flexDirection: "row", justifyContent: 'space-between', alignItems: "center" },
  doctorTextContainer: { flex: 1 },
  consultType: { fontSize: 16, fontWeight: "bold", color: COLORS.textDark, marginBottom: 4 },
  doctorName: { fontSize: 14, color: COLORS.secondary, marginBottom: 4 },
  appointmentTime: { fontSize: 13, color: COLORS.textLight },
  doctorThumb: { width: 50, height: 50, borderRadius: 25 },
  detailsButton: { 
    alignSelf: 'flex-end', 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F7F9FC', 
    paddingVertical: 8, 
    paddingHorizontal: 15, 
    borderRadius: 10,
    marginTop: 10
  },
  detailsButtonText: { color: COLORS.accent, fontSize: 13, fontWeight: "bold", marginRight: 5 },

  // History Section
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 17, fontWeight: "bold", color: COLORS.textDark },
  viewAllText: { color: COLORS.accent, fontWeight: "600", fontSize: 13 },
  historyRow: { flexDirection: "row", justifyContent: 'space-between', marginBottom: 25 },
  smallCard: { 
    width: '48%',
    backgroundColor: COLORS.white, 
    borderRadius: 15, 
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  smallCardTitle: { fontSize: 14, fontWeight: "bold", color: COLORS.textDark, marginBottom: 10 },
  skinImageMain: { width: '100%', height: 70, borderRadius: 8, marginBottom: 8 },
  diagnosisName: { fontSize: 13, fontWeight: "bold", color: COLORS.textDark },
  lastConsult: { fontSize: 10, color: COLORS.textLight, marginTop: 2 },
  photoGrid: { flexDirection: "row", justifyContent: 'space-between', marginBottom: 10 },
  gridThumb: { width: 45, height: 45, borderRadius: 6 },
  photoCount: { fontSize: 11, color: COLORS.textLight },

  // Premium Banner
  premiumBanner: { 
    borderRadius: 20, 
    padding: 20, 
    flexDirection: 'row', 
    height: 160,
    overflow: 'hidden'
  },
  premiumLeft: { flex: 2, justifyContent: 'center' },
  premiumTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  premiumSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 15 },
  uploadButton: { 
    backgroundColor: COLORS.white, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 15, 
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  uploadText: { color: COLORS.accent, fontWeight: 'bold', fontSize: 13 },
  bottleContainer: { position: 'absolute', right: 10, bottom: -10, flexDirection: 'row', alignItems: 'flex-end' },
  bottle: { backgroundColor: 'rgba(255,255,255,0.2)', borderTopLeftRadius: 5, borderTopRightRadius: 5 },

  // Bottom Navigation
  tabBar: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: 85, 
    backgroundColor: COLORS.white, 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F7'
  },
  tabItem: { alignItems: 'center' },
  tabLabel: { fontSize: 11, color: COLORS.textLight, marginTop: 5 }
});