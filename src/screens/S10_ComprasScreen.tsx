import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
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
  sanitizarItemCompra,
} from '../services/compraService';
import { Producto, suscribirAProductos } from '../services/productService';
import { formatearStock, sanearEntero, sanearImporte } from '../utils/sanitizers';

export default function S10_ComprasScreen(): React.ReactNode {
  const navigation = useNavigation<any>();

  // Botón de retroceso hacia la pantalla de Inicio
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
  const [unidadModal, setUnidadModal] = useState<'u' | 'g'>('u');
  const [subUnidadPeso, setSubUnidadPeso] = useState<'kg' | 'g'>('g');
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

  // 1. Cargar productos en tiempo real
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = suscribirAProductos(
      (data) => {
        if (isMounted) {
          setProductos(data || []);
          setCargandoProductos(false);
        }
      },
      (error) => {
        console.error('Error cargando productos para compras:', error);
        if (isMounted) setCargandoProductos(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Persistencia y sincronización del borrador al entrar o volver al módulo
  useFocusEffect(
    useCallback(() => {
      let isFocused = true;
      obtenerPlanillaBorrador()
        .then((borrador) => {
          if (isFocused && borrador && Array.isArray(borrador.items)) {
            setPlanillaItems(borrador.items.map(sanitizarItemCompra));
          }
        })
        .catch((err) => {
          console.error('Error al recuperar planilla borrador en foco:', err);
        });

      return () => {
        isFocused = false;
      };
    }, [])
  );

  const productosFiltrados = (productos || []).filter((p) =>
    p?.nombre ? p.nombre.toLowerCase().includes((busqueda || '').trim().toLowerCase()) : false
  );

  const totalCalculado = Number(
    (planillaItems || []).reduce((acc, item) => acc + (Number(item?.subtotal) || 0), 0).toFixed(2)
  );

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

  // 3. Abrir Modal para ingresar un nuevo producto desde la búsqueda
  const abrirModalProducto = (prod: Producto) => {
    setProductoSeleccionado(prod);
    setCantidadInput('');
    setPrecioCostoInput('');
    const alPeso = Boolean(prod.esAlPeso);
    setUnidadModal(alPeso ? 'g' : 'u');
    setSubUnidadPeso('g');
    setEsEdicion(false);
    setModalVisible(true);
  };

  // 4. Abrir Modal para EDITAR un producto que ya está en la planilla
  const abrirModalEditarItem = (item: ItemCompra) => {
    const prodRef = productos.find((p) => p.id === item.productId) || {
      id: item.productId,
      nombre: item.nombre,
      precio: 0,
      stock: 0,
      esAlPeso: item.esAlPeso,
    };

    setProductoSeleccionado(prodRef);
    const esPeso = item.unidadMedida === 'g' || item.esAlPeso;
    setUnidadModal(esPeso ? 'g' : 'u');
    setSubUnidadPeso('g');
    setCantidadInput(item.cantidad ? item.cantidad.toString() : '');

    // Para productos al peso, el input de precio es el TOTAL de la compra ($)
    if (esPeso) {
      setPrecioCostoInput(
        item.subtotal ? item.subtotal.toString() : ((item.cantidad / 100) * item.precioCosto).toFixed(2)
      );
    } else {
      setPrecioCostoInput(item.precioCosto ? item.precioCosto.toString() : '');
    }

    setEsEdicion(true);
    setModalVisible(true);
  };

  // Manejo de cambio de unidad de peso (kilos <-> gramos)
  const alternarSubUnidadPeso = (nuevaSubUnidad: 'kg' | 'g') => {
    if (nuevaSubUnidad === subUnidadPeso) return;
    if (cantidadInput.trim().length > 0) {
      if (nuevaSubUnidad === 'kg') {
        const gramos = sanearEntero(cantidadInput);
        if (gramos > 0) {
          setCantidadInput((gramos / 1000).toString());
        }
      } else {
        const kilos = sanearImporte(cantidadInput);
        if (kilos > 0) {
          setCantidadInput(Math.round(kilos * 1000).toString());
        }
      }
    }
    setSubUnidadPeso(nuevaSubUnidad);
  };

  // Cálculos dinámicos en vivo para el modal al peso
  const gramosCalculadosModal =
    unidadModal === 'g'
      ? subUnidadPeso === 'kg'
        ? Math.round(sanearImporte(cantidadInput) * 1000)
        : sanearEntero(cantidadInput)
      : 0;

  const precioTotalCalculadoModal = unidadModal === 'g' ? sanearImporte(precioCostoInput) : 0;
  const costoPorKgModal =
    gramosCalculadosModal > 0 ? Number(((precioTotalCalculadoModal / gramosCalculadosModal) * 1000).toFixed(2)) : 0;
  const costoCada100gModal =
    gramosCalculadosModal > 0 ? Number(((precioTotalCalculadoModal / gramosCalculadosModal) * 100).toFixed(2)) : 0;

  // 5. Guardar o Actualizar producto en la planilla
  const handleGuardarEnPlanilla = async () => {
    if (!productoSeleccionado || !productoSeleccionado.id) return;

    const esGramos = unidadModal === 'g';
    let cantidad = 0;
    let subtotal = 0;
    let precioCosto = 0;
    let precioUnitario = 0;
    let detalleFormateado = '';

    if (esGramos) {
      const gramos =
        subUnidadPeso === 'kg'
          ? Math.round(sanearImporte(cantidadInput) * 1000)
          : sanearEntero(cantidadInput);

      const precioTotal = sanearImporte(precioCostoInput);

      if (gramos <= 0) {
        Alert.alert('Cantidad requerida', 'Ingresá una cantidad mayor a 0 (ej: 5000 g o 5 kg).');
        return;
      }
      if (precioTotal <= 0) {
        Alert.alert('Precio total requerido', 'Ingresá el precio total abonado por la compra del producto.');
        return;
      }

      cantidad = gramos;
      subtotal = Number(precioTotal.toFixed(2));
      // Costo cada 100g calculado internamente para actualizar la ficha del producto
      precioCosto = Number(((precioTotal / gramos) * 100).toFixed(2));
      precioUnitario = precioCosto;

      if (gramos >= 1000) {
        const kg = Number((gramos / 1000).toFixed(2));
        detalleFormateado = `Comprado: ${kg} kg (${gramos} g)`;
      } else {
        detalleFormateado = `Comprado: ${gramos} g`;
      }
    } else {
      cantidad = sanearEntero(cantidadInput);
      precioCosto = sanearImporte(precioCostoInput);
      precioUnitario = precioCosto;

      if (cantidad <= 0) {
        Alert.alert('Cantidad requerida', 'Ingresá una cantidad en unidades mayor a 0.');
        return;
      }
      if (precioCosto <= 0) {
        Alert.alert('Precio de costo requerido', 'Ingresá el precio de costo unitario mayor a 0.');
        return;
      }

      subtotal = Number((cantidad * precioCosto).toFixed(2));
      detalleFormateado = `Comprado: ${cantidad} u.`;
    }

    // Sanitizar objeto para garantizar que NUNCA tenga propiedades undefined
    const itemPlanilla: ItemCompra = sanitizarItemCompra({
      productId: productoSeleccionado.id,
      nombre: productoSeleccionado.nombre,
      cantidad,
      gramos: esGramos ? cantidad : 0,
      precioCosto,
      precioUnitario,
      subtotal,
      esAlPeso: esGramos,
      unidadMedida: esGramos ? 'g' : 'u',
      detalleFormateado,
    });

    const nuevosItems = [...planillaItems];
    const indiceExistente = nuevosItems.findIndex(
      (item) => item.productId === productoSeleccionado.id
    );

    if (indiceExistente >= 0) {
      nuevosItems[indiceExistente] = itemPlanilla;
    } else {
      nuevosItems.push(itemPlanilla);
    }

    setPlanillaItems(nuevosItems);
    setBusqueda('');
    setModalVisible(false);

    const nuevoTotal = Number(
      nuevosItems.reduce((acc, item) => acc + (Number(item?.subtotal) || 0), 0).toFixed(2)
    );

    try {
      await guardarPlanillaBorrador(nuevosItems, nuevoTotal);
    } catch (err) {
      console.error('Error al persistir planilla borrador:', err);
    }
  };

  // 6. Quitar un producto de la planilla
  const handleQuitarItem = async (productId: string) => {
    const nuevosItems = (planillaItems || []).filter((item) => item.productId !== productId);
    setPlanillaItems(nuevosItems);
    const nuevoTotal = Number(
      nuevosItems.reduce((acc, item) => acc + (Number(item?.subtotal) || 0), 0).toFixed(2)
    );
    try {
      await guardarPlanillaBorrador(nuevosItems, nuevoTotal);
    } catch (err) {
      console.error('Error al actualizar planilla borrador:', err);
    }
  };

  // 7. Abrir modal de validación del ticket
  const handleIniciarConfirmacion = () => {
    if (planillaItems.length === 0) {
      Alert.alert('Planilla vacía', 'Agregá productos antes de ingresar la compra.');
      return;
    }
    setMontoTicketInput(totalCalculado > 0 ? totalCalculado.toFixed(2) : '');
    setModalConfirmacionVisible(true);
  };

  // 8. Procesar compra
  const handleEjecutarCompra = async () => {
    const totalAbonado = sanearImporte(montoTicketInput);
    if (totalAbonado <= 0) {
      Alert.alert('Monto Inválido', 'Ingresá el costo total real pagado en la compra.');
      return;
    }

    try {
      setProcesando(true);
      await confirmarCompraYSumarStock(planillaItems, totalAbonado);
      setPlanillaItems([]);
      setModalConfirmacionVisible(false);
      setMontoTicketInput('');
      Alert.alert('Éxito', '¡La mercadería fue sumada al inventario y archivada con éxito!');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo procesar la compra.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {/* BUSCADOR SUPERIOR */}
          <View style={styles.headerBusqueda}>
            <View style={styles.inputContainer}>
              <Ionicons name="search-outline" size={20} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inputBusqueda}
                placeholder="Escribí para buscar un producto..."
                placeholderTextColor="#94A3B8"
                value={busqueda}
                onChangeText={setBusqueda}
                returnKeyType="search"
              />
              {busqueda.length > 0 && (
                <TouchableOpacity onPress={() => setBusqueda('')}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.botonHistorial} onPress={abrirHistorial}>
              <Ionicons name="time-outline" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.textoBotonHistorial}>Historial</Text>
            </TouchableOpacity>
          </View>

          {/* LISTA DESPLEGABLE DE BÚSQUEDA */}
          {busqueda.trim().length > 0 ? (
            <View style={styles.contenedorResultados}>
              {cargandoProductos && <ActivityIndicator color="#0284C7" style={{ margin: 10 }} />}
              <FlatList
                data={productosFiltrados}
                keyExtractor={(item, index) => (item?.id ? `${item.id}_${index}` : `prod_${index}`)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const stockDisplay = formatearStock(item.stock ?? 0, item.esAlPeso);
                  return (
                    <TouchableOpacity
                      style={styles.itemBusqueda}
                      onPress={() => abrirModalProducto(item)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.nombreProdBusqueda}>{item.nombre}</Text>
                        <Text style={styles.stockProdBusqueda}>{stockDisplay}</Text>
                      </View>
                      {item.esAlPeso && (
                        <View style={styles.badgeBusquedaAlPeso}>
                          <Ionicons name="scale-outline" size={11} color="#0284C7" />
                          <Text style={styles.textoBadgeBusquedaAlPeso}>Al peso</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
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
            keyExtractor={(item, index) => (item?.productId ? `${item.productId}_${index}` : `item_${index}`)}
            contentContainerStyle={styles.listaPlanilla}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              if (!item) return null;
              let textoCantidadCosto = '';
              const esPeso = item.unidadMedida === 'g' || item.esAlPeso;

              if (esPeso) {
                const cant = Number(item.cantidad ?? 0);
                const displayPeso =
                  cant >= 1000
                    ? `${Number((cant / 1000).toFixed(2))} kg (${cant} g)`
                    : `${cant} g`;
                textoCantidadCosto = `${displayPeso} • Costo: $${Number(item?.precioCosto ?? 0).toLocaleString('es-AR')} (cada 100g)`;
              } else {
                textoCantidadCosto = `${item.cantidad ?? 0} u. x $${Number(item?.precioCosto ?? 0).toLocaleString('es-AR')} (Costo)`;
              }

              return (
                <View style={styles.cardPlanilla}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.nombreItem}>{item.nombre}</Text>
                      {item.esAlPeso && (
                        <View style={styles.badgeMiniAlPeso}>
                          <Text style={styles.textoBadgeMiniAlPeso}>Al peso</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.detalleItem}>{textoCantidadCosto}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={styles.subtotalItem}>
                      ${Number(item?.subtotal ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </Text>

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
              );
            }}
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
                <Text style={styles.montoTotal}>
                  ${totalCalculado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Text>
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

              {/* Selector de Unidades y Gramos los dos al lado */}
              <View style={styles.campoModal}>
                <Text style={styles.labelInput}>Unidad para ingresar la compra:</Text>
                <View style={styles.selectorUnidadContainer}>
                  <TouchableOpacity
                    testID="btn-unidad-u"
                    style={[
                      styles.botonUnidad,
                      unidadModal === 'u' && styles.botonUnidadActivo,
                    ]}
                    onPress={() => setUnidadModal('u')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="cube-outline"
                      size={15}
                      color={unidadModal === 'u' ? '#FFFFFF' : '#64748B'}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[
                        styles.textoBotonUnidad,
                        unidadModal === 'u' && styles.textoBotonUnidadActivo,
                      ]}
                    >
                      Unidades (u)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="btn-unidad-g"
                    style={[
                      styles.botonUnidad,
                      unidadModal === 'g' && styles.botonUnidadActivo,
                    ]}
                    onPress={() => setUnidadModal('g')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="scale-outline"
                      size={15}
                      color={unidadModal === 'g' ? '#FFFFFF' : '#64748B'}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[
                        styles.textoBotonUnidad,
                        unidadModal === 'g' && styles.textoBotonUnidadActivo,
                      ]}
                    >
                      Gramos (g)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sub-selector de Kilos o Gramos cuando es al peso */}
              {unidadModal === 'g' && (
                <View style={styles.campoModal}>
                  <View style={styles.selectorSubPesoContainer}>
                    <TouchableOpacity
                      testID="btn-peso-g"
                      style={[
                        styles.botonSubPeso,
                        subUnidadPeso === 'g' && styles.botonSubPesoActivo,
                      ]}
                      onPress={() => alternarSubUnidadPeso('g')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.textoSubPeso,
                          subUnidadPeso === 'g' && styles.textoSubPesoActivo,
                        ]}
                      >
                        En Gramos (g)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      testID="btn-peso-kg"
                      style={[
                        styles.botonSubPeso,
                        subUnidadPeso === 'kg' && styles.botonSubPesoActivo,
                      ]}
                      onPress={() => alternarSubUnidadPeso('kg')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.textoSubPeso,
                          subUnidadPeso === 'kg' && styles.textoSubPesoActivo,
                        ]}
                      >
                        En Kilos (kg)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* INPUT DE CANTIDAD */}
              <Text style={styles.labelInput}>
                {unidadModal === 'g'
                  ? subUnidadPeso === 'kg'
                    ? 'Cantidad total comprada (kilos) *'
                    : 'Cantidad a ingresar en gramos (g) *'
                  : 'Cantidad a comprar (unidades) *'}
              </Text>
              <TextInput
                testID="input-cantidad-compra"
                style={styles.inputModal}
                placeholder={
                  unidadModal === 'g'
                    ? subUnidadPeso === 'kg'
                      ? 'Ej: 3.5 (para 3.5 kg)'
                      : 'Ej: 5000 (para 5 kg)'
                    : 'Ej: 12'
                }
                placeholderTextColor="#94A3B8"
                keyboardType={unidadModal === 'g' && subUnidadPeso === 'kg' ? 'decimal-pad' : 'number-pad'}
                value={cantidadInput}
                onChangeText={setCantidadInput}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />

              {/* AYUDAS VISUALES DE CONVERSIÓN EN VIVO */}
              {unidadModal === 'g' && subUnidadPeso === 'g' && Boolean(cantidadInput && sanearEntero(cantidadInput) >= 1000) && (
                <Text style={styles.notaConversion}>
                  💡 Equivale a {Number((sanearEntero(cantidadInput) / 1000).toFixed(2))} kg para el inventario.
                </Text>
              )}
              {unidadModal === 'g' && subUnidadPeso === 'kg' && Boolean(cantidadInput && sanearImporte(cantidadInput) > 0) && (
                <Text style={styles.notaConversion}>
                  💡 Equivale a {Math.round(sanearImporte(cantidadInput) * 1000).toLocaleString('es-AR')} gramos exactos para el inventario.
                </Text>
              )}

              {/* INPUT DE PRECIO: PRECIO TOTAL PARA AL PESO O UNITARIO PARA UNIDADES */}
              <Text style={styles.labelInput}>
                {unidadModal === 'g'
                  ? 'Precio TOTAL de la compra ($) *'
                  : 'Precio de costo unitario ($) *'}
              </Text>
              <TextInput
                testID="input-costo-compra"
                style={styles.inputModal}
                placeholder={unidadModal === 'g' ? 'Ej: 25000 (total abonado)' : 'Ej: 850.50'}
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={precioCostoInput}
                onChangeText={setPrecioCostoInput}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />

              {/* DESGLOSE AUTOMÁTICO DE COSTO CALCULADO PARA PRODUCTOS AL PESO */}
              {unidadModal === 'g' && gramosCalculadosModal > 0 && precioTotalCalculadoModal > 0 && (
                <View style={styles.cajaCostoCalculado}>
                  <Ionicons name="calculator-outline" size={15} color="#0284C7" style={{ marginRight: 6 }} />
                  <Text style={styles.textoCostoCalculado}>
                    Costo calculado: ${costoCada100gModal.toLocaleString('es-AR')} cada 100g (${costoPorKgModal.toLocaleString('es-AR')} / kg)
                  </Text>
                </View>
              )}

              <View style={styles.modalAcciones}>
                <TouchableOpacity
                  style={styles.botonCancelar}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.textoBotonCancelar}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="btn-confirmar-item-compra"
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

      {/* MODAL 2: CONFIRMAR COMPRA CON MONTO TOTAL DE TICKET */}
      <Modal visible={modalConfirmacionVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Confirmar Ingreso de Compra</Text>
              <Text style={styles.modalSub}>
                Ingresá el importe final pagado al proveedor según el ticket.
              </Text>

              <Text style={styles.labelInput}>Monto total real abonado ($) *</Text>
              <TextInput
                style={styles.inputModal}
                placeholder="Ej: 45000.00"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={montoTicketInput}
                onChangeText={setMontoTicketInput}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />

              <Text style={styles.infoPlanillaText}>
                Al confirmar, se incrementarán automáticamente las existencias en el inventario y la planilla se archivará en el historial.
              </Text>

              <View style={styles.modalAcciones}>
                <TouchableOpacity
                  style={styles.botonCancelar}
                  onPress={() => setModalConfirmacionVisible(false)}
                  disabled={procesando}
                  activeOpacity={0.8}
                >
                  <Text style={styles.textoBotonCancelar}>Volver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.botonGuardar, procesando && { opacity: 0.7 }]}
                  onPress={handleEjecutarCompra}
                  disabled={procesando}
                  activeOpacity={0.8}
                >
                  {procesando ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.textoBotonGuardar}>Confirmar y Sumar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 3: HISTORIAL DE COMPRAS PASADAS */}
      <Modal visible={modalHistorialVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>Historial de Compras</Text>
              <TouchableOpacity onPress={() => setModalHistorialVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {cargandoHistorial ? (
              <ActivityIndicator color="#0284C7" style={{ marginVertical: 30 }} />
            ) : (
              <FlatList
                data={historialCompras}
                keyExtractor={(item, index) => (item?.id ? `${item.id}_${index}` : `hist_${index}`)}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  let fechaTexto = 'Sin fecha';
                  if (item.finalizadaAt) {
                    const fecha = item.finalizadaAt.toDate ? item.finalizadaAt.toDate() : new Date(item.finalizadaAt);
                    fechaTexto = fecha.toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  }

                  return (
                    <View style={styles.cardHistorial}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.fechaHistorial}>{fechaTexto}</Text>
                        <Text style={styles.itemsHistorialCount}>
                          {(item.items || []).length} productos comprados:
                        </Text>
                        <View style={styles.itemsHistorialList}>
                          {(item.items || []).map((prod: ItemCompra, i: number) => {
                            let detalleTexto = prod.detalleFormateado;
                            if (!detalleTexto) {
                              const esAlPeso = Boolean(prod.unidadMedida === 'g' || prod.esAlPeso);
                              if (esAlPeso) {
                                const kg = prod.cantidad >= 1000 ? `${(prod.cantidad / 1000).toFixed(2)} kg` : `${prod.cantidad} g`;
                                detalleTexto = `Comprado: ${kg} (${prod.cantidad} g)`;
                              } else {
                                detalleTexto = `Comprado: ${prod.cantidad} u.`;
                              }
                            }
                            return (
                              <Text key={i} style={styles.textoDetalleHistorial}>
                                • {prod.nombre} - {detalleTexto}
                              </Text>
                            );
                          })}
                        </View>
                      </View>
                      <Text style={styles.totalHistorial}>
                        ${(item.montoTotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.textoVacio}>No hay compras anteriores archivadas.</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },

  headerBusqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputBusqueda: { flex: 1, fontSize: 14, color: '#0F172A' },
  botonHistorial: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
  },
  textoBotonHistorial: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },

  contenedorResultados: {
    maxHeight: 220,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 999,
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
  stockProdBusqueda: { fontSize: 12, color: '#64748B', marginTop: 2 },
  badgeBusquedaAlPeso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  textoBadgeBusquedaAlPeso: {
    fontSize: 10,
    color: '#0284C7',
    fontWeight: '700',
  },
  textoNoResultado: { padding: 16, textAlign: 'center', color: '#64748B', fontSize: 13 },

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
  badgeMiniAlPeso: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  textoBadgeMiniAlPeso: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0284C7',
  },
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
  modalSub: { fontSize: 14, color: '#64748B', marginBottom: 14 },
  campoModal: { marginBottom: 6 },
  labelInput: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  selectorUnidadContainer: {
    flexDirection: 'row',
    backgroundColor: '#E0F2FE',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 10,
    gap: 4,
  },
  botonUnidad: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 7,
  },
  botonUnidadActivo: {
    backgroundColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
  },
  textoBotonUnidad: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  textoBotonUnidadActivo: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Sub-selector Kilos / Gramos
  selectorSubPesoContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    marginBottom: 8,
    gap: 4,
  },
  botonSubPeso: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
  },
  botonSubPesoActivo: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textoSubPeso: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  textoSubPesoActivo: {
    color: '#0284C7',
    fontWeight: '700',
  },

  notaConversion: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: -8,
    marginBottom: 12,
    fontWeight: '500',
  },
  cajaCostoCalculado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: -4,
    marginBottom: 14,
  },
  textoCostoCalculado: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
    flex: 1,
  },
  inputModal: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
    color: '#0F172A',
    fontSize: 15,
  },
  infoPlanillaText: { fontSize: 12, color: '#64748B', fontStyle: 'italic', marginBottom: 16 },
  modalAcciones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
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
    alignItems: 'flex-start',
  },
  fechaHistorial: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  itemsHistorialCount: { fontSize: 12, color: '#64748B', marginTop: 2 },
  itemsHistorialList: { marginTop: 6, gap: 2 },
  textoDetalleHistorial: { fontSize: 12, color: '#334155' },
  totalHistorial: { fontSize: 16, fontWeight: 'bold', color: '#0284C7' },
});
