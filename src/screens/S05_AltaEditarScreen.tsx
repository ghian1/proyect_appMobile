import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  actualizarProducto,
  crearCategoriaBD,
  crearProducto,
  obtenerProductoPorId,
  suscribirACategorias
} from '../services/productService';
import { StockStackParamList } from '../types/navigation';
import { sanearEntero, sanearImporte } from '../utils/sanitizers';

type ScreenRouteProp = RouteProp<StockStackParamList, 'ProductEdit'>;
type ScreenNavProp = NativeStackNavigationProp<StockStackParamList, 'ProductEdit'>;

export function S05_AltaEditarScreen() {
  const navigation = useNavigation<ScreenNavProp>();
  const route = useRoute<ScreenRouteProp>();

  const productId = route.params?.productId;
  const esEdicion = Boolean(productId);

  const [nombre, setNombre] = useState<string>('');
  const [categorias, setCategorias] = useState<string[]>(['Almacén']);
  const [listaCategorias, setListaCategorias] = useState<string[]>(['Comestibles', 'Bebidas', 'Limpieza', 'Almacén']);

  const [modalCatVisible, setModalCatVisible] = useState<boolean>(false);
  const [nuevaCatTexto, setNuevaCatTexto] = useState<string>('');

  const [precioTexto, setPrecioTexto] = useState<string>('');
  const [stockTexto, setStockTexto] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [guardando, setGuardando] = useState<boolean>(false);
  const [cargandoInicial, setCargandoInicial] = useState<boolean>(false);
  const [imagenUri, setImagenUri] = useState<string | null>(null);

  // Suscripción a categorías de Firestore
  useEffect(() => {
    const desuscribirCats = suscribirACategorias((cats: string[]) => {
      // [FILTRO] Excluimos filtros de estado calculados para que NO se asignen a productos
      const categoriasValidasParaElegir = cats.filter(
        (c: string) => c !== 'Todas' && c !== 'Stock Crítico' && c !== 'Sin Stock'
      );
      setListaCategorias(categoriasValidasParaElegir);
    });

    return () => {
      if (desuscribirCats) desuscribirCats();
    };
  }, []);
  
  useEffect(() => {
    let activo = true;

    const hidratarFormulario = async () => {
      if (!esEdicion || !productId) return;

      try {
        setCargandoInicial(true);
        const productoEncontrado = await obtenerProductoPorId(productId);

        if (productoEncontrado && activo) {
          setNombre(productoEncontrado.nombre || '');

          if (Array.isArray(productoEncontrado.categorias) && productoEncontrado.categorias.length > 0) {
            setCategorias(productoEncontrado.categorias);
          } else if (productoEncontrado.categoria) {
            setCategorias([productoEncontrado.categoria]);
          } else {
            setCategorias(['Almacén']);
          }

          setPrecioTexto(productoEncontrado.precio !== undefined ? String(productoEncontrado.precio) : '');
          setStockTexto(productoEncontrado.stock !== undefined ? String(productoEncontrado.stock) : '');
          setDescripcion(productoEncontrado.descripcion || '');
          setImagenUri(productoEncontrado.imagenUrl || null);
        } else if (!productoEncontrado && activo) {
          Alert.alert('Aviso', 'No se encontró la mercadería a editar.', [
            { text: 'Volver', onPress: () => navigation.goBack() }
          ]);
        }
      } catch (error) {
        console.error('Error al precargar producto:', error);
        Alert.alert('Error', 'No se pudieron recuperar los datos del producto.');
      } finally {
        if (activo) {
          setCargandoInicial(false);
        }
      }
    };

    hidratarFormulario();

    return () => {
      activo = false;
    };
  }, [productId, esEdicion]);

  const toggleCategoria = (cat: string) => {
    if (categorias.includes(cat)) {
      if (categorias.length > 1) {
        setCategorias(categorias.filter((item) => item !== cat));
      } else {
        Alert.alert('Validación', 'El producto debe pertenecer al menos a una categoría.');
      }
    } else {
      setCategorias([...categorias, cat]);
    }
  };

  //Guardado persistente de nueva categoría en Firestore
  const handleConfirmarNuevaCategoria = async () => {
    if (!nuevaCatTexto.trim()) {
      Alert.alert('Atención', 'Ingresá un nombre para la categoría.');
      return;
    }

    const textoLimpio = nuevaCatTexto.trim();
    const formateada = textoLimpio.charAt(0).toUpperCase() + textoLimpio.slice(1);

    try {
      if (!listaCategorias.includes(formateada)) {
        await crearCategoriaBD(formateada);
        setCategorias([...categorias, formateada]);
      }
      setNuevaCatTexto('');
      setModalCatVisible(false);
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      Alert.alert('Error', 'No se pudo guardar la categoría.');
    }
  };

  const tomarFotoConCamara = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permiso necesario',
          'Se necesitan permisos de acceso a la cámara para poder fotografiar los productos.'
        );
        return;
      }

      const resultado = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        setImagenUri(resultado.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al abrir la cámara:', error);
      Alert.alert('Error', 'No se pudo abrir la cámara.');
    }
  };

  const handleGuardar = async () => {
    if (!nombre.trim() || nombre.trim().length < 2) {
      Alert.alert('Validación', 'El nombre debe tener al menos 2 caracteres.');
      return;
    }

    if (categorias.length === 0) {
      Alert.alert('Validación', 'Seleccioná al menos una categoría.');
      return;
    }

    const precioFinal = sanearImporte(precioTexto);
    const stockFinal = sanearEntero(stockTexto);

    try {
      setGuardando(true);

      const payload = {
        nombre,
        categorias,
        categoria: categorias[0],
        precio: precioFinal,
        stock: stockFinal,
        descripcion,
        imagenUrl: imagenUri || null,
      };

      if (esEdicion && productId) {
        await actualizarProducto(productId, payload);
        Alert.alert('Éxito', 'Producto modificado correctamente.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await crearProducto(payload);
        Alert.alert('Éxito', 'Producto guardado exitosamente.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      console.error('Error al persistir producto:', error);
      Alert.alert('Error', error?.message || 'Ocurrió un problema al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargandoInicial) {
    return (
      <SafeAreaView style={[styles.contenedor, styles.centroCarga]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.textoCarga}>Cargando datos del producto...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.titulo}>
          {esEdicion ? 'Editar Mercadería' : 'Nueva Mercadería'}
        </Text>

        <View style={styles.seccionFoto}>
          {imagenUri ? (
            <Image source={{ uri: imagenUri }} style={styles.fotoPreview} />
          ) : (
            <View style={styles.fotoPlaceholder}>
              <Text style={styles.placeholderTexto}>Sin Foto</Text>
            </View>
          )}

          <View style={styles.contenedorBotonesFoto}>
            <TouchableOpacity
              style={styles.botonCamara}
              onPress={tomarFotoConCamara}
              activeOpacity={0.7}
            >
              <Text style={styles.textoBotonCamara}>📷 Tomar Foto</Text>
            </TouchableOpacity>

            {imagenUri && (
              <TouchableOpacity
                onPress={() => setImagenUri(null)}
                style={styles.botonEliminarFoto}
              >
                <Text style={styles.textoEliminarFoto}>Quitar foto</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Nombre del producto *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Fideos Marolio 500g"
            placeholderTextColor="#8E8E93"
            value={nombre}
            onChangeText={setNombre}
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Categorías (podés elegir varias)</Text>
          <View style={styles.categoriasContenedor}>
            {listaCategorias.map((cat) => {
              const seleccionada = categorias.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, seleccionada ? styles.chipSeleccionado : null]}                  
                  onPress={() => toggleCategoria(cat)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipTexto,
                      seleccionada ? styles.chipTextoSeleccionado : null,
                    ]}
                  >
                    {cat} {seleccionada ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.chipAgregarCategoria}
              onPress={() => setModalCatVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.textoAgregarCategoria}>+ Nueva Categoría</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filaInputs}>
          <View style={[styles.campo, styles.columna]}>
            <Text style={styles.label}>Precio ($) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#8E8E93"
              keyboardType="numeric"
              value={precioTexto}
              onChangeText={setPrecioTexto}
            />
          </View>

          <View style={[styles.campo, styles.columna]}>
            <Text style={styles.label}>Stock inicial *</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#8E8E93"
              keyboardType="number-pad"
              value={stockTexto}
              onChangeText={setStockTexto}
            />
          </View>
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Descripción / Notas (Opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Aclaraciones del proveedor, ubicación en depósito..."
            placeholderTextColor="#8E8E93"
            multiline
            numberOfLines={3}
            value={descripcion}
            onChangeText={setDescripcion}
          />
        </View>

        <TouchableOpacity
          style={[styles.botonGuardar, guardando && styles.botonDeshabilitado]}
          onPress={handleGuardar}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.textoBotonGuardar}>
              {esEdicion ? 'Actualizar Producto' : 'Registrar Producto'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalCatVisible} animationType="fade" transparent>
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <Text style={styles.modalTitulo}>Nueva Categoría</Text>
            <Text style={styles.modalSubtitulo}>Ingresá el nombre del nuevo rubro:</Text>

            <TextInput
              style={styles.inputModal}
              placeholder="Ej: Golosinas, Fiambres..."
              placeholderTextColor="#8E8E93"
              value={nuevaCatTexto}
              onChangeText={setNuevaCatTexto}
              autoFocus
            />

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.botonModalCancelar}
                onPress={() => {
                  setNuevaCatTexto('');
                  setModalCatVisible(false);
                }}
              >
                <Text style={styles.textoModalCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botonModalAgregar}
                onPress={handleConfirmarNuevaCategoria}
              >
                <Text style={styles.textoModalAgregar}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  centroCarga: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoCarga: {
    marginTop: 12,
    fontSize: 15,
    color: '#8E8E93',
  },
  scroll: {
    padding: 20,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  seccionFoto: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  fotoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  fotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderTexto: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
  },
  contenedorBotonesFoto: {
    marginLeft: 16,
    flex: 1,
  },
  botonCamara: {
    backgroundColor: '#34C759',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoBotonCamara: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  botonEliminarFoto: {
    marginTop: 8,
    alignItems: 'center',
  },
  textoEliminarFoto: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '500',
  },
  campo: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3A3A3C',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1C1C1E',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  filaInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  columna: {
    flex: 1,
  },
  categoriasContenedor: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#E5E5EA',
  },
  chipSeleccionado: {
    backgroundColor: '#007AFF',
  },
  chipTexto: {
    fontSize: 13,
    color: '#3A3A3C',
    fontWeight: '500',
  },
  chipTextoSeleccionado: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chipAgregarCategoria: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#34C759',
    borderStyle: 'dashed',
  },
  textoAgregarCategoria: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },
  botonGuardar: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  botonDeshabilitado: {
    backgroundColor: '#9EBAE4',
  },
  textoBotonGuardar: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContenido: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    elevation: 5,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  modalSubtitulo: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 16,
  },
  inputModal: {
    backgroundColor: '#F2F4F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1C1C1E',
    marginBottom: 16,
  },
  modalBotones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  botonModalCancelar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  textoModalCancelar: {
    color: '#3A3A3C',
    fontWeight: '600',
  },
  botonModalAgregar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#34C759',
  },
  textoModalAgregar: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});