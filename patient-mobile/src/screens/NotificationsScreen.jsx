import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Bell,
  ChevronLeft,
  CircleCheck as CheckCircle,
  MessageSquare,
  TriangleAlert as AlertTriangle,
} from "lucide-react-native";

const COLORS = {
  background: "#F2F6F7",
  surface: "#FFFFFF",
  textPrimary: "#14222F",
  textSecondary: "#5E6B76",
  textMuted: "#8D99A4",
  accent: "#0F6E56",
  accentSoft: "#D5EFEA",
  border: "#E2E8EC",
  warning: "#D97706",
  warningSoft: "#FEEFD8",
  info: "#3B82F6",
  infoSoft: "#DDEBFF",
};

const INITIAL_NOTIFICATIONS = [
  {
    id: "n1",
    title: "Rappel traitement",
    message: "Appliquez votre creme ce soir avant 22:00.",
    time: "Il y a 10 min",
    type: "reminder",
    isRead: false,
  },
  {
    id: "n2",
    title: "Nouvelle recommandation",
    message: "Le medecin vous conseille de limiter l'exposition au soleil.",
    time: "Aujourd'hui, 09:20",
    type: "medical",
    isRead: false,
  },
  {
    id: "n3",
    title: "Message recu",
    message: "Un nouveau message est disponible dans votre suivi.",
    time: "Hier, 18:05",
    type: "message",
    isRead: true,
  },
  {
    id: "n4",
    title: "Synchronisation terminee",
    message: "Vos dernieres donnees ont ete synchronisees avec succes.",
    time: "Hier, 08:43",
    type: "system",
    isRead: true,
  },
];

const getTypeConfig = (type) => {
  if (type === "medical") {
    return {
      Icon: AlertTriangle,
      iconColor: COLORS.warning,
      iconBg: COLORS.warningSoft,
    };
  }

  if (type === "message") {
    return {
      Icon: MessageSquare,
      iconColor: COLORS.info,
      iconBg: COLORS.infoSoft,
    };
  }

  if (type === "system") {
    return {
      Icon: CheckCircle,
      iconColor: COLORS.accent,
      iconBg: COLORS.accentSoft,
    };
  }

  return {
    Icon: Bell,
    iconColor: COLORS.accent,
    iconBg: COLORS.accentSoft,
  };
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.isRead).length;
  }, [notifications]);

  const markAllAsRead = () => {
    setNotifications((previous) =>
      previous.map((item) => ({ ...item, isRead: true })),
    );
  };

  const handleOpenNotification = (notificationId) => {
    setNotifications((previous) =>
      previous.map((item) => {
        if (item.id !== notificationId) {
          return item;
        }

        return { ...item, isRead: true };
      }),
    );
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.readAllButton} onPress={markAllAsRead}>
          <Text style={styles.readAllButtonText}>Tout lire</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconWrap}>
            <Bell size={18} color={COLORS.accent} />
          </View>
          <View style={styles.summaryBody}>
            <Text style={styles.summaryTitle}>Centre de notifications</Text>
            <Text style={styles.summaryText}>
              {unreadCount > 0
                ? `${unreadCount} notification(s) non lue(s)`
                : "Vous etes a jour"}
            </Text>
          </View>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyText}>
              Les nouvelles alertes apparaitront ici.
            </Text>
          </View>
        ) : (
          notifications.map((item) => {
            const typeConfig = getTypeConfig(item.type);
            const Icon = typeConfig.Icon;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.notificationCard,
                  !item.isRead && styles.notificationCardUnread,
                ]}
                activeOpacity={0.9}
                onPress={() => handleOpenNotification(item.id)}
              >
                <View
                  style={[
                    styles.notificationIconWrap,
                    { backgroundColor: typeConfig.iconBg },
                  ]}
                >
                  <Icon size={16} color={typeConfig.iconColor} />
                </View>

                <View style={styles.notificationBody}>
                  <View style={styles.notificationTitleRow}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    {!item.isRead ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <Text style={styles.notificationMessage}>{item.message}</Text>
                  <Text style={styles.notificationTime}>{item.time}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
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
  readAllButton: {
    minWidth: 64,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#B9DCD6",
    backgroundColor: "#EAF6F3",
    justifyContent: "center",
    alignItems: "center",
  },
  readAllButtonText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 10,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryBody: {
    flex: 1,
  },
  summaryTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  summaryText: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: "center",
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  notificationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  notificationCardUnread: {
    borderColor: "#9FD3C8",
    backgroundColor: "#F4FBF9",
  },
  notificationIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBody: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  notificationMessage: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  notificationTime: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
});
