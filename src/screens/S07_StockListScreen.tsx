import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
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

import { Producto, suscribirAProductos } from '../services/productService'; //traemos la interfaz Producto y la función suscribirAProductos desde el servicio de productos
import { StockStackParamList } from '../types/navigation'; //Importa la lista de pantallas válidas que pertenecen al módulo de stock (StockList, ProductDetail, ProductEdit).

type StockNavProp = NativeStackNavigationProp<StockStackParamList>;

//Creamos las catergorías que se van a mostrar en la pantalla de inventario, incluyendo la opción "Todas" para mostrar todos los productos sin filtrar por categoría.
const CATEGORIAS = ['Todas', 'Comestibles', 'Bebidas', 'Limpieza', 'Almacén'];

export function S07_StockListScreen() {
  const navigation = useNavigation<StockNavProp>();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [busqueda, setBusqueda] = useState<string>('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('Todas');

  //Suscribirse a la lista de productos en tiempo real al montar el componente
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
      if (desuscribir) {
        desuscribir();
      }
    };
  }, []);

  // Filtrar productos según la búsqueda y la categoría seleccionada
  const productosFiltrados = useMemo(() => {
    return productos.filter((item) => {
      const coincideNombre = item.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase().trim());

      const coincideCategoria =
        categoriaSeleccionada === 'Todas' ||
        (Array.isArray(item.categorias) &&
          item.categorias.some(
            (c) => c.toLowerCase() === categoriaSeleccionada.toLowerCase()
          )) ||
        item.categoria?.toLowerCase() === categoriaSeleccionada.toLowerCase();

      return coincideNombre && coincideCategoria;
    });
  }, [productos, busqueda, categoriaSeleccionada]);

  // Renderizado de tarjeta vertical en formato de tarjeta/grilla
  const renderProducto = ({ item }: { item: Producto }) => {
    const sinStock = item.stock <= 0; //nos fijamos que el producto tenga stock.

    return (
      <TouchableOpacity //creamos un TouchableOpacity para que al tocar el producto nos lleve a la pantalla de detalle del producto.
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          if (item.id) {
            navigation.navigate('ProductDetail', { productId: item.id });
          }
        }}
      >
        {/* renderiza la información del producto, incluyendo el nombre, la categoría y el precio. */}
        <View style={styles.cardContenido}>
          {/*Limitamos el título a 2 renglones con numberOfLines={2} */}
          <Text style={styles.cardTitulo} numberOfLines={2}>
            {item.nombre}
          </Text>

          {/* [NUEVO - GRID 2 COLUMNAS] Formateamos todas las categorías del producto unidas con puntos */}
          <Text style={styles.cardCategoria} numberOfLines={1}>
            {Array.isArray(item.categorias) && item.categorias.length > 0
              ? item.categorias.join(' • ')
              : item.categoria || 'Almacén'}
          </Text>

          <Text style={styles.cardPrecio}>${item.precio.toFixed(2)}</Text>
        </View>

        {/* Muestra toda la información del stock del producto */}
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
              {sinStock ? 'SIN STOCK' : `${item.stock} u.`}
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
        />
      </View>

      <View style={styles.categoriasWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIAS}
          keyExtractor={(cat) => cat}
          contentContainerStyle={styles.listaCategorias}
          renderItem={({ item: cat }) => {
            const activa = categoriaSeleccionada === cat;
            return (
              <TouchableOpacity
                style={[styles.chip, activa ? styles.chipActivo : null]}
                onPress={() => setCategoriaSeleccionada(cat)}
              >
                <Text
                  style={[
                    styles.chipTexto,
                    activa ? styles.chipTextoActivo : null,
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
  contenedor: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  tituloHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  botonNuevo: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  textoBotonNuevo: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  buscadorContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },
  inputBuscador: {
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    color: '#1C1C1E',
  },
  categoriasWrapper: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 10,
  },
  listaCategorias: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
    marginRight: 6,
  },
  chipActivo: {
    backgroundColor: '#007AFF',
  },
  chipTexto: {
    fontSize: 13,
    color: '#3A3A3C',
    fontWeight: '500',
  },
  chipTextoActivo: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listaProductos: {
    padding: 12,
    paddingBottom: 20,
  },
  //Distribucion proporcional para cada par de tarjetas por fila
  filaGrid: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  //Rediseño de tarjeta en formato caja rectangular(cambiamos las tarjetas para que tengan un diseño más moderno y limpio, con bordes redondeados y sombra sutil)
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    width: '48.5%',
    justifyContent: 'space-between',
    minHeight: 135,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2.2,
    elevation: 2,
  },
  cardContenido: {
    flex: 1,
  },
  cardTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
    lineHeight: 19,
  },
  cardCategoria: {
    fontSize: 11,
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cardPrecio: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 8,
  },
  cardStockContainer: {
    alignItems: 'flex-start',
    marginTop: 'auto',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeConStock: {
    backgroundColor: '#E8F5E9',
  },
  badgeSinStock: {
    backgroundColor: '#FFEBEE',
  },
  badgeTexto: {
    fontSize: 11,
    fontWeight: '700',
  },
  textoConStock: {
    color: '#2E7D32',
  },
  textoSinStock: {
    color: '#D32F2F',
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
    color: '#8E8E93',
    fontSize: 14,
  },
  textoVacio: {
    color: '#8E8E93',
    fontSize: 15,
    textAlign: 'center',
  },
});