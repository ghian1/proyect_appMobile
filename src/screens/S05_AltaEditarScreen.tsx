import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { actualizarProducto, crearProducto } from '../services/productService';
import { StockStackParamList } from '../types/navigation';
import { sanearEntero, sanearImporte } from '../utils/sanitizers'; //usamos los sanear 

type ScreenRouteProp = RouteProp<StockStackParamList, 'ProductEdit'>;
type ScreenNavProp = NativeStackNavigationProp<StockStackParamList, 'ProductEdit'>;

const CATEGORIAS_DISPONIBLES = ['Comestibles', 'Bebidas', 'Limpieza', 'Almacén'];

export function S05_AltaEditarScreen() {
  const navigation = useNavigation<ScreenNavProp>();
  const route = useRoute<ScreenRouteProp>();

  //comprobamos si estamos en modo edición o creación de un producto, dependiendo de si se pasa un productId como parámetro de la ruta.
  const productId = route.params?.productId;
  const esEdicion = Boolean(productId);

  const [nombre, setNombre] = useState<string>('');
  const [categoria, setCategoria] = useState<string>('Almacén');
  const [precioTexto, setPrecioTexto] = useState<string>('');
  const [stockTexto, setStockTexto] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [guardando, setGuardando] = useState<boolean>(false);
  

  const handleGuardar = async () => {
    if (!nombre.trim() || nombre.trim().length < 2) {
      Alert.alert('Validación', 'El nombre debe tener al menos 2 caracteres.');
      return;
    }

    //Usamos los saneamientos que creamos
    const precioFinal = sanearImporte(precioTexto);
    const stockFinal = sanearEntero(stockTexto);

    //manejo de errores
    try {
      setGuardando(true);

      if (esEdicion && productId) {
        await actualizarProducto(productId, {
          nombre,
          categoria,
          precio: precioFinal,
          stock: stockFinal,
          descripcion,
        });
        Alert.alert('Éxito', 'Producto modificado correctamente.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await crearProducto({
          nombre,
          categoria,
          precio: precioFinal,
          stock: stockFinal,
          descripcion,
        });
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

  return (
    <SafeAreaView style={styles.contenedor}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.titulo}>
          {esEdicion ? 'Editar Mercadería' : 'Nueva Mercadería'}
        </Text>

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
      <Text style={styles.label}>Categoría</Text>
      <View style={styles.categoriasContenedor}>
        {CATEGORIAS_DISPONIBLES.map((cat) => {
          const seleccionada = categoria === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, seleccionada ? styles.chipSeleccionado : null]}                  
              onPress={() => setCategoria(cat)}
            >
              <Text
                style={[
                  styles.chipTexto,
                  seleccionada ? styles.chipTextoSeleccionado : null,
                ]}
              >
                {cat}
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
  scroll: {
    padding: 20,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 20,
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