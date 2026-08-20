import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Image, Animated, Platform } from 'react-native';
import { Colors, Radius } from '../theme';
import { LEAGUES } from '../constants';
import {
  STADIUM_REWARDS,
  REWARD_ICONS,
  REWARD_LABELS,
  REWARD_BORDER,
  formatRewardAmount,
} from './LocationsModal';
import type { StadiumReward } from './LocationsModal';

interface Props {
  visible: boolean;
  stadiumIndex: number;
  onClose: () => void;
}

export default function StadiumRewardModal({ visible, stadiumIndex, onClose }: Props) {
  const reward: StadiumReward | null = STADIUM_REWARDS?.[stadiumIndex] ?? null;
  const league = LEAGUES[stadiumIndex];
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconBounce = useRef(new Animated.Value(0.3)).current;
  const canUseNative = Platform.OS !== 'web';

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      iconBounce.setValue(0.3);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 120, useNativeDriver: canUseNative }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: canUseNative }),
      ]).start(() => {
        // Bounce the icon
        Animated.sequence([
          Animated.spring(iconBounce, { toValue: 1.15, friction: 4, tension: 200, useNativeDriver: canUseNative }),
          Animated.spring(iconBounce, { toValue: 1, friction: 5, tension: 150, useNativeDriver: canUseNative }),
        ]).start();
      });
    }
  }, [visible]);

  if (!reward || !league) return null;

  const borderColor = REWARD_BORDER[reward.type] ?? '#3B82F6';
  const label = REWARD_LABELS[reward.type] ?? 'Reward';
  const amountStr = formatRewardAmount(reward.type, reward.amount);
  const icon = REWARD_ICONS[reward.type];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[ms.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[ms.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Glow ring */}
          <View style={[ms.glowRing, { borderColor }]} />

          {/* Title */}
          <Text style={ms.title}>🏟️ Stadium Reward!</Text>
          <Text style={ms.subtitle}>Welcome to {league.name}</Text>

          {/* Reward icon */}
          <Animated.View style={[ms.iconWrap, { borderColor, transform: [{ scale: iconBounce }] }]}>
            <Image source={icon} style={ms.rewardImg} />
          </Animated.View>

          {/* Amount & label */}
          <Text style={[ms.amount, { color: borderColor }]}>×{amountStr}</Text>
          <Text style={ms.label}>{label}</Text>

          {/* Collect button */}
          <Pressable
            style={[ms.btn, { backgroundColor: borderColor }]}
            onPress={onClose}
          >
            <Text style={ms.btnText}>Collect!</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '82%',
    maxWidth: 340,
    backgroundColor: Colors.card,
    borderRadius: 24,
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  glowRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 27,
    borderWidth: 3,
    opacity: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  rewardImg: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  amount: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 24,
  },
  btn: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 48,
    minWidth: 180,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
});
