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
        item.categoria?.toLowerCase() === categoriaSeleccionada.toLowerCase(); // Comparamos la categoría seleccionada con la categoría del producto, ignorando mayúsculas y minúsculas

      return coincideNombre && coincideCategoria;
    });
  }, [productos, busqueda, categoriaSeleccionada]);

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
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitulo}>{item.nombre}</Text>
          <Text style={styles.cardCategoria}>{item.categoria || 'Almacén'}</Text>
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
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={renderProducto}
          contentContainerStyle={styles.listaProductos}
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
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2.2,
    elevation: 2,
    marginBottom: 8,
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  cardCategoria: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardPrecio: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#34C759',
  },
  cardStockContainer: {
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeConStock: {
    backgroundColor: '#E8F5E9',
  },
  badgeSinStock: {
    backgroundColor: '#FFEBEE',
  },
  badgeTexto: {
    fontSize: 12,
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