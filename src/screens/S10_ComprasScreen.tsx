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
import { suscribirAProductos, Producto } from '../services/productService';
import {
  ItemCompra,
  obtenerPlanillaBorrador,
  guardarPlanillaBorrador,
  confirmarCompraYSumarStock,
  obtenerHistorialCompras, // 👈 Asegurate de tenerlo o definirlo en tu servicio
} from '../services/compraService';
import { sanearEntero, sanearImporte } from '../utils/sanitizers';

export default function S10_ComprasScreen(): React.ReactNode {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargandoProductos, setCargandoProductos] = useState(true);

  // Planilla activa
  const [planillaItems, setPlanillaItems] = useState<ItemCompra[]>([]);
  const [procesando, setProcesando] = useState(false);

  // Modal 1: Agregar/Editar producto en planilla
  const [modalVisible, setModalVisible] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidadInput, setCantidadInput] = useState('');
  const [precioCostoInput, setPrecioCostoInput] = useState('');
  const [esEdicion, setEsEdicion] = useState(false);

  // Modal 2: Confirmar compra con total de ticket real
  const [modalConfirmacionVisible, setModalConfirmacionVisible] = useState(false);
  const [montoTicketInput, setMontoTicketInput] = useState('');

  // Modal 3: Historial de Planillas
  const [modalHistorialVisible, setModalHistorialVisible] = useState(false);
  const [historialCompras, setHistorialCompras] = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // 1. Cargar productos y recuperar borrador
  useEffect(() => {
    const unsubscribe = suscribirAProductos(
      (data) => {
        setProductos(data);
        setCargandoProductos(false);
      },
      (error) => {
        console.error('Error cargando productos para compras:', error);
        setCargandoProductos(false);
      }
    );

    obtenerPlanillaBorrador().then((borrador) => {
      if (borrador && borrador.items) {
        setPlanillaItems(borrador.items);
      }
    });

    return () => unsubscribe();
  }, []);

  const productosFiltrados = productos.filter((p) =>
    p.nombre ? p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()) : false
  );

  const totalCalculado = planillaItems.reduce((acc, item) => acc + item.subtotal, 0);

  // Abrir y cargar historial de compras
  const abrirHistorial = async () => {
    setModalHistorialVisible(true);
    setCargandoHistorial(true);
    try {
      const data = await obtenerHistorialCompras();
      setHistorialCompras(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el historial de compras.');
    } finally {
      setCargandoHistorial(false);
    }
  };

  // 2. Abrir Modal para ingresar un nuevo producto desde la búsqueda
  const abrirModalProducto = (prod: Producto) => {
    setProductoSeleccionado(prod);
    setCantidadInput('');
    setPrecioCostoInput(prod.precioCosto ? prod.precioCosto.toString() : '');
    setEsEdicion(false);
    setModalVisible(true);
  };

  // 3. Abrir Modal para EDITAR un producto que ya está en la planilla
  const abrirModalEditarItem = (item: ItemCompra) => {
    const prodRef = productos.find((p) => p.id === item.productId) || {
      id: item.productId,
      nombre: item.nombre,
      precio: 0,
      stock: 0,
    };

    setProductoSeleccionado(prodRef);
    setCantidadInput(item.cantidad.toString());
    setPrecioCostoInput(item.precioCosto.toString());
    setEsEdicion(true);
    setModalVisible(true);
  };

  // 4. Guardar o Actualizar producto en la planilla
  const handleGuardarEnPlanilla = async () => {
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
    setBusqueda('');
    setModalVisible(false);

    const nuevoTotal = nuevosItems.reduce((acc, item) => acc + item.subtotal, 0);
    await guardarPlanillaBorrador(nuevosItems, nuevoTotal);
  };

  // 5. Quitar un producto de la planilla
  const handleQuitarItem = async (productId: string) => {
    const nuevosItems = planillaItems.filter((item) => item.productId !== productId);
    setPlanillaItems(nuevosItems);
    const nuevoTotal = nuevosItems.reduce((acc, item) => acc + item.subtotal, 0);
    await guardarPlanillaBorrador(nuevosItems, nuevoTotal);
  };

  // 6. Abrir modal de validación del ticket
  const handleIniciarConfirmacion = () => {
    if (planillaItems.length === 0) {
      Alert.alert('Planilla vacía', 'Agregá productos antes de ingresar la compra.');
      return;
    }
    setMontoTicketInput(totalCalculado > 0 ? totalCalculado.toString() : '');
    setModalConfirmacionVisible(true);
  };

  // 7. Procesar compra
  const handleEjecutarCompra = async () => {
    const montoTicket = sanearImporte(montoTicketInput);

    if (montoTicket <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresá un total válido del ticket.');
      return;
    }

    const diferencia = Math.abs(montoTicket - totalCalculado);

    if (diferencia > 0.01) {
      const esMayor = montoTicket > totalCalculado;
      const mensajeDiferencia = `El total ingresado ($${montoTicket.toLocaleString('es-AR')}) es ${
        esMayor ? 'mayor' : 'menor'
      } que el calculado en la planilla ($${totalCalculado.toLocaleString('es-AR')}) por una diferencia de $${diferencia.toLocaleString('es-AR')}.\n\n¿Querés registrar el costo real del ticket de todas formas?`;

      Alert.alert('Diferencia de Monto', mensajeDiferencia, [
        { text: 'Revisar Planilla', style: 'cancel' },
        {
          text: 'Confirmar con Total Ticket',
          onPress: () => procesarImpactoStock(montoTicket),
        },
      ]);
    } else {
      await procesarImpactoStock(montoTicket);
    }
  };

  const procesarImpactoStock = async (montoFinal: number) => {
    try {
      setProcesando(true);
      await confirmarCompraYSumarStock(planillaItems, montoFinal);
      setModalConfirmacionVisible(false);
      Alert.alert('¡Éxito!', 'Los productos fueron sumados al inventario correctamente.');
      setPlanillaItems([]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo procesar la compra.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Header Buscador + Botón de Historial */}
      <View style={styles.header}>
        <TextInput
          style={styles.inputBuscador}
          placeholder="Escribí para buscar un producto..."
          placeholderTextColor="#888"
          value={busqueda}
          onChangeText={setBusqueda}
        />
        <TouchableOpacity style={styles.btnHistorialHeader} onPress={abrirHistorial}>
          <Text style={styles.textoBtnHistorial}>📜 Historial</Text>
        </TouchableOpacity>
      </View>

      {/* Selector desplegable de búsqueda */}
      {cargandoProductos ? (
        <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 10 }} />
      ) : busqueda.trim().length > 0 ? (
        <View style={styles.resultadosContenedor}>
          <FlatList
            data={productosFiltrados}
            keyExtractor={(item) => item.id || Math.random().toString()}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 180 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.itemBusqueda}
                onPress={() => abrirModalProducto(item)}
              >
                <Text style={styles.nombreProdBusqueda}>{item.nombre}</Text>
                <Text style={styles.stockProdBusqueda}>Stock actual: {item.stock || 0} u.</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.textoNoResultado}>
                No se encontraron productos con ese nombre.
              </Text>
            }
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
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={styles.cardPlanilla}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.nombreItem}>{item.nombre}</Text>
              <Text style={styles.detalleItem}>
                {item.cantidad} u. x ${item.precioCosto.toLocaleString('es-AR')} (Costo)
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={styles.subtotalItem}>${item.subtotal.toLocaleString('es-AR')}</Text>

              <View style={styles.accionesCard}>
                <TouchableOpacity
                  style={styles.btnEditar}
                  onPress={() => abrirModalEditarItem(item)}
                >
                  <Text style={styles.textoBtnEditar}>✏️ Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleQuitarItem(item.productId)}>
                  <Text style={styles.btnQuitar}>Quitar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.textoVacio}>
            La planilla está vacía. Escribí el nombre de un producto en el buscador de arriba para comenzar a armar el pedido.
          </Text>
        }
      />

      {/* PANEL INFERIOR DE TOTAL Y CONFIRMACIÓN */}
      {planillaItems.length > 0 && (
        <View style={styles.panelInferior}>
          <View style={styles.resumenTotal}>
            <Text style={styles.labelTotal}>MONTO PLANILLA ESTIMADO</Text>
            <Text style={styles.montoTotal}>${totalCalculado.toLocaleString('es-AR')}</Text>
          </View>

          <TouchableOpacity
            style={styles.botonConfirmar}
            onPress={handleIniciarConfirmacion}
            disabled={procesando}
          >
            <Text style={styles.textoBotonConfirmar}>Ingresar a Stock y Archivar 🚚</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL 1: AGREGAR O EDITAR PRODUCTO EN LA PLANILLA */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {esEdicion ? 'Editar en Planilla' : 'Añadir a Planilla'}
            </Text>
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

              <TouchableOpacity style={styles.botonGuardar} onPress={handleGuardarEnPlanilla}>
                <Text style={styles.textoBotonGuardar}>
                  {esEdicion ? 'Actualizar' : 'Agregar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: INGRESO Y VALIDACIÓN DEL TICKET REAL */}
      <Modal visible={modalConfirmacionVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar Ingreso de Stock</Text>
            <Text style={styles.modalSub}>
              Ingresá el total final que figura en la factura / ticket del mayorista:
            </Text>

            <Text style={styles.labelInput}>Total abonado ($) *</Text>
            <TextInput
              style={styles.inputModal}
              placeholder="0.00"
              placeholderTextColor="#A0AEC0"
              keyboardType="decimal-pad"
              value={montoTicketInput}
              onChangeText={setMontoTicketInput}
            />

            <Text style={styles.infoPlanillaText}>
              Total según planilla actual: ${totalCalculado.toLocaleString('es-AR')}
            </Text>

            <View style={styles.modalAcciones}>
              <TouchableOpacity
                style={styles.botonCancelar}
                onPress={() => setModalConfirmacionVisible(false)}
                disabled={procesando}
              >
                <Text style={styles.textoBotonCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botonGuardar}
                onPress={handleEjecutarCompra}
                disabled={procesando}
              >
                {procesando ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.textoBotonGuardar}>Confirmar y Cargar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: HISTORIAL DE PLANILLAS ARCHIVADAS */}
      <Modal visible={modalHistorialVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>📜 Historial de Planillas</Text>
            <Text style={styles.modalSub}>Registro de compras finalizadas e ingresadas al stock</Text>

            {cargandoHistorial ? (
              <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 30 }} />
            ) : (
              <FlatList
                data={historialCompras}
                keyExtractor={(item) => item.id || Math.random().toString()}
                renderItem={({ item }) => {
                  const fechaFormat = item.fecha
                    ? new Date(item.fecha.seconds * 1000).toLocaleString('es-AR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : 'Fecha N/A';

                  return (
                    <View style={styles.cardHistorial}>
                      <View>
                        <Text style={styles.fechaHistorial}>Planilla - {fechaFormat}</Text>
                        <Text style={styles.itemsHistorialCount}>
                          {item.items?.length || 0} productos comprados
                        </Text>
                      </View>
                      <Text style={styles.totalHistorial}>
                        ${(item.montoTotal || 0).toLocaleString('es-AR')}
                      </Text>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.textoVacio}>No hay planillas archivadas aún.</Text>
                }
              />
            )}

            <TouchableOpacity
              style={[styles.botonCancelar, { marginTop: 16, alignItems: 'center' }]}
              onPress={() => setModalHistorialVisible(false)}
            >
              <Text style={styles.textoBotonCancelar}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  inputBuscador: {
    flex: 1,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  btnHistorialHeader: {
    backgroundColor: '#3B82F6',
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBtnHistorial: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  resultadosContenedor: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    zIndex: 10,
  },
  itemBusqueda: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nombreProdBusqueda: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  stockProdBusqueda: { fontSize: 12, color: '#6B7280' },
  textoNoResultado: { padding: 14, color: '#888', textAlign: 'center', fontSize: 13 },

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
  accionesCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnEditar: { backgroundColor: '#E0F2FE', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  textoBtnEditar: { fontSize: 11, color: '#0284C7', fontWeight: '600' },
  btnQuitar: { fontSize: 12, color: '#EF4444', fontWeight: 'bold' },
  textoVacio: { textAlign: 'center', color: '#888', marginTop: 30, fontSize: 14, paddingHorizontal: 20 },

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

  // Modales
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
    color: '#1F2937',
  },
  infoPlanillaText: { fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginBottom: 16 },
  modalAcciones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  botonCancelar: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#E5E7EB' },
  textoBotonCancelar: { color: '#374151', fontWeight: '600' },
  botonGuardar: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#059669' },
  textoBotonGuardar: { color: '#FFFFFF', fontWeight: 'bold' },

  // Historial
  cardHistorial: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fechaHistorial: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },
  itemsHistorialCount: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  totalHistorial: { fontSize: 16, fontWeight: 'bold', color: '#059669' },
});