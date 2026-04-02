import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from "react-native";
import {
  Activity,
  Calendar,
  Smile,
  TrendingUp,
} from "lucide-react-native/icons";

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
};

export default function CheckInScreen() {
  const [score, setScore] = useState("7");
  const [notes, setNotes] = useState("");
  const [history] = useState([
    { date: "Aujourd'hui", score: 7, status: "Bon", color: COLORS.success },
    { date: "Hier", score: 6, status: "Acceptable", color: COLORS.accent },
    {
      date: "Il y a 2 jours",
      score: 8,
      status: "Très bon",
      color: COLORS.success,
    },
    {
      date: "Il y a 3 jours",
      score: 5,
      status: "À surveiller",
      color: "#F59E0B",
    },
  ]);

  const handleSubmit = () => {
    // Handle check-in submission
    console.log("Check-in soumis:", { score, notes });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Suivi Quotidien</Text>
            <Text style={styles.headerSubtitle}>
              Comment vous vous sentez ?
            </Text>
          </View>
          <View style={styles.headerIconBg}>
            <Activity size={28} color={COLORS.accent} />
          </View>
        </View>

        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleBg}>
              <Smile size={20} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>État de votre peau</Text>
              <Text style={styles.cardSubtitle}>
                Évaluez votre bien-être (1-10)
              </Text>
            </View>
          </View>

          <View style={styles.scoreInputSection}>
            <View style={styles.scoreInputBox}>
              <TextInput
                style={styles.scoreInput}
                value={score}
                onChangeText={(val) => {
                  if (
                    val === "" ||
                    (parseInt(val) >= 1 && parseInt(val) <= 10)
                  ) {
                    setScore(val);
                  }
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="7"
                placeholderTextColor={COLORS.textLight}
              />
              <Text style={styles.scoreUnit}>/10</Text>
            </View>

            <View style={styles.starRating}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.star,
                    {
                      backgroundColor:
                        i <= Math.round(score / 2) ? COLORS.accent : "#E5E7EB",
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Notes Section */}
        <Text style={styles.sectionTitle}>Observations Personnelles</Text>
        <View style={styles.notesCard}>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Partagez vos observations sur votre peau..."
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Text style={styles.submitButtonText}>Valider Check-in</Text>
        </TouchableOpacity>

        {/* History Section */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <View style={styles.historyTitleBg}>
              <TrendingUp size={20} color={COLORS.accent} />
            </View>
            <Text style={styles.sectionTitle}>Historique Récent</Text>
          </View>

          {history.map((checkIn, index) => (
            <View key={index} style={styles.historyCard}>
              <View style={styles.historyContent}>
                <View style={styles.historyDateBg}>
                  <Calendar size={16} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDate}>{checkIn.date}</Text>
                  <Text
                    style={[styles.historyStatus, { color: checkIn.color }]}
                  >
                    {checkIn.status}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.scoreDisplayBg,
                  { borderLeftColor: checkIn.color },
                ]}
              >
                <Text style={styles.scoreDisplayNumber}>{checkIn.score}</Text>
                <Text style={styles.scoreDisplayUnit}>/10</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  headerIconBg: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.lightBg,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitleBg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.lightBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  scoreInputSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scoreInputBox: {
    flex: 0.4,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lightBg,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  scoreInput: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.accent,
    paddingVertical: 12,
    flex: 1,
  },
  scoreUnit: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  starRating: {
    flexDirection: "row",
    gap: 6,
    flex: 0.6,
  },
  star: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  notesCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  notesInput: {
    fontSize: 14,
    color: COLORS.textDark,
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitButton: {
    marginHorizontal: 20,
    marginBottom: 28,
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
  submitButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },
  historySection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  historyTitleBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.lightBg,
    justifyContent: "center",
    alignItems: "center",
  },
  historyCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  historyContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  historyDateBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.lightBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDark,
    marginBottom: 2,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  scoreDisplayBg: {
    borderLeftWidth: 4,
    paddingLeft: 10,
  },
  scoreDisplayNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.accent,
  },
  scoreDisplayUnit: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
});
