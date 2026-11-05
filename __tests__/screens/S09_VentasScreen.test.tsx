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

  describe('Venta de Productos al Peso (por gramos)', () => {
    const productoAlPesoMock: productService.Producto[] = [
      {
        id: 'prod_queso',
        nombre: 'Queso Cremoso La Paulina',
        precio: 1200, // cada 100g
        stock: 5000, // 5 kg en gramos
        categoria: 'Fiambrería',
        esAlPeso: true,
      },
    ];

    beforeEach(() => {
      (productService.suscribirAProductos as jest.Mock).mockImplementation((onData) => {
        onData(productoAlPesoMock);
        return jest.fn();
      });
    });

    it('debe mostrar el producto con etiqueta de precio cada 100g y stock amigable en kg', () => {
      const { getByText } = render(<S09_VentasScreen />);

      expect(getByText('Queso Cremoso La Paulina')).toBeTruthy();
      expect(getByText('$1200.00 / 100g')).toBeTruthy();
      expect(getByText('Stock: 5 kg')).toBeTruthy();
      expect(getByText('Al peso')).toBeTruthy();
    });

    it('al seleccionar un producto al peso, la cantidad inicial por defecto en el carrito debe ser 100g', () => {
      const { getByText, getAllByText, getByTestId } = render(<S09_VentasScreen />);

      // Presionar "Agregar"
      const botonAgregar = getByTestId('btn-agregar-prod_queso');
      fireEvent.press(botonAgregar);

      // Debe mostrar 100g en el selector de la tarjeta
      expect(getByText('100g')).toBeTruthy();

      // En la barra flotante: 1 item y $1200.00 ((100/100) * 1200)
      expect(getByText('1 items agregados')).toBeTruthy();
      expect(getAllByText('$1200.00').length).toBeGreaterThanOrEqual(1);
    });

    it('los botones + y - deben aumentar o disminuir en saltos de 50 gramos con mínimo de 50g', () => {
      const { getByText, queryByText, getByTestId } = render(<S09_VentasScreen />);

      // 1. Agregar: 100g
      fireEvent.press(getByTestId('btn-agregar-prod_queso'));
      expect(getByText('100g')).toBeTruthy();

      // 2. Presionar +: debe pasar a 150g
      const botonSumar = getByTestId('btn-sumar-prod_queso');
      fireEvent.press(botonSumar);
      expect(getByText('150g')).toBeTruthy();
      // Subtotal de 150g a $1200/100g = 1.5 * 1200 = $1800
      expect(getByText('$1800.00')).toBeTruthy();

      // 3. Presionar + de nuevo: pasa a 200g ($2400)
      fireEvent.press(botonSumar);
      expect(getByText('200g')).toBeTruthy();
      expect(getByText('$2400.00')).toBeTruthy();

      // 4. Presionar -: pasa a 150g
      const botonRestar = getByTestId('btn-restar-prod_queso');
      fireEvent.press(botonRestar);
      expect(getByText('150g')).toBeTruthy();

      // 5. Presionar -: pasa a 100g
      fireEvent.press(botonRestar);
      expect(getByText('100g')).toBeTruthy();

      // 6. Presionar -: pasa a 50g (mínimo permitido antes de remover)
      fireEvent.press(botonRestar);
      expect(getByText('50g')).toBeTruthy();
      // Subtotal de 50g = (50/100)*1200 = $600
      expect(getByText('$600.00')).toBeTruthy();

      // 7. Presionar - en 50g: debe removerse del carrito
      fireEvent.press(botonRestar);
      expect(queryByText('50g')).toBeNull();
      expect(getByText('Agregar')).toBeTruthy();
    });

    it('al confirmar el cobro debe registrar la venta y descontar los gramos exactos en Firestore', async () => {
      const { getByText, getByTestId } = render(<S09_VentasScreen />);

      // 1. Agregar producto (100g)
      fireEvent.press(getByTestId('btn-agregar-prod_queso'));

      // 2. Aumentar a 250g con 3 clics en + (100 -> 150 -> 200 -> 250)
      const botonSumar = getByTestId('btn-sumar-prod_queso');
      fireEvent.press(botonSumar);
      fireEvent.press(botonSumar);
      fireEvent.press(botonSumar);
      expect(getByText('250g')).toBeTruthy();

      // 3. Abrir modal de cobro
      fireEvent.press(getByText('Cobrar ➔'));

      // 4. Verificar resumen en modal: 250g x $1200.00 (cada 100g) y subtotal $3000.00
      expect(getByText('250g x $1200.00 (cada 100g)')).toBeTruthy();

      // 5. Confirmar venta en efectivo
      fireEvent.press(getByTestId('btn-confirmar-venta'));

      await waitFor(() => {
        expect(saleService.registrarVenta).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              idProducto: 'prod_queso',
              nombre: 'Queso Cremoso La Paulina',
              precio: 1200,
              cantidad: 250,
              subtotal: 3000,
              esAlPeso: true,
            }),
          ]),
          3000,
          'Efectivo',
          undefined
        );
      });
    });
  });
});
