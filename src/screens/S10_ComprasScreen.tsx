import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { HeaderBackButton } from '../components/HeaderBackButton';
import {
  confirmarCompraYSumarStock,
  guardarPlanillaBorrador,
  ItemCompra,
  obtenerHistorialCompras,
  obtenerPlanillaBorrador,
} from '../services/compraService';
import { Producto, suscribirAProductos } from '../services/productService';
import { sanearEntero, sanearImporte } from '../utils/sanitizers';

export default function S10_ComprasScreen(): React.ReactNode {
  const navigation = useNavigation<any>();

  //Botón de retroceso hacia la pantalla de Inicio
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <HeaderBackButton />,
    });
  }, [navigation]);
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
        setProductos(data || []);
        setCargandoProductos(false);
      },
      (error) => {
        console.error('Error cargando productos para compras:', error);
        setCargandoProductos(false);
      }
    );

    obtenerPlanillaBorrador().then((borrador) => {
      if (borrador && Array.isArray(borrador.items)) {
        setPlanillaItems(borrador.items);
      }
    });

    return () => unsubscribe();
  }, []);

  const productosFiltrados = (productos || []).filter((p) =>
    p?.nombre ? p.nombre.toLowerCase().includes((busqueda || '').trim().toLowerCase()) : false
  );

  const totalCalculado = (planillaItems || []).reduce((acc, item) => acc + (Number(item?.subtotal) || 0), 0);

  // Abrir y cargar historial de compras
  const abrirHistorial = async () => {
    setModalHistorialVisible(true);
    setCargandoHistorial(true);
    try {
      const data = await obtenerHistorialCompras();
      setHistorialCompras(data || []);
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
    const precioCostoVal = (prod as any).precioCosto;
    setPrecioCostoInput(precioCostoVal ? precioCostoVal.toString() : '');
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

    const nuevoTotal = (nuevosItems || []).reduce((acc, item) => acc + (Number(item?.subtotal) || 0), 0);
    await guardarPlanillaBorrador(nuevosItems, nuevoTotal);
  };

  // 5. Quitar un producto de la planilla
  const handleQuitarItem = async (productId: string) => {
    const nuevosItems = (planillaItems || []).filter((item) => item.productId !== productId);
    setPlanillaItems(nuevosItems);
    const nuevoTotal = (nuevosItems || []).reduce((acc, item) => acc + (Number(item?.subtotal) || 0), 0);
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
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {/* Header Buscador + Botón de Historial */}
          <View style={styles.header}>
            <View style={styles.inputBuscadorWrapper}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inputBuscador}
                placeholder="Escribí para buscar un producto..."
                placeholderTextColor="#94A3B8"
                value={busqueda}
                onChangeText={setBusqueda}
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

            <TouchableOpacity
              style={styles.btnHistorialHeader}
              onPress={abrirHistorial}
              activeOpacity={0.8}
            >
              <Ionicons name="time-outline" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.textoBtnHistorial}>Historial</Text>
            </TouchableOpacity>
          </View>

          {/* Selector desplegable de búsqueda */}
          {cargandoProductos ? (
            <ActivityIndicator size="small" color="#0284C7" style={{ marginVertical: 10 }} />
          ) : busqueda.trim().length > 0 ? (
            <View style={styles.resultadosContenedor}>
              <FlatList
                data={productosFiltrados || []}
                keyExtractor={(item) => item.id || Math.random().toString()}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 180 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.itemBusqueda}
                    onPress={() => abrirModalProducto(item)}
                    activeOpacity={0.7}
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
            <Text style={styles.tituloPlanilla}>Planilla de Compras Pendiente</Text>
          </View>

          <FlatList
            data={planillaItems || []}
            keyExtractor={(item) => item.productId}
            contentContainerStyle={styles.listaPlanilla}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={13} color="#0284C7" style={{ marginRight: 2 }} />
                      <Text style={styles.textoBtnEditar}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleQuitarItem(item.productId)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.btnQuitar}>Quitar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.centerEmpty}>
                <Ionicons name="cart-outline" size={48} color="#CBD5E1" style={{ marginBottom: 8 }} />
                <Text style={styles.textoVacio}>
                  La planilla está vacía. Escribí el nombre de un producto en el buscador de arriba para comenzar a armar el pedido.
                </Text>
              </View>
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
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.textoBotonConfirmar}>Ingresar a Stock y Archivar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* MODAL 1: AGREGAR O EDITAR PRODUCTO EN LA PLANILLA */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {esEdicion ? 'Editar en Planilla' : 'Añadir a Planilla'}
              </Text>
              <Text style={styles.modalSub}>{productoSeleccionado?.nombre}</Text>

              <Text style={styles.labelInput}>Cantidad a comprar *</Text>
              <TextInput
                style={styles.inputModal}
                placeholder="Ej: 12"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                value={cantidadInput}
                onChangeText={setCantidadInput}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />

              <Text style={styles.labelInput}>Precio de costo unitario ($)</Text>
              <TextInput
                style={styles.inputModal}
                placeholder="Ej: 850.50"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={precioCostoInput}
                onChangeText={setPrecioCostoInput}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />

              <View style={styles.modalAcciones}>
                <TouchableOpacity
                  style={styles.botonCancelar}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.textoBotonCancelar}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botonGuardar}
                  onPress={handleGuardarEnPlanilla}
                  activeOpacity={0.8}
                >
                  <Text style={styles.textoBotonGuardar}>
                    {esEdicion ? 'Actualizar' : 'Agregar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 2: INGRESO Y VALIDACIÓN DEL TICKET REAL */}
      <Modal visible={modalConfirmacionVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Confirmar Ingreso de Stock</Text>
              <Text style={styles.modalSub}>
                Ingresá el total final que figura en la factura / ticket del mayorista:
              </Text>

              <Text style={styles.labelInput}>Total abonado ($) *</Text>
              <TextInput
                style={styles.inputModal}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={montoTicketInput}
                onChangeText={setMontoTicketInput}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />

              <Text style={styles.infoPlanillaText}>
                Total según planilla actual: ${totalCalculado.toLocaleString('es-AR')}
              </Text>

              <View style={styles.modalAcciones}>
                <TouchableOpacity
                  style={styles.botonCancelar}
                  onPress={() => setModalConfirmacionVisible(false)}
                  disabled={procesando}
                  activeOpacity={0.8}
                >
                  <Text style={styles.textoBotonCancelar}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botonGuardar}
                  onPress={handleEjecutarCompra}
                  disabled={procesando}
                  activeOpacity={0.8}
                >
                  {procesando ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.textoBotonGuardar}>Confirmar y Cargar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 3: HISTORIAL DE PLANILLAS ARCHIVADAS */}
      <Modal visible={modalHistorialVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Historial de Planillas</Text>
            <Text style={styles.modalSub}>Registro de compras finalizadas e ingresadas al stock</Text>

            {cargandoHistorial ? (
              <ActivityIndicator size="large" color="#0284C7" style={{ marginVertical: 30 }} />
            ) : (
              <FlatList
                data={historialCompras || []}
                keyExtractor={(item) => item.id || Math.random().toString()}
                showsVerticalScrollIndicator={false}
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
              activeOpacity={0.8}
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
  container: { 
    flex: 1, 
    backgroundColor: '#F0F9FF', 
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  inputBuscadorWrapper: {
    flex: 1,
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
    height: 44,
    fontSize: 14,
    color: '#0F172A',
  },
  btnHistorialHeader: {
    backgroundColor: '#0284C7',
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  textoBtnHistorial: { 
    color: '#FFFFFF', 
    fontWeight: '600', 
    fontSize: 14, 
  },
  resultadosContenedor: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#0284C7',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  itemBusqueda: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nombreProdBusqueda: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  stockProdBusqueda: { fontSize: 12, color: '#64748B' },
  textoNoResultado: { padding: 14, color: '#64748B', textAlign: 'center', fontSize: 13 },

  planillaHeader: { paddingHorizontal: 16, paddingTop: 16 },
  tituloPlanilla: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  listaPlanilla: { padding: 16, paddingBottom: 100 },
  cardPlanilla: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  nombreItem: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  detalleItem: { fontSize: 12, color: '#64748B', marginTop: 2 },
  subtotalItem: { fontSize: 15, fontWeight: 'bold', color: '#0EA5E9' },
  accionesCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnEditar: { 
    backgroundColor: '#E0F2FE', 
    paddingVertical: 4, 
    paddingHorizontal: 8, 
    borderRadius: 6, 
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoBtnEditar: { fontSize: 12, color: '#0284C7', fontWeight: '600' },
  btnQuitar: { fontSize: 12, color: '#EF4444', fontWeight: 'bold' },
  centerEmpty: { marginTop: 40, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  textoVacio: { textAlign: 'center', color: '#64748B', fontSize: 14 },

  panelInferior: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0F2FE',
    elevation: 8,
  },
  resumenTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  labelTotal: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  montoTotal: { fontSize: 22, fontWeight: 'bold', color: '#0284C7' },
  botonConfirmar: {
    backgroundColor: '#0284C7',
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  textoBotonConfirmar: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },

  // Modales
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E0F2FE' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  modalSub: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  labelInput: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  inputModal: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
    color: '#0F172A',
    fontSize: 15,
  },
  infoPlanillaText: { fontSize: 12, color: '#64748B', fontStyle: 'italic', marginBottom: 16 },
  modalAcciones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  botonCancelar: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#F1F5F9' },
  textoBotonCancelar: { color: '#334155', fontWeight: '600' },
  botonGuardar: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#0284C7' },
  textoBotonGuardar: { color: '#FFFFFF', fontWeight: 'bold' },

  // Historial
  cardHistorial: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fechaHistorial: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  itemsHistorialCount: { fontSize: 12, color: '#64748B', marginTop: 2 },
  totalHistorial: { fontSize: 16, fontWeight: 'bold', color: '#0284C7' },
});