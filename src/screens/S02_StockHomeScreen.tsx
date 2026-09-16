import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/Authcontext';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>; 

export function S02_StockHomeScreen(): React.ReactNode {  
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const nombreUsuario = user?.displayName || user?.email?.split('@')[0] || 'Usuario'; //Obtenemos el nombre del usuario logueado, si no tiene displayName usamos el email antes del @, si no hay email mostramos 'Usuario'

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Encabezado con información del usuario */}
        <View style={styles.header}>
          <Text style={styles.saludo}>Bienvenido/a 👋</Text>
          <Text style={styles.usuario}>{nombreUsuario}</Text>
          <Text style={styles.subtitulo}>Almacén Mingo - Panel de Control</Text>
        </View>

        {/* Grilla con las tarjetas de los módulos */}
        <View style={styles.grid}>
          {/* Módulo 1: Gestión de Stock */}
          <TouchableOpacity 
            style={styles.cardMenu} 
            onPress={() => navigation.navigate('StockFlow')} //Navegamos al flujo de stock, que contiene la lista de productos, el detalle y la edición/alta de productos.
          >
            <View style={[styles.iconoContainer, { backgroundColor: '#E0F2FE' }]}>
              <Text style={styles.emoji}>📦</Text>
            </View>
            <Text style={styles.tituloCard}>Gestión de Stock</Text>
            <Text style={styles.descCard}>Inventario completo, altas, bajas y modificación de precios.</Text>
          </TouchableOpacity>

          {/* Módulo 2: Registro de Ventas */}
          <TouchableOpacity 
            style={styles.cardMenu} 
            onPress={() => navigation.navigate('VentasFlow')} //Navegamos al flujo de ventas.
          >
            <View style={[styles.iconoContainer, { backgroundColor: '#DCFCE7' }]}>
              <Text style={styles.emoji}>🛒</Text>
            </View>
            <Text style={styles.tituloCard}>Ventas / Caja</Text>
            <Text style={styles.descCard}>Cobro rápido en mostrador y emisión de tickets diarios.</Text>
          </TouchableOpacity>

          {/* Módulo 3: Libreta de Fiados */}
          <TouchableOpacity 
            style={styles.cardMenu} 
            onPress={() => navigation.navigate('FiadosFlow')} //Navegamos al flujo de fiados.
          >
            <View style={[styles.iconoContainer, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.emoji}>📓</Text>
            </View>
            <Text style={styles.tituloCard}>Libreta de Fiados</Text>
            <Text style={styles.descCard}>Cuentas corrientes de clientes, deudas y cobros parciales.</Text>
          </TouchableOpacity>

          {/* Módulo 4: Compras a Proveedores */}
          <TouchableOpacity 
            style={styles.cardMenu} 
            onPress={() => navigation.navigate('ComprasFlow')} //Navegamos al flujo de compras.
          >
            <View style={[styles.iconoContainer, { backgroundColor: '#F3E8FF' }]}>
              <Text style={styles.emoji}>🚚</Text>
            </View>
            <Text style={styles.tituloCard}>Compras / Proveedores</Text>
            <Text style={styles.descCard}>Ingreso de facturas y pedidos de reposición al por mayor.</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F2F4F7' 
  },
  scrollContent: { 
    padding: 20 
  },
  header: { 
    marginBottom: 24 
  },
  saludo: { 
    fontSize: 16, 
    color: '#666666' 
  },
  usuario: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    color: '#1A1A1A' 
  },
  subtitulo: { 
    fontSize: 14, 
    color: '#007AFF', 
    fontWeight: '500', 
    marginTop: 2 
  },
  grid: { 
    gap: 16 
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
    fontSize: 22 
  },
  tituloCard: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1A1A1A' 
  },
  descCard: { 
    fontSize: 13, 
    color: '#666666', 
    marginTop: 4 
  },
});