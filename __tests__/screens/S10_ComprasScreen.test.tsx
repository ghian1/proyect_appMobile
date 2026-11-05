import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import S10_ComprasScreen from '../../src/screens/S10_ComprasScreen';
import * as compraService from '../../src/services/compraService';
import * as productService from '../../src/services/productService';

jest.mock('../../src/services/compraService');
jest.mock('../../src/services/productService');

// Mock react-navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    }),
    useFocusEffect: jest.fn((callback) => callback()),
  };
});

describe('Pantalla de Compras y Reposición de Stock - S10_ComprasScreen', () => {
  const productosMock: productService.Producto[] = [
    {
      id: 'prod_queso',
      nombre: 'Queso Barra Tybo',
      precio: 1300,
      stock: 4000,
      categoria: 'Fiambrería',
      esAlPeso: true,
    },
    {
      id: 'prod_arroz',
      nombre: 'Arroz Lucchetti 1kg',
      precio: 1200,
      stock: 15,
      categoria: 'Almacén',
      esAlPeso: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (productService.suscribirAProductos as jest.Mock).mockImplementation((onData) => {
      onData(productosMock);
      return jest.fn();
    });

    (compraService.obtenerPlanillaBorrador as jest.Mock).mockResolvedValue(null);
    (compraService.guardarPlanillaBorrador as jest.Mock).mockResolvedValue(undefined);
    (compraService.confirmarCompraYSumarStock as jest.Mock).mockResolvedValue('compra_id_123');
    (compraService.obtenerHistorialCompras as jest.Mock).mockResolvedValue([]);
    (compraService.sanitizarItemCompra as jest.Mock).mockImplementation((item) => ({
      productId: item?.productId || '',
      nombre: item?.nombre || '',
      cantidad: Number(item?.cantidad ?? 0),
      gramos: Number(item?.gramos ?? 0),
      precioCosto: Number(item?.precioCosto ?? 0),
      precioUnitario: Number(item?.precioUnitario ?? item?.precioCosto ?? 0),
      subtotal: Number(item?.subtotal ?? 0),
      esAlPeso: Boolean(item?.esAlPeso),
      unidadMedida: item?.unidadMedida || 'u',
      detalleFormateado: item?.detalleFormateado || '',
    }));
  });

  it('al buscar un producto al peso debe mostrar su stock formateado con badge al peso', () => {
    const { getByPlaceholderText, getByText } = render(<S10_ComprasScreen />);

    // Buscar "Queso"
    const inputBusqueda = getByPlaceholderText('Escribí para buscar un producto...');
    fireEvent.changeText(inputBusqueda, 'Queso');

    expect(getByText('Queso Barra Tybo')).toBeTruthy();
    expect(getByText('Stock: 4 kg')).toBeTruthy();
    expect(getByText('Al peso')).toBeTruthy();
  });

  it('al seleccionar un producto al peso, permite ingresar gramos y precio TOTAL calculando costo unitario automáticamente', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(<S10_ComprasScreen />);

    // 1. Buscar producto al peso
    const inputBusqueda = getByPlaceholderText('Escribí para buscar un producto...');
    fireEvent.changeText(inputBusqueda, 'Queso');

    // 2. Tocar el producto en la lista desplegable
    fireEvent.press(getByText('Queso Barra Tybo'));

    // 3. El modal debe mostrar el selector Unidades (u) y Gramos (g) los dos al lado
    expect(getByTestId('btn-unidad-u')).toBeTruthy();
    expect(getByTestId('btn-unidad-g')).toBeTruthy();
    expect(getByText('Unidades (u)')).toBeTruthy();
    expect(getByText('Gramos (g)')).toBeTruthy();

    // 4. Muestra sub-selector de gramos y kilos
    expect(getByTestId('btn-peso-g')).toBeTruthy();
    expect(getByTestId('btn-peso-kg')).toBeTruthy();

    // 5. Como es al peso, está en gramos por defecto y pide PRECIO TOTAL
    expect(getByText('Cantidad a ingresar en gramos (g) *')).toBeTruthy();
    expect(getByText('Precio TOTAL de la compra ($) *')).toBeTruthy();

    // 6. Ingresar 5000 gramos
    const inputCantidad = getByTestId('input-cantidad-compra');
    fireEvent.changeText(inputCantidad, '5000');

    // Muestra equivalencia en kg
    expect(getByText(/Equivale a 5 kg para el inventario/i)).toBeTruthy();

    // 7. Ingresar PRECIO TOTAL de la compra: $30000 (sin forzar al usuario a calcular los 100g)
    const inputCosto = getByTestId('input-costo-compra');
    fireEvent.changeText(inputCosto, '30000');

    // Muestra el desglose de costo calculado: 30000 / 5000g = $600 cada 100g ($6.000 / kg)
    expect(getByText(/Costo calculado: \$600 cada 100g/i)).toBeTruthy();

    // 8. Presionar "Agregar"
    const botonAgregar = getByTestId('btn-confirmar-item-compra');
    fireEvent.press(botonAgregar);

    // 9. Debe guardarse en borrador con 5000 gramos exactos, costo 600 cada 100g y subtotal 30000
    await waitFor(() => {
      expect(compraService.guardarPlanillaBorrador).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            productId: 'prod_queso',
            nombre: 'Queso Barra Tybo',
            cantidad: 5000,
            gramos: 5000,
            precioCosto: 600,
            precioUnitario: 600,
            subtotal: 30000,
            esAlPeso: true,
            unidadMedida: 'g',
          }),
        ]),
        30000
      );
    });

    // En la planilla se visualiza como "5 kg (5000 g)"
    expect(getByText(/5 kg \(5000 g\)/i)).toBeTruthy();
  });

  it('permite ingresar productos al peso en KILOS directamente y convierte a gramos para el stock', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(<S10_ComprasScreen />);

    // 1. Buscar y seleccionar queso
    fireEvent.changeText(getByPlaceholderText('Escribí para buscar un producto...'), 'Queso');
    fireEvent.press(getByText('Queso Barra Tybo'));

    // 2. Cambiar a Kilos
    fireEvent.press(getByTestId('btn-peso-kg'));
    expect(getByText('Cantidad total comprada (kilos) *')).toBeTruthy();

    // 3. Ingresar 3.5 kg y $21000 total
    fireEvent.changeText(getByTestId('input-cantidad-compra'), '3.5');
    expect(getByText(/Equivale a 3.500 gramos exactos para el inventario/i)).toBeTruthy();

    fireEvent.changeText(getByTestId('input-costo-compra'), '21000');
    // 21000 / 3500g = $600 cada 100g ($6.000 / kg)
    expect(getByText(/Costo calculado: \$600 cada 100g/i)).toBeTruthy();

    // 4. Agregar a planilla
    fireEvent.press(getByTestId('btn-confirmar-item-compra'));

    await waitFor(() => {
      expect(compraService.guardarPlanillaBorrador).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            productId: 'prod_queso',
            cantidad: 3500, // Suma 3500 gramos exactos al stock de Firestore
            gramos: 3500,
            precioCosto: 600,
            subtotal: 21000,
            esAlPeso: true,
          }),
        ]),
        21000
      );
    });
  });

  it('al seleccionar un producto estándar por unidades (Coca-Cola, Arroz), abre en Unidades por defecto y sanitiza sin undefined', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(<S10_ComprasScreen />);

    // 1. Buscar "Arroz"
    const inputBusqueda = getByPlaceholderText('Escribí para buscar un producto...');
    fireEvent.changeText(inputBusqueda, 'Arroz');

    // 2. Seleccionar
    fireEvent.press(getByText('Arroz Lucchetti 1kg'));

    // 3. El modal muestra las dos opciones al lado, con Unidades activo por defecto
    expect(getByText('Unidades (u)')).toBeTruthy();
    expect(getByText('Gramos (g)')).toBeTruthy();
    expect(getByText('Cantidad a comprar (unidades) *')).toBeTruthy();
    expect(getByText('Precio de costo unitario ($) *')).toBeTruthy();

    // 4. Ingresar 10 unidades a $900
    fireEvent.changeText(getByTestId('input-cantidad-compra'), '10');
    fireEvent.changeText(getByTestId('input-costo-compra'), '900');
    fireEvent.press(getByTestId('btn-confirmar-item-compra'));

    // 5. Verifica que se guarde en borrador SIN undefined (gramos: 0, unidadMedida: 'u', precioUnitario: 900)
    await waitFor(() => {
      expect(compraService.guardarPlanillaBorrador).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            productId: 'prod_arroz',
            cantidad: 10,
            gramos: 0,
            precioCosto: 900,
            precioUnitario: 900,
            subtotal: 9000,
            esAlPeso: false,
            unidadMedida: 'u',
          }),
        ]),
        9000
      );
    });
  });
});
