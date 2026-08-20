import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../src/theme';

export default function NotFound() {
  return (
    <View style={s.container}>
      <Text style={s.emoji}>⚽</Text>
      <Text style={s.title}>Page Not Found</Text>
      <Pressable style={s.btn} onPress={() => router.replace('/tabs')}>
        <Text style={s.btnText}>Go Home</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.dark, marginBottom: 24 },
  btn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
