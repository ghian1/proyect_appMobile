import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Producto, suscribirAProductos } from '../services/productService';
import { ItemCarrito, registrarVenta } from '../services/saleService';
// Importamos el modelo y la suscripción de clientes fiados
import { ClienteFiado, subscribeToClientesFiados } from '../services/fiadoService';

const CATEGORIAS = ['Todas', 'Comestibles', 'Bebidas', 'Limpieza', 'Almacén'];

export function S09_VentasScreen() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [busqueda, setBusqueda] = useState<string>('');
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('Todas');

  // Estado del carrito de compras: un objeto clave-valor { idProducto: ItemCarrito }
    const [carrito, setCarrito] = useState<{ [idProducto: string]: ItemCarrito }>({});

  // Estados para el Modal de Cobro / Cierre de Venta
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [medioPago, setMedioPago] = useState<'Efectivo' | 'Mercado Pago' | 'Fiado'>('Efectivo');
    const [montoPagaCon, setMontoPagaCon] = useState<string>('');
    const [procesandoVenta, setProcesandoVenta] = useState<boolean>(false);

  // Estados para la lista de clientes fiados y la selección
    const [listaClientesFiados, setListaClientesFiados] = useState<ClienteFiado[]>([]);
    const [clienteFiadoSeleccionado, setClienteFiadoSeleccionado] = useState<ClienteFiado | null>(null);
    const [busquedaCliente, setBusquedaCliente] = useState<string>('');

  //Suscripción en tiempo real a Productos de Firestore
    useEffect(() => {
    const desuscribir = suscribirAProductos(
        (datos: Producto[]) => {
        setProductos(datos);
        setCargando(false);
        },
        (error: Error) => {
        console.error('Error al cargar productos para venta:', error);
        setCargando(false);
        }
    );

    return () => {
        if (desuscribir) desuscribir();
    };
    }, []);

    //Suscripción en tiempo real a Clientes Fiados
    useEffect(() => {
    const desuscribirClientes = subscribeToClientesFiados((clientes) => {
        setListaClientesFiados(clientes);
    });

    return () => {
        if (desuscribirClientes) desuscribirClientes();
    };
    }, []);

    // Filtrado reactivo de productos por nombre y categoría
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

    //Filtrado rápido de clientes fiados en el modal
    const clientesFiltrados = useMemo(() => {
    if (!busquedaCliente.trim()) return listaClientesFiados;
    return listaClientesFiados.filter((c) =>
        c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase().trim())
    );
    }, [listaClientesFiados, busquedaCliente]);

    // Funciones para manipular el carrito
    const agregarAlCarrito = (producto: Producto) => {
    if (!producto.id) return;

    const itemExistente = carrito[producto.id];
    const cantidadActual = itemExistente ? itemExistente.cantidad : 0;

    if (cantidadActual + 1 > producto.stock) {
        Alert.alert('Stock Máximo', `Solo hay ${producto.stock} unidades disponibles de este producto.`);
        return;
    }

    const nuevaCantidad = cantidadActual + 1;
    setCarrito({
        ...carrito,
        [producto.id]: {
        idProducto: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: nuevaCantidad,
        subtotal: nuevaCantidad * producto.precio,
        },
    });
    };

    const restarDelCarrito = (productoId: string) => {
    const itemExistente = carrito[productoId];
    if (!itemExistente) return;

    if (itemExistente.cantidad <= 1) {
        const nuevoCarrito = { ...carrito };
        delete nuevoCarrito[productoId];
        setCarrito(nuevoCarrito);
    } else {
        const nuevaCantidad = itemExistente.cantidad - 1;
        setCarrito({
        ...carrito,
        [productoId]: {
            ...itemExistente,
            cantidad: nuevaCantidad,
          subtotal: nuevaCantidad * itemExistente.precio,
        },
        });
    }
    };

  // Cálculos consolidados del carrito
    const listaItemsCarrito = useMemo(() => Object.values(carrito), [carrito]);
    const totalCantidad = useMemo(
    () => listaItemsCarrito.reduce((acc, item) => acc + item.cantidad, 0),
    [listaItemsCarrito]
    );
    const totalImporte = useMemo(
    () => listaItemsCarrito.reduce((acc, item) => acc + item.subtotal, 0),
    [listaItemsCarrito]
    );

  // Vuelto para pago en efectivo
    const vueltoCalculado = useMemo(() => {
    const pago = parseFloat(montoPagaCon.replace(',', '.'));
    if (isNaN(pago) || pago < totalImporte) return 0;
    return pago - totalImporte;
    }, [montoPagaCon, totalImporte]);

  // Ejecución final del cobro
    const handleConfirmarVenta = async () => {
    if (listaItemsCarrito.length === 0) {
        Alert.alert('Carrito Vacío', 'Agregá al menos un producto para cobrar.');
        return;
    }

    //Validación obligatoria de cliente al seleccionar Fiado
    if (medioPago === 'Fiado' && !clienteFiadoSeleccionado) {
        Alert.alert('Cliente Requerido', 'Por favor seleccioná a qué cliente de la libreta le vas a fiar esta compra.');
        return;
    }

    try {
        setProcesandoVenta(true);
        
        const infoCliente = clienteFiadoSeleccionado
        ? { id: clienteFiadoSeleccionado.id || '', nombre: clienteFiadoSeleccionado.nombre }
        : undefined;

        await registrarVenta(listaItemsCarrito, totalImporte, medioPago, infoCliente);

        const mensajeExito = medioPago === 'Fiado'
        ? `Venta fiada a ${clienteFiadoSeleccionado?.nombre} por $${totalImporte.toFixed(2)}`
        : `Cobro registrado por $${totalImporte.toFixed(2)}`;

        Alert.alert('¡Venta Exitosa!', mensajeExito, [
        {
            text: 'OK',
            onPress: () => {
            setCarrito({});
            setModalVisible(false);
            setMontoPagaCon('');
            setClienteFiadoSeleccionado(null);
            setBusquedaCliente('');
            },
        },
        ]);
    } catch (error) {
        console.error('Error procesando cobro:', error);
        Alert.alert('Error', 'Ocurrió un problema al registrar la venta.');
    } finally {
        setProcesandoVenta(false);
    }
    };

    //Renderizado de tarjeta de producto
    const renderProductoItem = ({ item }: { item: Producto }) => {
    const sinStock = item.stock <= 0;
    const itemEnCarrito = item.id ? carrito[item.id] : undefined;
    const cantidadEnCarrito = itemEnCarrito ? itemEnCarrito.cantidad : 0;

    return (
        <View style={[styles.card, sinStock && styles.cardSinStock]}>
        <View style={styles.cardInfo}>
            <Text style={styles.cardTitulo} numberOfLines={2}>
            {item.nombre}
            </Text>
            <Text style={styles.cardCategoria} numberOfLines={1}>
            {Array.isArray(item.categorias) && item.categorias.length > 0
                ? item.categorias.join(' • ')
                : item.categoria || 'Almacén'}
            </Text>
            <Text style={styles.cardPrecio}>${item.precio.toFixed(2)}</Text>
        </View>

        <View style={styles.cardAcciones}>
            {sinStock ? (
            <View style={styles.badgeSinStock}>
                <Text style={styles.textoSinStock}>SIN STOCK</Text>
            </View>
            ) : cantidadEnCarrito > 0 ? (
            <View style={styles.selectorCantidad}>
                <TouchableOpacity
                style={styles.botonRestar}
                onPress={() => item.id && restarDelCarrito(item.id)}
                >
                <Text style={styles.textoBotonRestar}>-</Text>
                </TouchableOpacity>

                <Text style={styles.textoCantidad}>{cantidadEnCarrito}</Text>

                <TouchableOpacity
                style={styles.botonSumarPequeno}
                onPress={() => agregarAlCarrito(item)}
                >
                <Text style={styles.textoBotonSumar}>+</Text>
                </TouchableOpacity>
            </View>
            ) : (
            <TouchableOpacity
                style={styles.botonAgregarDirecto}
                onPress={() => agregarAlCarrito(item)}
            >
                <Text style={styles.textoAgregarDirecto}>+ Agregar</Text>
            </TouchableOpacity>
            )}
        </View>
        </View>
    );
    };

    return (
    <SafeAreaView style={styles.contenedor}>
      {/* Buscador de productos */}
        <View style={styles.buscadorContainer}>
        <TextInput
            style={styles.inputBuscador}
            placeholder="Buscar producto para vender..."
            placeholderTextColor="#8E8E93"
            value={busqueda}
            onChangeText={setBusqueda}
            autoCapitalize="none"
        />
        </View>

      {/* Carrusel horizontal de categorías */}
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
                <Text style={[styles.chipTexto, activa ? styles.chipTextoActivo : null]}>
                    {cat}
                </Text>
                </TouchableOpacity>
            );
            }}
        />
        </View>

      {/* Grilla táctil de 2 columnas */}
        {cargando ? (
        <View style={styles.centrado}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.textoCargando}>Cargando catálogo para venta...</Text>
        </View>
        ) : (
        <FlatList
            data={productosFiltrados}
            key="grilla_ventas_2_col"
            numColumns={2}
            keyExtractor={(item) => item.id || Math.random().toString()}
            renderItem={renderProductoItem}
            contentContainerStyle={styles.listaProductos}
            columnWrapperStyle={styles.filaGrid}
        />
        )}

      {/* BARRA FLOTANTE DE CARRITO */}
        {totalCantidad > 0 && (
        <View style={styles.barraCarritoFlotante}>
            <View>
            <Text style={styles.textoItemsCarrito}>{totalCantidad} items agregados</Text>
            <Text style={styles.textoTotalCarrito}>${totalImporte.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
            style={styles.botonVerCarrito}
            onPress={() => setModalVisible(true)}
            >
            <Text style={styles.textoBotonVerCarrito}>Cobrar ➔</Text>
            </TouchableOpacity>
        </View>
        )}

      {/* MODAL DE RESUMEN Y COBRO */}
        <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalFondo}>
            <View style={styles.modalContenido}>
            <Text style={styles.modalTitulo}>Resumen de Venta</Text>

            <ScrollView style={styles.scrollModal}>
                {listaItemsCarrito.map((item) => (
                <View key={item.idProducto} style={styles.filaItemCarrito}>
                    <View style={{ flex: 1 }}>
                    <Text style={styles.itemNombre}>{item.nombre}</Text>
                    <Text style={styles.itemDetalle}>
                        {item.cantidad} x ${item.precio.toFixed(2)}
                    </Text>
                    </View>
                    <Text style={styles.itemSubtotal}>${item.subtotal.toFixed(2)}</Text>
                </View>
                ))}
            </ScrollView>

            <View style={styles.divisor} />

            <View style={styles.filaTotal}>
                <Text style={styles.labelTotal}>TOTAL A COBRAR:</Text>
                <Text style={styles.valorTotal}>${totalImporte.toFixed(2)}</Text>
            </View>

            {/* Selector de Medio de Pago */}
            <Text style={styles.labelSeccion}>Medio de Pago:</Text>
            <View style={styles.contenedorMediosPago}>
                {(['Efectivo', 'Mercado Pago', 'Fiado'] as const).map((m) => (
                <TouchableOpacity
                    key={m}
                    style={[styles.chipPago, medioPago === m && styles.chipPagoActivo]}
                    onPress={() => setMedioPago(m)}
                >
                    <Text
                    style={[
                        styles.textoChipPago,
                        medioPago === m && styles.textoChipPagoActivo,
                    ]}
                    >
                    {m}
                    </Text>
                </TouchableOpacity>
                ))}
            </View>

            {/* Selector táctil de Cliente de la Libreta */}
            {medioPago === 'Fiado' && (
                <View style={styles.seccionFiado}>
                <Text style={styles.labelInput}>Seleccionar Cliente de la Libreta:</Text>
                
                <TextInput
                    style={styles.inputBuscadorCliente}
                    placeholder="Buscar cliente por nombre..."
                    placeholderTextColor="#8E8E93"
                    value={busquedaCliente}
                    onChangeText={setBusquedaCliente}
                />

                <ScrollView style={styles.scrollClientes} nestedScrollEnabled>
                    {clientesFiltrados.length === 0 ? (
                    <Text style={styles.textoSinClientes}>No se encontraron clientes registrados.</Text>
                    ) : (
                    clientesFiltrados.map((cliente) => {
                        const seleccionado = clienteFiadoSeleccionado?.id === cliente.id;
                        return (
                        <TouchableOpacity
                            key={cliente.id}
                            style={[
                            styles.tarjetaClienteFiado,
                            seleccionado && styles.tarjetaClienteSeleccionado,
                            ]}
                            onPress={() => setClienteFiadoSeleccionado(cliente)}
                        >
                            <View>
                            <Text style={[styles.nombreCliente, seleccionado && styles.textoClienteSeleccionado]}>
                                {cliente.nombre}
                            </Text>
                            <Text style={styles.deudaCliente}>
                                Deuda actual: ${cliente.deudaTotal?.toFixed(2) || '0.00'}
                            </Text>
                            </View>
                            {seleccionado && <Text style={styles.checkSeleccionado}>✓</Text>}
                        </TouchableOpacity>
                        );
                    })
                    )}
                </ScrollView>
                </View>
            )}

            {/* Cálculo de vuelto en Efectivo */}
            {medioPago === 'Efectivo' && (
                <View style={styles.seccionEfectivo}>
                <Text style={styles.labelInput}>Paga con ($):</Text>
                <TextInput
                    style={styles.inputEfectivo}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={montoPagaCon}
                    onChangeText={setMontoPagaCon}
                />
                {vueltoCalculado > 0 && (
                    <Text style={styles.textoVuelto}>
                    Vuelto a entregar: ${vueltoCalculado.toFixed(2)}
                    </Text>
                )}
                </View>
            )}

            <View style={styles.botonesModal}>
                <TouchableOpacity
                style={styles.botonCancelarModal}
                onPress={() => setModalVisible(false)}
                >
                <Text style={styles.textoCancelar}>Volver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                style={[styles.botonCobrarModal, procesandoVenta && styles.botonDeshabilitado]}
                onPress={handleConfirmarVenta}
                disabled={procesandoVenta}
                >
                {procesandoVenta ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.textoCobrar}>Confirmar Cobro</Text>
                )}
                </TouchableOpacity>
            </View>
            </View>
        </View>
        </Modal>
    </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: '#F2F4F7' },
    buscadorContainer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#FFFFFF' },
    inputBuscador: {
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    color: '#1C1C1E',
    },
    categoriasWrapper: { backgroundColor: '#FFFFFF', paddingBottom: 10 },
    listaCategorias: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#E5E5EA', marginRight: 6 },
    chipActivo: { backgroundColor: '#007AFF' },
    chipTexto: { fontSize: 13, color: '#3A3A3C', fontWeight: '500' },
    chipTextoActivo: { color: '#FFFFFF', fontWeight: '600' },
    listaProductos: { padding: 12, paddingBottom: 90 },
    filaGrid: { justifyContent: 'space-between', marginBottom: 12 },
    card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    width: '48.5%',
    justifyContent: 'space-between',
    minHeight: 145,
    elevation: 2,
    },
    cardSinStock: { opacity: 0.6 },
    cardInfo: { flex: 1 },
    cardTitulo: { fontSize: 15, fontWeight: '600', color: '#1C1C1E', marginBottom: 2 },
    cardCategoria: { fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', marginBottom: 4 },
    cardPrecio: { fontSize: 16, fontWeight: 'bold', color: '#34C759', marginBottom: 6 },
    cardAcciones: { marginTop: 'auto' },
    botonAgregarDirecto: {
    backgroundColor: '#34C759',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    },
    textoAgregarDirecto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
    selectorCantidad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F4F7',
    borderRadius: 8,
    padding: 4,
    },
    botonRestar: { backgroundColor: '#FF3B30', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    textoBotonRestar: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    textoCantidad: { fontSize: 14, fontWeight: 'bold', color: '#1C1C1E' },
    botonSumarPequeno: { backgroundColor: '#34C759', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    textoBotonSumar: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    badgeSinStock: { backgroundColor: '#FFEBEE', padding: 6, borderRadius: 6, alignItems: 'center' },
    textoSinStock: { color: '#D32F2F', fontSize: 11, fontWeight: 'bold' },
    barraCarritoFlotante: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 5,
    },
    textoItemsCarrito: { color: '#8E8E93', fontSize: 12 },
    textoTotalCarrito: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    botonVerCarrito: { backgroundColor: '#34C759', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    textoBotonVerCarrito: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
    modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContenido: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
    modalTitulo: { fontSize: 20, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 12 },
    scrollModal: { maxHeight: 140 },
    filaItemCarrito: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    itemNombre: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
    itemDetalle: { fontSize: 12, color: '#8E8E93' },
    itemSubtotal: { fontSize: 15, fontWeight: 'bold', color: '#1C1C1E' },
    divisor: { height: 1, backgroundColor: '#E5E5EA', marginVertical: 12 },
    filaTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    labelTotal: { fontSize: 16, fontWeight: 'bold', color: '#8E8E93' },
    valorTotal: { fontSize: 22, fontWeight: 'bold', color: '#34C759' },
    labelSeccion: { fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 },
    contenedorMediosPago: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    chipPago: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#E5E5EA', alignItems: 'center' },
    chipPagoActivo: { backgroundColor: '#007AFF' },
    textoChipPago: { fontSize: 13, fontWeight: '500', color: '#3A3A3C' },
    textoChipPagoActivo: { color: '#FFFFFF', fontWeight: 'bold' },
    
    // Estilos para el selector de clientes, fiados.
    seccionFiado: { marginBottom: 16 },
    inputBuscadorCliente: {
    backgroundColor: '#F2F4F7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    marginBottom: 8,
    },
    scrollClientes: { maxHeight: 130 },
    textoSinClientes: { fontSize: 13, color: '#8E8E93', fontStyle: 'italic', paddingVertical: 8 },
    tarjetaClienteFiado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 6,
    backgroundColor: '#FAFAFA',
    },
    tarjetaClienteSeleccionado: {
    borderColor: '#007AFF',
    backgroundColor: '#EBF5FF',
    },
    nombreCliente: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
    textoClienteSeleccionado: { color: '#007AFF' },
    deudaCliente: { fontSize: 11, color: '#8E8E93' },
    checkSeleccionado: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },

    seccionEfectivo: { marginBottom: 16 },
    labelInput: { fontSize: 13, fontWeight: '500', color: '#3A3A3C', marginBottom: 4 },
    inputEfectivo: { borderWidth: 1, borderColor: '#D1D1D6', borderRadius: 8, padding: 10, fontSize: 16 },
    textoVuelto: { marginTop: 6, fontSize: 14, fontWeight: 'bold', color: '#34C759' },
    botonesModal: { flexDirection: 'row', gap: 12, marginTop: 8 },
    botonCancelarModal: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#E5E5EA', alignItems: 'center' },
    textoCancelar: { fontWeight: '600', color: '#3A3A3C' },
    botonCobrarModal: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: '#34C759', alignItems: 'center' },
    botonDeshabilitado: { backgroundColor: '#9EBAE4' },
    textoCobrar: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    textoCargando: { marginTop: 10, color: '#8E8E93', fontSize: 14 },
});