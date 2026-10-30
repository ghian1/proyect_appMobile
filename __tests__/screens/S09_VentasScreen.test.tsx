import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { S09_VentasScreen } from '../../src/screens/S09_VentasScreen';
import * as productService from '../../src/services/productService';
import * as saleService from '../../src/services/saleService';
import * as fiadoService from '../../src/services/fiadoService';

jest.mock('../../src/services/productService');
jest.mock('../../src/services/saleService');
jest.mock('../../src/services/fiadoService');

describe('Pantalla de Ventas y Cobro en Efectivo - S09_VentasScreen', () => {
  const productosMock: productService.Producto[] = [
    {
      id: 'prod_yerba',
      nombre: 'Yerba Mate Playadito 1kg',
      precio: 3500,
      stock: 10,
      categoria: 'Almacén',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (productService.suscribirAProductos as jest.Mock).mockImplementation((onData) => {
      onData(productosMock);
      return jest.fn();
    });

    (productService.suscribirACategorias as jest.Mock).mockImplementation((onData) => {
      onData(['Almacén', 'Bebidas']);
      return jest.fn();
    });

    (fiadoService.subscribeToClientesFiados as jest.Mock).mockImplementation((onData) => {
      onData([]);
      return jest.fn();
    });

    (saleService.registrarVenta as jest.Mock).mockResolvedValue('venta_id_123');
  });

  it('debe renderizar el catálogo de productos disponibles para la venta', () => {
    const { getByText } = render(<S09_VentasScreen />);

    expect(getByText('Yerba Mate Playadito 1kg')).toBeTruthy();
  });

  it('debe agregar productos al carrito y mostrar la barra flotante de cobro', () => {
    const { getByText, getAllByText } = render(<S09_VentasScreen />);

    // Presionar "Agregar" en el producto ($3500)
    const botonAgregar = getByText('Agregar');
    fireEvent.press(botonAgregar);

    // La barra flotante debe aparecer con 1 item y $3500.00
    expect(getByText('1 items agregados')).toBeTruthy();
    expect(getAllByText('$3500.00').length).toBeGreaterThanOrEqual(1);
    expect(getByText('Cobrar ➔')).toBeTruthy();
  });

  it('debe autocompletar con el monto exacto al confirmar en efectivo sin ingresar dinero ("paga con el monto exacto")', async () => {
    const { getByText, getByTestId } = render(<S09_VentasScreen />);

    // 1. Agregar producto al carrito
    fireEvent.press(getByText('Agregar'));

    // 2. Abrir modal de cobro
    fireEvent.press(getByText('Cobrar ➔'));

    // 3. Confirmar venta sin escribir monto en efectivo
    const botonConfirmar = getByTestId('btn-confirmar-venta');
    fireEvent.press(botonConfirmar);

    // Debe registrar la venta exitosamente asumiendo el monto exacto
    await waitFor(() => {
      expect(saleService.registrarVenta).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ idProducto: 'prod_yerba', cantidad: 1, subtotal: 3500 }),
        ]),
        3500,
        'Efectivo',
        undefined
      );
    });
  });

  it('debe alertar al usuario si ingresa un monto en efectivo inferior al total', async () => {
    const { getByText, getByTestId } = render(<S09_VentasScreen />);

    // 1. Agregar producto de $3500
    fireEvent.press(getByText('Agregar'));

    // 2. Abrir modal
    fireEvent.press(getByText('Cobrar ➔'));

    // 3. Ingresar $2000 (menor a $3500)
    const inputPagaCon = getByTestId('input-paga-con');
    fireEvent.changeText(inputPagaCon, '2000');

    // 4. Intentar confirmar
    const botonConfirmar = getByTestId('btn-confirmar-venta');
    fireEvent.press(botonConfirmar);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Monto Insuficiente',
      expect.stringContaining('menor al total a cobrar ($3500.00)')
    );
    expect(saleService.registrarVenta).not.toHaveBeenCalled();
  });

  it('debe calcular y mostrar el vuelto cuando el comprador abona con un monto superior', async () => {
    const { getByText, getByTestId } = render(<S09_VentasScreen />);

    // 1. Agregar producto de $3500
    fireEvent.press(getByText('Agregar'));

    // 2. Abrir modal
    fireEvent.press(getByText('Cobrar ➔'));

    // 3. Ingresar $5000 (vuelto esperado: $1500)
    const inputPagaCon = getByTestId('input-paga-con');
    fireEvent.changeText(inputPagaCon, '5000');

    // 4. Verificar texto de vuelto
    const textoVuelto = getByTestId('texto-vuelto');
    expect(textoVuelto.props.children.join('')).toContain('1500.00');

    // 5. Confirmar venta
    fireEvent.press(getByTestId('btn-confirmar-venta'));

    await waitFor(() => {
      expect(saleService.registrarVenta).toHaveBeenCalledTimes(1);
    });
  });

  it('debe autocompletar el campo al tocar el botón "Monto Exacto"', () => {
    const { getByText, getByTestId } = render(<S09_VentasScreen />);

    fireEvent.press(getByText('Agregar'));
    fireEvent.press(getByText('Cobrar ➔'));

    const botonMontoExacto = getByTestId('btn-monto-exacto');
    fireEvent.press(botonMontoExacto);

    const inputPagaCon = getByTestId('input-paga-con');
    expect(inputPagaCon.props.value).toBe('3500.00');
  });
});
