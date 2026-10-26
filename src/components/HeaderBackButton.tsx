// NUEVO: Componente reutilizable para el botón de retroceso en el encabezado
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';

interface HeaderBackButtonProps {
  tintColor?: string;
  onPress?: () => void;
}

export function HeaderBackButton({ tintColor = '#1A1A1A', onPress }: HeaderBackButtonProps) {
  const navigation = useNavigation<any>();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Si es la pantalla principal del flujo secundario, vuelve al menú de Inicio en el navegador padre
      navigation.getParent()?.goBack();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.boton}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Volver"
    >
      <Ionicons
        name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
        size={24}
        color={tintColor}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  boton: {
    padding: 8,
    marginLeft: Platform.OS === 'ios' ? -4 : 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
