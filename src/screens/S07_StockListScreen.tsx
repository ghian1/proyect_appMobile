import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import {
  CATEGORIAS_BASE,
  Producto,
  suscribirACategorias,
  suscribirAProductos,
} from '../services/productService';
import { StockStackParamList } from '../types/navigation';

type StockNavProp = NativeStackNavigationProp<StockStackParamList>;

// NUEVO: Estados de stock limpios: 'Todas', 'Stock Crítico' y 'Sin Stock'
type EstadoStock = 'Todas' | 'Stock Crítico' | 'Sin Stock';

export function S07_StockListScreen() {
  const navigation = useNavigation<StockNavProp>();
  const [productos, setProductos] = useState<Producto[]>([]);
  // El carrusel de categorías ahora es dinámico y en tiempo real
  const [categoriasBarra, setCategoriasBarra] = useState<string[]>(CATEGORIAS_BASE);
  const [cargando, setCargando] = useState<boolean>(true);
  const [busqueda, setBusqueda] = useState<string>('');
  // Separamos el estado de stock de las categorías y permitimos multi-selección de rubros
  const [estadoStockSeleccionado, setEstadoStockSeleccionado] = useState<EstadoStock>('Todas');
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([]);

  // Dejamos solo los rubros de productos en la lista para no mezclar con estados de stock
  const categoriasRubros = useMemo(() => {
    return categoriasBarra.filter(
      (c) => c !== 'Todas' && c !== 'Stock Crítico' && c !== 'Sin Stock'
    );
  }, [categoriasBarra]);

  // Handler toggle para activar o desactivar categorías dinámicamente
  const toggleCategoria = (cat: string) => {
    setCategoriasSeleccionadas((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Suscripción en tiempo real a productos de Firestore
  useEffect(() => {
    const desuscribir = suscribirAProductos(
      (datos: Producto[]) => {
        setProductos(datos);
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

  // Suscripción en tiempo real a las categorías creadas por el usuario
  useEffect(() => {
    const desuscribirCats = suscribirACategorias((cats: string[]) => {
      setCategoriasBarra(cats);
    });

    return () => {
      if (desuscribirCats) desuscribirCats();
    };
  }, []);

  // Filtrado combinado reactivo: texto + estado de stock + categorías múltiples
  const productosFiltrados = useMemo(() => {
    const filtrados = productos.filter((item) => {
      const coincideNombre = item.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase().trim());

      // Validación del filtro de estado de stock (Todas / Crítico / Sin Stock)
      let coincideStock = true;
      if (estadoStockSeleccionado === 'Stock Crítico') {
        // [LÓGICA AUTOMÁTICA] Productos con stock entre 1 y 4 unidades
        coincideStock = item.stock > 0 && item.stock < 5;
      } else if (estadoStockSeleccionado === 'Sin Stock') {
        // [LÓGICA AUTOMÁTICA] Productos agotados
        coincideStock = item.stock <= 0;
      }

      // Validación de categorías múltiples (si hay categorías seleccionadas, buscamos coincidencias)
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

    // Ordenamiento por defecto: productos disponibles primero, agotados al final
    return filtrados.sort((a, b) => {
      const tieneStockA = a.stock > 0 ? 1 : 0;
      const tieneStockB = b.stock > 0 ? 1 : 0;

      if (tieneStockA !== tieneStockB) {
        return tieneStockB - tieneStockA;
      }

      return a.nombre.localeCompare(b.nombre);
    });
  }, [productos, busqueda, estadoStockSeleccionado, categoriasSeleccionadas]);

  const renderProducto = ({ item }: { item: Producto }) => {
    const sinStock = item.stock <= 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          if (item.id) {
            navigation.navigate('ProductDetail', { productId: item.id });
          }
        }}
      >
        {/* Contenedor de la imagen con fondo blanco estilo e-commerce */}
        <View style={styles.imagenContenedor}>
          {item.imagenUrl ? (
            <Image
              source={{ uri: item.imagenUrl }}
              style={styles.imagenProd}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.textoSinImagen}>Sin Imagen</Text>
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

          {/* Precio en color neutro (gris oscuro/negro) */}
          <Text style={styles.cardPrecio}>${item.precio.toFixed(2)}</Text>
        </View>

        {/* Stock abajo con color dinámico según unidades */}
        <View style={styles.cardStockContainer}>
          <View
            style={[
              styles.badge,
              sinStock ? styles.badgeSinStock : styles.badgeConStock,
            ]}
          >
            <Text
              style={[
                styles.badgeTexto,
                sinStock ? styles.textoSinStock : styles.textoConStock,
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
      <View style={styles.header}>
        <Text style={styles.tituloHeader}>Inventario de Stock</Text>
        <TouchableOpacity
          style={styles.botonNuevo}
          onPress={() => navigation.navigate('ProductEdit', {})}
        >
          <Text style={styles.textoBotonNuevo}>+ Producto</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buscadorContainer}>
        <TextInput
          style={styles.inputBuscador}
          placeholder="Buscar producto por nombre..."
          placeholderTextColor="#8E8E93"
          value={busqueda}
          onChangeText={setBusqueda}
          autoCapitalize="none"
          returnKeyType="done"
          blurOnSubmit={true}
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>

      {/* Rediseño visual de filtros */}
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
          data={['Todas', ...categoriasRubros]}
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

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color="#007AFF" />
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
  contenedor: { flex: 1, backgroundColor: '#F2F4F7' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  tituloHeader: { fontSize: 22, fontWeight: 'bold', color: '#1C1C1E' },
  botonNuevo: { backgroundColor: '#007AFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  textoBotonNuevo: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  buscadorContainer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#FFFFFF' },
  inputBuscador: {
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    color: '#1C1C1E',
  },
  filtrosContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    padding: 3,
    marginHorizontal: 16,
    marginTop: 8,
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
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  segmentItemTodasActivo: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  textoSegmentTodasActivo: {
    color: '#111827',
    fontWeight: '600',
  },
  segmentItemCriticoActivo: {
    backgroundColor: '#FFEDD5',
  },
  textoSegmentCriticoActivo: {
    color: '#EA580C',
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
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  listaCategorias: {
    paddingHorizontal: 16,
    paddingBottom: 2,
    gap: 8,
  },
  chipCategoria: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 6,
  },
  chipCategoriaSeleccionada: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  textoChipCategoria: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  textoChipCategoriaSeleccionada: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listaProductos: { padding: 12, paddingBottom: 20 },
  filaGrid: { justifyContent: 'space-between', marginBottom: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    width: '48.5%',
    justifyContent: 'space-between',
    elevation: 2,
  },
  imagenContenedor: {
    width: '100%',
    height: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  imagenProd: {
    width: '100%',
    height: '100%',
  },
  textoSinImagen: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  cardContenido: { flex: 1, marginBottom: 8 },
  cardCategoria: { fontSize: 10, color: '#8E8E93', textTransform: 'uppercase', marginBottom: 2 },
  cardTitulo: { fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginBottom: 4, lineHeight: 18 },
  cardPrecio: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  cardStockContainer: { alignItems: 'flex-start', marginTop: 'auto' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, width: '100%', alignItems: 'center' },
  badgeConStock: { backgroundColor: '#F3F4F6' }, // Fondo neutro suave cuando hay stock
  badgeSinStock: { backgroundColor: '#FFEBEE' }, // Fondo rojo suave cuando no hay stock
  badgeTexto: { fontSize: 11, fontWeight: '700' },
  textoConStock: { color: '#4B5563' }, // Texto gris neutro oscuro para stock normal
  textoSinStock: { color: '#D32F2F' }, // Texto rojo intenso para alertas de sin stock
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: 40 },
  textoCargando: { marginTop: 10, color: '#8E8E93', fontSize: 14 },
  textoVacio: { color: '#8E8E93', fontSize: 15, textAlign: 'center' },
});
