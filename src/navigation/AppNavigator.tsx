import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform, Text } from 'react-native';

// Pantallas de las solapas inferiores
import { S02_StockHomeScreen } from '../screens/S02_StockHomeScreen';
// NUEVO: Se importa la pantalla S11_MetricasScreen para la segunda solapa principal
import { S11_MetricasScreen } from '../screens/S11_MetricasScreen';

// Tipados y navegadores anidados
import { MainTabParamList, RootStackParamList } from '../types/navigation';
// Importamos el navegador real del módulo de Compras
import ComprasNavigator from './ComprasNavigator';
import FiadosNavigator from './FiadosNavigator';
import StockNavigator from './StockNavigator';
// Importamos el navegador real del módulo de Ventas
import VentasNavigator from './VentasNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// NUEVO: Configuración de la Tab Bar simplificada a 2 pestañas (Inicio y Métricas), con íconos reducidos y proporcionales
function TabNavigator() {
  return (
    <Tab.Navigator 
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 82 : 68,
          paddingBottom: Platform.OS === 'ios' ? 26 : 14,
          paddingTop: 8,
          elevation: 6,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 5,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '600',
          marginTop: 1,
        },
        tabBarIconStyle: {
          height: 14,
          marginBottom: -2,
        },
      }}
    >
      {/* Pestaña 1: Inicio */}
      <Tab.Screen 
        name="S02_Inicio" 
        component={S02_StockHomeScreen} 
        options={{ 
          title: 'Inicio',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 11, textAlign: 'center' }}>⏷</Text>
          ),
        }} 
      />
      {/* NUEVO: Pestaña 2: Métricas y Control de Caja */}
      <Tab.Screen 
        name="S11_Metricas" 
        component={S11_MetricasScreen} 
        options={{ 
          title: 'Métricas',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 11, textAlign: 'center' }}>⏷</Text>
          ),
        }} 
      />
    </Tab.Navigator>
  );
}

// Configuración de la navegación principal de la App
export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="StockFlow" component={StockNavigator} />
      {/* Reemplazamos VentasPlaceholder por VentasNavigator */}
      <Stack.Screen 
        name="VentasFlow" 
        component={VentasNavigator} 
      />
      <Stack.Screen 
        name="FiadosFlow" 
        component={FiadosNavigator} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="ComprasFlow" 
        component={ComprasNavigator} 
        options={{ headerShown: false }} 
      />
    </Stack.Navigator>
  );
}
