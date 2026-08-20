import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Dimensions, ScrollView, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RARITY_CONFIG } from '../constants';
import { Player } from '../types';

const { width: SW } = Dimensions.get('window');
const FLAG_CDN = 'https://flagcdn.com/w40/';

const RARITY_GLOW: Record<string, readonly [string, string]> = {
  common:    ['#94A3B8', '#64748B'] as const,
  rare:      ['#22C55E', '#16A34A'] as const,
  epic:      ['#3B82F6', '#2563EB'] as const,
  legendary: ['#A855F7', '#7C3AED'] as const,
  icon:      ['#F97316', '#EA580C'] as const,
  ultimate:  ['#EF4444', '#DC2626'] as const,
};

interface Props {
  visible: boolean;
  players: Player[];
  onClose: () => void;
}

const SINGLE_W = SW * 0.35;
const MULTI_W = (SW * 0.92 - 24 * 2 - 6 * 2) / 3;

function PlayerCard({ player, size }: { player: Player; size: 'small' | 'single' }) {
  const cfg = RARITY_CONFIG[player.rarity] ?? RARITY_CONFIG.common;
  const glow = RARITY_GLOW[player.rarity] ?? RARITY_GLOW.common;
  const flagCode = (player.country ?? 'br').toLowerCase();
  const w = size === 'single' ? SINGLE_W : MULTI_W;
  const sc = size === 'single' ? 1.3 : 1;
  const circleSize = 36 * sc;
  return (
    <View style={[c.card, { width: w }]}>
      <LinearGradient colors={glow} style={c.glowBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={c.inner}>
        {/* Rating circle like PlayerCard */}
        <View style={[c.circle, { width: circleSize, height: circleSize + 4, borderRadius: circleSize / 2, borderColor: cfg.color, borderWidth: 2 * sc }]}>
          <Text style={[c.circlePos, { fontSize: 6 * sc }]}>{player.position}</Text>
          <Text style={[c.circleOvr, { fontSize: 14 * sc, color: cfg.color }]}>{player.overall}</Text>
        </View>
        <Image source={{ uri: FLAG_CDN + flagCode + '.png' }} style={[c.flag, { width: 16 * sc, height: 11 * sc }]} />
        <Text style={[c.name, { fontSize: 10 * sc }]} numberOfLines={1}>{player.lastName}</Text>
        <Text style={[c.rarity, { fontSize: 6 * sc, color: cfg.color }]}>{cfg.label}</Text>
        <View style={c.statsRow}>
          <View style={c.statItem}>
            <Text style={[c.statEmoji, { fontSize: 8 * sc }]}>{'\u2694\uFE0F'}</Text>
            <Text style={[c.stat, { fontSize: 8 * sc }]}>{player.attack}</Text>
          </View>
          <View style={c.statItem}>
            <Text style={[c.statEmoji, { fontSize: 8 * sc }]}>{'\uD83D\uDEE1\uFE0F'}</Text>
            <Text style={[c.stat, { fontSize: 8 * sc }]}>{player.defense}</Text>
          </View>
        </View>
        <Text style={[c.income, { fontSize: 7 * sc }]}>+${player.income}/s</Text>
      </View>
    </View>
  );
}

function AnimatedCard({ player, revealed }: { player: Player; revealed: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (revealed) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 200 }).start();
    }
  }, [revealed, anim]);

  if (!revealed) {
    return <View style={[c.card, { width: MULTI_W, opacity: 0.15 }]}>
      <View style={[c.inner, { backgroundColor: 'rgba(255,255,255,0.05)', aspectRatio: MULTI_W / (MULTI_W * 1.6), justifyContent: 'center' }]}>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }}>?</Text>
      </View>
    </View>;
  }

  return (
    <Animated.View style={{ transform: [{ scale: anim }], opacity: anim }}>
      <PlayerCard player={player} size="small" />
    </Animated.View>
  );
}

export default function ChestOpenModal({ visible, players, onClose }: Props) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    if (visible && players.length > 0) {
      setSessionKey(k => k + 1);
      if (players.length > 1) {
        setRevealedCount(1);
        let count = 1;
        const timer = setInterval(() => {
          count++;
          setRevealedCount(count);
          if (count >= players.length) clearInterval(timer);
        }, 300);
        return () => clearInterval(timer);
      } else {
        setRevealedCount(players.length);
      }
    } else {
      setRevealedCount(0);
    }
  }, [visible, players]);

  if (!visible || players.length === 0) return null;

  const isMulti = players.length > 1;
  const allRevealed = revealedCount >= players.length;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.container}>
          <Text style={s.title}>{isMulti ? `x${players.length} PLAYERS` : 'NEW PLAYER'}</Text>
          {isMulti ? (
            <ScrollView style={{ maxHeight: SW * 1.2 }} showsVerticalScrollIndicator={false}>
              <View style={s.grid}>
                {players.map((p, i) => (
                  <AnimatedCard key={`${sessionKey}-${p.id}`} player={p} revealed={i < revealedCount} />
                ))}
              </View>
            </ScrollView>
          ) : (
            <PlayerCard player={players[0]!} size="single" />
          )}
          {allRevealed && (
            <Pressable style={({ pressed }) => [s.collectBtn, pressed && { opacity: 0.8 }]} onPress={onClose}>
              <Text style={s.collectBtnText}>{isMulti ? 'COLLECT ALL' : 'COLLECT'}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const c = StyleSheet.create({
  card: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  glowBg: {
    ...StyleSheet.absoluteFillObject,
  },
  inner: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    margin: 1.5,
    borderRadius: 8.5,
    padding: 6,
    alignItems: 'center',
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    marginBottom: 3,
  },
  circlePos: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  circleOvr: {
    fontWeight: '900',
    marginTop: -1,
  },
  rarity: {
    fontWeight: '700',
    marginTop: 1,
  },
  flag: {
    borderRadius: 1.5,
    marginTop: 3,
  },
  name: {
    color: '#FFF',
    fontWeight: '700',
    marginTop: 2,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statEmoji: {
    textShadowColor: 'rgba(0,0,0,0)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
  stat: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
  },
  income: {
    color: '#4ADE80',
    fontWeight: '700',
    marginTop: 3,
  },
});

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SW * 0.92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  collectBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
    marginTop: 10,
  },
  collectBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
