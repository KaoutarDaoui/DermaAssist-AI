import React from "react";
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ChevronLeft,
  CircleQuestionMark,
  Mail,
  Phone,
  Shield,
} from "lucide-react-native/icons";

const COLORS = {
  background: "#F2F6F7",
  surface: "#FFFFFF",
  textPrimary: "#14222F",
  textSecondary: "#5E6B76",
  textMuted: "#8D99A4",
  accent: "#0F6E56",
  accentSoft: "#D5EFEA",
  border: "#E2E8EC",
};

const SUPPORT_EMAIL = "support@skinplus.app";
const SUPPORT_PHONE = "+213 555 12 34 56";

export default function HelpSupportScreen({ navigation }) {
  const openEmail = async () => {
    const emailUrl = `mailto:${SUPPORT_EMAIL}`;

    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (!canOpen) {
        Alert.alert("Information", "Impossible d'ouvrir l'application email.");
        return;
      }

      await Linking.openURL(emailUrl);
    } catch (error) {
      Alert.alert("Information", "Impossible d'ouvrir l'application email.");
    }
  };

  const openPhone = async () => {
    const telUrl = `tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`;

    try {
      const canOpen = await Linking.canOpenURL(telUrl);
      if (!canOpen) {
        Alert.alert(
          "Information",
          "Impossible de lancer un appel depuis cet appareil.",
        );
        return;
      }

      await Linking.openURL(telUrl);
    } catch (error) {
      Alert.alert(
        "Information",
        "Impossible de lancer un appel depuis cet appareil.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft size={22} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aide et assistance</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <CircleQuestionMark size={20} color={COLORS.accent} />
          </View>
          <Text style={styles.heroTitle}>Besoin d'aide ?</Text>
          <Text style={styles.heroText}>
            Cette section vous donne les informations essentielles pour utiliser
            l'application et contacter l'equipe support.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Questions frequentes</Text>
          <Text style={styles.listItem}>
            - Comment ajouter une photo ? Ouvrez Comparaison puis appuyez sur
            Ajouter.
          </Text>
          <Text style={styles.listItem}>
            - Comment consulter mes analyses ? Ouvrez l'onglet Consultations.
          </Text>
          <Text style={styles.listItem}>
            - Donnees du profil ? Rendez-vous dans Profil pour voir et gerer vos
            informations.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contacter l'assistance</Text>

          <TouchableOpacity style={styles.actionRow} onPress={openEmail}>
            <View style={styles.actionIconWrap}>
              <Mail size={16} color={COLORS.accent} />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionLabel}>Email support</Text>
              <Text style={styles.actionValue}>{SUPPORT_EMAIL}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={openPhone}>
            <View style={styles.actionIconWrap}>
              <Phone size={16} color={COLORS.accent} />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionLabel}>Telephone</Text>
              <Text style={styles.actionValue}>{SUPPORT_PHONE}</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.supportHours}>
            Disponibilite support: du lundi au vendredi, 08:30 - 17:00.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.securityHeader}>
            <Shield size={16} color={COLORS.accent} />
            <Text style={styles.cardTitle}>Confidentialite</Text>
          </View>
          <Text style={styles.securityText}>
            Vos informations personnelles et medicales sont traitees de maniere
            confidentielle et accessibles uniquement aux personnes autorisees.
          </Text>
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
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 24,
    gap: 12,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  heroIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },
  heroText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  listItem: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  actionBody: {
    flex: 1,
  },
  actionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  actionValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 1,
  },
  supportHours: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  securityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  securityText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
});
