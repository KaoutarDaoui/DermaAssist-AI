import React, { useEffect, useState } from "react";
import { View, Text, AppRegistry, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, BookOpen, Activity, User } from 'lucide-react-native';

// Import screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import SuiviScreen from "./src/screens/SuiviScreen";
import ConsultationsScreen from "./src/screens/ConsultationsScreen";
import AnalyseScreen from "./src/screens/AnalyseScreen";
import ConsultationDetailScreen from "./src/screens/ConsultationDetailScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

// Import colors
import { colors } from "./src/constants/theme";

// Create navigators at module level
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const ICON_COLOR = colors.primary;
const INACTIVE_COLOR = "#8E9AAF";

// Tab Navigator with all app screens
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let icon;
          if (route.name === "Suivi") {
            return <Activity size={24} color={focused ? ICON_COLOR : INACTIVE_COLOR} />;
          } else if (route.name === "Consultations") {
            return <BookOpen size={24} color={focused ? ICON_COLOR : INACTIVE_COLOR} />;
          } else if (route.name === "Analyse") {
            return <Activity size={24} color={focused ? ICON_COLOR : INACTIVE_COLOR} />;
          }
        },
        tabBarLabel: ({ focused }) => {
          let label;
          if (route.name === "Suivi") {
            label = "Suivre mon état";
          } else if (route.name === "Consultations") {
            label = "Mes consultations";
          } else if (route.name === "Analyse") {
            label = "Évaluer mon état";
          }
          return <Text style={{ fontSize: 11, color: focused ? ICON_COLOR : INACTIVE_COLOR, marginTop: 3, fontWeight: "500" }}>{label}</Text>;
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
        name="Suivi" 
        component={SuiviScreen} 
        options={{ title: "Suivre mon état" }}
      />
      <Tab.Screen 
        name="Consultations" 
        component={ConsultationsScreen} 
        options={{ title: "Mes consultations" }}
      />
      <Tab.Screen 
        name="Analyse" 
        component={AnalyseScreen} 
        options={{ title: "Évaluer mon état" }}
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
        name="ConsultationDetail" 
        component={ConsultationDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F9FBFF" }}>
        <Text style={{ fontSize: 40, marginBottom: 24 }}>🏥</Text>
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
