import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker'; //Librería para acceder al hardware de la cámara
import { useEffect, useState } from 'react'; //Importamos useEffect para ejecutar código al abrir la pantalla
import {
  ActivityIndicator,
  Alert,
  Image, //Importamos Image para mostrar la foto en pantalla 
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

//Importamos obtenerProductoPorId junto a crear y actualizar
import { actualizarProducto, crearProducto, obtenerProductoPorId } from '../services/productService';
import { StockStackParamList } from '../types/navigation';
import { sanearEntero, sanearImporte } from '../utils/sanitizers'; //usamos los sanear que creamos

type ScreenRouteProp = RouteProp<StockStackParamList, 'ProductEdit'>;
type ScreenNavProp = NativeStackNavigationProp<StockStackParamList, 'ProductEdit'>;

const CATEGORIAS_DISPONIBLES = ['Comestibles', 'Bebidas', 'Limpieza', 'Almacén'];

export function S05_AltaEditarScreen() {
  const navigation = useNavigation<ScreenNavProp>();
  const route = useRoute<ScreenRouteProp>();

  //comprobamos si estamos en modo edición o creación de un producto, dependiendo de si se pasa un productId como parámetro de la ruta.
  const productId = route.params?.productId;
  const esEdicion = Boolean(productId);

  //constantes de estado para los campos del formulario
  const [nombre, setNombre] = useState<string>('');
  // [NUEVO] El estado ahora almacena un array de strings para permitir varias categorías
  const [categorias, setCategorias] = useState<string[]>(['Almacén']);
  const [precioTexto, setPrecioTexto] = useState<string>('');
  const [stockTexto, setStockTexto] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [guardando, setGuardando] = useState<boolean>(false);
  
  //Estado para saber si estamos cargando los datos iniciales desde Firestore
  const [cargandoInicial, setCargandoInicial] = useState<boolean>(false);

  //Estado para guardar la ruta temporal de la foto en el celular (o null si no hay foto)
  const [imagenUri, setImagenUri] = useState<string | null>(null);

  //Efecto que recupera los datos del producto si estamos en modo edición
  useEffect(() => {
    let activo = true;

    const hidratarFormulario = async () => {
      // Si no es edición o no hay productId, no hacemos nada (queda todo vacío para producto nuevo)
      if (!esEdicion || !productId) return;

      try {
        setCargandoInicial(true);
        const productoEncontrado = await obtenerProductoPorId(productId);

        if (productoEncontrado && activo) {
          // Poblamos cada estado local con los datos reales de Firestore
          setNombre(productoEncontrado.nombre || '');

          // [NUEVO] Hidratamos las categorías: si ya es array usamos ese, si es el string viejo lo metemos en array
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

    // Función de limpieza por si el usuario sale de la pantalla antes de que termine la consulta
    return () => {
      activo = false;
    };
  }, [productId, esEdicion]);

  // [NUEVO] Alterna la selección de una categoría (agregar o quitar de la lista)
  const toggleCategoria = (cat: string) => {
    if (categorias.includes(cat)) {
      // Si ya está seleccionada y hay más de una, la quitamos
      if (categorias.length > 1) {
        setCategorias(categorias.filter((item) => item !== cat));
      } else {
        // Regla: no dejar el producto sin ninguna categoría asignada
        Alert.alert('Validación', 'El producto debe pertenecer al menos a una categoría.');
      }
    } else {
      // Si no estaba en la lista, la agregamos
      setCategorias([...categorias, cat]);
    }
  };

  //Función que solicita permisos y abre la cámara nativa del celular
  const tomarFotoConCamara = async () => {
    try {
      //Pedir permisos de cámara (se abre el modal de Android/iOS)
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permiso necesario',
          'Se necesitan permisos de acceso a la cámara para poder fotografiar los productos.'
        );
        return;
      }

      //Disparar la cámara del sistema operativo
      const resultado = await ImagePicker.launchCameraAsync({
        allowsEditing: true, // Le deja a la comerciante recortar la foto
        aspect: [1, 1],      // Forzamos formato cuadrado (1 a 1) para el catálogo
        quality: 0.5,        // Comprime al 50% para que la app responda rápido y no gaste datos
      });

      //Si no tocó cancelar, guardamos la dirección de la foto
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

    // [NUEVO] Comprobamos que al menos una categoría esté elegida
    if (categorias.length === 0) {
      Alert.alert('Validación', 'Seleccioná al menos una categoría.');
      return;
    }

    //Usamos los saneamientos que creamos
    const precioFinal = sanearImporte(precioTexto);
    const stockFinal = sanearEntero(stockTexto);

    //manejo de errores
    try {
      setGuardando(true);

      //Armamos el payload enviando 'categorias' como array y 'categoria' para retrocompatibilidad
      const payload = {
        nombre,
        categorias,
        categoria: categorias[0],
        precio: precioFinal,
        stock: stockFinal,
        descripcion,
        imagenUrl: imagenUri || null, //Persistimos la foto o null si no hay foto. Importante hacer el contrato en el servicio para que acepte null, sino tira error de tipado
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

  //Si está recuperando los datos del producto, mostramos un spinner de carga
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

        {/* SECCIÓN VISUAL PARA SACAR Y PREVISUALIZAR LA FOTO */}
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

        {/*Sección de categorías con selección múltiple interactiva */}
        <View style={styles.campo}>
          <Text style={styles.label}>Categorías (podés elegir varias)</Text>
          <View style={styles.categoriasContenedor}>
            {CATEGORIAS_DISPONIBLES.map((cat) => {
              // [NUEVO] Comprobamos si esta categoría puntual está dentro del array 'categorias'
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
                    {/* [NUEVO] Si está seleccionada le agrega el tilde al lado del nombre */}
                    {cat} {seleccionada ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  //Estilos para el estado de carga
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
  //Estilos de la tarjeta visual de foto
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
    backgroundColor: '#34C759', // Verde iOS prolijo para la acción de foto
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
  // Fin de estilos nuevos de cámara
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
});