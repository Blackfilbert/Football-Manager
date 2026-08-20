import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as StoreReview from 'expo-store-review';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function RateUsModal({ visible, onDismiss }: Props) {
  if (!visible) return null;

  const handleRate = async () => {
    onDismiss();
    try {
      const available = await StoreReview.isAvailableAsync();
      if (available) {
        await StoreReview.requestReview();
      } else if (Platform.OS === 'android') {
        // Fallback: open Play Store page (update package name when published)
        // For now just dismiss
      }
    } catch (_) { /* ignore */ }
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Stars row */}
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <Ionicons key={i} name="star" size={32} color="#FBBF24" />
            ))}
          </View>

          <Text style={s.title}>Enjoying the game?</Text>
          <Text style={s.subtitle}>Please rate us! Your feedback helps us improve.</Text>

          {/* Rate button */}
          <Pressable onPress={handleRate} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
            <LinearGradient
              colors={['#22C55E', '#16A34A'] as const}
              style={s.rateBtn}
            >
              <Ionicons name="star" size={18} color="#FFF" />
              <Text style={s.rateBtnText}>Rate Us ⭐</Text>
            </LinearGradient>
          </Pressable>

          {/* Later button */}
          <Pressable onPress={onDismiss} style={s.laterBtn}>
            <Text style={s.laterText}>Maybe Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    minWidth: 200,
    justifyContent: 'center',
  },
  rateBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  laterBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  laterText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
});
