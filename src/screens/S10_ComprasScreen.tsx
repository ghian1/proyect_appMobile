import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Producto, suscribirAProductos } from '../services/productService';
import {
  ItemCompra,
  obtenerPlanillaBorrador,
  guardarPlanillaBorrador,
  confirmarCompraYSumarStock,
} from '../services/compraService';
import { sanearEntero, sanearImporte } from '../utils/sanitizers';

export default function S11_ComprasScreen(): React.ReactNode {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargandoProductos, setCargandoProductos] = useState(true);

  // Planilla activa
  const [planillaItems, setPlanillaItems] = useState<ItemCompra[]>([]);
  const [procesando, setProcesando] = useState(false);

  // Modal para agregar producto a la planilla
  const [modalVisible, setModalVisible] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidadInput, setCantidadInput] = useState('');
  const [precioCostoInput, setPrecioCostoInput] = useState('');

  // 1. Cargar productos y recuperar el borrador si existía
  useEffect(() => {
    const unsubscribe = suscribirAProductos((data) => {
      setProductos(data);
      setCargandoProductos(false);
    });

    // Recuperar la planilla en borrador si el usuario había dejado una armada
    obtenerPlanillaBorrador().then((borrador) => {
      if (borrador && borrador.items) {
        setPlanillaItems(borrador.items);
      }
    });

    return () => unsubscribe();
  }, []);

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalGasto = planillaItems.reduce((acc, item) => acc + item.subtotal, 0);

  // 2. Abrir Modal para ingresar costo y cantidad
  const abrirModalProducto = (prod: Producto) => {
    setProductoSeleccionado(prod);
    setCantidadInput('');
    // Si el producto ya tiene precioCosto guardado, se precarga
    setPrecioCostoInput(prod.precioCosto ? prod.precioCosto.toString() : '');
    setModalVisible(true);
  };

  // 3. Agregar / Actualizar producto en la planilla
  const handleAgregarAPlanilla = async () => {
    if (!productoSeleccionado || !productoSeleccionado.id) return;

    const cantidad = sanearEntero(cantidadInput);
    const precioCosto = sanearImporte(precioCostoInput);

    if (cantidad <= 0) {
      Alert.alert('Cantidad inválida', 'Ingresá una cantidad mayor a 0.');
      return;
    }

    const subtotal = cantidad * precioCosto;

    const nuevosItems = [...planillaItems];
    const indiceExistente = nuevosItems.findIndex(
      (item) => item.productId === productoSeleccionado.id
    );

    if (indiceExistente >= 0) {
      nuevosItems[indiceExistente] = {
        ...nuevosItems[indiceExistente],
        cantidad,
        precioCosto,
        subtotal,
      };
    } else {
      nuevosItems.push({
        productId: productoSeleccionado.id,
        nombre: productoSeleccionado.nombre,
        cantidad,
        precioCosto,
        subtotal,
      });
    }

    setPlanillaItems(nuevosItems);
    setModalVisible(false);

    // Guardar borrador en Firestore para no perder los datos al cerrar la app
    const nuevoTotal = nuevosItems.reduce((acc, item) => acc + item.subtotal, 0);
    await guardarPlanillaBorrador(nuevosItems, nuevoTotal);
  };

  // 4. Quitar un producto de la planilla
  const handleQuitarItem = async (productId: string) => {
    const nuevosItems = planillaItems.filter((item) => item.productId !== productId);
    setPlanillaItems(nuevosItems);
    const nuevoTotal = nuevosItems.reduce((acc, item) => acc + item.subtotal, 0);
    await guardarPlanillaBorrador(nuevosItems, nuevoTotal);
  };

  // 5. Confirmar las compras e ingresar al stock
  const handleConfirmarCompra = async () => {
    if (planillaItems.length === 0) {
      Alert.alert('Planilla vacía', 'Agregá productos antes de confirmar la compra.');
      return;
    }

    Alert.alert(
      'Confirmar Compra',
      `¿Deseás ingresar estas unidades al stock por un total de $${totalGasto.toLocaleString('es-AR')}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar y Cargar Stock',
          onPress: async () => {
            try {
              setProcesando(true);
              await confirmarCompraYSumarStock(planillaItems, totalGasto);
              Alert.alert('¡Éxito!', 'Los productos fueron sumados al inventario correctamente.');
              setPlanillaItems([]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo procesar la compra.');
            } finally {
              setProcesando(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Buscador de Productos del Almacén */}
      <View style={styles.header}>
        <TextInput
          style={styles.inputBuscador}
          placeholder="Buscar producto para pedir a proveedor..."
          placeholderTextColor="#888"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* Selector de productos */}
      {cargandoProductos ? (
        <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 10 }} />
      ) : busqueda.length > 0 ? (
        <View style={styles.resultadosContenedor}>
          <FlatList
            data={productosFiltrados}
            keyExtractor={(item) => item.id || Math.random().toString()}
            style={{ maxHeight: 150 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.itemBusqueda}
                onPress={() => abrirModalProducto(item)}
              >
                <Text style={styles.nombreProdBusqueda}>{item.nombre}</Text>
                <Text style={styles.stockProdBusqueda}>Stock actual: {item.stock || 0} u.</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      {/* PLANILLA DE COMPRAS */}
      <View style={styles.planillaHeader}>
        <Text style={styles.tituloPlanilla}>📋 Planilla de Compras Pendiente</Text>
      </View>

      <FlatList
        data={planillaItems}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={styles.listaPlanilla}
        renderItem={({ item }) => (
          <View style={styles.cardPlanilla}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombreItem}>{item.nombre}</Text>
              <Text style={styles.detalleItem}>
                {item.cantidad} u. x ${item.precioCosto.toLocaleString('es-AR')} (Costo)
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={styles.subtotalItem}>${item.subtotal.toLocaleString('es-AR')}</Text>
              <TouchableOpacity onPress={() => handleQuitarItem(item.productId)}>
                <Text style={styles.btnQuitar}>Quitar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.textoVacio}>
            La planilla está vacía. Buscá productos arriba para armar tu pedido de reposición.
          </Text>
        }
      />

      {/* PANEL INFERIOR DE RESUMEN Y CONFIRMACIÓN */}
      {planillaItems.length > 0 && (
        <View style={styles.panelInferior}>
          <View style={styles.resumenTotal}>
            <Text style={styles.labelTotal}>MONTO TOTAL ESTIMADO</Text>
            <Text style={styles.montoTotal}>${totalGasto.toLocaleString('es-AR')}</Text>
          </View>

          <TouchableOpacity
            style={styles.botonConfirmar}
            onPress={handleConfirmarCompra}
            disabled={procesando}
          >
            {procesando ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.textoBotonConfirmar}>Ingresar a Stock y Archivar 🚚</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL EDITAR CANTIDAD Y PRECIO COSTO */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Añadir a Planilla</Text>
            <Text style={styles.modalSub}>{productoSeleccionado?.nombre}</Text>

            <Text style={styles.labelInput}>Cantidad a comprar *</Text>
            <TextInput
              style={styles.inputModal}
              placeholder="Ej: 12"
              placeholderTextColor="#A0AEC0"
              keyboardType="number-pad"
              value={cantidadInput}
              onChangeText={setCantidadInput}
            />

            <Text style={styles.labelInput}>Precio de costo unitario ($)</Text>
            <TextInput
              style={styles.inputModal}
              placeholder="Ej: 850.50"
              placeholderTextColor="#A0AEC0"
              keyboardType="decimal-pad"
              value={precioCostoInput}
              onChangeText={setPrecioCostoInput}
            />

            <View style={styles.modalAcciones}>
              <TouchableOpacity
                style={styles.botonCancelar}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.textoBotonCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.botonGuardar} onPress={handleAgregarAPlanilla}>
                <Text style={styles.textoBotonGuardar}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  header: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  inputBuscador: {
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  resultadosContenedor: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 3,
    maxHeight: 150,
  },
  itemBusqueda: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nombreProdBusqueda: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  stockProdBusqueda: { fontSize: 12, color: '#6B7280' },

  planillaHeader: { paddingHorizontal: 16, paddingTop: 16 },
  tituloPlanilla: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  listaPlanilla: { padding: 16, paddingBottom: 100 },
  cardPlanilla: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  nombreItem: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  detalleItem: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  subtotalItem: { fontSize: 15, fontWeight: 'bold', color: '#059669' },
  btnQuitar: { fontSize: 12, color: '#EF4444', fontWeight: 'bold' },
  textoVacio: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 14 },

  panelInferior: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 8,
  },
  resumenTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  labelTotal: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  montoTotal: { fontSize: 22, fontWeight: 'bold', color: '#059669' },
  botonConfirmar: {
    backgroundColor: '#059669',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotonConfirmar: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  modalSub: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  labelInput: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  inputModal: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  modalAcciones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  botonCancelar: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#E5E7EB' },
  textoBotonCancelar: { color: '#374151', fontWeight: '600' },
  botonGuardar: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#059669' },
  textoBotonGuardar: { color: '#FFFFFF', fontWeight: 'bold' },
});