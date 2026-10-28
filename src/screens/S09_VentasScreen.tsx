import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
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
    const [estadoStockSeleccionado, setEstadoStockSeleccionado] = useState<'Todas' | 'Stock Crítico' | 'Sin Stock'>('Todas');
    const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([]);

    const categoriasRubros = useMemo(() => {
        return categoriasBarra.filter(
            (c) => c !== 'Todas' && c !== 'Stock Crítico' && c !== 'Sin Stock'
        );
    }, [categoriasBarra]);

    const toggleCategoria = (cat: string) => {
        setCategoriasSeleccionadas((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        );
    };

    const [carrito, setCarrito] = useState<{ [idProducto: string]: ItemCarrito }>({});

    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [medioPago, setMedioPago] = useState<'Efectivo' | 'Mercado Pago' | 'Transferencia' | 'Fiado'>('Efectivo');
    const [montoPagaCon, setMontoPagaCon] = useState<string>('');
    const [procesandoVenta, setProcesandoVenta] = useState<boolean>(false);

    const [listaClientesFiados, setListaClientesFiados] = useState<ClienteFiado[]>([]);
    const [clienteFiadoSeleccionado, setClienteFiadoSeleccionado] = useState<ClienteFiado | null>(null);
    const [busquedaCliente, setBusquedaCliente] = useState<string>('');

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

    useEffect(() => {
        const desuscribirCats = suscribirACategorias((cats) => {
            setCategoriasBarra(cats);
        });

        return () => {
            if (desuscribirCats) desuscribirCats();
        };
    }, []);

    useEffect(() => {
        const desuscribirClientes = subscribeToClientesFiados((clientes) => {
            setListaClientesFiados(clientes);
        });

        return () => {
            if (desuscribirClientes) desuscribirClientes();
        };
    }, []);

    const productosFiltrados = useMemo(() => {
        const filtrados = productos.filter((item) => {
            const coincideNombre = item.nombre
                .toLowerCase()
                .includes(busqueda.toLowerCase().trim());

            let coincideStock = true;
            if (estadoStockSeleccionado === 'Stock Crítico') {
                coincideStock = item.stock > 0 && item.stock < 5;
            } else if (estadoStockSeleccionado === 'Sin Stock') {
                coincideStock = item.stock <= 0;
            }

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
            <View style={styles.card}>
                <View style={styles.imagenContenedor}>
                    {item.imagenUrl ? (
                        <Image
                            source={{ uri: item.imagenUrl }}
                            style={styles.imagenProd}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={styles.placeholderIconContainer}>
                            <Ionicons name="image-outline" size={24} color="#94A3B8" />
                            <Text style={styles.textoSinImagen}>Sin Imagen</Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardInfo}>
                    <Text style={styles.cardCategoria} numberOfLines={1}>
                        {Array.isArray(item.categorias) && item.categorias.length > 0
                            ? item.categorias.join(' • ')
                            : item.categoria || 'Almacén'}
                    </Text>

                    <Text style={styles.cardTitulo} numberOfLines={2}>
                        {item.nombre}
                    </Text>

                    <Text style={styles.cardPrecio}>${item.precio.toFixed(2)}</Text>
                </View>

                <View style={styles.cardStockContainer}>
                    <View style={[styles.badgeStock, sinStock ? styles.badgeSinStock : styles.badgeConStock]}>
                        <Text style={[styles.textoBadgeStock, sinStock ? styles.textoSinStock : styles.textoConStock]}>
                            {sinStock ? 'SIN STOCK' : `Stock: ${item.stock} u.`}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardAcciones}>
                    {sinStock ? (
                        <View style={styles.bloqueAgotado}>
                            <Text style={styles.textoAgotado}>Agotado</Text>
                        </View>
                    ) : cantidadEnCarrito > 0 ? (
                        <View style={styles.selectorCantidad}>
                            <TouchableOpacity
                                style={styles.botonRestar}
                                onPress={() => item.id && restarDelCarrito(item.id)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.textoBotonRestar}>-</Text>
                            </TouchableOpacity>

                            <Text style={styles.textoCantidad}>{cantidadEnCarrito}</Text>

                            <TouchableOpacity
                                style={styles.botonSumarPequeno}
                                onPress={() => agregarAlCarrito(item)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.textoBotonSumar}>+</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.botonAgregarDirecto}
                            onPress={() => agregarAlCarrito(item)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="cart-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.textoAgregarDirecto}>Agregar</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.contenedor}>
            <View style={styles.buscadorContainer}>
                <View style={styles.inputBuscadorWrapper}>
                    <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.inputBuscador}
                        placeholder="Buscar producto para vender..."
                        placeholderTextColor="#94A3B8"
                        value={busqueda}
                        onChangeText={setBusqueda}
                        autoCapitalize="none"
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
            </View>

            <View style={styles.filtrosContainer}>
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

                <View style={styles.separadorFiltros} />

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
                    <ActivityIndicator size="large" color="#0284C7" />
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
                    ListEmptyComponent={
                        <View style={styles.centrado}>
                            <Ionicons name="cart-outline" size={48} color="#CBD5E1" style={{ marginBottom: 8 }} />
                            <Text style={styles.textoVacio}>No se encontraron productos disponibles.</Text>
                        </View>
                    }
                />
            )}

            {totalCantidad > 0 && (
                <View style={styles.barraCarritoFlotante}>
                    <View>
                        <Text style={styles.textoItemsCarrito}>{totalCantidad} items en carrito</Text>
                        <Text style={styles.textoTotalCarrito}>${totalImporte.toFixed(2)}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.botonVerCarrito}
                        onPress={() => setModalVisible(true)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="cash-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.textoBotonVerCarrito}>Cobrar</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* MODAL PRINCIPAL DE COBRO */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalFondo}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.modalContenido}>
                                <Text style={styles.modalTitulo}>Resumen de Venta</Text>

                                <ScrollView style={styles.scrollModal} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
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
                                <View style={styles.contenedorMediosPago}>
                                    {(['Efectivo', 'Mercado Pago', 'Transferencia', 'Fiado'] as const).map((m) => (
                                        <TouchableOpacity
                                            key={m}
                                            style={[styles.chipPago, medioPago === m && styles.chipPagoActivo]}
                                            onPress={() => setMedioPago(m)}
                                            activeOpacity={0.8}
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

                                        <View style={styles.inputBuscadorClienteWrapper}>
                                            <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                                            <TextInput
                                                style={styles.inputBuscadorCliente}
                                                placeholder="Buscar cliente por nombre..."
                                                placeholderTextColor="#94A3B8"
                                                value={busquedaCliente}
                                                onChangeText={setBusquedaCliente}
                                                returnKeyType="done"
                                                blurOnSubmit={true}
                                                onSubmitEditing={Keyboard.dismiss}
                                            />
                                        </View>

                                        <ScrollView style={styles.scrollClientes} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
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
                                                            activeOpacity={0.8}
                                                        >
                                                            <View>
                                                                <Text style={[styles.nombreCliente, seleccionado && styles.textoClienteSeleccionado]}>
                                                                    {cliente.nombre}
                                                                </Text>
                                                                <Text style={styles.deudaCliente}>
                                                                    Deuda actual: ${cliente.deudaTotal?.toFixed(2) || '0.00'}
                                                                </Text>
                                                            </View>
                                                            {seleccionado && <Ionicons name="checkmark-circle" size={20} color="#0284C7" />}
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
                                            placeholderTextColor="#94A3B8"
                                            keyboardType="numeric"
                                            value={montoPagaCon}
                                            onChangeText={setMontoPagaCon}
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
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.textoCancelar}>Volver</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.botonCobrarModal, procesandoVenta && styles.botonDeshabilitado]}
                                        onPress={handleConfirmarVenta}
                                        disabled={procesandoVenta}
                                        activeOpacity={0.8}
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
    contenedor: { 
        flex: 1, 
        backgroundColor: '#F0F9FF', 
    },
    buscadorContainer: { 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0F2FE',
    },
    inputBuscadorWrapper: {
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
        paddingVertical: 9,
        fontSize: 15,
        color: '#0F172A',
    },
    filtrosContainer: {
        backgroundColor: '#FFFFFF',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0F2FE',
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        padding: 3,
        marginHorizontal: 16,
        marginTop: 6,
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
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    segmentItemTodasActivo: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
    textoSegmentTodasActivo: {
        color: '#0F172A',
        fontWeight: '600',
    },
    segmentItemCriticoActivo: {
        backgroundColor: '#FEF3C7',
    },
    textoSegmentCriticoActivo: {
        color: '#D97706',
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
        backgroundColor: '#F1F5F9',
        marginHorizontal: 16,
        marginBottom: 8,
    },
    listaCategorias: {
        paddingHorizontal: 16,
        paddingBottom: 2,
        gap: 8,
    },
    chipCategoria: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginRight: 6,
    },
    chipCategoriaSeleccionada: {
        backgroundColor: '#0284C7',
        borderColor: '#0284C7',
    },
    textoChipCategoria: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '500',
    },
    textoChipCategoriaSeleccionada: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    listaProductos: { 
        padding: 12, 
        paddingBottom: 90, 
    },
    filaGrid: { 
        justifyContent: 'space-between', 
        marginBottom: 12, 
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 10,
        width: '48.5%',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E0F2FE',
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    imagenContenedor: {
        width: '100%',
        height: 100,
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginBottom: 8,
    },
    imagenProd: {
        width: '100%',
        height: '100%',
    },
    placeholderIconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    textoSinImagen: {
        fontSize: 11,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 4,
        fontWeight: '500',
    },
    cardInfo: { 
        flex: 1, 
        marginBottom: 6, 
    },
    cardCategoria: { 
        fontSize: 10, 
        color: '#0284C7', 
        textTransform: 'uppercase', 
        marginBottom: 2,
        fontWeight: '700',
    },
    cardTitulo: { 
        fontSize: 14, 
        fontWeight: '600', 
        color: '#0F172A', 
        marginBottom: 4, 
        lineHeight: 18, 
    },
    cardPrecio: { 
        fontSize: 15, 
        fontWeight: '700', 
        color: '#0EA5E9', 
    },
    cardStockContainer: { 
        alignItems: 'flex-start', 
        marginBottom: 8, 
    },
    badgeStock: { 
        paddingHorizontal: 8, 
        paddingVertical: 3, 
        borderRadius: 6, 
        width: '100%', 
        alignItems: 'center', 
    },
    badgeConStock: { 
        backgroundColor: '#F0FDF4', 
    },
    badgeSinStock: { 
        backgroundColor: '#FEF2F2', 
    },
    textoBadgeStock: { 
        fontSize: 11, 
        fontWeight: '700', 
    },
    textoConStock: { 
        color: '#16A34A', 
    },
    textoSinStock: { 
        color: '#DC2626', 
    },
    cardAcciones: {
        marginTop: 'auto',
    },
    bloqueAgotado: {
        backgroundColor: '#F1F5F9',
        paddingVertical: 6,
        borderRadius: 8,
        alignItems: 'center',
    },
    textoAgotado: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
    },
    selectorCantidad: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F0F9FF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        overflow: 'hidden',
    },
    botonRestar: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#E0F2FE',
    },
    textoBotonRestar: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0284C7',
    },
    textoCantidad: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    botonSumarPequeno: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#0284C7',
    },
    textoBotonSumar: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    botonAgregarDirecto: {
        backgroundColor: '#0284C7',
        flexDirection: 'row',
        paddingVertical: 7,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textoAgregarDirecto: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    centrado: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 20, 
        marginTop: 40, 
    },
    textoCargando: { 
        marginTop: 10, 
        color: '#64748B', 
        fontSize: 14, 
    },
    textoVacio: { 
        color: '#64748B', 
        fontSize: 15, 
        textAlign: 'center', 
    },
    barraCarritoFlotante: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        backgroundColor: '#0F172A',
        borderRadius: 14,
        paddingHorizontal: 18,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    textoItemsCarrito: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    textoTotalCarrito: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    botonVerCarrito: {
        backgroundColor: '#0284C7',
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    textoBotonVerCarrito: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 15,
    },
    modalFondo: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContenido: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '85%',
        borderWidth: 1,
        borderColor: '#E0F2FE',
    },
    modalTitulo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 12,
    },
    scrollModal: {
        maxHeight: 150,
        marginBottom: 10,
    },
    filaItemCarrito: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    itemNombre: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    itemDetalle: {
        fontSize: 12,
        color: '#64748B',
    },
    itemSubtotal: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
    },
    divisor: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 10,
    },
    filaTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    labelTotal: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    valorTotal: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0284C7',
    },
    labelSeccion: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    contenedorMediosPago: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 14,
    },
    chipPago: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    chipPagoActivo: {
        backgroundColor: '#0284C7',
        borderColor: '#0284C7',
    },
    textoChipPago: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569',
    },
    textoChipPagoActivo: {
        color: '#FFFFFF',
    },
    seccionMP: {
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    instruccionQR: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 8,
    },
    contenedorImagenQR: {
        backgroundColor: '#FFFFFF',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    imagenQR: {
        width: 140,
        height: 140,
    },
    alertaMP: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 8,
        textAlign: 'center',
    },
    seccionTransferencia: {
        backgroundColor: '#F8FAFC',
        padding: 14,
        borderRadius: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    tituloTransferencia: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 4,
    },
    montoTransferencia: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0284C7',
        marginBottom: 8,
    },
    alertaTransferencia: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 16,
    },
    seccionFiado: {
        marginBottom: 14,
    },
    inputBuscadorClienteWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 8,
    },
    inputBuscadorCliente: {
        flex: 1,
        height: 38,
        fontSize: 13,
        color: '#0F172A',
    },
    scrollClientes: {
        maxHeight: 130,
    },
    textoSinClientes: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        paddingVertical: 10,
    },
    tarjetaClienteFiado: {
        backgroundColor: '#F8FAFC',
        padding: 10,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    tarjetaClienteSeleccionado: {
        backgroundColor: '#E0F2FE',
        borderColor: '#0284C7',
    },
    nombreCliente: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    textoClienteSeleccionado: {
        color: '#0369A1',
    },
    deudaCliente: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    checkSeleccionado: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0284C7',
    },
    seccionEfectivo: {
        marginBottom: 14,
    },
    labelInput: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 6,
    },
    inputEfectivo: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 44,
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    textoVuelto: {
        fontSize: 13,
        fontWeight: '700',
        color: '#16A34A',
        marginTop: 6,
    },
    botonesModal: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 10,
    },
    botonCancelarModal: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
    },
    textoCancelar: {
        color: '#334155',
        fontWeight: '600',
        fontSize: 14,
    },
    botonCobrarModal: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        backgroundColor: '#0284C7',
        alignItems: 'center',
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    botonDeshabilitado: {
        backgroundColor: '#94A3B8',
    },
    textoCobrar: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 15,
    },
});