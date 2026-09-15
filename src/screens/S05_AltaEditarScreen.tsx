import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function S05_AltaEditarScreen(): React.ReactNode {
  return (
    <View style={styles.container}>
      <Text style={styles.texto}>S05 - Alta / Editar Producto</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  texto: { fontSize: 18, fontWeight: 'bold' },
});