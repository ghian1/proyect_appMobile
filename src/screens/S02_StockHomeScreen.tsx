import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/Authcontext';
import { RootStackParamList } from '../types/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function S02_StockHomeScreen(): React.ReactNode {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const nombreUsuario = user?.displayName || user?.email?.split('@')[0] || 'Usuario';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.saludo}>Bienvenido/a 👋</Text>
          <Text style={styles.usuario}>{nombreUsuario}</Text>
          <Text style={styles.subtitulo}>Almacén Mingo - Panel de Control</Text>
        </View>

        {/* Grilla de Menú Principal */}
        <View style={styles.grid}>
          {/* Módulo 1: Gestión de Stock */}
          <TouchableOpacity 
            style={styles.cardMenu} 
            onPress={() => navigation.navigate('S07_StockList')}
          >
            <View style={[styles.iconoContainer, { backgroundColor: '#E0F2FE' }]}>
              <Text style={styles.emoji}>📦</Text>
            </View>
            <Text style={styles.tituloCard}>Gestión de Stock</Text>
            <Text style={styles.descCard}>Ver inventario completo, buscar y filtrar productos.</Text>
          </TouchableOpacity>

          {/* Módulo 2: Alta de Producto */}
          <TouchableOpacity 
            style={styles.cardMenu} 
            onPress={() => navigation.navigate('S05_AltaEditar', {})}
          >
            <View style={[styles.iconoContainer, { backgroundColor: '#DCFCE7' }]}>
              <Text style={styles.emoji}>➕</Text>
            </View>
            <Text style={styles.tituloCard}>Nuevo Producto</Text>
            <Text style={styles.descCard}>Registrar un nuevo producto en el sistema.</Text>
          </TouchableOpacity>

          {/* Módulo 3: Reposición / Alertas */}
          <TouchableOpacity 
            style={styles.cardMenu} 
            onPress={() => navigation.navigate('MainTabs', { screen: 'S04_Reponer' } as any)}
          >
            <View style={[styles.iconoContainer, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.emoji}>⚠️</Text>
            </View>
            <Text style={styles.tituloCard}>Para Reponer</Text>
            <Text style={styles.descCard}>Consultar artículos agotados o con stock bajo.</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 24 },
  saludo: { fontSize: 16, color: '#666' },
  usuario: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  subtitulo: { fontSize: 14, color: '#007AFF', fontWeight: '500', marginTop: 2 },
  grid: { gap: 16 },
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
  emoji: { fontSize: 22 },
  tituloCard: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  descCard: { fontSize: 13, color: '#666', marginTop: 4 },
});