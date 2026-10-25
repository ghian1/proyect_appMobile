import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  abrirCaja,
  cerrarCaja,
  EstadoCaja,
  suscribirAEstadoCaja,
} from '../services/cajaService';
import { ClienteFiado, subscribeToClientesFiados } from '../services/fiadoService';
import { suscribirAVentas, Venta } from '../services/saleService';

// Formateador de moneda en pesos argentinos ($ 1.250,00)
const formatearMoneda = (monto: number): string => {
  const seguro = isNaN(monto) ? 0 : Number(monto);
  const partes = seguro.toFixed(2).split('.');
  const enteros = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimales = partes[1];
  return `$${enteros},${decimales}`;
};

// Formateador de fecha en español
const formatearFechaHoy = (): string => {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const ahora = new Date();
  return `${dias[ahora.getDay()]}, ${ahora.getDate()} de ${meses[ahora.getMonth()]}`;
};

// Formateador de hora para aperturas y cierres de caja
const formatearHora = (timestamp: any): string => {
  if (!timestamp) return '';
  const d = timestamp.toDate
    ? timestamp.toDate()
    : timestamp.seconds
    ? new Date(timestamp.seconds * 1000)
    : new Date(timestamp);
  const horas = String(d.getHours()).padStart(2, '0');
  const minutos = String(d.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos} hs`;
};

export function S11_MetricasScreen(): React.ReactNode {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [clientesFiados, setClientesFiados] = useState<ClienteFiado[]>([]);
  const [estadoCaja, setEstadoCaja] = useState<EstadoCaja>({ estado: 'abierta' });

  const [cargandoVentas, setCargandoVentas] = useState<boolean>(true);
  const [cargandoClientes, setCargandoClientes] = useState<boolean>(true);
  const [procesandoCaja, setProcesandoCaja] = useState<boolean>(false);
  const [refrescando, setRefrescando] = useState<boolean>(false);

  // Suscripción en tiempo real a las ventas de Firestore
  useEffect(() => {
    const desuscribirVentas = suscribirAVentas(
      (datos) => {
        setVentas(datos);
        setCargandoVentas(false);
      },
      (error) => {
        console.error('Error al obtener ventas:', error);
        setCargandoVentas(false);
      }
    );

    return () => {
      if (desuscribirVentas) desuscribirVentas();
    };
  }, []);

  // Suscripción en tiempo real a clientes fiados y sus deudas
  useEffect(() => {
    const desuscribirClientes = subscribeToClientesFiados((datos) => {
      setClientesFiados(datos);
      setCargandoClientes(false);
    });

    return () => {
      if (desuscribirClientes) desuscribirClientes();
    };
  }, []);

  // Suscripción en tiempo real al estado de la caja
  useEffect(() => {
    const desuscribirCaja = suscribirAEstadoCaja((estado) => {
      setEstadoCaja(estado);
    });

    return () => {
      if (desuscribirCaja) desuscribirCaja();
    };
  }, []);

  // Filtrado de las ventas del turno de caja actual (inicia en $0 al abrir nueva caja)
  const ventasTurnoActual = useMemo(() => {
    // Si la caja está cerrada, no hay recaudación activa en curso ($0)
    if (estadoCaja.estado === 'cerrada') {
      return [];
    }

    // Convertimos la fecha de apertura si existe
    const dApertura = estadoCaja.fechaApertura?.toDate
      ? estadoCaja.fechaApertura.toDate().getTime()
      : estadoCaja.fechaApertura?.seconds
      ? estadoCaja.fechaApertura.seconds * 1000
      : null;

    return ventas.filter((v) => {
      if (!v.fecha) return false;
      const dVenta = v.fecha?.toDate
        ? v.fecha.toDate().getTime()
        : v.fecha?.seconds
        ? v.fecha.seconds * 1000
        : new Date(v.fecha).getTime();

      // Si existe fecha de apertura del turno actual, se toman solo las ventas ocurridas a partir de dicha apertura
      if (dApertura) {
        return dVenta >= dApertura;
      }

      // Fallback: si no hay fecha de apertura registrada aún, tomamos las del día de hoy
      const hoy = new Date();
      const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
      return dVenta >= inicioHoy;
    });
  }, [ventas, estadoCaja.estado, estadoCaja.fechaApertura]);

  // Total facturado en el turno de caja actual
  const totalFacturadoHoy = useMemo(() => {
    return ventasTurnoActual.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
  }, [ventasTurnoActual]);

  // Cantidad de ventas realizadas en el turno actual
  const cantidadVentasHoy = ventasTurnoActual.length;

  // Ticket promedio del turno actual
  const ticketPromedio = useMemo(() => {
    return cantidadVentasHoy > 0 ? totalFacturadoHoy / cantidadVentasHoy : 0;
  }, [totalFacturadoHoy, cantidadVentasHoy]);

  // Total acumulado en cuentas corrientes de fiados (global)
  const totalEnFiados = useMemo(() => {
    return clientesFiados.reduce(
      (acc, c) => acc + (Number(c.deudaTotal) || 0),
      0
    );
  }, [clientesFiados]);

  // Cantidad de clientes con saldo deudor pendiente
  const clientesConSaldo = useMemo(() => {
    return clientesFiados.filter((c) => (Number(c.deudaTotal) || 0) > 0).length;
  }, [clientesFiados]);

  // Desglose por método de pago del turno actual
  const desgloseMetodos = useMemo(() => {
    let efectivo = 0;
    let efectivoCant = 0;
    let qr = 0;
    let qrCant = 0;
    let transferencia = 0;
    let transferenciaCant = 0;
    let fiado = 0;
    let fiadoCant = 0;

    ventasTurnoActual.forEach((v) => {
      const monto = Number(v.total) || 0;
      const medio = v.medioPago;

      if (medio === 'Efectivo') {
        efectivo += monto;
        efectivoCant += 1;
      } else if (medio === 'Mercado Pago' || medio?.toLowerCase().includes('qr')) {
        qr += monto;
        qrCant += 1;
      } else if (medio === 'Transferencia') {
        transferencia += monto;
        transferenciaCant += 1;
      } else if (medio === 'Fiado') {
        fiado += monto;
        fiadoCant += 1;
      }
    });

    return {
      efectivo: { monto: efectivo, cantidad: efectivoCant },
      qr: { monto: qr, cantidad: qrCant },
      transferencia: { monto: transferencia, cantidad: transferenciaCant },
      fiado: { monto: fiado, cantidad: fiadoCant },
    };
  }, [ventasTurnoActual]);

  // Porcentajes de cada medio de pago respecto del total recaudado en caja
  const calcularPorcentaje = (monto: number): number => {
    if (totalFacturadoHoy === 0) return 0;
    return Math.round((monto / totalFacturadoHoy) * 100);
  };

  // Manejo de la acción de Cerrar o Abrir Caja
  const handleAccionCaja = () => {
    if (estadoCaja.estado === 'abierta') {
      Alert.alert(
        'Cerrar Caja del Día',
        `¿Deseás cerrar la caja del turno con los siguientes valores?\n\n• Facturado: ${formatearMoneda(
          totalFacturadoHoy
        )}\n• Ventas: ${cantidadVentasHoy} operaciones\n• En Efectivo: ${formatearMoneda(
          desgloseMetodos.efectivo.monto
        )}\n\nAl confirmar, la recaudación del turno se cerrará y pasará a $0,00 para el próximo turno.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cerrar Caja',
            style: 'destructive',
            onPress: async () => {
              try {
                setProcesandoCaja(true);
                await cerrarCaja({
                  totalFacturado: totalFacturadoHoy,
                  cantidadVentas: cantidadVentasHoy,
                  desglose: desgloseMetodos,
                });
                Alert.alert(
                  '¡Caja Cerrada!',
                  'El cierre quedó registrado en el sistema. La recaudación se ha reiniciado a $0,00.'
                );
              } catch (error) {
                console.error('Error al cerrar caja:', error);
                Alert.alert('Error', 'No se pudo cerrar la caja.');
              } finally {
                setProcesandoCaja(false);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Abrir Caja',
        '¿Deseás abrir la caja para iniciar un nuevo turno de recaudación en $0,00?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Abrir Caja',
            onPress: async () => {
              try {
                setProcesandoCaja(true);
                await abrirCaja();
                Alert.alert('¡Caja Abierta!', 'La caja ya está activa y lista para recibir ventas.');
              } catch (error) {
                console.error('Error al abrir caja:', error);
                Alert.alert('Error', 'No se pudo abrir la caja.');
              } finally {
                setProcesandoCaja(false);
              }
            },
          },
        ]
      );
    }
  };

  const estaCargando = cargandoVentas || cargandoClientes;
  const cajaAbierta = estadoCaja.estado === 'abierta';

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      {/* Header estilo iOS */}
      <View style={styles.header}>
        <View style={styles.headerTextoContainer}>
          <Text style={styles.tituloHeader}>Métricas y Control de Caja</Text>
          <Text style={styles.fechaHeader}>{formatearFechaHoy()}</Text>
        </View>

        {/* Badge indicador de estado de caja */}
        <View
          style={[
            styles.badgeEstado,
            cajaAbierta ? styles.badgeAbierta : styles.badgeCerrada,
          ]}
        >
          <View
            style={[
              styles.puntoEstado,
              cajaAbierta ? styles.puntoVerde : styles.puntoRojo,
            ]}
          />
          <Text
            style={[
              styles.textoBadgeEstado,
              cajaAbierta ? styles.textoVerde : styles.textoRojo,
            ]}
          >
            {cajaAbierta ? 'Caja Abierta' : 'Caja Cerrada'}
          </Text>
        </View>
      </View>

      {estaCargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.textoCargando}>Sincronizando métricas en tiempo real...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={() => {
                setRefrescando(true);
                setTimeout(() => setRefrescando(false), 600);
              }}
              tintColor="#007AFF"
            />
          }
        >
          {/* Card 1: Total Facturado en Turno */}
          <View style={styles.card}>
            <View style={styles.cardHeaderFila}>
              <Text style={styles.cardEtiqueta}>TOTAL FACTURADO EN CAJA</Text>
              <View style={[styles.iconoCirculo, { backgroundColor: '#DCFCE7' }]}>
                <Text style={styles.iconoEmoji}>💰</Text>
              </View>
            </View>
            <Text style={styles.montoPrincipal}>{formatearMoneda(totalFacturadoHoy)}</Text>
            <Text style={styles.cardSubtexto}>
              {cajaAbierta
                ? 'Recaudación del turno actual en curso'
                : 'La caja está cerrada. Presioná "Abrir Caja" para iniciar el turno.'}
            </Text>
          </View>

          {/* Grilla con Card 2 (Cantidad de Ventas) y Card 3 (Fiados) */}
          <View style={styles.filaDosColumnas}>
            {/* Card 2: Cantidad de Ventas */}
            <View style={[styles.card, styles.columna]}>
              <View style={styles.cardHeaderFila}>
                <Text style={styles.cardEtiquetaMini}>VENTAS DEL TURNO</Text>
                <View style={[styles.iconoCirculoMini, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={styles.iconoEmojiMini}>🛒</Text>
                </View>
              </View>
              <Text style={styles.montoMedio}>
                {cantidadVentasHoy}{' '}
                <Text style={styles.unidadMedio}>{cantidadVentasHoy === 1 ? 'venta' : 'ventas'}</Text>
              </Text>
              <View style={styles.divisorSutil} />
              <Text style={styles.datoComplementario}>
                Promedio: <Text style={styles.datoResaltado}>{formatearMoneda(ticketPromedio)}</Text>
              </Text>
            </View>

            {/* Card 3: Total en Fiados / Cuentas Corrientes */}
            <View style={[styles.card, styles.columna]}>
              <View style={styles.cardHeaderFila}>
                <Text style={styles.cardEtiquetaMini}>EN FIADOS</Text>
                <View style={[styles.iconoCirculoMini, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={styles.iconoEmojiMini}>📓</Text>
                </View>
              </View>
              <Text style={[styles.montoMedio, { color: '#B45309' }]}>
                {formatearMoneda(totalEnFiados)}
              </Text>
              <View style={styles.divisorSutil} />
              <Text style={styles.datoComplementario}>
                {clientesConSaldo} {clientesConSaldo === 1 ? 'cliente con saldo' : 'clientes con saldo'}
              </Text>
            </View>
          </View>

          {/* Card 4: Desglose por Método de Pago */}
          <View style={styles.card}>
            <View style={styles.cardHeaderFila}>
              <View>
                <Text style={styles.cardTituloSeccion}>Desglose por Método de Pago</Text>
                <Text style={styles.cardSubtextoSeccion}>Ventas cobradas en este turno de caja</Text>
              </View>
              <View style={[styles.iconoCirculo, { backgroundColor: '#F3E8FF' }]}>
                <Text style={styles.iconoEmoji}>📊</Text>
              </View>
            </View>

            <View style={styles.contenedorDesglose}>
              {/* Efectivo */}
              <View style={styles.itemDesglose}>
                <View style={styles.filaDesgloseEncabezado}>
                  <View style={styles.filaMetodoNombre}>
                    <Text style={styles.emojiMetodo}>💵</Text>
                    <Text style={styles.nombreMetodo}>Efectivo</Text>
                  </View>
                  <View style={styles.filaMetodoMontos}>
                    <Text style={styles.montoMetodo}>
                      {formatearMoneda(desgloseMetodos.efectivo.monto)}
                    </Text>
                    <Text style={styles.porcentajeMetodo}>
                      {calcularPorcentaje(desgloseMetodos.efectivo.monto)}%
                    </Text>
                  </View>
                </View>
                <View style={styles.barraFondo}>
                  <View
                    style={[
                      styles.barraRelleno,
                      {
                        backgroundColor: '#10B981',
                        width: `${calcularPorcentaje(desgloseMetodos.efectivo.monto)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.cantVentasMetodo}>
                  {desgloseMetodos.efectivo.cantidad}{' '}
                  {desgloseMetodos.efectivo.cantidad === 1 ? 'cobro' : 'cobros'}
                </Text>
              </View>

              {/* QR / Mercado Pago */}
              <View style={styles.itemDesglose}>
                <View style={styles.filaDesgloseEncabezado}>
                  <View style={styles.filaMetodoNombre}>
                    <Text style={styles.emojiMetodo}>📱</Text>
                    <Text style={styles.nombreMetodo}>QR (Mercado Pago)</Text>
                  </View>
                  <View style={styles.filaMetodoMontos}>
                    <Text style={styles.montoMetodo}>
                      {formatearMoneda(desgloseMetodos.qr.monto)}
                    </Text>
                    <Text style={styles.porcentajeMetodo}>
                      {calcularPorcentaje(desgloseMetodos.qr.monto)}%
                    </Text>
                  </View>
                </View>
                <View style={styles.barraFondo}>
                  <View
                    style={[
                      styles.barraRelleno,
                      {
                        backgroundColor: '#009EE3',
                        width: `${calcularPorcentaje(desgloseMetodos.qr.monto)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.cantVentasMetodo}>
                  {desgloseMetodos.qr.cantidad}{' '}
                  {desgloseMetodos.qr.cantidad === 1 ? 'cobro' : 'cobros'}
                </Text>
              </View>

              {/* Transferencia */}
              <View style={styles.itemDesglose}>
                <View style={styles.filaDesgloseEncabezado}>
                  <View style={styles.filaMetodoNombre}>
                    <Text style={styles.emojiMetodo}>🏦</Text>
                    <Text style={styles.nombreMetodo}>Transferencia</Text>
                  </View>
                  <View style={styles.filaMetodoMontos}>
                    <Text style={styles.montoMetodo}>
                      {formatearMoneda(desgloseMetodos.transferencia.monto)}
                    </Text>
                    <Text style={styles.porcentajeMetodo}>
                      {calcularPorcentaje(desgloseMetodos.transferencia.monto)}%
                    </Text>
                  </View>
                </View>
                <View style={styles.barraFondo}>
                  <View
                    style={[
                      styles.barraRelleno,
                      {
                        backgroundColor: '#6366F1',
                        width: `${calcularPorcentaje(desgloseMetodos.transferencia.monto)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.cantVentasMetodo}>
                  {desgloseMetodos.transferencia.cantidad}{' '}
                  {desgloseMetodos.transferencia.cantidad === 1 ? 'cobro' : 'cobros'}
                </Text>
              </View>

              {/* Fiado (si hubieron ventas a cuenta en este turno) */}
              {desgloseMetodos.fiado.monto > 0 && (
                <View style={[styles.itemDesglose, { borderBottomWidth: 0 }]}>
                  <View style={styles.filaDesgloseEncabezado}>
                    <View style={styles.filaMetodoNombre}>
                      <Text style={styles.emojiMetodo}>📓</Text>
                      <Text style={styles.nombreMetodo}>Anotado en Fiado</Text>
                    </View>
                    <View style={styles.filaMetodoMontos}>
                      <Text style={styles.montoMetodo}>
                        {formatearMoneda(desgloseMetodos.fiado.monto)}
                      </Text>
                      <Text style={styles.porcentajeMetodo}>
                        {calcularPorcentaje(desgloseMetodos.fiado.monto)}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.barraFondo}>
                    <View
                      style={[
                        styles.barraRelleno,
                        {
                          backgroundColor: '#F59E0B',
                          width: `${calcularPorcentaje(desgloseMetodos.fiado.monto)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.cantVentasMetodo}>
                    {desgloseMetodos.fiado.cantidad}{' '}
                    {desgloseMetodos.fiado.cantidad === 1 ? 'ticket' : 'tickets'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Card 5: Control y Estado de Caja con Botón de Acción Principal */}
          <View style={[styles.card, styles.cardCaja]}>
            <View style={styles.infoCajaContainer}>
              <View style={styles.cajaEstadoRow}>
                <View
                  style={[
                    styles.iconoCirculoCaja,
                    cajaAbierta
                      ? { backgroundColor: '#DCFCE7' }
                      : { backgroundColor: '#FEE2E2' },
                  ]}
                >
                  <Text style={styles.iconoEmoji}>{cajaAbierta ? '🔓' : '🔒'}</Text>
                </View>
                <View style={styles.textoCajaContainer}>
                  <Text style={styles.tituloControlCaja}>Control de Caja</Text>
                  <Text style={styles.subtituloControlCaja}>
                    {cajaAbierta
                      ? estadoCaja.fechaApertura
                        ? `Turno abierto hoy a las ${formatearHora(estadoCaja.fechaApertura)}`
                        : 'Caja operativa y recibiendo ventas'
                      : estadoCaja.fechaCierre
                      ? `Cerrada hoy a las ${formatearHora(estadoCaja.fechaCierre)}${
                          estadoCaja.totalFacturadoAlCierre
                            ? ` • Cierre: ${formatearMoneda(estadoCaja.totalFacturadoAlCierre)}`
                            : ''
                        }`
                      : 'La caja se encuentra cerrada'}
                  </Text>
                </View>
              </View>

              {/* Botón principal de acción: Cerrar Caja del Día / Abrir Caja */}
              <TouchableOpacity
                style={[
                  styles.botonAccionCaja,
                  cajaAbierta ? styles.botonCerrarCaja : styles.botonAbrirCaja,
                ]}
                onPress={handleAccionCaja}
                disabled={procesandoCaja}
                activeOpacity={0.8}
              >
                {procesandoCaja ? (
                  <ActivityIndicator
                    size="small"
                    color={cajaAbierta ? '#DC2626' : '#FFFFFF'}
                  />
                ) : (
                  <Text
                    style={[
                      styles.textoBotonAccionCaja,
                      cajaAbierta ? styles.textoBtnCerrar : styles.textoBtnAbrir,
                    ]}
                  >
                    {cajaAbierta ? 'Cerrar Caja del Día 🔒' : 'Abrir Caja 🔓'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTextoContainer: {
    flex: 1,
  },
  tituloHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  fechaHeader: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  badgeEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeAbierta: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  badgeCerrada: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  puntoEstado: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  puntoVerde: {
    backgroundColor: '#10B981',
  },
  puntoRojo: {
    backgroundColor: '#EF4444',
  },
  textoBadgeEstado: {
    fontSize: 12,
    fontWeight: '600',
  },
  textoVerde: {
    color: '#065F46',
  },
  textoRojo: {
    color: '#991B1B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  textoCargando: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardEtiqueta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.8,
  },
  cardEtiquetaMini: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  iconoCirculo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoCirculoMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoEmoji: {
    fontSize: 18,
  },
  iconoEmojiMini: {
    fontSize: 14,
  },
  montoPrincipal: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  cardSubtexto: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 18,
  },
  filaDosColumnas: {
    flexDirection: 'row',
    gap: 12,
  },
  columna: {
    flex: 1,
    padding: 14,
  },
  montoMedio: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 2,
  },
  unidadMedio: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  divisorSutil: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  datoComplementario: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  datoResaltado: {
    fontWeight: '700',
    color: '#1C1C1E',
  },
  cardTituloSeccion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  cardSubtextoSeccion: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  contenedorDesglose: {
    marginTop: 12,
  },
  itemDesglose: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filaDesgloseEncabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  filaMetodoNombre: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiMetodo: {
    fontSize: 16,
    marginRight: 8,
  },
  nombreMetodo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  filaMetodoMontos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  montoMetodo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  porcentajeMetodo: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    minWidth: 32,
    textAlign: 'right',
  },
  barraFondo: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  barraRelleno: {
    height: '100%',
    borderRadius: 3,
  },
  cantVentasMetodo: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  cardCaja: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginTop: 4,
  },
  infoCajaContainer: {
    gap: 16,
  },
  cajaEstadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconoCirculoCaja: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textoCajaContainer: {
    flex: 1,
  },
  tituloControlCaja: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  subtituloControlCaja: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  botonAccionCaja: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCerrarCaja: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  botonAbrirCaja: {
    backgroundColor: '#007AFF',
  },
  textoBotonAccionCaja: {
    fontSize: 15,
    fontWeight: '700',
  },
  textoBtnCerrar: {
    color: '#DC2626',
  },
  textoBtnAbrir: {
    color: '#FFFFFF',
  },
});
