import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { S05_AltaEditarScreen } from '../../src/screens/S05_AltaEditarScreen';
import * as productService from '../../src/services/productService';

jest.mock('../../src/services/productService');

jest.mock('@react-navigation/elements', () => ({
  useHeaderHeight: () => 64,
}));

// Mock react-navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

describe('Pantalla de Alta y Edición de Productos - S05_AltaEditarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (productService.suscribirACategorias as jest.Mock).mockImplementation((onData) => {
      onData(['Almacén', 'Fiambrería', 'Comestibles']);
      return jest.fn();
    });

    (productService.crearProducto as jest.Mock).mockResolvedValue('prod_nuevo_1');
  });

  it('debe renderizar el selector de tipo de venta con Por Unidad activo por defecto', () => {
    const { getByText } = render(<S05_AltaEditarScreen />);

    expect(getByText('Tipo de venta *')).toBeTruthy();
    expect(getByText('Por Unidad')).toBeTruthy();
    expect(getByText('Por Gramos')).toBeTruthy();
    expect(getByText('Precio ($) *')).toBeTruthy();
    expect(getByText('Stock inicial *')).toBeTruthy();
  });

  it('al activar "Por Gramos", debe actualizar las etiquetas y notas aclaratorias', () => {
    const { getByText, getByTestId, queryByText } = render(<S05_AltaEditarScreen />);

    const botonPorGramos = getByTestId('btn-tipo-gramos');
    fireEvent.press(botonPorGramos);

    // Debe cambiar la etiqueta del precio y stock
    expect(getByText('Precio cada 100g ($) *')).toBeTruthy();
    expect(getByText('Stock total en gramos (g) *')).toBeTruthy();
    expect(getByText(/ej: 5000 para 5 kg/i)).toBeTruthy();

    // Las etiquetas anteriores ya no deben estar
    expect(queryByText('Stock inicial *')).toBeNull();
  });

  it('debe enviar esAlPeso=true al guardar un producto por gramos', async () => {
    const { getByPlaceholderText, getByTestId, getByText } = render(<S05_AltaEditarScreen />);

    // 1. Activar Por Gramos
    fireEvent.press(getByTestId('btn-tipo-gramos'));

    // 2. Ingresar nombre
    const inputNombre = getByPlaceholderText('Ej: Fideos Marolio 500g');
    fireEvent.changeText(inputNombre, 'Jalapeño al peso');

    // 3. Ingresar precio por 100g
    const inputPrecio = getByTestId('input-precio');
    fireEvent.changeText(inputPrecio, '950');

    // 4. Ingresar stock en gramos
    const inputStock = getByTestId('input-stock');
    fireEvent.changeText(inputStock, '3000');

    // 5. Guardar
    const botonGuardar = getByText('Registrar Producto');
    fireEvent.press(botonGuardar);

    await waitFor(() => {
      expect(productService.crearProducto).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Jalapeño al peso',
          precio: 950,
          stock: 3000,
          esAlPeso: true,
        })
      );
    });
  });
});
