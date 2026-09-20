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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  subscribeToClientesFiados,
  crearClienteFiado,
  registrarMovimientoFiado,
  ClienteFiado,
} from '../services/fiadoService';

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
        telefono: telefono.trim() ? telefono.trim() : '', // Evitamos valores undefined
        notas: notas.trim() ? notas.trim() : '', // Previene crash si no pones descripción
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
    const montoNum = parseFloat(monto.replace(',', '.'));

    if (isNaN(montoNum) || montoNum <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresá un monto mayor a 0.');
      return;
    }

    if (!clienteSeleccionado?.id) return;

    try {
      setProcesandoSaldo(true);
      // Asignamos una descripción por defecto si queda vacía
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
          ? `Se sumaron $${montoNum} a la deuda de ${clienteSeleccionado.nombre}`
          : `Se descontaron $${montoNum} de la deuda de ${clienteSeleccionado.nombre}`
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
        <Text style={styles.nombreCliente}>{item.nombre}</Text>
        {item.telefono ? (
          <Text style={styles.telefonoCliente}>📞 {item.telefono}</Text>
        ) : null}
        {item.notas ? (
          <Text style={styles.notasCliente} numberOfLines={1}>
            📝 {item.notas}
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

        {/* Botones rápidos para Sumar (+) o Descontar (-) */}
        <View style={styles.botonesAccion}>
          <TouchableOpacity
            style={[styles.btnMini, styles.btnRestar]}
            onPress={() => abrirModalSaldo(item, 'PAGO')}
          >
            <Text style={styles.textoBtnMini}>- Cobrar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnMini, styles.btnSumar]}
            onPress={() => abrirModalSaldo(item, 'FIADO')}
          >
            <Text style={styles.textoBtnMini}>+ Fiar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Header y buscador */}
      <View style={styles.header}>
        <TextInput
          style={styles.inputBuscador}
          placeholder="Buscar cliente..."
          placeholderTextColor="#888"
          value={busqueda}
          onChangeText={setBusqueda}
        />
        <TouchableOpacity
          style={styles.botonNuevo}
          onPress={() => setModalClienteVisible(true)}
        >
          <Text style={styles.textoBotonNuevo}>+ Cliente</Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={clientesFiltrados}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <Text style={styles.textoVacio}>
              {busqueda
                ? 'No se encontraron clientes.'
                : 'No hay clientes registrados en la libreta.'}
            </Text>
          }
        />
      )}

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
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Nuevo Cliente de Fiado</Text>

              <Text style={styles.labelInput}>Nombre completo *</Text>
              <TextInput
                style={styles.inputModal}
                placeholder="Ej: Juan Pérez"
                placeholderTextColor="#A0AEC0"
                value={nombre}
                onChangeText={setNombre}
              />

              <Text style={styles.labelInput}>Teléfono (Opcional)</Text>
              <TextInput
                style={styles.inputModal}
                placeholder="Ej: 11 1234-5678"
                placeholderTextColor="#A0AEC0"
                keyboardType="phone-pad"
                value={telefono}
                onChangeText={setTelefono}
              />

              <Text style={styles.labelInput}>Notas o Referencias (Opcional)</Text>
              <TextInput
                style={[styles.inputModal, styles.textArea]}
                placeholder="Ej: Vive a la vuelta del almacén"
                placeholderTextColor="#A0AEC0"
                multiline
                numberOfLines={3}
                value={notas}
                onChangeText={setNotas}
              />

              <View style={styles.modalAcciones}>
                <TouchableOpacity
                  style={styles.botonCancelar}
                  onPress={resetFormCliente}
                  disabled={guardandoCliente}
                >
                  <Text style={styles.textoBotonCancelar}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botonGuardar}
                  onPress={handleGuardarCliente}
                  disabled={guardandoCliente}
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
              placeholderTextColor="#A0AEC0"
              keyboardType="decimal-pad"
              value={monto}
              onChangeText={setMonto}
            />

            <Text style={styles.labelInput}>Descripción / Concepto</Text>
            <TextInput
              style={styles.inputModal}
              placeholder={
                tipoMovimiento === 'FIADO'
                  ? 'Ej: Compra de mercadería'
                  : 'Ej: Pago a cuenta'
              }
              placeholderTextColor="#A0AEC0"
              value={concepto}
              onChangeText={setConcepto}
            />

            <View style={styles.modalAcciones}>
              <TouchableOpacity
                style={styles.botonCancelar}
                onPress={() => setModalSaldoVisible(false)}
                disabled={procesandoSaldo}
              >
                <Text style={styles.textoBotonCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botonGuardar,
                  tipoMovimiento === 'FIADO' ? styles.btnSumar : styles.btnRestar,
                ]}
                onPress={handleProcesarSaldo}
                disabled={procesandoSaldo}
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
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  header: { padding: 16, flexDirection: 'row', gap: 10, alignItems: 'center' },
  inputBuscador: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  botonNuevo: {
    backgroundColor: '#10B981',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotonNuevo: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  lista: { paddingHorizontal: 16, paddingBottom: 20 },
  cardCliente: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  infoCliente: { flex: 1, paddingRight: 10 },
  nombreCliente: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  telefonoCliente: { fontSize: 12, color: '#666', marginTop: 4 },
  notasCliente: { fontSize: 12, color: '#888', marginTop: 2, fontStyle: 'italic' },
  derechaContainer: { alignItems: 'flex-end' },
  labelDeuda: { fontSize: 10, color: '#666', textTransform: 'uppercase' },
  montoDeuda: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  conDeuda: { color: '#EF4444' },
  sinDeuda: { color: '#10B981' },
  botonesAccion: { flexDirection: 'row', gap: 6 },
  btnMini: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSumar: { backgroundColor: '#EF4444' },
  btnRestar: { backgroundColor: '#10B981' },
  textoBtnMini: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 11 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoVacio: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 14 },

  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  labelInput: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
  },
  inputModal: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 15,
    color: '#1F2937',
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
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  textoBotonCancelar: { color: '#374151', fontWeight: '600', fontSize: 14 },
  botonGuardar: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  textoBotonGuardar: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});