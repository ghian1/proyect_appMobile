import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { HeaderBackButton } from '../../src/components/HeaderBackButton';
import { useNavigation } from '@react-navigation/native';

describe('Componente UI: HeaderBackButton', () => {
  const mockGoBack = jest.fn();
  const mockCanGoBack = jest.fn();
  const mockParentGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      goBack: mockGoBack,
      canGoBack: mockCanGoBack,
      getParent: () => ({
        goBack: mockParentGoBack,
      }),
    });
  });

  it('debe renderizar el botón accesible con rol "button" y accesibilityLabel "Volver"', () => {
    mockCanGoBack.mockReturnValue(true);

    const { getByRole, getByLabelText } = render(<HeaderBackButton />);

    const boton = getByRole('button');
    expect(boton).toBeTruthy();
    expect(getByLabelText('Volver')).toBeTruthy();
  });

  it('debe ejecutar la función onPress personalizada si fue provista por props', () => {
    const onPressCustom = jest.fn();
    const { getByRole } = render(<HeaderBackButton onPress={onPressCustom} />);

    fireEvent.press(getByRole('button'));

    expect(onPressCustom).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockParentGoBack).not.toHaveBeenCalled();
  });

  it('debe invocar navigation.goBack() si canGoBack() es true', () => {
    mockCanGoBack.mockReturnValue(true);

    const { getByRole } = render(<HeaderBackButton />);

    fireEvent.press(getByRole('button'));

    expect(mockCanGoBack).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockParentGoBack).not.toHaveBeenCalled();
  });

  it('debe invocar navigation.getParent().goBack() si canGoBack() es false (pantalla raíz de tab secundario)', () => {
    mockCanGoBack.mockReturnValue(false);

    const { getByRole } = render(<HeaderBackButton />);

    fireEvent.press(getByRole('button'));

    expect(mockCanGoBack).toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockParentGoBack).toHaveBeenCalledTimes(1);
  });

  it('debe renderizar el icono "chevron-back" en iOS', () => {
    const originalPlatform = Platform.OS;
    Platform.OS = 'ios';

    const { getByTestId } = render(<HeaderBackButton />);
    expect(getByTestId('icon-chevron-back')).toBeTruthy();

    Platform.OS = originalPlatform;
  });

  it('debe renderizar el icono "arrow-back" en Android', () => {
    const originalPlatform = Platform.OS;
    Platform.OS = 'android';

    const { getByTestId } = render(<HeaderBackButton />);
    expect(getByTestId('icon-arrow-back')).toBeTruthy();

    Platform.OS = originalPlatform;
  });
});
