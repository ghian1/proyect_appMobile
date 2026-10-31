import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBackButton } from '../components/HeaderBackButton';
import {
  CATEGORIAS_BASE,
  Producto,
  eliminarCategoriaBD,
  suscribirACategorias,
  suscribirAProductos,
} from '../services/productService';
import { StockStackParamList } from '../types/navigation';

type StockNavProp = NativeStackNavigationProp<StockStackParamList>;

type EstadoStock = 'Todas' | 'Stock Crítico' | 'Sin Stock';

export function S07_StockListScreen() {
  const navigation = useNavigation<StockNavProp>();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriasBarra, setCategoriasBarra] = useState<string[]>(CATEGORIAS_BASE || []);
  const [cargando, setCargando] = useState<boolean>(true);
  const [busqueda, setBusqueda] = useState<string>('');
  const [estadoStockSeleccionado, setEstadoStockSeleccionado] = useState<EstadoStock>('Todas');
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <HeaderBackButton />,
    });
  }, [navigation]);

  const categoriasRubros = useMemo(() => {
    return (categoriasBarra || []).filter(
      (c) => c !== 'Todas' && c !== 'Stock Crítico' && c !== 'Sin Stock'
    );
  }, [categoriasBarra]);

  const toggleCategoria = (cat: string) => {
    setCategoriasSeleccionadas((prev) =>
      (prev || []).includes(cat) ? prev.filter((c) => c !== cat) : [...(prev || []), cat]
    );
  };

  // Manejador del borrado lógico de categoría al mantener presionado
  const handleLongPressCategoria = (cat: string) => {
    if (cat === 'Todas' || cat === 'Stock Crítico' || cat === 'Sin Stock') {
      return;
    }
    if (cat === 'Almacén') {
      Alert.alert('Aviso', 'La categoría "Almacén" es la principal del sistema y no se puede desactivar.');
      return;
    }

    Alert.alert(
      'Desactivar Categoría',
      `¿Estás seguro de que querés desactivar la categoría "${cat}"? Se ocultará de los filtros y se limpiará de los productos asociados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarCategoriaBD(cat);
              setCategoriasSeleccionadas((prev) => (prev || []).filter((c) => c !== cat));
              Alert.alert('Éxito', `La categoría "${cat}" fue desactivada correctamente.`);
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'No se pudo desactivar la categoría.');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    const desuscribir = suscribirAProductos(
      (datos: Producto[]) => {
        setProductos(datos || []);
        setCargando(false);
      },
      (error: Error) => {
        console.error('Fallo la suscripción a productos:', error);
        setCargando(false);
      }
    );

    return () => {
      if (desuscribir) desuscribir();
    };
  }, []);

  useEffect(() => {
    const desuscribirCats = suscribirACategorias((cats: string[]) => {
      setCategoriasBarra(cats || []);
    });

    return () => {
      if (desuscribirCats) desuscribirCats();
    };
  }, []);

  const productosFiltrados = useMemo(() => {
    const filtrados = (productos || []).filter((item) => {
      const coincideNombre = (item?.nombre || '')
        .toLowerCase()
        .includes((busqueda || '').toLowerCase().trim());

      let coincideStock = true;
      if (estadoStockSeleccionado === 'Stock Crítico') {
        coincideStock = item.stock > 0 && item.stock < 5;
      } else if (estadoStockSeleccionado === 'Sin Stock') {
        coincideStock = item.stock <= 0;
      }

      let coincideCategoria = true;
      if (categoriasSeleccionadas.length > 0) {
        coincideCategoria = categoriasSeleccionadas.some((catSel) => {
          const catLower = catSel.toLowerCase();
          const enArray =
            Array.isArray(item.categorias) &&
            item.categorias.some((c) => c.toLowerCase() === catLower);
          const enPrincipal =
            item.categoria?.toLowerCase() === catLower;
          return enArray || enPrincipal;
        });
      }

      return coincideNombre && coincideStock && coincideCategoria;
    });

    return filtrados.sort((a, b) => {
      const tieneStockA = a.stock > 0 ? 1 : 0;
      const tieneStockB = b.stock > 0 ? 1 : 0;

      if (tieneStockA !== tieneStockB) {
        return tieneStockB - tieneStockA;
      }

      return (a?.nombre || '').localeCompare(b?.nombre || '');
    });
  }, [productos, busqueda, estadoStockSeleccionado, categoriasSeleccionadas]);

  const renderProducto = ({ item }: { item: Producto }) => {
    const sinStock = item.stock <= 0;
    const esCritico = item.stock > 0 && item.stock < 5;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => {
          if (item.id) {
            navigation.navigate('ProductDetail', { productId: item.id });
          }
        }}
      >
        <View style={styles.imagenContenedor}>
          {item.imagenUrl ? (
            <Image
              source={{ uri: item.imagenUrl }}
              style={styles.imagenProd}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderIconContainer}>
              <Ionicons name="image-outline" size={26} color="#94A3B8" />
              <Text style={styles.textoSinImagen}>Sin Imagen</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContenido}>
          <Text style={styles.cardCategoria} numberOfLines={1}>
            {Array.isArray(item.categorias) && item.categorias.length > 0
              ? item.categorias.join(' • ')
              : item.categoria || 'Almacén'}
          </Text>

          <Text style={styles.cardTitulo} numberOfLines={2}>
            {item.nombre}
          </Text>

          <Text style={styles.cardPrecio}>${item.precio.toFixed(2)}</Text>
        </View>

        <View style={styles.cardStockContainer}>
          <View
            style={[
              styles.badge,
              sinStock
                ? styles.badgeSinStock
                : esCritico
                ? styles.badgeCritico
                : styles.badgeConStock,
            ]}
          >
            <Text
              style={[
                styles.badgeTexto,
                sinStock ? styles.textoSinStock : esCritico ? styles.textoStockCritico : styles.textoConStock,
              ]}
            >
              {sinStock ? 'SIN STOCK' : `Stock: ${item.stock} unidades.`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.contenedor}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subtituloHeader}>Inventario General</Text>
          <Text style={styles.tituloHeader}>Almacén Mingo</Text>
        </View>
        <TouchableOpacity
          style={styles.botonNuevo}
          onPress={() => navigation.navigate('ProductEdit', {})}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.textoBotonNuevo}>Producto</Text>
        </TouchableOpacity>
      </View>

      {/* BUSCADOR */}
      <View style={styles.buscadorContainer}>
        <View style={styles.inputBuscadorWrapper}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.inputBuscador}
            placeholder="Buscar producto por nombre..."
            placeholderTextColor="#94A3B8"
            value={busqueda}
            onChangeText={setBusqueda}
            autoCapitalize="none"
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={Keyboard.dismiss}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* FILTROS Y CATEGORÍAS */}
      <View style={styles.filtrosContainer}>
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[
              styles.segmentItem,
              estadoStockSeleccionado === 'Todas' && styles.segmentItemTodasActivo,
            ]}
            onPress={() => setEstadoStockSeleccionado('Todas')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.textoSegment,
                estadoStockSeleccionado === 'Todas' && styles.textoSegmentTodasActivo,
              ]}
            >
              Todas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentItem,
              estadoStockSeleccionado === 'Stock Crítico' && styles.segmentItemCriticoActivo,
            ]}
            onPress={() =>
              setEstadoStockSeleccionado((prev) =>
                prev === 'Stock Crítico' ? 'Todas' : 'Stock Crítico'
              )
            }
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.textoSegment,
                estadoStockSeleccionado === 'Stock Crítico' && styles.textoSegmentCriticoActivo,
              ]}
            >
              Stock Crítico
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentItem,
              estadoStockSeleccionado === 'Sin Stock' && styles.segmentItemSinStockActivo,
            ]}
            onPress={() =>
              setEstadoStockSeleccionado((prev) =>
                prev === 'Sin Stock' ? 'Todas' : 'Sin Stock'
              )
            }
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.textoSegment,
                estadoStockSeleccionado === 'Sin Stock' && styles.textoSegmentSinStockActivo,
              ]}
            >
              Sin Stock
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.separadorFiltros} />

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['Todas', ...(categoriasRubros || [])]}
          keyExtractor={(cat) => cat}
          contentContainerStyle={styles.listaCategorias}
          renderItem={({ item: cat }) => {
            const esTodas = cat === 'Todas';
            const seleccionada = esTodas
              ? categoriasSeleccionadas.length === 0
              : categoriasSeleccionadas.includes(cat);

            return (
              <TouchableOpacity
                style={[
                  styles.chipCategoria,
                  seleccionada && styles.chipCategoriaSeleccionada,
                ]}
                onPress={() => {
                  if (esTodas) {
                    setCategoriasSeleccionadas([]);
                  } else {
                    toggleCategoria(cat);
                  }
                }}
                onLongPress={() => handleLongPressCategoria(cat)}
                delayLongPress={500}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.textoChipCategoria,
                    seleccionada && styles.textoChipCategoriaSeleccionada,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* LISTADO DE PRODUCTOS */}
      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.textoCargando}>Sincronizando inventario...</Text>
        </View>
      ) : (
        <FlatList
          data={productosFiltrados}
          key="grilla_stock_2_col"
          numColumns={2}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={renderProducto}
          contentContainerStyle={styles.listaProductos}
          columnWrapperStyle={styles.filaGrid}
          ListEmptyComponent={
            <View style={styles.centrado}>
              <Ionicons name="cube-outline" size={48} color="#CBD5E1" style={{ marginBottom: 8 }} />
              <Text style={styles.textoVacio}>
                No se encontraron productos registrados.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { 
    flex: 1, 
    backgroundColor: '#F0F9FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
  },
  subtituloHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tituloHeader: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#0F172A', 
  },
  botonNuevo: { 
    backgroundColor: '#0284C7', 
    flexDirection: 'row',
    paddingHorizontal: 14, 
    paddingVertical: 9, 
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  textoBotonNuevo: { 
    color: '#FFFFFF', 
    fontWeight: '600', 
    fontSize: 14, 
  },
  buscadorContainer: { 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#FFFFFF',
  },
  inputBuscadorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputBuscador: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 15,
    color: '#0F172A',
  },
  filtrosContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSegment: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  segmentItemTodasActivo: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  textoSegmentTodasActivo: {
    color: '#0F172A',
    fontWeight: '600',
  },
  segmentItemCriticoActivo: {
    backgroundColor: '#FEF3C7',
  },
  textoSegmentCriticoActivo: {
    color: '#D97706',
    fontWeight: '600',
  },
  segmentItemSinStockActivo: {
    backgroundColor: '#FEE2E2',
  },
  textoSegmentSinStockActivo: {
    color: '#DC2626',
    fontWeight: '600',
  },
  separadorFiltros: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  listaCategorias: {
    paddingHorizontal: 16,
    paddingBottom: 2,
    gap: 8,
  },
  chipCategoria: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  chipCategoriaSeleccionada: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  textoChipCategoria: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  textoChipCategoriaSeleccionada: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listaProductos: { 
    padding: 12, 
    paddingBottom: 20, 
  },
  filaGrid: { 
    justifyContent: 'space-between', 
    marginBottom: 12, 
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    width: '48.5%',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  imagenContenedor: {
    width: '100%',
    height: 110,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  imagenProd: {
    width: '100%',
    height: '100%',
  },
  placeholderIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoSinImagen: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  cardContenido: { 
    flex: 1, 
    marginBottom: 8, 
  },
  cardCategoria: { 
    fontSize: 10, 
    color: '#0284C7', 
    textTransform: 'uppercase', 
    marginBottom: 2,
    fontWeight: '700',
  },
  cardTitulo: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#0F172A', 
    marginBottom: 4, 
    lineHeight: 18, 
  },
  cardPrecio: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#0EA5E9', 
  },
  cardStockContainer: { 
    alignItems: 'flex-start', 
    marginTop: 'auto', 
  },
  badge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 6, 
    width: '100%', 
    alignItems: 'center', 
  },
  badgeConStock: { 
    backgroundColor: '#F0FDF4', 
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  badgeCritico: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeSinStock: { 
    backgroundColor: '#FEF2F2', 
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  badgeTexto: { 
    fontSize: 11, 
    fontWeight: '700', 
  },
  textoConStock: {
    color: '#16A34A',
  },
  textoStockCritico: {
    color: '#D97706',
  },
  textoSinStock: { 
    color: '#DC2626', 
  },
  centrado: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    marginTop: 40, 
  },
  textoCargando: { 
    marginTop: 10, 
    color: '#64748B', 
    fontSize: 14, 
  },
  textoVacio: { 
    color: '#64748B', 
    fontSize: 15, 
    textAlign: 'center', 
  },
});
