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
  ClienteFiado,
} from '../services/fiadoService';

export default function S08_FiadosScreen(): React.ReactNode {
  // Estados de la lista
  const [busqueda, setBusqueda] = useState('');
  const [clientes, setClientes] = useState<ClienteFiado[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados del Modal / Formulario
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    // Suscripción en tiempo real a Firestore
    const unsubscribe = subscribeToClientesFiados((data) => {
      setClientes(data);
      setCargando(false);
    });

    return () => unsubscribe();
  }, []);

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const resetFormulario = () => {
    setNombre('');
    setTelefono('');
    setNotas('');
    setModalVisible(false);
  };

  const handleGuardarCliente = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo obligatorio', 'Por favor ingresá el nombre del cliente.');
      return;
    }

    try {
      setGuardando(true);
      await crearClienteFiado({
        nombre: nombre.trim(),
        telefono: telefono.trim() || undefined,
        notas: notas.trim() || undefined,
      });

      Alert.alert('¡Éxito!', 'Cliente registrado correctamente.');
      resetFormulario();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el cliente. Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const renderItem = ({ item }: { item: ClienteFiado }) => (
    <TouchableOpacity
      style={styles.cardCliente}
      onPress={() =>
        Alert.alert(
          item.nombre,
          `Deuda total: $${item.deudaTotal.toLocaleString('es-AR')}\n` +
            (item.notas ? `Notas: ${item.notas}` : '')
        )
      }
    >
      <View style={styles.infoCliente}>
        <Text style={styles.nombreCliente}>{item.nombre}</Text>
        {item.telefono ? (
          <Text style={styles.telefonoCliente}>📞 {item.telefono}</Text>
        ) : null}
      </View>
      <View style={styles.deudaContainer}>
        <Text style={styles.labelDeuda}>Deuda Total</Text>
        <Text
          style={[
            styles.montoDeuda,
            item.deudaTotal > 0 ? styles.conDeuda : styles.sinDeuda,
          ]}
        >
          ${item.deudaTotal.toLocaleString('es-AR')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Barra de búsqueda y botón nuevo cliente */}
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
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.textoBotonNuevo}>+ Cliente</Text>
        </TouchableOpacity>
      </View>

      {/* Lista principal */}
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

      {/* Modal para alta de nuevo cliente */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={resetFormulario}
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
                  onPress={resetFormulario}
                  disabled={guardando}
                >
                  <Text style={styles.textoBotonCancelar}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botonGuardar}
                  onPress={handleGuardarCliente}
                  disabled={guardando}
                >
                  {guardando ? (
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
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  infoCliente: { flex: 1 },
  nombreCliente: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  telefonoCliente: { fontSize: 12, color: '#666', marginTop: 4 },
  deudaContainer: { alignItems: 'flex-end' },
  labelDeuda: { fontSize: 11, color: '#666', textTransform: 'uppercase' },
  montoDeuda: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  conDeuda: { color: '#EF4444' },
  sinDeuda: { color: '#10B981' },
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 18,
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
    height: 80,
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
    paddingHorizontal: 22,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    minWidth: 100,
    alignItems: 'center',
  },
  textoBotonGuardar: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});