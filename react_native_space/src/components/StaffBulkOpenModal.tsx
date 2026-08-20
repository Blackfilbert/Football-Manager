import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { STAFF_CARDS } from '../constants';
import { StaffRarity } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');

const RARITY_ORDER: Record<StaffRarity, number> = { rare: 0, epic: 1, legendary: 2 };
const RARITY_COL: Record<StaffRarity, string> = { rare: '#22C55E', epic: '#A855F7', legendary: '#F59E0B' };
const RARITY_BG: Record<StaffRarity, readonly [string, string]> = {
  rare: ['#065F46', '#10B981'] as const,
  epic: ['#4C1D95', '#A855F7'] as const,
  legendary: ['#78350F', '#F59E0B'] as const,
};
const RARITY_BORDER: Record<StaffRarity, string> = { rare: '#10B981', epic: '#7C3AED', legendary: '#F59E0B' };
const RARITY_LABEL: Record<StaffRarity, string> = { rare: 'RARE', epic: 'EPIC', legendary: 'LEGEND' };
const ROLE_LABEL: Record<string, string> = { marketer: 'Marketer', trainer: 'Trainer', doctor: 'Doctor' };
const PARTICLE_COUNT: Record<StaffRarity, number> = { rare: 3, epic: 8, legendary: 16 };

interface Particle {
  id: number;
  anim: Animated.Value;
  dx: number;
  dy: number;
  size: number;
  char: string;
  rot: number;
}

function StarParticles({ rarity, trigger, size }: { rarity: StaffRarity; trigger: boolean; size: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const count = PARTICLE_COUNT[rarity];
    const chars = rarity === 'legendary'
      ? ['⭐', '✨', '💫', '🌟', '⚡']
      : rarity === 'epic'
        ? ['✨', '⭐', '💜']
        : ['✨', '⭐'];
    const ps: Particle[] = [];
    const radius = size * 0.6;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed = radius + Math.random() * radius * 0.5;
      ps.push({
        id: i,
        anim: new Animated.Value(0),
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        size: 8 + Math.random() * 8,
        char: chars[i % chars.length],
        rot: Math.random() * 360,
      });
    }
    setParticles(ps);
    ps.forEach((p, idx) => {
      Animated.sequence([
        Animated.delay(idx * 15),
        Animated.timing(p.anim, { toValue: 1, duration: 700 + Math.random() * 300, useNativeDriver: true }),
      ]).start();
    });
  }, [trigger, rarity, size]);

  if (!particles.length) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map(p => {
        const tx = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] });
        const ty = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] });
        const scale = p.anim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1.4, 0.3] });
        const rotate = p.anim.interpolate({ inputRange: [0, 1], outputRange: [`${p.rot}deg`, `${p.rot + 200}deg`] });
        return (
          <Animated.Text
            key={p.id}
            style={{
              position: 'absolute',
              top: '45%',
              left: '40%',
              fontSize: p.size,
              opacity,
              transform: [{ translateX: tx }, { translateY: ty }, { scale }, { rotate }],
            }}
          >
            {p.char}
          </Animated.Text>
        );
      })}
    </View>
  );
}

interface CardRevealProps {
  cardId: string;
  index: number;
  revealedIndex: number;
  cardW: number;
  cardH: number;
}

function CardReveal({ cardId, index, revealedIndex, cardW, cardH }: CardRevealProps) {
  const def = STAFF_CARDS.find(c => c.id === cardId);
  const isRevealed = index <= revealedIndex;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [showParticles, setShowParticles] = useState(false);
  const didReveal = useRef(false);

  useEffect(() => {
    if (isRevealed && !didReveal.current) {
      didReveal.current = true;
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        if (def && def.rarity !== 'rare') {
          setShowParticles(true);
        }
      });
    }
  }, [isRevealed]);

  if (!def) return <View style={{ width: cardW, height: cardH, margin: 3 }} />;

  const rarity = def.rarity;
  const borderCol = RARITY_BORDER[rarity];
  const grad = RARITY_BG[rarity];
  const emojiSize = Math.max(cardW * 0.32, 16);
  const nameSize = Math.max(cardW * 0.09, 7);
  const roleSize = Math.max(cardW * 0.07, 6);
  const bonusSize = Math.max(cardW * 0.1, 8);
  const badgeSize = Math.max(cardW * 0.055, 5);

  return (
    <Animated.View
      style={{
        width: cardW,
        height: cardH,
        margin: 3,
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    >
      {!isRevealed && (
        <View style={[ss.cardBack, { width: cardW, height: cardH, borderRadius: cardW * 0.12 }]}>
          <LinearGradient colors={['#1E293B', '#334155'] as const} style={[ss.cardBackInner, { borderRadius: cardW * 0.12 }]}>
            <Text style={{ fontSize: emojiSize, opacity: 0.4 }}>❓</Text>
          </LinearGradient>
        </View>
      )}

      {isRevealed && (
        <View style={[ss.cardFront, { width: cardW, height: cardH, borderColor: borderCol, borderRadius: cardW * 0.12 }]}>
          <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[ss.cardFrontInner, { borderRadius: cardW * 0.12 }]}>
            <View style={[ss.rarityBadge, { backgroundColor: borderCol, top: 3, right: 3, borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1 }]}>
              <Text style={[ss.rarityText, { fontSize: badgeSize }]}>{RARITY_LABEL[rarity]}</Text>
            </View>
            <Text style={{ fontSize: emojiSize, marginBottom: 1 }}>{def.emoji}</Text>
            <Text style={[ss.cardName, { fontSize: nameSize }]} numberOfLines={1}>{def.name}</Text>
            <Text style={[ss.cardRole, { fontSize: roleSize }]}>{ROLE_LABEL[def.role] ?? def.role}</Text>
            <Text style={[ss.cardBonus, { fontSize: bonusSize, color: RARITY_COL[rarity] }]}>+{(def.baseMult * 100).toFixed(1)}%</Text>
          </LinearGradient>

          {rarity !== 'rare' && (
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  borderRadius: cardW * 0.12,
                  borderWidth: 2,
                  borderColor: borderCol,
                  shadowColor: borderCol,
                  shadowOpacity: 0.8,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 8,
                },
              ]}
              pointerEvents="none"
            />
          )}

          {showParticles && <StarParticles rarity={rarity} trigger={showParticles} size={cardW} />}
        </View>
      )}
    </Animated.View>
  );
}

