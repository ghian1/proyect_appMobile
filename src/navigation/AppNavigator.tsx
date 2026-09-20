import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

// Pantallas de las solapas inferiores
import { S02_StockHomeScreen } from '../screens/S02_StockHomeScreen';
import { S04_ReponerScreen } from '../screens/S04_ReponerScreen';
import { S06_PerfilScreen } from '../screens/S06_PerfilScreen';

// Tipados y navegadores anidados
import { MainTabParamList, RootStackParamList } from '../types/navigation';
import FiadosNavigator from './FiadosNavigator';
import StockNavigator from './StockNavigator';

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
      <Stack.Screen 
        name="VentasFlow" 
        component={VentasPlaceholder} 
        options={{ headerShown: true, title: 'Ventas' }} 
      />
      <Stack.Screen 
        name="FiadosFlow" 
        component={FiadosNavigator} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="ComprasFlow" 
        component={ComprasPlaceholder} 
        options={{ headerShown: true, title: 'Compras' }} 
      />
    </Stack.Navigator>
  );
}

// Estilos para los placeholders pendientes
const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#888888',
  },
});

// Módulos que todavía no desarrollamos
function VentasPlaceholder() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Módulo de Ventas</Text>
      <Text style={styles.subtitle}>En desarrollo...</Text>
    </View>
  );
}

function ComprasPlaceholder() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Módulo de Compras</Text>
      <Text style={styles.subtitle}>En desarrollo...</Text>
    </View>
  );
}