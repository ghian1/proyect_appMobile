import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import {
  CobroEfectivo,
  calcularVuelto,
  validarCobroEfectivo,
} from '../../src/components/CobroEfectivo';

describe('Módulo de Cobro en Efectivo - Pruebas Unitarias y de Componente', () => {
  describe('Función auxiliar: calcularVuelto', () => {
    const totalVenta = 1250.5;

    it('debe devolver 0 si el cliente no ingresó dinero o el valor es nulo/vacío', () => {
      expect(calcularVuelto(totalVenta, '')).toBe(0);
      expect(calcularVuelto(totalVenta, null)).toBe(0);
      expect(calcularVuelto(totalVenta, undefined)).toBe(0);
    });

    it('debe devolver 0 si el dinero abonado es exactamente igual al total (pago exacto)', () => {
      expect(calcularVuelto(totalVenta, 1250.5)).toBe(0);
      expect(calcularVuelto(totalVenta, '1250.50')).toBe(0);
    });

    it('debe devolver 0 si el dinero abonado es menor al total a cobrar', () => {
      expect(calcularVuelto(totalVenta, 1000)).toBe(0);
      expect(calcularVuelto(totalVenta, '500')).toBe(0);
    });

    it('debe calcular el vuelto correcto cuando el dinero abonado supera el total', () => {
      expect(calcularVuelto(totalVenta, 2000)).toBe(749.5);
      expect(calcularVuelto(100, 150)).toBe(50);
    });

    it('debe aceptar montos expresados con coma decimal argentina (ej: "2000,50")', () => {
      const total = 1500;
      expect(calcularVuelto(total, '2000,50')).toBe(500.5);
    });

    it('debe devolver 0 si el total de la venta es menor o igual a 0', () => {
      expect(calcularVuelto(0, 100)).toBe(0);
      expect(calcularVuelto(-50, 100)).toBe(0);
    });
  });

  describe('Función auxiliar: validarCobroEfectivo', () => {
    const total = 2500;

    it('debe autocompletar con el monto exacto si el campo está vacío ("paga con el monto exacto")', () => {
      const resultado = validarCobroEfectivo(total, '');

      expect(resultado.esValido).toBe(true);
      expect(resultado.montoFinal).toBe(2500);
      expect(resultado.vuelto).toBe(0);
      expect(resultado.esMontoExactoAutocompletado).toBe(true);
      expect(resultado.error).toBeUndefined();
    });

    it('debe rechazar montos no numéricos o menores o iguales a cero', () => {
      const resultadoTextoInvalido = validarCobroEfectivo(total, 'abc');
      expect(resultadoTextoInvalido.esValido).toBe(false);
      expect(resultadoTextoInvalido.error).toContain('Ingresá un monto válido');

      const resultadoCero = validarCobroEfectivo(total, '0');
      expect(resultadoCero.esValido).toBe(false);
    });

    it('debe rechazar montos inferiores al total de la compra con mensaje explicativo', () => {
      const resultado = validarCobroEfectivo(total, '2000');

      expect(resultado.esValido).toBe(false);
      expect(resultado.montoFinal).toBe(2000);
      expect(resultado.vuelto).toBe(0);
      expect(resultado.error).toContain('menor al total ($2500.00)');
      expect(resultado.error).toContain('Faltan $500.00');
    });

    it('debe validar exitosamente y calcular vuelto cuando el pago es mayor al total', () => {
      const resultado = validarCobroEfectivo(total, '3000');

      expect(resultado.esValido).toBe(true);
      expect(resultado.montoFinal).toBe(3000);
      expect(resultado.vuelto).toBe(500);
      expect(resultado.esMontoExactoAutocompletado).toBe(false);
    });
  });

  describe('Componente UI: <CobroEfectivo />', () => {
    const totalMock = 3500;
    const onConfirmarPagoMock = jest.fn();
    const onCancelarMock = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('debe renderizar el total a cobrar formateado correctamente', () => {
      const { getByText } = render(
        <CobroEfectivo
          total={totalMock}
          onConfirmarPago={onConfirmarPagoMock}
          onCancelar={onCancelarMock}
        />
      );

      expect(getByText('$3500.00')).toBeTruthy();
    });

    it('debe mostrar banner de autocompletado si el cajero no ingresa dinero', () => {
      const { getByTestId, queryByTestId } = render(
        <CobroEfectivo
          total={totalMock}
          onConfirmarPago={onConfirmarPagoMock}
        />
      );

      expect(getByTestId('banner-monto-exacto-auto')).toBeTruthy();
      expect(queryByTestId('contenedor-vuelto')).toBeNull();
    });

    it('debe permitir confirmar la venta con el monto exacto cuando no se ingresa dinero', () => {
      const { getByTestId } = render(
        <CobroEfectivo
          total={totalMock}
          onConfirmarPago={onConfirmarPagoMock}
        />
      );

      const botonConfirmar = getByTestId('btn-confirmar-cobro');
      fireEvent.press(botonConfirmar);

      expect(onConfirmarPagoMock).toHaveBeenCalledTimes(1);
      expect(onConfirmarPagoMock).toHaveBeenCalledWith({
        montoAbonado: 3500,
        vuelto: 0,
      });
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('debe autocompletar el campo al presionar el botón "Paga Justo"', () => {
      const { getByTestId } = render(
        <CobroEfectivo
          total={totalMock}
          onConfirmarPago={onConfirmarPagoMock}
        />
      );

      const botonPagaJusto = getByTestId('btn-monto-exacto');
      fireEvent.press(botonPagaJusto);

      const input = getByTestId('input-paga-con');
      expect(input.props.value).toBe('3500.00');
      expect(getByTestId('badge-pago-exacto')).toBeTruthy();
    });

    it('debe bloquear la venta y disparar una Alerta si el monto abonado es insuficiente', () => {
      const { getByTestId } = render(
        <CobroEfectivo
          total={totalMock}
          onConfirmarPago={onConfirmarPagoMock}
        />
      );

      const input = getByTestId('input-paga-con');
      fireEvent.changeText(input, '2000');

      const botonConfirmar = getByTestId('btn-confirmar-cobro');
      fireEvent.press(botonConfirmar);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Monto Insuficiente',
        expect.stringContaining('menor al total ($3500.00)')
      );
      expect(onConfirmarPagoMock).not.toHaveBeenCalled();
    });

    it('debe calcular y mostrar el vuelto en tiempo real cuando el cliente abona con dinero sobrante', () => {
      const { getByTestId, getByText } = render(
        <CobroEfectivo
          total={totalMock}
          onConfirmarPago={onConfirmarPagoMock}
        />
      );

      const input = getByTestId('input-paga-con');
      fireEvent.changeText(input, '5000');

      expect(getByText('$1500.00')).toBeTruthy();

      const botonConfirmar = getByTestId('btn-confirmar-cobro');
      fireEvent.press(botonConfirmar);

      expect(onConfirmarPagoMock).toHaveBeenCalledWith({
        montoAbonado: 5000,
        vuelto: 1500,
      });
    });

    it('debe invocar onCancelar al presionar el botón Volver', () => {
      const { getByTestId } = render(
        <CobroEfectivo
          total={totalMock}
          onConfirmarPago={onConfirmarPagoMock}
          onCancelar={onCancelarMock}
        />
      );

      const botonCancelar = getByTestId('btn-cancelar-cobro');
      fireEvent.press(botonCancelar);

      expect(onCancelarMock).toHaveBeenCalledTimes(1);
    });
  });
});
