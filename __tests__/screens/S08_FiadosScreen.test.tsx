import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import S08_FiadosScreen from '../../src/screens/S08_FiadosScreen';
import * as fiadoService from '../../src/services/fiadoService';

// Mock del servicio de fiados
jest.mock('../../src/services/fiadoService');

describe('Pantalla de Fiados / Cuentas Corrientes - S08_FiadosScreen', () => {
  const clientesMock: fiadoService.ClienteFiado[] = [
    {
      id: 'c1',
      nombre: 'Alberto Gómez',
      telefono: '1198765432',
      deudaTotal: 4500,
      notas: 'Paga fin de mes',
    },
    {
      id: 'c2',
      nombre: 'Beatriz Morales',
      telefono: '1144332211',
      deudaTotal: 0,
      notas: 'Al día',
    },
    {
      id: 'c3',
      nombre: 'Carlos Díaz',
      telefono: '1155667788',
      deudaTotal: 12000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (fiadoService.subscribeToClientesFiados as jest.Mock).mockImplementation((callback) => {
      callback(clientesMock);
      return jest.fn();
    });
  });

  it('debe listar los clientes fiados y sus deudas actuales', () => {
    const { getByText } = render(<S08_FiadosScreen />);

    expect(getByText('Alberto Gómez')).toBeTruthy();
    expect(getByText('Beatriz Morales')).toBeTruthy();
    expect(getByText('Carlos Díaz')).toBeTruthy();
  });

  it('debe filtrar los clientes en tiempo real según el texto del buscador', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<S08_FiadosScreen />);

    const buscador = getByPlaceholderText('Buscar cliente...');
    fireEvent.changeText(buscador, 'Beatriz');

    expect(getByText('Beatriz Morales')).toBeTruthy();
    expect(queryByText('Alberto Gómez')).toBeNull();
    expect(queryByText('Carlos Díaz')).toBeNull();
  });

  it('debe abrir el modal de nuevo cliente y validar que el nombre sea obligatorio', async () => {
    const { getByText } = render(<S08_FiadosScreen />);

    // Abrir modal de nuevo cliente
    const botonNuevo = getByText('Cliente');
    fireEvent.press(botonNuevo);

    // Intentar guardar sin nombre
    const botonGuardar = getByText('Guardar');
    fireEvent.press(botonGuardar);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Campo obligatorio',
      'Por favor ingresá el nombre del cliente.'
    );
    expect(fiadoService.crearClienteFiado).not.toHaveBeenCalled();
  });

  it('debe crear un cliente nuevo cuando el formulario es completado correctamente', async () => {
    (fiadoService.crearClienteFiado as jest.Mock).mockResolvedValueOnce({ id: 'nuevo_id' });

    const { getByText, getByPlaceholderText } = render(<S08_FiadosScreen />);

    // Abrir modal
    fireEvent.press(getByText('Cliente'));

    // Completar campos
    fireEvent.changeText(getByPlaceholderText('Ej: Juan Pérez'), 'Dario Barassi');
    fireEvent.changeText(getByPlaceholderText('Ej: 11 1234-5678'), '1122334455');
    fireEvent.changeText(getByPlaceholderText('Ej: Vive a la vuelta del almacén'), 'Cliente frecuente');

    // Guardar
    fireEvent.press(getByText('Guardar'));

    await waitFor(() => {
      expect(fiadoService.crearClienteFiado).toHaveBeenCalledWith({
        nombre: 'Dario Barassi',
        telefono: '1122334455',
        notas: 'Cliente frecuente',
      });
      expect(Alert.alert).toHaveBeenCalledWith('¡Éxito!', 'Cliente registrado correctamente.');
    });
  });

  it('debe advertir si se intenta eliminar un cliente con deuda pendiente mayor a $0', () => {
    const { getAllByText } = render(<S08_FiadosScreen />);

    // Buscar los botones de eliminar (icono 🗑️)
    const botonesEliminar = getAllByText('🗑️');
    // El primer cliente es Alberto Gómez con deuda de 4500
    fireEvent.press(botonesEliminar[0]);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Eliminar Cliente',
      expect.stringContaining('tiene una deuda pendiente'),
      expect.any(Array)
    );
  });
});
