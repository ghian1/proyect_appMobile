import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Producto } from '../services/productService';
import { StockStackParamList } from '../types/navigation';

type RouteProps = RouteProp<StockStackParamList, 'ProductDetail'>;
type NavigationProps = NativeStackNavigationProp<StockStackParamList>;

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
  }, [productId, navigation]);

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
        <ActivityIndicator size="large" color="#0284C7" />
      </View>
    );
  }

  if (!producto) return null;

  // Lógica de colores dinámicos para el stock
  const stock = producto.stock || 0;
  const esSinStock = stock <= 0;
  const esCritico = stock > 0 && stock <= 5;

  // Manejo seguro de categoría/categorías
  const nombreCategoria = (
    producto.categoria ||
    (Array.isArray(producto.categorias) && producto.categorias.length > 0
      ? producto.categorias.join(' • ')
      : 'Sin Categoría')
  ).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* CONTENEDOR DE IMAGEN */}
        {producto.imagenUrl ? (
          <View style={styles.imagenWrapper}>
            <Image source={{ uri: producto.imagenUrl }} style={styles.imagen} resizeMode="contain" />
          </View>
        ) : (
          <View style={styles.imagenPlaceholder}>
            <Ionicons name="image-outline" size={40} color="#94A3B8" />
            <Text style={styles.textoPlaceholder}>Sin Imagen</Text>
          </View>
        )}

        {/* TARJETA DE INFORMACIÓN */}
        <View style={styles.cardInfo}>
          <Text style={styles.categoria}>{nombreCategoria}</Text>
          <Text style={styles.nombre}>{producto.nombre}</Text>
          <Text style={styles.precio}>${producto.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</Text>

          <View style={styles.separator} />

          <View style={styles.row}>
            <Text style={styles.label}>Stock Disponible:</Text>
            {/* Badge dinámico */}
            <View
              style={[
                styles.badgeStock,
                esSinStock
                  ? styles.badgeSinStock
                  : esCritico
                  ? styles.badgeCritico
                  : styles.badgeNormal,
              ]}
            >
              <Text
                style={[
                  styles.textoBadgeStock,
                  esSinStock
                    ? styles.textoSinStock
                    : esCritico
                    ? styles.textoCritico
                    : styles.textoNormal,
                ]}
              >
                {esSinStock ? 'SIN STOCK' : `${stock} unidades`}
              </Text>
            </View>
          </View>

          {producto.descripcion ? (
            <View style={styles.seccionDesc}>
              <Text style={styles.label}>Descripción:</Text>
              <Text style={styles.descripcion}>{producto.descripcion}</Text>
            </View>
          ) : null}
        </View>

        {/* BOTONES DE ACCIÓN */}
        <View style={styles.acciones}>
          <TouchableOpacity
            style={styles.botonEditar}
            onPress={() => navigation.navigate('ProductEdit', { productId })}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.textoBotonEditar}>Editar Producto</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.botonEliminar} 
            onPress={handleEliminar}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={styles.textoBotonEliminar}>Eliminar Producto</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F0F9FF', // Fondo celeste sutil característico
  },
  content: { 
    padding: 20,
    paddingBottom: 40,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
  },
  imagenWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imagen: { 
    width: '100%', 
    height: 220, 
    borderRadius: 12, 
  },
  imagenPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  textoPlaceholder: { 
    color: '#94A3B8', 
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },
  cardInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoria: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#0284C7', // Azul principal del logo
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  nombre: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#0F172A',
    lineHeight: 26,
  },
  precio: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#0EA5E9', // Azul claro dinámico para resaltar precio
    marginTop: 8, 
  },
  separator: { 
    height: 1, 
    backgroundColor: '#F1F5F9', 
    marginVertical: 16, 
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  label: { 
    fontSize: 14, 
    color: '#64748B', 
    fontWeight: '500', 
  },
  
  // Estilos para los badges de stock
  badgeStock: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeSinStock: {
    backgroundColor: '#FEF2F2', 
  },
  badgeCritico: {
    backgroundColor: '#FFFBEB', 
  },
  badgeNormal: {
    backgroundColor: '#F0FDF4', 
  },
  textoBadgeStock: {
    fontSize: 13,
    fontWeight: '700',
  },
  textoSinStock: {
    color: '#DC2626', 
  },
  textoCritico: {
    color: '#D97706', 
  },
  textoNormal: {
    color: '#16A34A', 
  },

  seccionDesc: { 
    marginTop: 16, 
  },
  descripcion: { 
    fontSize: 14, 
    color: '#334155', 
    marginTop: 4, 
    lineHeight: 20, 
  },
  acciones: { 
    gap: 12, 
  },
  botonEditar: {
    backgroundColor: '#0284C7', // Azul corporativo del logo
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  textoBotonEditar: { 
    color: '#FFFFFF', 
    fontWeight: 'bold', 
    fontSize: 15, 
  },
  botonEliminar: {
    backgroundColor: '#FEF2F2',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  textoBotonEliminar: { 
    color: '#DC2626', 
    fontWeight: '600', 
    fontSize: 15, 
  },
});