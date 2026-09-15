import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export  function S04_ReponerScreen(): React.ReactNode {
  return (
    <View style={styles.container}>
      <Text style={styles.texto}>S04 - Para Reponer</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  texto: { fontSize: 18, fontWeight: 'bold' },
});