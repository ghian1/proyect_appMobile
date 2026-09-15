import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import S02_StockHomeScreen from '../screens/S02_StockHomeScreen';
import {S03_ProductDetailScreen} from '../screens/S03_ProductDetailScreen';
import {S04_ReponerScreen} from '../screens/S04_ReponerScreen';
import {S05_AltaEditarScreen} from '../screens/S05_AltaEditarScreen';
import {S06_PerfilScreen} from '../screens/S06_PerfilScreen';
import {S07_StockListScreen} from '../screens/S07_StockListScreen';

import { MainTabParamList, RootStackParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Solapas Inferiores
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#F2F4F7' },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tab.Screen 
        name="S02_Inicio" 
        component={S02_StockHomeScreen} 
        options={{ title: 'Inicio' }} 
      />
      <Tab.Screen 
        name="S04_Reponer" 
        component={S04_ReponerScreen} 
        options={{ title: 'Para Reponer' }} 
      />
      <Tab.Screen 
        name="S06_Perfil" 
        component={S06_PerfilScreen} 
        options={{ title: 'Perfil' }} 
      />
    </Tab.Navigator>
  );
}

// Stack Principal
export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen 
    name="S07_StockList" 
    component={S07_StockListScreen} 
    options={{ headerShown: true, title: 'Gestión de Inventario' }} 
    />
      <Stack.Screen 
        name="S03_Detalle" 
        component={S03_ProductDetailScreen} 
        options={{ headerShown: true, title: 'Detalle del Producto' }} 
      />
      <Stack.Screen 
        name="S05_AltaEditar" 
        component={S05_AltaEditarScreen} 
        options={{ headerShown: true, title: 'Producto' }} 
      />
    </Stack.Navigator>
  );
}