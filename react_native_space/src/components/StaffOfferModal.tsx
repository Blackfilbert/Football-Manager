import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, cardShadow } from '../theme';
import { STAFF_CARDS } from '../constants';
import CurrencyIcon from './CurrencyIcon';

const SW = Dimensions.get('window').width;

// Chest sprites
const CHEST_NORMAL = require('../../assets/images/staff_chest_normal.png');
const CHEST_EPIC = require('../../assets/images/staff_chest_epic.png');
const CHEST_LEGENDARY = require('../../assets/images/staff_chest_legendary.png');
const OFFER_BG = require('../../assets/images/offer_legendary_staff_bg.png');
const OFFER_EPIC_BG = require('../../assets/images/offer_epic_staff_bg.png');

interface StaffBoxOfferProps {
  visible: boolean;
  expiresAt?: number;
  onBuy: () => void | Promise<void>;
  onDismiss: () => void;
}

export function StaffBoxOfferModal({ visible, expiresAt, onBuy, onDismiss }: StaffBoxOfferProps) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!visible) return;
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [visible]);

  const remaining = Math.max(0, (expiresAt ?? 0) - Date.now());
  const hrs = Math.floor(remaining / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const timeStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Close button */}
          <Pressable style={s.closeBtn} onPress={onDismiss} hitSlop={12}>
            <View style={s.closeBtnBg}>
              <Ionicons name="close" size={18} color="#FFF" />
            </View>
          </Pressable>

          {/* Hero image background */}
          <Image source={OFFER_BG} style={s.heroBg} resizeMode="contain" />

          {/* Timer + last chance row */}
          <View style={s.timerRow}>
            <Text style={s.lastChanceText}>⏰ Last chance — time is running out!</Text>
            <View style={s.timerPill}>
              <Ionicons name="time-outline" size={13} color="#FF6B6B" />
              <Text style={s.timerText}>{timeStr}</Text>
            </View>
          </View>

          {/* White bottom panel */}
          <View style={s.bottomPanel}>
            <Text style={s.bundleTitle}>BUNDLE INCLUDES:</Text>

            <View style={s.itemsRow}>
              {/* 5x Legendary Staff Cards */}
              <View style={s.bundleItem}>
                <View style={[s.bundleIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={{ fontSize: 28 }}>🌟</Text>
                </View>
                <Text style={s.bundleQty}>x5</Text>
                <Text style={s.bundleLabel}>LEGENDARY{"\n"}STAFF CARDS</Text>
              </View>

              {/* 10x Normal Staff Chest */}
              <View style={s.bundleItem}>
                <View style={s.bundleIconWrap}>
                  <Image source={CHEST_NORMAL} style={s.bundleChestImg} resizeMode="contain" />
                </View>
                <Text style={s.bundleQty}>x10</Text>
                <Text style={s.bundleLabel}>NORMAL{"\n"}STAFF CHEST</Text>
              </View>

              {/* 8x Epic Staff Chest */}
              <View style={s.bundleItem}>
                <View style={s.bundleIconWrap}>
                  <Image source={CHEST_EPIC} style={s.bundleChestImg} resizeMode="contain" />
                </View>
                <Text style={s.bundleQty}>x8</Text>
                <Text style={s.bundleLabel}>EPIC{"\n"}STAFF CHEST</Text>
              </View>

              {/* 4x Legendary Staff Chest */}
              <View style={s.bundleItem}>
                <View style={s.bundleIconWrap}>
                  <Image source={CHEST_LEGENDARY} style={s.bundleChestImg} resizeMode="contain" />
                </View>
                <Text style={s.bundleQty}>x4</Text>
                <Text style={s.bundleLabel}>LEGENDARY{"\n"}STAFF CHEST</Text>
              </View>
            </View>

            <Pressable style={({ pressed }) => [s.buyBtn, pressed && { opacity: 0.85 }]} onPress={onBuy}>
              <Text style={s.buyBtnText}>BUY — $7.99</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface EpicStaffOfferProps {
  visible: boolean;
  cardId?: string;
  onBuy: () => void | Promise<void>;
  onDismiss: () => void;
}

export function EpicStaffOfferModal({ visible, cardId, onBuy, onDismiss }: EpicStaffOfferProps) {
  const card = STAFF_CARDS.find(c => c.id === cardId);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Close button */}
          <Pressable style={s.closeBtn} onPress={onDismiss} hitSlop={12}>
            <View style={s.closeBtnBg}>
              <Ionicons name="close" size={18} color="#FFF" />
            </View>
          </Pressable>

          {/* Hero image */}
          <Image source={OFFER_EPIC_BG} style={s.heroBg} resizeMode="contain" />

          {/* White bottom panel */}
          <View style={s.bottomPanel}>
            <Text style={s.bundleTitle}>BUNDLE INCLUDES:</Text>

            <View style={s.itemsRow}>
              {/* 8x Epic Staff Cards */}
              <View style={s.bundleItem}>
                <View style={[s.bundleIconWrap, { backgroundColor: '#F3E8FF' }]}>
                  <Text style={{ fontSize: 26 }}>{card?.emoji ?? '⚡'}</Text>
                </View>
                <Text style={s.bundleQty}>x8</Text>
                <Text style={s.bundleLabel}>{card?.name ?? 'EPIC'}{"\n"}CARDS</Text>
              </View>

              {/* 3x Epic Staff Chest */}
              <View style={s.bundleItem}>
                <View style={s.bundleIconWrap}>
                  <Image source={CHEST_EPIC} style={s.bundleChestImg} resizeMode="contain" />
                </View>
                <Text style={s.bundleQty}>x3</Text>
                <Text style={s.bundleLabel}>EPIC{"\n"}STAFF CHEST</Text>
              </View>

              {/* 500x Fame Tokens */}
              <View style={s.bundleItem}>
                <View style={[s.bundleIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={{ fontSize: 26 }}>🏆</Text>
                </View>
                <Text style={s.bundleQty}>x500</Text>
                <Text style={s.bundleLabel}>FAME{"\n"}TOKENS</Text>
              </View>
            </View>

            <Pressable style={({ pressed }) => [s.buyBtn, { backgroundColor: '#A855F7' }, pressed && { opacity: 0.85 }]} onPress={onBuy}>
              <Text style={s.buyBtnText}>BUY — $4.99</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const MODAL_W = Math.min(SW - 40, 340);

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  sheet: {
    width: MODAL_W, borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#FFFFFF', ...cardShadow,
  },
  closeBtn: { position: 'absolute', top: 8, right: 8, zIndex: 20 },
  closeBtnBg: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  heroBg: {
    width: '100%', height: MODAL_W * 0.92, backgroundColor: '#FFFFFF',
  },

  timerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 10, backgroundColor: 'rgba(0,0,0,0.85)',
  },
  lastChanceText: {
    fontSize: 10, fontWeight: '700', color: '#FDE68A', flex: 1,
  },
  timerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  timerText: { fontSize: 12, fontWeight: '800', color: '#FF6B6B', fontVariant: ['tabular-nums'] as any },
  // White bottom panel
  bottomPanel: {
    backgroundColor: '#FFFFFF', paddingTop: 12, paddingBottom: 16, paddingHorizontal: 12,
  },
  bundleTitle: {
    fontSize: 13, fontWeight: '900', color: '#1E293B', textAlign: 'center',
    marginBottom: 10, letterSpacing: 0.5,
  },
  itemsRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14,
  },
  bundleItem: {
    flex: 1, alignItems: 'center', gap: 2,
  },
  bundleIconWrap: {
    width: 52, height: 52, borderRadius: 10, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  bundleChestImg: { width: 40, height: 40 },
  bundleQty: {
    fontSize: 14, fontWeight: '900', color: '#1E293B',
  },
  bundleLabel: {
    fontSize: 7, fontWeight: '800', color: '#64748B',
    textAlign: 'center', textTransform: 'uppercase', lineHeight: 10,
  },
  buyBtn: {
    backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center',
  },
  buyBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },

});
