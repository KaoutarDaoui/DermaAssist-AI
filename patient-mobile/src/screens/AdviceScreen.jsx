import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { advice } from "../services/api";

const MOCK_DATA = [
  {
    id: 1,
    tips: [
      "Use gentle, fragrance-free cleanser twice daily",
      "Apply moisturizer within 3 minutes of cleansing",
      "Use SPF 30+ every day, even on cloudy days",
      "Avoid hot water - use lukewarm water when washing",
    ],
    products_to_avoid: [
      "Fragranced soaps and body washes",
      "Alcohol-based toners",
      "Exfoliating products more than 2x per week",
      "Heavy occlusive creams if prone to acne",
    ],
  },
  {
    id: 2,
    tips: [
      "Keep skin hydrated with hyaluronic acid serums",
      "Get 7-9 hours of sleep nightly",
      "Manage stress through meditation or yoga",
      "Stay hydrated - drink at least 8 glasses of water daily",
    ],
    products_to_avoid: [
      "Overly stripping cleansers",
      "Products with high concentrations of actives",
      "Skipping moisturizer",
    ],
  },
];

const USE_MOCK_DATA = true; // Set to false to use real API

export default function AdviceScreen() {
  const [adviceList, setAdviceList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdvice();
  }, []);

  const loadAdvice = async () => {
    try {
      if (USE_MOCK_DATA) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setAdviceList(MOCK_DATA);
      } else {
        const response = await advice.getMyAdvice();
        setAdviceList(response.data);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load advice");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Medical Advice</Text>

      {adviceList.length === 0 ? (
        <Text style={styles.emptyText}>
          No advice yet. Please consult your doctor.
        </Text>
      ) : (
        <FlatList
          data={adviceList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.adviceCard}>
              {item.tips && item.tips.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Tips</Text>
                  {item.tips.map((tip, idx) => (
                    <Text key={idx} style={styles.tipText}>
                      • {tip}
                    </Text>
                  ))}
                </View>
              )}

              {item.products_to_avoid && item.products_to_avoid.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Avoid</Text>
                  {item.products_to_avoid.map((product, idx) => (
                    <Text key={idx} style={styles.avoidText}>
                      • {product}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
          scrollEnabled
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1f2937",
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 32,
  },
  adviceCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563eb",
    marginBottom: 8,
  },
  tipText: {
    color: "#4b5563",
    marginBottom: 6,
  },
  avoidText: {
    color: "#dc2626",
    marginBottom: 6,
  },
});
