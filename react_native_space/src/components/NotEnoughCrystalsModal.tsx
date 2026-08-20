import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CurrencyIcon from './CurrencyIcon';
import { Colors, Radius, Spacing } from '../theme';

interface Props {
  visible: boolean;
  needed: number;
  current: number;
  onGoToShop: () => void;
  onClose: () => void;
}

export default function NotEnoughCrystalsModal({ visible, needed, current, onGoToShop, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Close */}
          <Pressable style={s.closeBtn} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>

          {/* Icon */}
          <View style={s.iconWrap}>
            <LinearGradient colors={['#7C3AED', '#A855F7'] as const} style={s.iconGrad}>
              <CurrencyIcon type="diamond" size={40} />
            </LinearGradient>
          </View>

          <Text style={s.title}>Not Enough Crystals</Text>
          <Text style={s.subtitle}>
            You need <Text style={s.highlight}>{needed}</Text> crystals but only have <Text style={s.highlight}>{current}</Text>.
          </Text>

          <View style={s.balanceRow}>
            <CurrencyIcon type="diamond" size={18} />
            <Text style={s.balanceText}>{current} / {needed}</Text>
          </View>

          {/* Buttons */}
          <Pressable onPress={onGoToShop} style={s.shopBtn}>
            <LinearGradient colors={['#7C3AED', '#6D28D9'] as const} style={s.shopBtnGrad}>
              <Ionicons name="cart" size={18} color="#FFF" />
              <Text style={s.shopBtnText}>Go to Shop</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={onClose} style={s.cancelBtn}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '100%', alignItems: 'center', position: 'relative' },
  closeBtn: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  iconWrap: { marginBottom: 12, marginTop: 4 },
  iconGrad: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  highlight: { fontWeight: '900', color: '#7C3AED' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16 },
  balanceText: { fontSize: 14, fontWeight: '700', color: '#334155' },
  shopBtn: { width: '100%', marginBottom: 8 },
  shopBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  shopBtnText: { fontSize: 16, fontWeight: '900', color: '#FFF' },
  cancelBtn: { paddingVertical: 8 },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
});
