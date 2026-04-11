import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  AppRegistry,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  House as Home,
  BookOpen,
  FileText,
  GitCompare,
  User,
} from "lucide-react-native";

// Import screens
import WelcomeScreen from "./src/screens/WelcomeScreen";
import HomeScreen from "./src/screens/HomeScreen";
import TreatmentScreen from "./src/screens/TreatmentScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ConsultationHistoryScreen from "./src/screens/ConsultationHistoryScreen";
import ConsultationDetailsScreen from "./src/screens/ConsultationDetailsScreen";
import PhotoUploadScreen from "./src/screens/PhotoUploadScreen";
import ComparisonScreen from "./src/screens/ComparisonScreen";
import HelpSupportScreen from "./src/screens/HelpSupportScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";

// Import colors
import { colors } from "./src/constants/theme";

// Create navigators at module level
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const ICON_COLOR = "#4A90E2";
const INACTIVE_COLOR = "#8E9AAF";

class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Comparison screen crash:", error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
            backgroundColor: "#F9FBFF",
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#1F2A33",
              textAlign: "center",
            }}
          >
            Erreur d'affichage de la comparaison
          </Text>
          <Text
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "#6B7280",
              textAlign: "center",
            }}
          >
            Veuillez recharger cet ecran.
          </Text>
          <TouchableOpacity
            onPress={this.handleRetry}
            style={{
              marginTop: 14,
              backgroundColor: "#0F6E56",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
              Recharger
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const ComparisonScreenSafe = (props) => (
  <ScreenErrorBoundary>
    <ComparisonScreen {...props} />
  </ScreenErrorBoundary>
);

// Tab Navigator with all app screens
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let icon;
          if (route.name === "Home") {
            return (
              <Home size={24} color={focused ? ICON_COLOR : INACTIVE_COLOR} />
            );
          } else if (route.name === "Treatment") {
            return (
              <BookOpen
                size={24}
                color={focused ? ICON_COLOR : INACTIVE_COLOR}
              />
            );
          } else if (route.name === "Consultations") {
            return (
              <FileText
                size={24}
                color={focused ? ICON_COLOR : INACTIVE_COLOR}
              />
            );
          } else if (route.name === "Comparison") {
            return (
              <GitCompare
                size={24}
                color={focused ? ICON_COLOR : INACTIVE_COLOR}
              />
            );
          } else if (route.name === "Profile") {
            return (
              <User size={24} color={focused ? ICON_COLOR : INACTIVE_COLOR} />
            );
          }
        },
        tabBarLabel: ({ focused }) => {
          let label;
          if (route.name === "Home") {
            label = "Accueil";
          } else if (route.name === "Treatment") {
            label = "Traitement";
          } else if (route.name === "Consultations") {
            label = "Consultations";
          } else if (route.name === "Comparison") {
            label = "Comparaison";
          } else if (route.name === "Profile") {
            label = "Profil";
          }
          return (
            <Text
              style={{
                fontSize: 11,
                color: focused ? ICON_COLOR : INACTIVE_COLOR,
                marginTop: 3,
                fontWeight: "500",
              }}
            >
              {label}
            </Text>
          );
        },
        tabBarActiveTintColor: ICON_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#F1F3F7",
          paddingBottom: 8,
          paddingTop: 8,
          height: 85,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Accueil" }}
      />
      <Tab.Screen
        name="Treatment"
        component={TreatmentScreen}
        options={{ title: "Traitement" }}
      />
      <Tab.Screen
        name="Consultations"
        component={ConsultationHistoryScreen}
        options={{ title: "Consultations" }}
      />
      <Tab.Screen
        name="Comparison"
        component={ComparisonScreenSafe}
        options={{ title: "Comparaison" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profil" }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigation
const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: "#F9FBFF" },
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen
        name="MainApp"
        component={TabNavigator}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen
        name="ConsultationHistory"
        component={ConsultationHistoryScreen}
      />
      <Stack.Screen
        name="ConsultationDetails"
        component={ConsultationDetailsScreen}
      />
      <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
};

const App = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F9FBFF",
        }}
      >
        <Image
          source={require("./assets/logo/green_logoSkin.png")}
          style={{ width: 130, height: 130, marginBottom: 18 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={ICON_COLOR} />
        <Text style={{ marginTop: 16, color: "#8E9AAF" }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
};

AppRegistry.registerComponent("main", () => App);
export default App;
