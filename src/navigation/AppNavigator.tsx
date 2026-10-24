import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Pantallas de las solapas inferiores
import { S02_StockHomeScreen } from '../screens/S02_StockHomeScreen';
import { S04_ReponerScreen } from '../screens/S04_ReponerScreen';
import { S06_PerfilScreen } from '../screens/S06_PerfilScreen';

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

// Configuración de las solapas inferiores de la App
function TabNavigator() {
  return (
    <Tab.Navigator 
      screenOptions={{
        headerStyle: { backgroundColor: '#F2F4F7' },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#888888',
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