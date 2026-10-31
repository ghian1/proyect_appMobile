import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  actualizarProducto,
  crearCategoriaBD,
  crearProducto,
  eliminarCategoriaBD,
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
  const headerHeight = useHeaderHeight(); 
  const scrollViewRef = useRef<any>(null); 

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
      const categoriasValidasParaElegir = (cats || []).filter(
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
        setCategorias((categorias || []).filter((item) => item !== cat));
      } else {
        Alert.alert('Validación', 'El producto debe pertenecer al menos a una categoría.');
      }
    } else {
      setCategorias([...categorias, cat]);
    }
  };

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
      `¿Estás seguro de que querés desactivar la categoría "${cat}"? Se ocultará de la lista y se quitará de los productos que la tengan asignada.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarCategoriaBD(cat);
              setCategorias((prev) => (prev || []).filter((c) => c !== cat));
              Alert.alert('Éxito', `La categoría "${cat}" fue desactivada correctamente.`);
            } catch (error) {
              Alert.alert('Error', 'No se pudo desactivar la categoría.');
            }
          },
        },
      ]
    );
  };

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

  // NUEVO: Función para seleccionar archivo (PNG/JPG) desde la galería
  const seleccionarDeGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permiso necesario',
          'Se necesitan permisos de acceso a la galería para poder seleccionar la imagen del producto.'
        );
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        setImagenUri(resultado.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al abrir la galería:', error);
      Alert.alert('Error', 'No se pudo abrir la galería de imágenes.');
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
        <ActivityIndicator size="large" color="#0284C7" />
        <Text style={styles.textoCarga}>Cargando datos del producto...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.titulo}>
              {esEdicion ? 'Editar Mercadería' : 'Nueva Mercadería'}
            </Text>

            <View style={styles.seccionFoto}>
              {imagenUri ? (
                <Image source={{ uri: imagenUri }} style={styles.fotoPreview} />
              ) : (
                <View style={styles.fotoPlaceholder}>
                  <Ionicons name="camera-outline" size={28} color="#94A3B8" />
                  <Text style={styles.placeholderTexto}>Sin Foto</Text>
                </View>
              )}

              <View style={styles.contenedorBotonesFoto}>
                <TouchableOpacity
                  style={styles.botonCamara}
                  onPress={tomarFotoConCamara}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.textoBotonCamara}>Tomar Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botonGaleria}
                  onPress={seleccionarDeGaleria}
                  activeOpacity={0.7}
                >
                  <Ionicons name="images" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.textoBotonGaleria}>Subir de Galería</Text>
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
                placeholderTextColor="#94A3B8"
                value={nombre}
                onChangeText={setNombre}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            <View style={styles.campo}>
              <Text style={styles.label}>Categorías (podés elegir varias)</Text>
              <View style={styles.categoriasContenedor}>
                {(listaCategorias || []).map((cat) => {
                  const seleccionada = (categorias || []).includes(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, seleccionada ? styles.chipSeleccionado : null]}      
                      onPress={() => toggleCategoria(cat)}
                      onLongPress={() => handleLongPressCategoria(cat)}
                      delayLongPress={500}
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
                  <Ionicons name="add" size={14} color="#0284C7" style={{ marginRight: 2 }} />
                  <Text style={styles.textoAgregarCategoria}>Nueva Categoría</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filaInputs}>
              <View style={[styles.campo, styles.columna]}>
                <Text style={styles.label}>Precio ($) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={precioTexto}
                  onChangeText={setPrecioTexto}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>

              <View style={[styles.campo, styles.columna]}>
                <Text style={styles.label}>Stock inicial *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  value={stockTexto}
                  onChangeText={setStockTexto}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>
            </View>

            <View style={styles.campo}>
              <Text style={styles.label}>Descripción / Notas (Opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Aclaraciones del proveedor, ubicación en depósito..."
                placeholderTextColor="#94A3B8"
                value={descripcion}
                onChangeText={setDescripcion}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                multiline={Platform.OS !== 'ios'}
                numberOfLines={3}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            <TouchableOpacity
              style={[styles.botonGuardar, guardando && styles.botonDeshabilitado]}
              onPress={handleGuardar}
              disabled={guardando}
              activeOpacity={0.8}
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <Modal visible={modalCatVisible} animationType="fade" transparent>
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <Text style={styles.modalTitulo}>Nueva Categoría</Text>
            <Text style={styles.modalSubtitulo}>Ingresá el nombre del nuevo rubro:</Text>

            <TextInput
              style={styles.inputModal}
              placeholder="Ej: Golosinas, Fiambres..."
              placeholderTextColor="#94A3B8"
              value={nuevaCatTexto}
              onChangeText={setNuevaCatTexto}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.botonModalCancelar}
                onPress={() => {
                  setNuevaCatTexto('');
                  setModalCatVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.textoModalCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botonModalAgregar}
                onPress={handleConfirmarNuevaCategoria}
                activeOpacity={0.7}
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
    backgroundColor: '#F0F9FF', // Fondo celeste sutil característico
  },
  centroCarga: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoCarga: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748B',
  },
  scroll: {
    padding: 20,
    paddingBottom: 100,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 20,
  },
  seccionFoto: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  fotoPreview: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  fotoPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderTexto: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  contenedorBotonesFoto: {
    marginLeft: 16,
    flex: 1,
  },
  botonCamara: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonCamara: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  botonGaleria: {
    backgroundColor: '#0284C7',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  textoBotonGaleria: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  botonEliminarFoto: {
    marginTop: 8,
    alignItems: 'center',
  },
  textoEliminarFoto: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  campo: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
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
    backgroundColor: '#E2E8F0',
  },
  chipSeleccionado: {
    backgroundColor: '#0284C7',
  },
  chipTexto: {
    fontSize: 13,
    color: '#334155',
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
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#0284C7',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoAgregarCategoria: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '600',
  },
  botonGuardar: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  botonDeshabilitado: {
    backgroundColor: '#94A3B8',
  },
  textoBotonGuardar: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContenido: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSubtitulo: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  inputModal: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: '#F1F5F9',
  },
  textoModalCancelar: {
    color: '#334155',
    fontWeight: '600',
  },
  botonModalAgregar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  textoModalAgregar: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});