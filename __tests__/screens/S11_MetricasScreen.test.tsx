import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { S11_MetricasScreen } from '../../src/screens/S11_MetricasScreen';
import * as cajaService from '../../src/services/cajaService';
import * as saleService from '../../src/services/saleService';
import * as fiadoService from '../../src/services/fiadoService';

jest.mock('../../src/services/cajaService');
jest.mock('../../src/services/saleService');
jest.mock('../../src/services/fiadoService');

describe('Pantalla de Métricas e Historial de Cierres de Caja - S11_MetricasScreen', () => {
  const ventasMock: saleService.Venta[] = [
    {
      id: 'venta_1',
      total: 20000,
      medioPago: 'Efectivo',
      items: [
        {
          idProducto: 'prod_1',
          nombre: 'Fernet Branca',
          precio: 20000,
          cantidad: 1,
          subtotal: 20000,
        },
      ],
      fecha: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (saleService.suscribirAVentas as jest.Mock).mockImplementation((onData) => {
      onData(ventasMock);
      return jest.fn();
    });

    (fiadoService.subscribeToClientesFiados as jest.Mock).mockImplementation((onData) => {
      onData([]);
      return jest.fn();
    });

    (cajaService.suscribirAEstadoCaja as jest.Mock).mockImplementation((onData) => {
      onData({
        estado: 'abierta',
        fechaApertura: new Date(Date.now() - 3600000), // Hace 1 hora
      });
      return jest.fn();
    });

    (cajaService.suscribirAHistorialCajas as jest.Mock).mockImplementation((onData) => {
      onData([
        {
          id: 'cierre_ayer',
          totalFacturado: 45000,
          cantidadVentas: 5,
          fechaCierre: new Date(Date.now() - 86400000),
        },
      ]);
      return jest.fn();
    });

    (cajaService.obtenerHistorialCajas as jest.Mock).mockResolvedValue([
      {
        id: 'cierre_ayer',
        totalFacturado: 45000,
        cantidadVentas: 5,
        fechaCierre: new Date(Date.now() - 86400000),
      },
    ]);

    (cajaService.cerrarCaja as jest.Mock).mockResolvedValue(undefined);
  });

  it('debe mostrar la facturación del turno actual ($20.000,00) y enviar el total al cerrar la caja', async () => {
    const { getByText, getAllByText } = render(<S11_MetricasScreen />);

    // Verifica que figure el total facturado en la pantalla
    expect(getAllByText('$20.000,00').length).toBeGreaterThanOrEqual(1);

    // Presionar el botón Cerrar Caja
    const botonCerrar = getByText('Cerrar Caja del Día');
    fireEvent.press(botonCerrar);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Cerrar Caja del Día',
      expect.stringContaining('$20.000,00'),
      expect.any(Array)
    );

    // Confirmar cierre en la alerta
    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const botonConfirmar = alertCalls[0][2].find((b: any) => b.text === 'Cerrar Caja');

    await botonConfirmar.onPress();

    // Debe invocar cerrarCaja con el total de $20000 y 1 venta
    expect(cajaService.cerrarCaja).toHaveBeenCalledWith(
      expect.objectContaining({
        totalFacturado: 20000,
        cantidadVentas: 1,
      })
    );
  });

  it('debe abrir el modal de historial y mostrar las operaciones y total del cierre', async () => {
    const { getByText } = render(<S11_MetricasScreen />);

    const botonHistorial = getByText('Historial');
    fireEvent.press(botonHistorial);

    await waitFor(() => {
      expect(getByText('Historial de Cierres de Caja')).toBeTruthy();
      expect(getByText('5 operaciones registradas')).toBeTruthy();
      expect(getByText('$45.000,00')).toBeTruthy();
    });
  });
});
