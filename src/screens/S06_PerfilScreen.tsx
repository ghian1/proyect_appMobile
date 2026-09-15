import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function S06_PerfilScreen(): React.ReactNode {
  return (
    <View style={styles.container}>
      <Text style={styles.texto}>S06 - Perfil</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  texto: { fontSize: 18, fontWeight: 'bold' },
});