import React, { useCallback } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '../theme';
import { formatMoney } from '../utils';
import { OFFLINE_EARNINGS_CAP } from '../constants';
import CurrencyIcon from './CurrencyIcon';
import { useGame } from '../context/GameContext';
import { requestPurchase, PRODUCT_IDS } from '../services/iap';

const { width: SCREEN_W } = Dimensions.get('window');
const IMG_3X_BANNER = require('../../assets/images/3x_idle.png');

interface Props {
  visible: boolean;
  earnings: number;
  seconds: number;
  idleMultiplier?: number;
  onDismiss: () => void;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function formatCapDuration(capSeconds: number): string {
  const hours = Math.floor(capSeconds / 3600);
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(capSeconds / 60)}m`;
}

export default function OfflineEarningsModal({ visible, earnings, seconds, idleMultiplier = 1, onDismiss }: Props) {
  const { gameState, buyPremiumPack } = useGame();

  const handleBuy3xIdle = useCallback(async () => {
    const purchased = await requestPurchase(PRODUCT_IDS.premium_3xIdle);
    if (!purchased) return;
    buyPremiumPack('3xIdle');
    onDismiss();
  }, [buyPremiumPack, onDismiss]);

  if (!visible || (earnings ?? 0) <= 0) return null;

  const actualCap = idleMultiplier >= 3 ? 24 * 60 * 60 : OFFLINE_EARNINGS_CAP;
  const cappedSeconds = Math.min(seconds, actualCap);
  const progressRatio = Math.min(cappedSeconds / actualCap, 1);
  const awayText = formatDuration(seconds);
  const capText = formatCapDuration(actualCap);
  const isCapped = seconds >= actualCap;
  const isPremium = idleMultiplier >= 3;
  const hasPermanent3x = (gameState?.idleMultiplier ?? 1) >= 3;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Title */}
          <Text style={s.title}>Welcome Back!</Text>

          {/* Subtitle */}
          <Text style={s.subtitle}>
            While you were away, your team kept earning income and trophies.
          </Text>

          {/* Premium badge */}
          {isPremium && (
            <View style={s.premiumBadge}>
              <Text style={s.premiumBadgeText}>3x IDLE INCOME ACTIVE</Text>
            </View>
          )}

          {/* Earnings card */}
          <View style={s.earningsCard}>
            <CurrencyIcon type="money" size={40} />
            <Text style={s.earningsLabel}>{isPremium ? '3x IDLE EARNINGS' : 'IDLE EARNINGS'}</Text>
            <Text style={s.amount}>{formatMoney(earnings ?? 0)}</Text>
          </View>

          {/* Progress bar section */}
          <View style={s.progressSection}>
            <View style={s.progressLabels}>
              <Text style={s.progressLabelLeft}>Time away: {awayText}</Text>
              <Text style={s.progressLabelRight}>Max: {capText}</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${Math.round(progressRatio * 100)}%` }]} />
            </View>
            {isCapped && (
              <Text style={s.cappedHint}>Earnings capped at {capText} offline</Text>
            )}
          </View>

          {/* Collect button */}
          <Pressable style={s.btn} onPress={onDismiss}>
            <Text style={s.btnText}>Collect</Text>
          </Pressable>
        </View>

        {/* 3X Idle Income Pack banner — identical to Shop */}
        {!hasPermanent3x && (
          <View style={s.packBanner}>
            <Image source={IMG_3X_BANNER} style={s.packImage} resizeMode="stretch" />
            <View style={s.packOverlay}>
              <Pressable onPress={handleBuy3xIdle}>
                <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={s.packBuyBtn}>
                  <Text style={s.packBuyText}>BUY NOW</Text>
                  <View style={s.packPriceBadge}><Text style={s.packPriceText}>$4.99</Text></View>
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
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  earningsCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  earningsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 4,
  },
  amount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#16A34A',
  },
  progressSection: {
    width: '100%',
    marginBottom: 24,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabelLeft: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  progressLabelRight: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  progressTrack: {
    height: 14,
    backgroundColor: '#E2E8F0',
    borderRadius: 7,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 7,
  },
  cappedHint: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 4,
    textAlign: 'center',
  },
  premiumBadge: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  btn: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 56,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 17,
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
  packOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 11,
  },
  packBuyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingVertical: 5.25,
    paddingHorizontal: 10.5,
    gap: 4,
    transform: [{ scale: 1.05 }],
  },
  packBuyText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  packPriceBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  packPriceText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#FFF',
  },
});
