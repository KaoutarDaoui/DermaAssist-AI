import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Bell, ChevronRight, User } from "lucide-react-native";
import { colors, typography, spacing, borderRadius } from "../constants/theme";
import patientDataService from "../services/patientDataService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const ConsultationsScreen = ({ navigation }) => {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConsultations = async () => {
    try {
      const data = await patientDataService.getConsultations();
      setConsultations(data || []);
    } catch (error) {
      console.error("Erreur lors de la récupération des consultations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConsultations();
  };

  const getStatusColor = (status) => {
    if (!status) return colors.gray;
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'completed' || lowerStatus === 'terminée') return colors.success;
    if (lowerStatus === 'scheduled' || lowerStatus === 'planifiée') return colors.primary;
    if (lowerStatus === 'cancelled' || lowerStatus === 'annulée') return colors.danger;
    return colors.warning;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate("ConsultationDetail", { consultation: item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.dateText}>
          {item.date ? format(new Date(item.date), "dd MMMM yyyy 'à' HH:mm", { locale: fr }) : "Date inconnue"}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status || "Inconnu"}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.doctorName}>Dr. {item.doctor?.full_name || "Non assigné"}</Text>
        {item.notes ? (
          <Text style={styles.notesText} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.detailLink}>Voir les détails</Text>
        <ChevronRight size={14} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Mes consultations</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
              <Bell size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Profile")}
            >
              <User size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.subtitle}>Historique de vos rendez-vous</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={consultations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune consultation trouvée.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.primary,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${colors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
  },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${colors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  dateText: {
    ...typography.bodyBold,
    color: colors.dark,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  cardBody: {
    marginTop: spacing.xs,
  },
  doctorName: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  notesText: {
    ...typography.body,
    fontSize: 13,
    color: colors.gray,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailLink: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    ...typography.body,
    color: colors.gray,
  },
});

export default ConsultationsScreen;
