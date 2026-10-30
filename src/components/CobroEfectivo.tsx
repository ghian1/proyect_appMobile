import React, { useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/**
 * Calcula el vuelto a entregar dado un total y el monto pagado.
 * Devuelve 0 si el monto pagado es insuficiente, inválido o menor al total.
 */
export function calcularVuelto(
  total: number,
  montoAbonado: string | number | null | undefined
): number {
  if (total <= 0) return 0;
  if (montoAbonado === null || montoAbonado === undefined || montoAbonado === '') {
    return 0;
  }

  const normalizado = montoAbonado.toString().replace(',', '.').trim();
  const pagoNum = parseFloat(normalizado);

  if (isNaN(pagoNum) || pagoNum < total) {
    return 0;
  }

  return Number((pagoNum - total).toFixed(2));
}

/**
 * Valida el cobro en efectivo.
 * Si el usuario no ingresa dinero, se autocompleta con el monto exacto.
 */
export function validarCobroEfectivo(
  total: number,
  montoAbonadoTexto: string | null | undefined
): {
  esValido: boolean;
  montoFinal: number;
  vuelto: number;
  error?: string;
  esMontoExactoAutocompletado: boolean;
} {
  const textoLimpio = (montoAbonadoTexto ?? '').toString().trim();

  // Autocompletado: si no se ingresa dinero, se asume pago con monto exacto
  if (textoLimpio === '') {
    return {
      esValido: true,
      montoFinal: total,
      vuelto: 0,
      esMontoExactoAutocompletado: true,
    };
  }

  const normalizado = textoLimpio.replace(',', '.');
  const pagoNum = parseFloat(normalizado);

  if (isNaN(pagoNum) || pagoNum <= 0) {
    return {
      esValido: false,
      montoFinal: 0,
      vuelto: 0,
      esMontoExactoAutocompletado: false,
      error: 'Ingresá un monto válido para registrar el cobro.',
    };
  }

  if (pagoNum < total) {
    const faltante = (total - pagoNum).toFixed(2);
    return {
      esValido: false,
      montoFinal: pagoNum,
      vuelto: 0,
      esMontoExactoAutocompletado: false,
      error: `El monto abonado ($${pagoNum.toFixed(2)}) es menor al total ($${total.toFixed(2)}). Faltan $${faltante}.`,
    };
  }

  const vuelto = Number((pagoNum - total).toFixed(2));

  return {
    esValido: true,
    montoFinal: pagoNum,
    vuelto,
    esMontoExactoAutocompletado: false,
  };
}

export interface CobroEfectivoProps {
  total: number;
  onConfirmarPago: (resultado: { montoAbonado: number; vuelto: number }) => void;
  onCancelar?: () => void;
  deshabilitado?: boolean;
}

/**
 * Componente interactivo para cobrar en efectivo en el punto de venta Mingo.
 * Soporta autocompletado de monto exacto, cálculo de vuelto en tiempo real
 * y validaciones estrictas de dinero recibido.
 */
export function CobroEfectivo({
  total,
  onConfirmarPago,
  onCancelar,
  deshabilitado = false,
}: CobroEfectivoProps) {
  const [montoAbonado, setMontoAbonado] = useState('');

  const vuelto = useMemo(() => {
    return calcularVuelto(total, montoAbonado);
  }, [total, montoAbonado]);

  const esMontoExacto = useMemo(() => {
    const texto = montoAbonado.trim();
    if (texto === '') return true;
    const pago = parseFloat(texto.replace(',', '.'));
    return !isNaN(pago) && Number(pago.toFixed(2)) === Number(total.toFixed(2));
  }, [montoAbonado, total]);

  const handleMontoExacto = () => {
    setMontoAbonado(total.toFixed(2));
  };

  const handleConfirmar = () => {
    const validacion = validarCobroEfectivo(total, montoAbonado);

    if (!validacion.esValido) {
      Alert.alert('Monto Insuficiente', validacion.error || 'Verificá el dinero ingresado.');
      return;
    }

    onConfirmarPago({
      montoAbonado: validacion.montoFinal,
      vuelto: validacion.vuelto,
    });
  };

  return (
    <View style={styles.contenedor} testID="componente-cobro-efectivo">
      <View style={styles.cabeceraTotal}>
        <Text style={styles.labelTotal}>TOTAL A COBRAR</Text>
        <Text testID="texto-total-cobro" style={styles.montoTotal}>
          ${total.toFixed(2)}
        </Text>
      </View>

      <View style={styles.filaLabel}>
        <Text style={styles.labelInput}>¿Con cuánto abona el cliente?</Text>
        <TouchableOpacity
          testID="btn-monto-exacto"
          accessibilityRole="button"
          accessibilityLabel="Paga con el monto exacto"
          style={styles.botonExacto}
          onPress={handleMontoExacto}
          disabled={deshabilitado}
        >
          <Text style={styles.textoBotonExacto}>Paga Justo</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        testID="input-paga-con"
        accessibilityLabel="Monto abonado por el cliente"
        style={styles.input}
        placeholder={`$${total.toFixed(2)} (Monto exacto)`}
        placeholderTextColor="#8E8E93"
        keyboardType="numeric"
        value={montoAbonado}
        onChangeText={setMontoAbonado}
        editable={!deshabilitado}
      />

      {/* Indicadores contextuales de vuelto o autocompletado */}
      {montoAbonado.trim() === '' && (
        <View testID="banner-monto-exacto-auto" style={styles.badgeInfo}>
          <Text style={styles.textoBadgeInfo}>
            ℹ️ Sin monto ingresado: se cobrará con el monto exacto ($0.00 de vuelto).
          </Text>
        </View>
      )}

      {vuelto > 0 && (
        <View testID="contenedor-vuelto" style={styles.badgeVuelto}>
          <Text style={styles.labelVuelto}>Vuelto a entregar:</Text>
          <Text testID="texto-vuelto" style={styles.montoVuelto}>
            ${vuelto.toFixed(2)}
          </Text>
        </View>
      )}

      {esMontoExacto && montoAbonado.trim() !== '' && (
        <View testID="badge-pago-exacto" style={styles.badgeExacto}>
          <Text style={styles.textoBadgeExacto}>✓ Pago con monto exacto - Sin vuelto</Text>
        </View>
      )}

      <View style={styles.filaBotones}>
        {onCancelar && (
          <TouchableOpacity
            testID="btn-cancelar-cobro"
            style={styles.botonCancelar}
            onPress={onCancelar}
            disabled={deshabilitado}
          >
            <Text style={styles.textoBotonCancelar}>Volver</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          testID="btn-confirmar-cobro"
          accessibilityRole="button"
          accessibilityLabel="Confirmar Cobro en Efectivo"
          style={[styles.botonConfirmar, deshabilitado && styles.botonDeshabilitado]}
          onPress={handleConfirmar}
          disabled={deshabilitado}
        >
          <Text style={styles.textoBotonConfirmar}>Confirmar Cobro</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cabeceraTotal: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  labelTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  montoTotal: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  filaLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelInput: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  botonExacto: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BCF0DA',
  },
  textoBotonExacto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#03543F',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  badgeInfo: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  textoBadgeInfo: {
    fontSize: 12,
    color: '#4B5563',
  },
  badgeVuelto: {
    backgroundColor: '#DEF7EC',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BCF0DA',
  },
  labelVuelto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#03543F',
  },
  montoVuelto: {
    fontSize: 18,
    fontWeight: '800',
    color: '#046C4E',
  },
  badgeExacto: {
    backgroundColor: '#E1EFFE',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  textoBadgeExacto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E429F',
    textAlign: 'center',
  },
  filaBotones: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  botonCancelar: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoBotonCancelar: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  botonConfirmar: {
    flex: 2,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoBotonConfirmar: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
});
