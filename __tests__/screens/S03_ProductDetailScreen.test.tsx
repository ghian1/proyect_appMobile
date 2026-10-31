import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { S03_ProductDetailScreen } from '../../src/screens/S03_ProductDetailScreen';
import { deleteDoc, onSnapshot } from 'firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';

describe('Pantalla de Detalle de Producto - S03_ProductDetailScreen', () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    });

    (useRoute as jest.Mock).mockReturnValue({
      params: { productId: 'prod_arroz_123' },
    });

    (onSnapshot as jest.Mock).mockImplementation((_ref, callback) => {
      callback({
        id: 'prod_arroz_123',
        exists: () => true,
        data: () => ({
          nombre: 'Arroz Lucchetti 1kg',
          precio: 1500,
          stock: 20,
          categoria: 'Almacén',
        }),
      });
      return jest.fn();
    });
  });

  it('debe solicitar confirmación y navegar a StockList al eliminar el producto', async () => {
    const { getByText } = render(<S03_ProductDetailScreen />);

    // Presionar el botón Eliminar Producto
    const botonEliminar = getByText('Eliminar Producto');
    fireEvent.press(botonEliminar);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Confirmar eliminación',
      '¿Estás seguro de que querés borrar este producto?',
      expect.any(Array)
    );

    // Ejecutar la acción 'Eliminar' de la alerta
    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const botonesAlerta = alertCalls[0][2];
    const botonConfirmar = botonesAlerta.find((b: any) => b.text === 'Eliminar');

    await botonConfirmar.onPress();

    // Debe llamar a deleteDoc
    expect(deleteDoc).toHaveBeenCalledTimes(1);

    // Debe navegar a StockList (no ir hacia atrás al menú)
    expect(mockNavigate).toHaveBeenCalledWith('StockList');
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
