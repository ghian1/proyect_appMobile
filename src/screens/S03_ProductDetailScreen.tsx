import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Producto } from '../services/productService';
import { RootStackParamList } from '../types/navigation';

type RouteProps = RouteProp<RootStackParamList, 'S03_Detalle'>;
type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

export function S03_ProductDetailScreen(): React.ReactNode {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { productId } = route.params;

  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'productos', productId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setProducto({ id: docSnap.id, ...docSnap.data() } as Producto);
      } else {
        Alert.alert('Error', 'El producto no existe o fue eliminado.');
        navigation.goBack();
      }
      setCargando(false);
    });

    return () => unsubscribe();
  }, [productId]);

  const handleEliminar = () => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que querés borrar este producto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'productos', productId));
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el producto.');
            }
          },
        },
      ]
    );
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!producto) return null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {producto.imagenUrl ? (
          <Image source={{ uri: producto.imagenUrl }} style={styles.imagen} />
        ) : (
          <View style={styles.imagenPlaceholder}>
            <Text style={styles.textoPlaceholder}>Sin Imagen</Text>
          </View>
        )}

        <View style={styles.cardInfo}>
          <Text style={styles.categoria}>{producto.categoria.toUpperCase()}</Text>
          <Text style={styles.nombre}>{producto.nombre}</Text>
          <Text style={styles.precio}>${producto.precio.toLocaleString('es-AR')}</Text>

          <View style={styles.separator} />

          <View style={styles.row}>
            <Text style={styles.label}>Stock Disponible:</Text>
            <Text style={[styles.valorStock, producto.stock <= 0 && styles.stockAgotado]}>
              {producto.stock} unidades
            </Text>
          </View>

          {producto.descripcion ? (
            <View style={styles.seccionDesc}>
              <Text style={styles.label}>Descripción:</Text>
              <Text style={styles.descripcion}>{producto.descripcion}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.acciones}>
          <TouchableOpacity
            style={styles.botonEditar}
            onPress={() => navigation.navigate('S05_AltaEditar', { productId })}
          >
            <Text style={styles.textoBotonEditar}>Editar Producto</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botonEliminar} onPress={handleEliminar}>
            <Text style={styles.textoBotonEliminar}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imagen: { width: '100%', height: 220, borderRadius: 12, marginBottom: 16 },
  imagenPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  textoPlaceholder: { color: '#9CA3AF', fontSize: 16 },
  cardInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
  },
  categoria: { fontSize: 12, fontWeight: 'bold', color: '#007AFF', marginBottom: 4 },
  nombre: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
  precio: { fontSize: 20, fontWeight: '600', color: '#10B981', marginTop: 6 },
  separator: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, color: '#666', fontWeight: '500' },
  valorStock: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  stockAgotado: { color: '#EF4444' },
  seccionDesc: { marginTop: 12 },
  descripcion: { fontSize: 14, color: '#4B5563', marginTop: 4, lineHeight: 20 },
  acciones: { gap: 10 },
  botonEditar: {
    backgroundColor: '#007AFF',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotonEditar: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  botonEliminar: {
    backgroundColor: '#FEE2E2',
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotonEliminar: { color: '#DC2626', fontWeight: '600', fontSize: 15 },
});