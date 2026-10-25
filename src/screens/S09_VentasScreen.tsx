import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView, // Importado para ajustar la vista del modal al abrir el teclado
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClienteFiado, subscribeToClientesFiados } from '../services/fiadoService';
import { CATEGORIAS_BASE, Producto, suscribirACategorias, suscribirAProductos } from '../services/productService';
import { ItemCarrito, registrarVenta } from '../services/saleService';

export function S09_VentasScreen() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [categoriasBarra, setCategoriasBarra] = useState<string[]>(CATEGORIAS_BASE);
    const [cargando, setCargando] = useState<boolean>(true);
    const [busqueda, setBusqueda] = useState<string>('');
    //Separamos estado de stock y categorías para permitir filtros combinados y selección múltiple
    const [estadoStockSeleccionado, setEstadoStockSeleccionado] = useState<'Todas' | 'Stock Crítico' | 'Sin Stock'>('Todas');
    const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([]);

    //Extraemos los rubros excluyendo los filtros de estado para la fila de categorías
    const categoriasRubros = useMemo(() => {
        return categoriasBarra.filter(
            (c) => c !== 'Todas' && c !== 'Stock Crítico' && c !== 'Sin Stock'
        );
    }, [categoriasBarra]);

    //Handler para agregar o remover categorías seleccionadas
    const toggleCategoria = (cat: string) => {
        setCategoriasSeleccionadas((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        );
    };

    const [carrito, setCarrito] = useState<{ [idProducto: string]: ItemCarrito }>({});

    // Estados para el flujo de cobro (incluye Transferencia)
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [medioPago, setMedioPago] = useState<'Efectivo' | 'Mercado Pago' | 'Transferencia' | 'Fiado'>('Efectivo');
    const [montoPagaCon, setMontoPagaCon] = useState<string>('');
    const [procesandoVenta, setProcesandoVenta] = useState<boolean>(false);

    // Estados para Fiados
    const [listaClientesFiados, setListaClientesFiados] = useState<ClienteFiado[]>([]);
    const [clienteFiadoSeleccionado, setClienteFiadoSeleccionado] = useState<ClienteFiado | null>(null);
    const [busquedaCliente, setBusquedaCliente] = useState<string>('');

    // Sincronización en tiempo real de productos
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

    // Sincronización en tiempo real de categorías dinámicas
    useEffect(() => {
        const desuscribirCats = suscribirACategorias((cats) => {
            setCategoriasBarra(cats);
        });

        return () => {
            if (desuscribirCats) desuscribirCats();
        };
    }, []);

    // Sincronización de clientes fiados
    useEffect(() => {
        const desuscribirClientes = subscribeToClientesFiados((clientes) => {
            setListaClientesFiados(clientes);
        });

        return () => {
            if (desuscribirClientes) desuscribirClientes();
        };
    }, []);

    //Filtrado combinado reactivo: texto de búsqueda + estado de stock + categorías múltiples
    const productosFiltrados = useMemo(() => {
        const filtrados = productos.filter((item) => {
            const coincideNombre = item.nombre
                .toLowerCase()
                .includes(busqueda.toLowerCase().trim());

            // Validación reactiva de condición de stock
            let coincideStock = true;
            if (estadoStockSeleccionado === 'Stock Crítico') {
                coincideStock = item.stock > 0 && item.stock < 5;
            } else if (estadoStockSeleccionado === 'Sin Stock') {
                coincideStock = item.stock <= 0;
            }

            //Validación de rubros/categorías múltiples seleccionadas (unión OR)
            let coincideCategoria = true;
            if (categoriasSeleccionadas.length > 0) {
                coincideCategoria = categoriasSeleccionadas.some((catSel) => {
                    const catLower = catSel.toLowerCase();
                    const enArray =
                        Array.isArray(item.categorias) &&
                        item.categorias.some((c) => c.toLowerCase() === catLower);
                    const enPrincipal =
                        item.categoria?.toLowerCase() === catLower;
                    return enArray || enPrincipal;
                });
            }

            return coincideNombre && coincideStock && coincideCategoria;
        });

        return filtrados.sort((a, b) => {
            const tieneStockA = a.stock > 0 ? 1 : 0;
            const tieneStockB = b.stock > 0 ? 1 : 0;

            if (tieneStockA !== tieneStockB) {
                return tieneStockB - tieneStockA;
            }

            return a.nombre.localeCompare(b.nombre);
        });
    }, [productos, busqueda, estadoStockSeleccionado, categoriasSeleccionadas]);

    const clientesFiltrados = useMemo(() => {
        if (!busquedaCliente.trim()) return listaClientesFiados;
        return listaClientesFiados.filter((c) =>
            c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase().trim())
        );
    }, [listaClientesFiados, busquedaCliente]);

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

    const listaItemsCarrito = useMemo(() => Object.values(carrito), [carrito]);
    const totalCantidad = useMemo(
        () => listaItemsCarrito.reduce((acc, item) => acc + item.cantidad, 0),
        [listaItemsCarrito]
    );
    const totalImporte = useMemo(
        () => listaItemsCarrito.reduce((acc, item) => acc + item.subtotal, 0),
        [listaItemsCarrito]
    );

    const vueltoCalculado = useMemo(() => {
        const pago = parseFloat(montoPagaCon.replace(',', '.'));
        if (isNaN(pago) || pago < totalImporte) return 0;
        return pago - totalImporte;
    }, [montoPagaCon, totalImporte]);

    const handleConfirmarVenta = async () => {
        if (listaItemsCarrito.length === 0) {
            Alert.alert('Carrito Vacío', 'Agregá al menos un producto para cobrar.');
            return;
        }

        if (medioPago === 'Efectivo') {
            const pagoIngresado = parseFloat(montoPagaCon.replace(',', '.'));
            if (isNaN(pagoIngresado) || pagoIngresado < totalImporte) {
                Alert.alert(
                    'Monto Insuficiente',
                    `El dinero ingresado ($${isNaN(pagoIngresado) ? '0.00' : pagoIngresado.toFixed(2)}) es menor al total a cobrar ($${totalImporte.toFixed(2)}). Por favor verifique.`
                );
                return;
            }
        }

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
                : `Cobro por ${medioPago} registrado por $${totalImporte.toFixed(2)}`;

            Alert.alert('¡Venta Exitosa!', mensajeExito, [
                {
                    text: 'OK',
                    onPress: () => {
                        setCarrito({});
                        setModalVisible(false);
                        setMontoPagaCon('');
                        setClienteFiadoSeleccionado(null);
                        setBusquedaCliente('');
                        setMedioPago('Efectivo');
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
            <View style={styles.buscadorContainer}>
                <TextInput
                    style={styles.inputBuscador}
                    placeholder="Buscar producto para vender..."
                    placeholderTextColor="#8E8E93"
                    value={busqueda}
                    onChangeText={setBusqueda}
                    autoCapitalize="none"
                    /* Setup de teclado limpio para el buscador de ventas */
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={Keyboard.dismiss}
                />
            </View>

            {/* Rediseño visual de filtros: Segmented Control iOS para estados, separador sutil y FlatList liviano de categorías */}
            <View style={styles.filtrosContainer}>
                {/* Fila 1: Segmented Control unificado estilo iOS para Estado de Stock */}
                <View style={styles.segmentedContainer}>
                    <TouchableOpacity
                        style={[
                            styles.segmentItem,
                            estadoStockSeleccionado === 'Todas' && styles.segmentItemTodasActivo,
                        ]}
                        onPress={() => setEstadoStockSeleccionado('Todas')}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.textoSegment,
                                estadoStockSeleccionado === 'Todas' && styles.textoSegmentTodasActivo,
                            ]}
                        >
                            Todas
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.segmentItem,
                            estadoStockSeleccionado === 'Stock Crítico' && styles.segmentItemCriticoActivo,
                        ]}
                        onPress={() =>
                            setEstadoStockSeleccionado((prev) =>
                                prev === 'Stock Crítico' ? 'Todas' : 'Stock Crítico'
                            )
                        }
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.textoSegment,
                                estadoStockSeleccionado === 'Stock Crítico' && styles.textoSegmentCriticoActivo,
                            ]}
                        >
                            Stock Crítico
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.segmentItem,
                            estadoStockSeleccionado === 'Sin Stock' && styles.segmentItemSinStockActivo,
                        ]}
                        onPress={() =>
                            setEstadoStockSeleccionado((prev) =>
                                prev === 'Sin Stock' ? 'Todas' : 'Sin Stock'
                            )
                        }
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.textoSegment,
                                estadoStockSeleccionado === 'Sin Stock' && styles.textoSegmentSinStockActivo,
                            ]}
                        >
                            Sin Stock
                        </Text>
                    </TouchableOpacity>
                </View>

                {/*Separador sutil para marcar la jerarquía entre estados y categorías */}
                <View style={styles.separadorFiltros} />

                {/* Fila 2: Carrusel horizontal FlatList con chips estilizados y livianos */}
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={['Todas', ...categoriasRubros]}
                    keyExtractor={(cat) => cat}
                    contentContainerStyle={styles.listaCategorias}
                    renderItem={({ item: cat }) => {
                        const esTodas = cat === 'Todas';
                        const seleccionada = esTodas
                            ? categoriasSeleccionadas.length === 0
                            : categoriasSeleccionadas.includes(cat);

                        return (
                            <TouchableOpacity
                                style={[
                                    styles.chipCategoria,
                                    seleccionada && styles.chipCategoriaSeleccionada,
                                ]}
                                onPress={() => {
                                    if (esTodas) {
                                        setCategoriasSeleccionadas([]);
                                    } else {
                                        toggleCategoria(cat);
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.textoChipCategoria,
                                        seleccionada && styles.textoChipCategoriaSeleccionada,
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

            {/* MODAL PRINCIPAL DE COBRO */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                {/*KeyboardAvoidingView dentro del modal para que los inputs de Efectivo y Fiados suban sobre el teclado */}
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalFondo}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.modalContenido}>
                                <Text style={styles.modalTitulo}>Resumen de Venta</Text>

                                <ScrollView style={styles.scrollModal} nestedScrollEnabled>
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

                                <Text style={styles.labelSeccion}>Medio de Pago:</Text>
                                {/* SELECTOR DE MEDIOS DE PAGO (4 OPCIONES) */}
                                <View style={styles.contenedorMediosPago}>
                                    {(['Efectivo', 'Mercado Pago', 'Transferencia', 'Fiado'] as const).map((m) => (
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
                                                numberOfLines={1}
                                            >
                                                {m}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* VISTA DIRECTA DEL QR AL SELECCIONAR MERCADO PAGO */}
                                {medioPago === 'Mercado Pago' && (
                                    <View style={styles.seccionMP}>
                                        <Text style={styles.instruccionQR}>Escaneá para abonar ${totalImporte.toFixed(2)}</Text>
                                        <View style={styles.contenedorImagenQR}>
                                            <Image
                                                source={{
                                                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=AlmacenMingo_$${totalImporte.toFixed(2)}`,
                                                }}
                                                style={styles.imagenQR}
                                            />
                                        </View>
                                        <Text style={styles.alertaMP}>Al confirmar, la venta se sumará a la caja del día.</Text>
                                    </View>
                                )}

                                {/* VISTA INFORMATIVA PARA TRANSFERENCIA */}
                                {medioPago === 'Transferencia' && (
                                    <View style={styles.seccionTransferencia}>
                                        <Text style={styles.tituloTransferencia}>Cobro por Transferencia Bancaria</Text>
                                        <Text style={styles.montoTransferencia}>Monto a recibir: ${totalImporte.toFixed(2)}</Text>
                                        <Text style={styles.alertaTransferencia}>
                                            Verificá en la app de tu banco el ingreso del dinero antes de presionar "Confirmar Cobro".
                                        </Text>
                                    </View>
                                )}

                                {medioPago === 'Fiado' && (
                                    <View style={styles.seccionFiado}>
                                        <Text style={styles.labelInput}>Seleccionar Cliente de la Libreta:</Text>

                                        <TextInput
                                            style={styles.inputBuscadorCliente}
                                            placeholder="Buscar cliente por nombre..."
                                            placeholderTextColor="#8E8E93"
                                            value={busquedaCliente}
                                            onChangeText={setBusquedaCliente}
                                            /* Setup de teclado limpio para la busqueda de cliente fiado */
                                            returnKeyType="done"
                                            blurOnSubmit={true}
                                            onSubmitEditing={Keyboard.dismiss}
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

                                {medioPago === 'Efectivo' && (
                                    <View style={styles.seccionEfectivo}>
                                        <Text style={styles.labelInput}>Paga con ($):</Text>
                                        <TextInput
                                            style={styles.inputEfectivo}
                                            placeholder="0.00"
                                            placeholderTextColor="#8E8E93"
                                            keyboardType="numeric"
                                            value={montoPagaCon}
                                            onChangeText={setMontoPagaCon}
                                            /* Setup de teclado limpio para el input numérico de efectivo */
                                            returnKeyType="done"
                                            blurOnSubmit={true}
                                            onSubmitEditing={Keyboard.dismiss}
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
                        </TouchableWithoutFeedback>
                    </View>
                </KeyboardAvoidingView>
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
    
    filtrosContainer: {
        backgroundColor: '#FFFFFF',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: '#E5E7EB',
        borderRadius: 10,
        padding: 3,
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 8,
    },
    segmentItem: {
        flex: 1,
        paddingVertical: 7,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textoSegment: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
    },
    segmentItemTodasActivo: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 2,
        elevation: 2,
    },
    textoSegmentTodasActivo: {
        color: '#111827',
        fontWeight: '600',
    },
    segmentItemCriticoActivo: {
        backgroundColor: '#FFEDD5',
    },
    textoSegmentCriticoActivo: {
        color: '#EA580C',
        fontWeight: '600',
    },
    segmentItemSinStockActivo: {
        backgroundColor: '#FEE2E2',
    },
    textoSegmentSinStockActivo: {
        color: '#DC2626',
        fontWeight: '600',
    },
    separadorFiltros: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 16,
        marginBottom: 8,
    },
    listaCategorias: {
        paddingHorizontal: 16,
        paddingBottom: 2,
        gap: 8,
    },
    chipCategoria: {
        paddingHorizontal: 13,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginRight: 6,
    },
    chipCategoriaSeleccionada: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    textoChipCategoria: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
    },
    textoChipCategoriaSeleccionada: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
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
    scrollModal: { maxHeight: 110 },
    filaItemCarrito: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    itemNombre: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
    itemDetalle: { fontSize: 12, color: '#8E8E93' },
    itemSubtotal: { fontSize: 14, fontWeight: 'bold', color: '#1C1C1E' },
    divisor: { height: 1, backgroundColor: '#E5E5EA', marginVertical: 10 },
    filaTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    labelTotal: { fontSize: 15, fontWeight: 'bold', color: '#8E8E93' },
    valorTotal: { fontSize: 20, fontWeight: 'bold', color: '#34C759' },
    labelSeccion: { fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 },
    contenedorMediosPago: { flexDirection: 'row', gap: 6, marginBottom: 12 },
    chipPago: { flex: 1, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 8, backgroundColor: '#E5E5EA', alignItems: 'center' },
    chipPagoActivo: { backgroundColor: '#007AFF' },
    textoChipPago: { fontSize: 11, fontWeight: '600', color: '#3A3A3C' },
    textoChipPagoActivo: { color: '#FFFFFF', fontWeight: 'bold' },

    seccionMP: {
        backgroundColor: '#F2F9FF',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#009EE3',
    },
    instruccionQR: { fontSize: 13, fontWeight: '600', color: '#007AFF', marginBottom: 8 },
    contenedorImagenQR: {
        padding: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#D1D1D6',
    },
    imagenQR: { width: 150, height: 150 },
    alertaMP: { marginTop: 8, fontSize: 11, color: '#8E8E93', textAlign: 'center' },

    // Estilos para la sección Transferencia
    seccionTransferencia: {
        backgroundColor: '#F2F4F7',
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#D1D1D6',
    },
    tituloTransferencia: { fontSize: 13, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 4 },
    montoTransferencia: { fontSize: 14, fontWeight: 'bold', color: '#34C759', marginBottom: 6 },
    alertaTransferencia: { fontSize: 11, color: '#8E8E93' },

    seccionFiado: { marginBottom: 16 },
    inputBuscadorCliente: {
        backgroundColor: '#F2F4F7',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
        fontSize: 13,
        color: '#1C1C1E',
        marginBottom: 8,
    },
    scrollClientes: { maxHeight: 110 },
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
    inputEfectivo: { borderWidth: 1, borderColor: '#D1D1D6', borderRadius: 8, padding: 10, fontSize: 16, color: '#1C1C1E' },
    textoVuelto: { marginTop: 6, fontSize: 14, fontWeight: 'bold', color: '#34C759' },
    botonesModal: { flexDirection: 'row', gap: 12, marginTop: 4 },
    botonCancelarModal: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#E5E5EA', alignItems: 'center' },
    textoCancelar: { fontWeight: '600', color: '#3A3A3C' },
    botonCobrarModal: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: '#34C759', alignItems: 'center' },
    botonDeshabilitado: { backgroundColor: '#9EBAE4' },
    textoCobrar: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    textoCargando: { marginTop: 10, color: '#8E8E93', fontSize: 14 },
});