interface Props {
  visible: boolean;
  cardIds: string[];
  onClose: () => void;
}

export default function StaffBulkOpenModal({ visible, cardIds, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [revealedIndex, setRevealedIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether all cards have been revealed (including via skip)
  const [allDone, setAllDone] = useState(false);

  // Sort: rare first, legendary last
  const sortedIds = React.useMemo(() => {
    if (cardIds.length === 0) return [];
    return [...cardIds].sort((a, b) => {
      const defA = STAFF_CARDS.find(c => c.id === a);
      const defB = STAFF_CARDS.find(c => c.id === b);
      return (RARITY_ORDER[defA?.rarity ?? 'rare']) - (RARITY_ORDER[defB?.rarity ?? 'rare']);
    });
  }, [cardIds]);

  // Grid dimensions — 5 columns
  const COLS = 5;
  const padding = 8;
  const cardMargin = 3;
  const containerW = Math.min(SCREEN_W, 420);
  const availW = containerW - padding * 2;
  const cardW = (availW / COLS) - cardMargin * 2;
  const cardH = cardW * 1.4;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible && sortedIds.length > 0) {
      setRevealedIndex(-1);
      setAllDone(false);
    } else {
      // Clean up timers on close
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    }
  }, [visible, sortedIds]);

  // Auto-reveal one by one
  useEffect(() => {
    if (!visible || sortedIds.length === 0 || allDone) return;
    let idx = -1;
    const reveal = () => {
      idx++;
      if (idx >= sortedIds.length) {
        setAllDone(true);
        return;
      }
      setRevealedIndex(idx);
      const def = STAFF_CARDS.find(c => c.id === sortedIds[idx]);
      const rarity = def?.rarity ?? 'rare';
      const delay = rarity === 'legendary' ? 700 : rarity === 'epic' ? 500 : 300;
      timerRef.current = setTimeout(reveal, delay);
    };
    timerRef.current = setTimeout(reveal, 500);
    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, [visible, sortedIds, allDone]);

  // Skip: reveal all instantly
  const skipAll = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setRevealedIndex(sortedIds.length - 1);
    setAllDone(true);
  }, [sortedIds.length]);

  // Handle tap anywhere: first tap = skip, second tap = close
  const handleScreenTap = useCallback(() => {
    if (!allDone) {
      skipAll();
    } else {
      onClose();
    }
  }, [allDone, skipAll, onClose]);

  if (!visible || sortedIds.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleScreenTap} statusBarTranslucent>
      <Pressable style={ss.overlay} onPress={handleScreenTap}>
        <LinearGradient
          colors={['#000000', '#05051A'] as const}
          style={[ss.bg, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 }]}
          pointerEvents="none"
        >
          {/* Title */}
          <Text style={ss.title}>×{sortedIds.length} STAFF</Text>

          {/* Grid — centered */}
          <View style={[ss.gridContainer, { paddingHorizontal: padding, maxWidth: containerW }]}>
            <View style={ss.grid}>
              {sortedIds.map((id, i) => (
                <CardReveal
                  key={`${id}-${i}`}
                  cardId={id}
                  index={i}
                  revealedIndex={revealedIndex}
                  cardW={cardW}
                  cardH={cardH}
                />
              ))}
            </View>
          </View>

          {/* Bottom button — always anchored to bottom */}
          <View style={ss.bottomRow}>
            {!allDone ? (
              <View style={ss.skipBtn}>
                <Text style={ss.skipText}>TAP TO SKIP ⏩</Text>
              </View>
            ) : (
              <View style={ss.collectBtn}>
                <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={ss.collectGrad}>
                  <Text style={ss.collectText}>COLLECT ALL</Text>
                </LinearGradient>
              </View>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    </Modal>
  );
}

const ss = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  bg: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBack: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#475569',
  },
  cardBackInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFront: {
    overflow: 'hidden',
    borderWidth: 2,
  },
  cardFrontInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  rarityBadge: {
    position: 'absolute',
    zIndex: 2,
  },
  rarityText: {
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  cardName: {
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },
  cardRole: {
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardBonus: {
    fontWeight: '900',
    marginTop: 1,
  },
  bottomRow: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  collectBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  collectGrad: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  collectText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
  },
});
