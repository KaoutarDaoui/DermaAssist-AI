import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
} from "react-native";
import {
  ChevronLeft,
  Calendar,
  Stethoscope,
  CheckCircle,
  Clock,
  ImageIcon,
  ChevronRight,
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
  warning: "#F59E0B",
  border: "#E5E7EB",
};

const statusColors = {
  "Conseils envoyés": { bgColor: "#D1FAE5", textColor: COLORS.success, icon: CheckCircle },
  "Diagnostic posé": { bgColor: "#DBEAFE", textColor: COLORS.accent, icon: CheckCircle },
  "Suivi en cours": { bgColor: "#FEF3C7", textColor: COLORS.warning, icon: Clock },
};

export default function ConsultationHistoryScreen({ navigation }) {
  const [consultations] = useState([
    {
      id: 1,
      date: "28 Mars 2026",
      doctorName: "Dr. Benali",
      specialty: "Dermatologie",
      treatment: "Consultation à Distance",
      notes: "Traitement prescrit pour Eczéma",
      status: "Conseils envoyés",
      photos: 3,
    },
    {
      id: 2,
      date: "12 Mars 2026",
      doctorName: "Dr. Benali",
      specialty: "Dermatologie",
      treatment: "Diagnostic Initial",
      notes: "Eczéma identifié, plan de traitement en cours",
      status: "Diagnostic posé",
      photos: 5,
    },
    {
      id: 3,
      date: "28 Février 2026",
      doctorName: "Dr. Benali",
      specialty: "Dermatologie",
      treatment: "Follow-up",
      notes: "Évolution positive du traitement",
      status: "Suivi en cours",
      photos: 2,
    },
  ]);

  const renderConsultationCard = ({ item }) => {
    const statusInfo = statusColors[item.status] || statusColors["Suivi en cours"];

    return (
      <TouchableOpacity style={styles.consultationCard} activeOpacity={0.85}>
        {/* Header with Date and Status */}
        <View style={styles.cardHeader}>
          <View style={styles.dateSection}>
            <View style={styles.dateIcon}>
              <Calendar size={16} color={COLORS.accent} />
            </View>
            <Text style={styles.date}>{item.date}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Text style={[styles.statusText, { color: statusInfo.textColor }]}>
              {item.status}
            </Text>
          </View>
        </View>

        {/* Treatment Title */}
        <Text style={styles.treatmentTitle}>{item.treatment}</Text>

        {/* Doctor Info */}
        <View style={styles.doctorSection}>
          <View style={styles.doctorIconBg}>
            <Stethoscope size={18} color={COLORS.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.doctorName}>{item.doctorName}</Text>
            <Text style={styles.specialty}>{item.specialty}</Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.notes}>{item.notes}</Text>
        </View>

        {/* Photo Count */}
        <View style={styles.photoSection}>
          <View style={styles.photoIconBg}>
            <ImageIcon size={14} color={COLORS.accent} />
          </View>
          <Text style={styles.photoCount}>{item.photos} photos</Text>
        </View>

        {/* View Details Link */}
        <View style={styles.detailsLink}>
          <Text style={styles.detailsText}>Voir tous les détails</Text>
          <ChevronRight size={16} color={COLORS.accent} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consultations</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Consultation List */}
      <FlatList
        data={consultations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderConsultationCard}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.white,
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
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  consultationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.lightBg,
    justifyContent: "center",
    alignItems: "center",
  },
  date: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  treatmentTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 12,
  },
  doctorSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 12,
  },
  doctorIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.lightBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  specialty: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  notesSection: {
    marginBottom: 12,
  },
  notes: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 18,
  },
  photoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  photoIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.lightBg,
    justifyContent: "center",
    alignItems: "center",
  },
  photoCount: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  detailsLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
  },
  detailsText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.accent,
  },
});
