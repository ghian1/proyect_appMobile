import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/Authcontext';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function S02_StockHomeScreen(): React.ReactNode {
  // Funcionalidad para desloguear
  const { user, logout } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const nombreUsuario = user?.displayName || user?.email?.split('@')[0] || 'Usuario';

  const handleCerrarSesion = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que querés salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar la sesión.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Encabezado con Botón de Cerrar Sesión */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.saludo}>Bienvenido/a 👋</Text>
            <Text style={styles.usuario}>{nombreUsuario}</Text>
            <Text style={styles.subtitulo}>Almacén Mingo - Panel de Control</Text>
          </View>

          <TouchableOpacity style={styles.btnLogout} onPress={handleCerrarSesion}>
            <Text style={styles.textoBtnLogout}>Salir 🚪</Text>
          </TouchableOpacity>
        </View>

        {/* Grilla de Módulos */}
        <View style={styles.grid}>
          {/* Módulo 1: Gestión de Stock */}
          <TouchableOpacity
            style={styles.cardMenu}
            onPress={() => navigation.navigate('StockFlow')}
          >
            <View style={[styles.iconoContainer, { backgroundColor: '#E0F2FE' }]}>
              <Text style={styles.emoji}>📦</Text>
            </View>
            <Text style={styles.tituloCard}>Gestión de Stock</Text>
            <Text style={styles.descCard}>
              Inventario completo, altas, bajas y modificación de precios.
            </Text>
          </TouchableOpacity>

          {/* Módulo 2: Registro de Ventas */}
          <TouchableOpacity
            style={styles.cardMenu}
            onPress={() => navigation.navigate('VentasFlow')}
          >
            <View style={[styles.iconoContainer, { backgroundColor: '#DCFCE7' }]}>
              <Text style={styles.emoji}>🛒</Text>
            </View>
            <Text style={styles.tituloCard}>Ventas / Caja</Text>
            <Text style={styles.descCard}>
              Cobro rápido en mostrador y emisión de tickets diarios.
            </Text>
          </TouchableOpacity>

          {/* Módulo 3: Libreta de Fiados */}
          <TouchableOpacity
            style={styles.cardMenu}
            onPress={() => navigation.navigate('FiadosFlow')}
          >
            <View style={[styles.iconoContainer, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.emoji}>📓</Text>
            </View>
            <Text style={styles.tituloCard}>Libreta de Fiados</Text>
            <Text style={styles.descCard}>
              Cuentas corrientes de clientes, deudas y cobros parciales.
            </Text>
          </TouchableOpacity>

          {/* Módulo 4: Compras a Proveedores */}
          <TouchableOpacity
            style={styles.cardMenu}
            onPress={() => navigation.navigate('ComprasFlow')}
          >
            <View style={[styles.iconoContainer, { backgroundColor: '#F3E8FF' }]}>
              <Text style={styles.emoji}>🚚</Text>
            </View>
            <Text style={styles.tituloCard}>Compras / Proveedores</Text>
            <Text style={styles.descCard}>
              Ingreso de facturas y pedidos de reposición al por mayor.
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
    paddingRight: 10,
  },
  saludo: {
    fontSize: 16,
    color: '#666666',
  },
  usuario: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  subtitulo: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 2,
  },
  btnLogout: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginTop: 4,
  },
  textoBtnLogout: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 13,
  },
  grid: {
    gap: 16,
  },
  cardMenu: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  iconoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 22,
  },
  tituloCard: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  descCard: {
    fontSize: 13,
    color: '#666666',
    marginTop: 4,
  },
});