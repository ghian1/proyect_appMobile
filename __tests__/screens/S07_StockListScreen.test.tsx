import React from 'react';
import { render } from '@testing-library/react-native';
import { S07_StockListScreen } from '../../src/screens/S07_StockListScreen';
import * as productService from '../../src/services/productService';

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
  };
});

describe('Pantalla de Stock / Inventario - S07_StockListScreen', () => {
  const productosMock: productService.Producto[] = [
    {
      id: 'prod_queso',
      nombre: 'Queso Cremoso',
      precio: 1200,
      stock: 4500, // 4.5 kg
      categoria: 'Fiambrería',
      esAlPeso: true,
    },
    {
      id: 'prod_salame',
      nombre: 'Salame Milán Feteado',
      precio: 950,
      stock: 350, // 350 g (< 1000g)
      categoria: 'Fiambrería',
      esAlPeso: true,
    },
    {
      id: 'prod_galletitas',
      nombre: 'Galletitas Chocolinas',
      precio: 850,
      stock: 12, // 12 u (producto estándar)
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

    (productService.suscribirACategorias as jest.Mock).mockImplementation((onData) => {
      onData(['Almacén', 'Fiambrería']);
      return jest.fn();
    });
  });

  it('debe formatear el stock en kg para productos al peso con >= 1000g', () => {
    const { getByText } = render(<S07_StockListScreen />);

    expect(getByText('Queso Cremoso')).toBeTruthy();
    // 4500g -> "Stock: 4.5 kg"
    expect(getByText('Stock: 4.5 kg')).toBeTruthy();
    expect(getByText('$1200.00 / 100g')).toBeTruthy();
  });

  it('debe formatear el stock directamente en g para productos al peso con < 1000g', () => {
    const { getByText } = render(<S07_StockListScreen />);

    expect(getByText('Salame Milán Feteado')).toBeTruthy();
    // 350g -> "Stock: 350 g"
    expect(getByText('Stock: 350 g')).toBeTruthy();
    expect(getByText('$950.00 / 100g')).toBeTruthy();
  });

  it('debe mantener el stock en unidades para productos que no son al peso', () => {
    const { getByText } = render(<S07_StockListScreen />);

    expect(getByText('Galletitas Chocolinas')).toBeTruthy();
    expect(getByText('Stock: 12 unidades.')).toBeTruthy();
    expect(getByText('$850.00')).toBeTruthy();
  });
});
