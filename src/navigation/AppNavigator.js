import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";

import AdminLoginScreen from "../screens/AdminLoginScreen";
import AdminOnboardingScreen from "../screens/AdminOnboardingScreen";
import AdminProfileScreen from "../screens/AdminProfileScreen";
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import UserDataEntryScreen from "../screens/UserDataEntryScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// The data-entry form is reachable WITHOUT login (congregants fill it in
// themselves on a shared/kiosk device); everything else requires an
// authenticated admin session.
function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{ title: "Dashboard & Members" }}
      />
      <Tab.Screen
        name="DataEntryAdmin"
        component={UserDataEntryScreen}
        options={{ title: "New / Edit Entry" }}
      />
      <Tab.Screen
        name="Onboarding"
        component={AdminOnboardingScreen}
        options={{ title: "Onboard Admin" }}
      />
      <Tab.Screen
        name="Profile"
        component={AdminProfileScreen}
        options={{ title: "Admin Profile" }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { admin, loading } = useAuth();

  if (loading) return null; // could render a splash screen here

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {admin ? (
          <Stack.Screen name="AdminTabs" component={AdminTabs} />
        ) : (
          <>
            <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
            {/* Public route: congregants can reach the form without logging in */}
            <Stack.Screen
              name="PublicDataEntry"
              component={UserDataEntryScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
