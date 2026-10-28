import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  ClienteFiado,
  crearClienteFiado,
  eliminarClienteFiado,
  registrarMovimientoFiado,
  subscribeToClientesFiados,
} from '../services/fiadoService';
import { sanearImporte } from '../utils/sanitizers';

export default function S08_FiadosScreen(): React.ReactNode {
  // Lista de clientes y búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [clientes, setClientes] = useState<ClienteFiado[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal 1: Nuevo Cliente
  const [modalClienteVisible, setModalClienteVisible] = useState(false);
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [notas, setNotas] = useState('');

  // Modal 2: Cargar / Descontar Saldo
  const [modalSaldoVisible, setModalSaldoVisible] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteFiado | null>(null);
  const [tipoMovimiento, setTipoMovimiento] = useState<'FIADO' | 'PAGO'>('FIADO');
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [procesandoSaldo, setProcesandoSaldo] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToClientesFiados((data) => {
      setClientes(data);
      setCargando(false);
    });
    return () => unsubscribe();
  }, []);

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Confirmación y eliminación de cliente
  const handleEliminarCliente = (cliente: ClienteFiado) => {
    if (!cliente.id) return;

    const mensajeAdvertencia =
      cliente.deudaTotal > 0
        ? `¡Atención! ${cliente.nombre} tiene una deuda pendiente de $${cliente.deudaTotal.toLocaleString(
            'es-AR'
          )}. ¿Querés eliminarlo de todas formas?`
        : `¿Estás seguro de que querés eliminar a ${cliente.nombre} de la libreta de fiados?`;

    Alert.alert('Eliminar Cliente', mensajeAdvertencia, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminarClienteFiado(cliente.id!);
            Alert.alert('Eliminado', 'El cliente fue removido de la libreta.');
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar el cliente.');
          }
        },
      },
    ]);
  };

  // 1. Resetear y Guardar Nuevo Cliente
  const resetFormCliente = () => {
    setNombre('');
    setTelefono('');
    setNotas('');
    setModalClienteVisible(false);
  };

  const handleGuardarCliente = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo obligatorio', 'Por favor ingresá el nombre del cliente.');
      return;
    }

    try {
      setGuardandoCliente(true);
      await crearClienteFiado({
        nombre: nombre.trim(),
        telefono: telefono.trim() ? telefono.trim() : '',
        notas: notas.trim() ? notas.trim() : '',
      });

      Alert.alert('¡Éxito!', 'Cliente registrado correctamente.');
      resetFormCliente();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el cliente.');
    } finally {
      setGuardandoCliente(false);
    }
  };

  // 2. Abrir Modal y Procesar Saldo (+ / -)
  const abrirModalSaldo = (cliente: ClienteFiado, tipo: 'FIADO' | 'PAGO') => {
    setClienteSeleccionado(cliente);
    setTipoMovimiento(tipo);
    setMonto('');
    setConcepto(tipo === 'FIADO' ? 'Compra fiada' : 'Entrega / Pago');
    setModalSaldoVisible(true);
  };

  const handleProcesarSaldo = async () => {
    const montoNum = sanearImporte(monto);

    if (isNaN(montoNum) || montoNum <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresá un monto mayor a 0.');
      return;
    }

    if (!clienteSeleccionado?.id) return;

    try {
      setProcesandoSaldo(true);
      const conceptoValido = concepto.trim()
        ? concepto.trim()
        : tipoMovimiento === 'FIADO'
        ? 'Compra fiada'
        : 'Entrega / Pago';

      await registrarMovimientoFiado(
        clienteSeleccionado.id,
        montoNum,
        tipoMovimiento,
        conceptoValido
      );

      Alert.alert(
        '¡Éxito!',
        tipoMovimiento === 'FIADO'
          ? `Se sumaron $${montoNum.toLocaleString('es-AR')} a la deuda de ${clienteSeleccionado.nombre}`
          : `Se descontaron $${montoNum.toLocaleString('es-AR')} de la deuda de ${clienteSeleccionado.nombre}`
      );
      setModalSaldoVisible(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el saldo.');
    } finally {
      setProcesandoSaldo(false);
    }
  };

  const renderItem = ({ item }: { item: ClienteFiado }) => (
    <View style={styles.cardCliente}>
      <View style={styles.infoCliente}>
        <View style={styles.headerInfoCliente}>
          <Text style={styles.nombreCliente}>{item.nombre}</Text>
          <TouchableOpacity
            style={styles.btnEliminar}
            onPress={() => handleEliminarCliente(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {item.telefono ? (
          <Text style={styles.telefonoCliente}>
            <Ionicons name="call-outline" size={12} color="#64748B" /> {item.telefono}
          </Text>
        ) : null}
        {item.notas ? (
          <Text style={styles.notasCliente} numberOfLines={1}>
            <Ionicons name="document-text-outline" size={12} color="#64748B" /> {item.notas}
          </Text>
        ) : null}
      </View>

      <View style={styles.derechaContainer}>
        <Text style={styles.labelDeuda}>Deuda</Text>
        <Text
          style={[
            styles.montoDeuda,
            item.deudaTotal > 0 ? styles.conDeuda : styles.sinDeuda,
          ]}
        >
          ${item.deudaTotal.toLocaleString('es-AR')}
        </Text>

        <View style={styles.botonesAccion}>
          <TouchableOpacity
            style={[styles.btnMini, styles.btnRestar]}
            onPress={() => abrirModalSaldo(item, 'PAGO')}
            activeOpacity={0.8}
          >
            <Text style={styles.textoBtnMini}>Cobrar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnMini, styles.btnSumar]}
            onPress={() => abrirModalSaldo(item, 'FIADO')}
            activeOpacity={0.8}
          >
            <Text style={styles.textoBtnMini}>+ Fiar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <View style={styles.inputBuscadorWrapper}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inputBuscador}
                placeholder="Buscar cliente..."
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
              style={styles.botonNuevo}
              onPress={() => setModalClienteVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.textoBotonNuevo}>Cliente</Text>
            </TouchableOpacity>
          </View>

          {cargando ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={styles.textoCargando}>Cargando libreta...</Text>
            </View>
          ) : (
            <FlatList
              data={clientesFiltrados}
              keyExtractor={(item) => item.id || Math.random().toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.lista}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.centerEmpty}>
                  <Ionicons name="book-outline" size={48} color="#CBD5E1" style={{ marginBottom: 8 }} />
                  <Text style={styles.textoVacio}>
                    {busqueda
                      ? 'No se encontraron clientes.'
                      : 'No hay clientes registrados en la libreta.'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* MODAL 1: Crear Nuevo Cliente */}
      <Modal
        visible={modalClienteVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={resetFormCliente}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Nuevo Cliente de Fiado</Text>

                <Text style={styles.labelInput}>Nombre completo *</Text>
                <TextInput
                  style={styles.inputModal}
                  placeholder="Ej: Juan Pérez"
                  placeholderTextColor="#94A3B8"
                  value={nombre}
                  onChangeText={setNombre}
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Text style={styles.labelInput}>Teléfono (Opcional)</Text>
                <TextInput
                  style={styles.inputModal}
                  placeholder="Ej: 11 1234-5678"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={telefono}
                  onChangeText={setTelefono}
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Text style={styles.labelInput}>Notas o Referencias (Opcional)</Text>
                <TextInput
                  style={[styles.inputModal, styles.textArea]}
                  placeholder="Ej: Vive a la vuelta del almacén"
                  placeholderTextColor="#94A3B8"
                  multiline={Platform.OS !== 'ios'}
                  numberOfLines={3}
                  value={notas}
                  onChangeText={setNotas}
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={Keyboard.dismiss}
                />

                <View style={styles.modalAcciones}>
                  <TouchableOpacity
                    style={styles.botonCancelar}
                    onPress={resetFormCliente}
                    disabled={guardandoCliente}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.textoBotonCancelar}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.botonGuardar}
                    onPress={handleGuardarCliente}
                    disabled={guardandoCliente}
                    activeOpacity={0.8}
                  >
                    {guardandoCliente ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.textoBotonGuardar}>Guardar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 2: Sumar (+) o Restar (-) Saldo */}
      <Modal
        visible={modalSaldoVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalSaldoVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {tipoMovimiento === 'FIADO'
                  ? `+ Cargar Fiado a ${clienteSeleccionado?.nombre}`
                  : `- Registrar Pago de ${clienteSeleccionado?.nombre}`}
              </Text>

              <Text style={styles.labelInput}>Monto ($) *</Text>
              <TextInput
                style={styles.inputModal}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={monto}
                onChangeText={setMonto}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />

              <Text style={styles.labelInput}>Descripción / Concepto</Text>
              <TextInput
                style={styles.inputModal}
                placeholder={
                  tipoMovimiento === 'FIADO'
                    ? 'Ej: Compra de mercadería'
                    : 'Ej: Pago a cuenta'
                }
                placeholderTextColor="#94A3B8"
                value={concepto}
                onChangeText={setConcepto}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />

              <View style={styles.modalAcciones}>
                <TouchableOpacity
                  style={styles.botonCancelar}
                  onPress={() => setModalSaldoVisible(false)}
                  disabled={procesandoSaldo}
                  activeOpacity={0.8}
                >
                  <Text style={styles.textoBotonCancelar}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.botonGuardar,
                    tipoMovimiento === 'FIADO' ? styles.btnSumarModal : styles.btnRestarModal,
                  ]}
                  onPress={handleProcesarSaldo}
                  disabled={procesandoSaldo}
                  activeOpacity={0.8}
                >
                  {procesandoSaldo ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.textoBotonGuardar}>
                      {tipoMovimiento === 'FIADO' ? 'Sumar Deuda' : 'Descontar Deuda'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F0F9FF', // Fondo celeste sutil característico
  },
  header: { 
    padding: 16, 
    flexDirection: 'row', 
    gap: 10, 
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
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
  botonNuevo: {
    backgroundColor: '#0284C7', // Azul corporativo del logo
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
  textoBotonNuevo: { 
    color: '#FFFFFF', 
    fontWeight: '600', 
    fontSize: 14, 
  },
  lista: { 
    padding: 16, 
    paddingBottom: 20, 
  },
  cardCliente: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
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
  infoCliente: { 
    flex: 1, 
    paddingRight: 10, 
  },
  headerInfoCliente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nombreCliente: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#0F172A', 
  },
  btnEliminar: { 
    padding: 4, 
  },
  telefonoCliente: { 
    fontSize: 12, 
    color: '#64748B', 
    marginTop: 4, 
  },
  notasCliente: { 
    fontSize: 12, 
    color: '#64748B', 
    marginTop: 2, 
    fontStyle: 'italic', 
  },
  derechaContainer: { 
    alignItems: 'flex-end', 
  },
  labelDeuda: { 
    fontSize: 10, 
    color: '#64748B', 
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  montoDeuda: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 8, 
  },
  conDeuda: { 
    color: '#EF4444', 
  },
  sinDeuda: { 
    color: '#16A34A', 
  },
  botonesAccion: { 
    flexDirection: 'row', 
    gap: 6, 
  },
  btnMini: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSumar: { 
    backgroundColor: '#EF4444', 
  },
  btnRestar: { 
    backgroundColor: '#16A34A', 
  },
  textoBtnMini: { 
    color: '#FFFFFF', 
    fontWeight: 'bold', 
    fontSize: 11, 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20,
  },
  centerEmpty: {
    marginTop: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoCargando: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 14,
  },
  textoVacio: { 
    textAlign: 'center', 
    color: '#64748B', 
    fontSize: 15, 
  },

  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  labelInput: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputModal: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 16,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  modalAcciones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  botonCancelar: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  textoBotonCancelar: { 
    color: '#334155', 
    fontWeight: '600', 
    fontSize: 14, 
  },
  botonGuardar: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#0284C7',
    alignItems: 'center',
  },
  btnSumarModal: {
    backgroundColor: '#EF4444',
  },
  btnRestarModal: {
    backgroundColor: '#16A34A',
  },
  textoBotonGuardar: { 
    color: '#FFFFFF', 
    fontWeight: '600', 
    fontSize: 14, 
  },
});