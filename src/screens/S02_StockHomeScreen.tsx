import { Ionicons } from '@expo/vector-icons';
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
  const { user, logout } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const nombreUsuario = user?.displayName || user?.email?.split('@')[0] || 'Administrador';

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ENCABEZADO CON LA PALETA DEL LOGO */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.userInfoContainer}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {nombreUsuario.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.empresaNombre}>Almacén Mingo</Text>
                <Text style={styles.usuarioNombre} numberOfLines={1}>{nombreUsuario}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.btnLogout} 
              onPress={handleCerrarSesion}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <View style={styles.badgePanel}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#0284C7" />
            <Text style={styles.badgeText}>Panel de Control Activo</Text>
          </View>
        </View>

        {/* SECCIÓN DE MÓDULOS */}
        <Text style={styles.seccionTitulo}>Módulos del Sistema</Text>

        <View style={styles.grid}>
          {/* Módulo 1: Gestión de Stock */}
          <TouchableOpacity
            style={styles.cardMenu}
            onPress={() => navigation.navigate('StockFlow')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconoContainer, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="cube-outline" size={24} color="#0284C7" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.tituloCard}>Gestión de Stock</Text>
              <Text style={styles.descCard}>
                Inventario completo, altas, bajas y modificación de precios.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" style={styles.chevron} />
          </TouchableOpacity>

          {/* Módulo 2: Registro de Ventas */}
          <TouchableOpacity
            style={styles.cardMenu}
            onPress={() => navigation.navigate('VentasFlow')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconoContainer, { backgroundColor: '#E0F4F8' }]}>
              <Ionicons name="cart-outline" size={24} color="#0EA5E9" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.tituloCard}>Ventas / Caja</Text>
              <Text style={styles.descCard}>
                Cobro rápido en mostrador y emisión de tickets diarios.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" style={styles.chevron} />
          </TouchableOpacity>

          {/* Módulo 3: Libreta de Fiados */}
          <TouchableOpacity
            style={styles.cardMenu}
            onPress={() => navigation.navigate('FiadosFlow')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconoContainer, { backgroundColor: '#E2E8F0' }]}>
              <Ionicons name="book-outline" size={24} color="#475569" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.tituloCard}>Libreta de Fiados</Text>
              <Text style={styles.descCard}>
                Cuentas corrientes de clientes, deudas y cobros parciales.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" style={styles.chevron} />
          </TouchableOpacity>

          {/* Módulo 4: Compras a Proveedores */}
          <TouchableOpacity
            style={styles.cardMenu}
            onPress={() => navigation.navigate('ComprasFlow')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconoContainer, { backgroundColor: '#BAE6FD' }]}>
              <Ionicons name="business-outline" size={24} color="#0369A1" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.tituloCard}>Compras / Proveedores</Text>
              <Text style={styles.descCard}>
                Ingreso de facturas y pedidos de reposición al por mayor.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" style={styles.chevron} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF', // Fondo general con un leve tinte celeste inspirado en el logo
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0284C7', // Azul principal del logo
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  empresaNombre: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  usuarioNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  btnLogout: {
    backgroundColor: '#FEF2F2',
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  badgePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 16,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
  },
  seccionTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0369A1',
    marginBottom: 14,
    marginLeft: 4,
  },
  grid: {
    gap: 12,
  },
  cardMenu: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  tituloCard: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  descCard: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  chevron: {
    opacity: 0.6,
  },
});