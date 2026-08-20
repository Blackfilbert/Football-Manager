import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Player, TrainingBoost } from '../types';
import { RARITY_CONFIG, ILLNESS_TYPES } from '../constants';
import { Colors, Spacing, Radius, cardShadow } from '../theme';
import { formatMoney } from '../utils';

interface Props {
  visible: boolean;
  player: Player | null;
  trainingBoosts: TrainingBoost[];
  onClose: () => void;
}

/** Calculate player sell price accounting for buffs, debuffs, and goals */
export function calcSellPrice(player: Player, trainingBoosts: TrainingBoost[]): number {
  const baseCost = player?.cost ?? 0;
  let multiplier = 1.0;

  // Illness debuff: reduce value proportionally
  if (player?.illness) {
    multiplier *= player.illness.effectiveness; // 0.1 - 0.7
  }

  // Training boost: increase value
  const now = Date.now();
  const activeBoost = trainingBoosts.find(b => b.playerId === player?.id && b.expiresAt > now);
  if (activeBoost) {
    multiplier *= activeBoost.multiplier; // e.g. 1.15
  }

  // Goals bonus: +2% per goal, capped at +50%
  const goals = player?.goals ?? 0;
  const goalBonus = Math.min(goals * 0.02, 0.5);
  multiplier *= (1 + goalBonus);

  return Math.floor(baseCost * 0.5 * multiplier);
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Recovering...';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function PlayerInfoModal({ visible, player, trainingBoosts, onClose }: Props) {
  const [tick, setTick] = useState(0);

  // Tick every second to update illness/healing timer
  useEffect(() => {
    if (!visible || (!player?.illness?.appliedAt && !player?.illness?.healingUntil)) return;
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [visible, player?.illness?.appliedAt, player?.illness?.healingUntil]);

  if (!player) return null;

  const rarity = RARITY_CONFIG?.[player.rarity ?? 'common'];
  const illnessInfo = player.illness
    ? ILLNESS_TYPES.find(i => i.type === player.illness?.type)
    : null;

  const now = Date.now();
  const activeBoost = trainingBoosts.find(b => b.playerId === player.id && b.expiresAt > now);
  const sellPrice = calcSellPrice(player, trainingBoosts);

  // Illness time remaining
  const illnessTimeLeft = (illnessInfo && player.illness?.appliedAt)
    ? Math.max(0, illnessInfo.duration - (now - player.illness.appliedAt))
    : 0;

  // Healing state
  const isHealing = !!(player.illness?.healingUntil && player.illness.healingUntil > now);
  const healingTimeLeft = isHealing ? Math.max(0, (player.illness?.healingUntil ?? 0) - now) : 0;

  const stats = [
    { label: 'Goals', value: player.goals ?? 0, emoji: '⚽' },
    { label: 'Assists', value: player.assists ?? 0, emoji: '🅰️' },
    { label: 'Penalties', value: player.penalties ?? 0, emoji: '🥅' },
    { label: 'Intercepts', value: player.intercepts ?? 0, emoji: '🛡️' },
    { label: 'Yellow Cards', value: player.yellowCards ?? 0, emoji: '🟨' },
    { label: 'Red Cards', value: player.redCards ?? 0, emoji: '🟥' },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent presentationStyle="overFullScreen" statusBarTranslucent>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
          {/* Header */}
          <View style={s.header}>
            <View style={[s.rarityBadge, { backgroundColor: rarity?.color ?? '#94A3B8' }]}>
              <Text style={s.rarityText}>{rarity?.label ?? 'Common'}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close-circle" size={28} color={Colors.textMuted} />
            </Pressable>
          </View>

          {/* Player identity */}
          <View style={s.identity}>
            <View style={[s.ovrCircle, { borderColor: rarity?.color ?? '#94A3B8' }]}>
              <Text style={s.posText}>{player.position}</Text>
              <Text style={s.ovrText}>{player.overall}</Text>
            </View>
            <View style={s.nameBlock}>
              <Text style={s.firstName}>{player.firstName}</Text>
              <Text style={s.lastName}>{player.lastName}</Text>
              {player.country ? <Text style={s.country}>{player.country}</Text> : null}
            </View>
          </View>

          {/* Sell price */}
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Sell Value</Text>
            <Text style={s.priceValue}>{formatMoney(sellPrice)}</Text>
          </View>

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
            {/* Stats grid */}
            <Text style={s.sectionTitle}>MATCH STATS</Text>
            <View style={s.statsGrid}>
              {stats.map(st => (
                <View key={st.label} style={s.statCell}>
                  <Text style={s.statEmoji}>{st.emoji}</Text>
                  <Text style={s.statValue}>{st.value}</Text>
                  <Text style={s.statLabel}>{st.label}</Text>
                </View>
              ))}
            </View>

            {/* Player attributes */}
            <Text style={s.sectionTitle}>ATTRIBUTES</Text>
            <View style={s.attrRow}>
              <View style={s.attrItem}>
                <Text style={s.attrLabel}>ATK</Text>
                <Text style={s.attrValue}>{player.attack}</Text>
              </View>
              <View style={s.attrItem}>
                <Text style={s.attrLabel}>DEF</Text>
                <Text style={s.attrValue}>{player.defense}</Text>
              </View>
              <View style={s.attrItem}>
                <Text style={s.attrLabel}>Level</Text>
                <Text style={s.attrValue}>{player.level}</Text>
              </View>
            </View>

            {/* Buffs & Debuffs */}
            {(illnessInfo || activeBoost || isHealing) && (
              <>
                <Text style={s.sectionTitle}>STATUS EFFECTS</Text>
                <View style={s.effectsList}>
                  {isHealing && (
                    <View style={[s.effectCard, s.healCard]}>
                      <Text style={s.effectEmoji}>✚</Text>
                      <View style={s.effectInfo}>
                        <Text style={s.effectName}>Healing in progress</Text>
                        <Text style={s.healText}>{illnessInfo ? illnessInfo.label : 'Recovering'}</Text>
                        {healingTimeLeft > 0 && (
                          <Text style={s.healTimer}>⏱ {formatTimeLeft(healingTimeLeft)}</Text>
                        )}
                      </View>
                    </View>
                  )}
                  {illnessInfo && !isHealing && (
                    <View style={[s.effectCard, s.debuffCard]}>
                      <Text style={s.effectEmoji}>{illnessInfo.emoji}</Text>
                      <View style={s.effectInfo}>
                        <Text style={s.effectName}>{illnessInfo.label}</Text>
                        <Text style={s.debuffText}>-{Math.round((1 - illnessInfo.effectiveness) * 100)}% effectiveness</Text>
                        {illnessTimeLeft > 0 && (
                          <Text style={s.timerText}>⏱ {formatTimeLeft(illnessTimeLeft)}</Text>
                        )}
                      </View>
                    </View>
                  )}
                  {activeBoost && (
                    <View style={[s.effectCard, s.buffCard]}>
                      <Text style={s.effectEmoji}>💪</Text>
                      <View style={s.effectInfo}>
                        <Text style={s.effectName}>Training Boost</Text>
                        <Text style={s.buffText}>+{Math.round((activeBoost.multiplier - 1) * 100)}% power</Text>
                      </View>
                    </View>
                  )}
                </View>
              </>
            )}

            {(!illnessInfo && !activeBoost) && (
              <View style={s.noEffects}>
                <Text style={s.noEffectsText}>No active status effects</Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    width: '88%',
    maxHeight: '80%',
    padding: Spacing.lg,
    ...cardShadow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  rarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rarityText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: Spacing.md,
  },
  ovrCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posText: { fontSize: 10, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.5 },
  ovrText: { fontSize: 20, fontWeight: '900', color: Colors.dark, marginTop: -2 },
  nameBlock: { flex: 1 },
  firstName: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  lastName: { fontSize: 20, fontWeight: '900', color: Colors.dark },
  country: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  priceLabel: { fontSize: 13, fontWeight: '700', color: '#166534' },
  priceValue: { fontSize: 18, fontWeight: '900', color: '#16A34A' },

  scroll: { flexGrow: 0 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCell: {
    width: '30%',
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: 8,
    alignItems: 'center',
  },
  statEmoji: { fontSize: 18, marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '800', color: Colors.dark },
  statLabel: { fontSize: 9, fontWeight: '600', color: Colors.textMuted, marginTop: 1 },

  attrRow: {
    flexDirection: 'row',
    gap: 8,
  },
  attrItem: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: 10,
    alignItems: 'center',
  },
  attrLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  attrValue: { fontSize: 18, fontWeight: '800', color: Colors.dark },

  effectsList: { gap: 8 },
  effectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 10,
  },
  debuffCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  buffCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  effectEmoji: { fontSize: 24 },
  effectInfo: { flex: 1 },
  effectName: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  debuffText: { fontSize: 12, fontWeight: '600', color: '#DC2626', marginTop: 2 },
  timerText: { fontSize: 11, fontWeight: '700', color: '#92400E', marginTop: 3 },
  buffText: { fontSize: 12, fontWeight: '600', color: '#16A34A', marginTop: 2 },
  healCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  healText: { fontSize: 12, fontWeight: '600', color: '#16A34A', marginTop: 2 },
  healTimer: { fontSize: 12, fontWeight: '800', color: '#15803D', marginTop: 3, fontVariant: ['tabular-nums'] as any },

  noEffects: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  noEffectsText: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
});
