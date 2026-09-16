
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Producto, subscribeToProducts } from '../services/productService';
import { StockStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<StockStackParamList>;

export function S07_StockListScreen(): React.ReactNode {
  const navigation = useNavigation<NavigationProp>();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToProducts((data) => {
      setProductos(data);
      setCargando(false);
    });

    return () => unsubscribe();
  }, []);

  const productosFiltrados = productos.filter((item) =>
    item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    item.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  const renderItem = ({ item }: { item: Producto }) => {
    const sinStock = item.stock <= 0;

    return (
      <TouchableOpacity
        style={styles.cardProducto}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id! })}
      >
        <View style={styles.infoProducto}>
          <Text style={styles.nombreProducto}>{item.nombre}</Text>
          <Text style={styles.categoriaProducto}>{item.categoria}</Text>
          <Text style={styles.precioProducto}>${item.precio.toLocaleString('es-AR')}</Text>
        </View>

        <View style={styles.badgeContainer}>
          <Text style={[styles.badgeStock, sinStock ? styles.badgeAgotado : styles.badgeOk]}>
            {sinStock ? 'Agotado' : `Stock: ${item.stock}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.inputBuscador}
          placeholder="Buscar por nombre o categoría..."
          placeholderTextColor="#888"
          value={busqueda}
          onChangeText={setBusqueda}
        />
        <TouchableOpacity
          style={styles.botonNuevo}
          onPress={() => navigation.navigate('ProductEdit', {})}
        >
          <Text style={styles.textoBotonNuevo}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={productosFiltrados}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <Text style={styles.textoVacio}>
              {busqueda ? 'No se encontraron resultados' : 'No hay productos registrados.'}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  header: {
    padding: 16,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  inputBuscador: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  botonNuevo: {
    backgroundColor: '#007AFF',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotonNuevo: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  lista: { paddingHorizontal: 16, paddingBottom: 20 },
  cardProducto: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoProducto: { flex: 1 },
  nombreProducto: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  categoriaProducto: { fontSize: 12, color: '#888', marginTop: 2 },
  precioProducto: { fontSize: 14, color: '#007AFF', fontWeight: '600', marginTop: 4 },
  badgeContainer: { marginLeft: 10 },
  badgeStock: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  badgeOk: { backgroundColor: '#E0F2FE', color: '#0369A1' },
  badgeAgotado: { backgroundColor: '#FEE2E2', color: '#DC2626' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoVacio: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 14 },
});