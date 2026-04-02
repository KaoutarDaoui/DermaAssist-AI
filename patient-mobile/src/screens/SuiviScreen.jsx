import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Bell, 
  ChevronDown, 
  ChevronUp,
  Info
} from "lucide-react-native";
import { LineChart } from "react-native-chart-kit";
import { colors, typography, spacing, borderRadius, shadows } from "../constants/theme";
import { skinComparison } from "../services/api";
import authService from "../services/authService";
import patientDataService from "../services/patientDataService";

const { width } = Dimensions.get("window");

export default function SuiviScreen({ navigation }) {
  const [progression, setProgression] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedImages, setExpandedImages] = useState(false);
  const [patientId, setPatientId] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const profile = await patientDataService.getPatientProfile();
      setPatientId(profile.id);
      await fetchData(profile.id);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (id) => {
    try {
      const [progRes, imgRes] = await Promise.all([
        skinComparison.getProgression(id),
        skinComparison.getImages(id),
      ]);
      setProgression(progRes.data || []);
      setImages(imgRes.data || []);
    } catch (error) {
      console.error("Error fetching suivi data:", error);
    }
  };

  const onRefresh = async () => {
    if (!patientId) return;
    setRefreshing(true);
    await fetchData(patientId);
    setRefreshing(false);
  };

  const getTrendIcon = () => {
    if (progression.length < 2) return <Minus size={16} color={colors.gray} />;
    const first = progression[0].score_pct;
    const last = progression[progression.length - 1].score_pct;
    const delta = last - first;
    
    if (delta > 3) return <TrendingUp size={16} color={colors.danger} />;
    if (delta < -3) return <TrendingDown size={16} color={colors.success} />;
    return <Minus size={16} color={colors.gray} />;
  };

  const getEvolutionText = () => {
    if (progression.length < 2) return "Stable";
    const first = progression[0].score_pct;
    const last = progression[progression.length - 1].score_pct;
    const delta = last - first;
    
    if (delta > 3) return `+${delta.toFixed(1)}%`;
    if (delta < -3) return `${delta.toFixed(1)}%`;
    return "Stable";
  };

  const chartData = {
    labels: progression.slice(-6).map(p => {
      const d = new Date(p.date);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    }),
    datasets: [
      {
        data: progression.slice(-6).map(p => p.score_pct),
        color: (opacity = 1) => `rgba(15, 110, 86, ${opacity})`,
        strokeWidth: 3
      }
    ]
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Suivre mon état</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.bellBtn}>
              <Bell size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileBtn}
              onPress={() => navigation.navigate("Profile")}
            >
              <User size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.subtitle}>Évolution de votre santé cutanée</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Summary */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>État actuel</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>
                {progression.length > 0 ? `${progression[progression.length-1].score_pct.toFixed(1)}%` : "--"}
              </Text>
              <View style={[styles.trendBadge, { backgroundColor: colors.bgStable }]}>
                {getTrendIcon()}
              </View>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Évolution</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{getEvolutionText()}</Text>
          </View>
        </View>

        {/* Chart Section */}
        <View style={styles.chartSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Progression de la sévérité</Text>
            <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Info size={16} color={colors.gray} />
            </TouchableOpacity>
          </View>
          
          {progression.length >= 2 ? (
            <LineChart
              data={chartData}
              width={width - 32}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(15, 110, 86, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: colors.primary
                }
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>Pas assez de données pour le graphique</Text>
              <Text style={styles.emptySubtext}>Prenez au moins 2 photos pour voir l'évolution</Text>
            </View>
          )}
        </View>

        {/* Photos History (Collapsible Concept) */}
        <View style={styles.photosSection}>
          <TouchableOpacity 
            style={styles.collapsibleHeader}
            onPress={() => setExpandedImages(!expandedImages)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Historique des photos</Text>
              <Text style={styles.photoCount}>({images.length})</Text>
            </View>
            {expandedImages ? <ChevronUp size={20} color={colors.gray} /> : <ChevronDown size={20} color={colors.gray} />}
          </TouchableOpacity>

          {expandedImages && (
            <View style={styles.imagesGrid}>
              {images.length > 0 ? images.map((img, idx) => (
                <View key={img.id || idx} style={styles.imageWrapper}>
                  <View style={styles.imageCard}>
                    {/* Note: In a real app, img.image_data would be a URL or base64 */}
                    {/* We'll use a placeholder if needed, but assuming backend provides it */}
                    <Image 
                      source={{ uri: img.image_data || "https://via.placeholder.com/150" }} 
                      style={styles.skinImage} 
                    />
                    <View style={styles.imageInfo}>
                      <Text style={styles.imageDate}>
                        {new Date(img.uploaded_at).toLocaleDateString("fr-FR")}
                      </Text>
                      {img.cnn_label && (
                        <View style={styles.labelBadge}>
                          <Text style={styles.labelText}>{img.cnn_label}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )) : (
                <Text style={styles.emptyText}>Aucune photo enregistrée</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: spacing.xl,
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
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${colors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${colors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    padding: spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  statLabel: {
    ...typography.smallBold,
    color: colors.gray,
    marginBottom: spacing.xs,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statValue: {
    ...typography.h3,
    color: colors.dark,
  },
  trendBadge: {
    padding: 4,
    borderRadius: 8,
  },
  chartSection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.dark,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  emptyChart: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.listItemBg,
    borderRadius: 16,
  },
  emptyText: {
    ...typography.bodyBold,
    color: colors.gray,
  },
  emptySubtext: {
    ...typography.small,
    color: colors.lightGray,
    marginTop: 4,
  },
  photosSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    ...shadows.small,
    overflow: "hidden",
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  photoCount: {
    ...typography.small,
    color: colors.gray,
    marginLeft: 4,
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing.md,
    gap: spacing.md,
  },
  imageWrapper: {
    width: (width - 64) / 2,
  },
  imageCard: {
    backgroundColor: colors.listItemBg,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  skinImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  imageInfo: {
    padding: spacing.sm,
  },
  imageDate: {
    ...typography.smallBold,
    fontSize: 10,
    color: colors.dark,
  },
  labelBadge: {
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  labelText: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.primary,
  }
});
