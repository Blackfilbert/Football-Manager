import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../context/GameContext';
import { requestPurchase, PRODUCT_IDS } from '../services/iap';

const { width: SCREEN_W } = Dimensions.get('window');
const IMG_BOOST = require('../../assets/images/boost_2x.png');
const IMG_2X_BANNER = require('../../assets/images/2x_income.png');

const FILM_EMOJI = '\uD83C\uDFAC';
const STAR_CHAR = '\u2726';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function Boost2xModal({ visible, onClose }: Props) {
  const { gameState, addBoost2x, buyPremiumPack, addQuestProgress } = useGame();

  const handleBuy2xIncome = useCallback(async () => {
    const purchased = await requestPurchase(PRODUCT_IDS.premium_2xIncome);
    if (!purchased) return;
    buyPremiumPack('2xIncome');
    onClose();
  }, [buyPremiumPack, onClose]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const endTime = gameState?.boost2xEndTime ?? 0;
  const remaining = Math.max(0, endTime - now);
  const isActive = remaining > 0;
  const maxMs = 3600_000;
  const progress = Math.min(remaining / maxMs, 1);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  const atMax = remaining >= maxMs - 1000;
  const hasPermanent2x = (gameState?.incomeMultiplier ?? 1) >= 2;

  const noAds = gameState?.noAds ?? false;

  const handleAdd = () => {
    if (noAds) {
      addBoost2x();
    } else {
      const { showRewarded } = require('../services/ads');
      showRewarded(() => {
        addBoost2x();
        addQuestProgress('watch_ad', 1);
      }, 'boost_2x_income');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Ribbon title — green gradient */}
          <LinearGradient
            colors={['#22C55E', '#16A34A'] as const}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.ribbon}
          >
            <Text style={s.ribbonStar}>{STAR_CHAR}</Text>
            <Text style={s.ribbonText}>2X Income</Text>
            <Text style={s.ribbonStar}>{STAR_CHAR}</Text>
          </LinearGradient>

          {/* Close button */}
          <Pressable style={s.closeBtn} onPress={onClose} hitSlop={14}>
            <Ionicons name="close" size={24} color="#64748B" />
          </Pressable>

          {/* Image */}
          <View style={s.imageWrap}>
            <Image source={IMG_BOOST} style={s.boostImage} resizeMode="contain" />
          </View>

          {/* Max label */}
          <Text style={s.maxLabel}>Max 1h</Text>

          {/* Status bar */}
          <View style={s.statusBar}>
            {isActive ? (
              <View style={s.statusBarInner}>
                <View style={[s.statusProgress, { width: `${progress * 100}%` }]} />
                <Text style={s.statusText}>{timeStr} remaining</Text>
              </View>
            ) : (
              <Text style={s.statusTextInactive}>Inactive</Text>
            )}
          </View>

          {/* +15 min reward button (orange) */}
          <Pressable
            style={[s.addBtnWrap, atMax && { opacity: 0.4 }]}
            onPress={handleAdd}
            disabled={atMax}
          >
            <LinearGradient
              colors={noAds ? (['#EAB308', '#CA8A04'] as const) : (['#F59E0B', '#D97706'] as const)}
              style={s.addBtn}
            >
              {!noAds && <Text style={s.addBtnEmoji}>{FILM_EMOJI}</Text>}
              <Text style={s.addBtnText}>+15 min</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* 2X Income Pack banner — identical to Shop, below modal card */}
        {!hasPermanent2x && (
          <View style={s.packBanner}>
            <Image source={IMG_2X_BANNER} style={s.packImage} resizeMode="stretch" />
            <View style={s.premiumOverlay}>
              <Pressable onPress={handleBuy2xIncome}>
                <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={s.premiumBuyBtn}>
                  <Text style={s.premiumBuyText}>BUY NOW</Text>
                  <View style={s.premiumPriceBadge}><Text style={s.premiumPriceText}>$9.99</Text></View>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const BANNER_H = (SCREEN_W - 32 - 3) / (717 / 239);

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    elevation: 0,
  },
  card: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    paddingBottom: 16,
    overflow: 'visible',
  },
  ribbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: -16,
    zIndex: 10,
    elevation: 4,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  ribbonStar: {
    fontSize: 14,
    color: '#FDE68A',
  },
  ribbonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 20,
  },
  imageWrap: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    margin: 16,
    marginTop: 20,
    padding: 10,
    width: '80%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boostImage: {
    width: '100%',
    height: '100%',
  },
  maxLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
  },
  statusBar: {
    width: '80%',
    height: 32,
    backgroundColor: '#64748B',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusBarInner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#22C55E',
    borderRadius: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    zIndex: 1,
  },
  statusTextInactive: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  addBtnWrap: {
    width: '80%',
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  addBtnEmoji: {
    fontSize: 18,
  },
  addBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  packBanner: {
    width: SCREEN_W - 32,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  packImage: {
    width: '100%',
    height: BANNER_H,
  },
  premiumOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 11,
  },
  premiumBuyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingVertical: 5.25,
    paddingHorizontal: 10.5,
    gap: 4,
    transform: [{ scale: 1.05 }],
  },
  premiumBuyText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  premiumPriceBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  premiumPriceText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#FFF',
  },
});
