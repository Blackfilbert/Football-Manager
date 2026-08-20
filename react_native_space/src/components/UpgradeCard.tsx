import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, cardShadow } from '../theme';
import { useGame } from '../context/GameContext';
import { getUpgradeCost, formatMoney, getBuildingIncome, getNextThreshold, getStaffBonus, getStaffStars, INCOME_THRESHOLDS, INCOME_THRESHOLD_MULTS } from '../utils';
import { LEAGUES, STAFF_CARDS } from '../constants';
import { UpgradeConfig } from '../types';
import StaffAssignModal from './StaffAssignModal';

interface Props {
  config: UpgradeConfig;
  listMode?: boolean;
  autoAssign?: boolean;
  onAutoAssignDone?: () => void;
}

function UpgradeCard({ config, listMode, autoAssign, onAutoAssignDone }: Props) {
  const { gameState, upgrade } = useGame();
  const [showStaffModal, setShowStaffModal] = useState(false);
  const autoAssignTriggered = React.useRef(false);

  React.useEffect(() => {
    if (autoAssign && !autoAssignTriggered.current) {
      autoAssignTriggered.current = true;
      setShowStaffModal(true);
    }
  }, [autoAssign]);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const canUseNative = Platform.OS !== 'web';

  const level = gameState?.upgrades?.[config?.id ?? ''] ?? 0;
  const isMax = level >= (config?.maxLevel ?? 30);
  const cost = getUpgradeCost(config?.id ?? '', level);
  const canAfford = (gameState?.money ?? 0) >= cost;

  const isIncome = config?.type === 'income';
  const basePerClick = isIncome ? (config?.incomePerClick ?? 1) : (config?.powerPerClick ?? 1);
  const leagueIdx = gameState?.leagueIndex ?? 0;
  const leagueMult = isIncome ? (LEAGUES?.[leagueIdx]?.multiplier ?? 1) : 1;

  const currentTotal = isIncome ? getBuildingIncome(basePerClick, level) : basePerClick * level;
  const nextTotal = isIncome ? getBuildingIncome(basePerClick, level + 1) : basePerClick * (level + 1);
  const rawDiff = nextTotal - currentTotal;
  // Show income diff with stadium multiplier applied
  const diff = isIncome ? rawDiff * leagueMult : rawDiff;
  const displayPerClick = isIncome ? diff : basePerClick;

  // Threshold progress for income buildings
  const threshold = isIncome ? getNextThreshold(level) : null;
  let progressFrac = 0;
  let prevThreshold = 0;
  if (threshold) {
    const idx = INCOME_THRESHOLDS.indexOf(threshold.level as any);
    prevThreshold = idx > 0 ? INCOME_THRESHOLDS[idx - 1] : 0;
    const range = threshold.level - prevThreshold;
    progressFrac = range > 0 ? (level - prevThreshold) / range : 0;
  } else if (isIncome) {
    progressFrac = 1; // past all thresholds
  }

  // Staff assigned to this building
  const assignedStaffId = isIncome ? (gameState?.staffAssigned?.[config?.id ?? ''] ?? null) : null;
  const assignedStaffDef = assignedStaffId ? STAFF_CARDS.find(c => c.id === assignedStaffId) : null;
  const assignedStaffOwned = assignedStaffId ? gameState?.staff?.[assignedStaffId] : null;
  const staffBonusPct = assignedStaffDef && assignedStaffOwned ? Math.round(getStaffBonus(assignedStaffDef, assignedStaffOwned) * 100) : 0;

  // Current building income/s (with league multiplier + staff bonus)
  const staffMult = staffBonusPct > 0 ? 1 + staffBonusPct / 100 : 1;
  const buildingIncomePerSec = isIncome ? Math.floor(currentTotal * leagueMult * staffMult) : 0;

  const handlePress = () => {
    if (isMax || !canAfford) return;
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: canUseNative, speed: 50 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: canUseNative, speed: 50 }),
    ]).start();
    upgrade(config?.id ?? '');
  };

  // ---------- List mode (income buildings) ----------
  if (listMode) {
    return (
      <Animated.View style={[s.listCard, { transform: [{ scale: scaleAnim }] }]}>
        {/* Top row: icon + info + button */}
        <View style={s.listTopRow}>
          <View style={s.iconCircle}>
            <Text style={s.emoji}>{config?.emoji ?? '\u26bd'}</Text>
          </View>
          <View style={s.listInfo}>
            <View style={s.listNameRow}>
              <Text style={s.name} numberOfLines={1}>{config?.name ?? 'Upgrade'}</Text>
              <Text style={s.buildingIncome}>${buildingIncomePerSec}/s</Text>
            </View>
            <Text style={s.levelLine}>
              Lv.{level}{!isMax && (
                <Text style={s.nextBonus}> +{diff}/s</Text>
              )}
            </Text>
          </View>
          {isMax ? (
            <View style={s.maxBadge}>
              <Text style={s.maxText}>MAX</Text>
            </View>
          ) : (
            <Pressable
              style={[s.listBtn, !canAfford && s.disabledBtn]}
              onPress={handlePress}
              disabled={!canAfford}
            >
              <Text style={[s.upgradeBtnText, !canAfford && s.disabledText]}>
                {formatMoney(cost)}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Progress bar toward next threshold */}
        {threshold && (
          <View style={s.progressRow}>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${Math.min(progressFrac * 100, 100)}%` }]} />
            </View>
            <Text style={s.progressLabel}>×{threshold.mult}</Text>
          </View>
        )}

        {/* Staff assignment row */}
        {isIncome && leagueIdx >= 1 && (
          <Pressable style={s.staffRow} onPress={() => setShowStaffModal(true)}>
            {assignedStaffDef ? (
              <>
                <Text style={s.staffEmoji}>{assignedStaffDef.emoji}</Text>
                <Text style={s.staffName}>{assignedStaffDef.name}</Text>
                <Text style={s.staffBonus}>+{staffBonusPct}%</Text>
              </>
            ) : (
              <>
                <Ionicons name="person-add-outline" size={14} color={Colors.textMuted} />
                <Text style={s.staffPlaceholder}>Assign Staff</Text>
                {(() => {
                  const assignedIds = new Set(Object.values(gameState?.staffAssigned ?? {}));
                  const canAssign = STAFF_CARDS.some(c => {
                    const o = gameState?.staff?.[c.id];
                    return o && o.copies > 0 && !assignedIds.has(c.id) && c.buildings.includes(config?.id ?? '');
                  });
                  return canAssign ? <View style={s.redDot} /> : null;
                })()}
              </>
            )}
            <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
          </Pressable>
        )}
        {isIncome && leagueIdx < 1 && (
          <View style={s.staffRow}>
            <Ionicons name="lock-closed" size={14} color={Colors.textMuted} />
            <Text style={s.staffLockedText}>Staff unlocks at #{2} {LEAGUES[1]?.name ?? 'City Stadium'}</Text>
          </View>
        )}

        {isIncome && (
          <StaffAssignModal
            buildingId={config?.id ?? ''}
            buildingName={config?.name ?? 'Building'}
            visible={showStaffModal}
            onClose={() => { setShowStaffModal(false); onAutoAssignDone?.(); }}
          />
        )}
      </Animated.View>
    );
  }

  // ---------- Grid mode (power upgrades) ----------
  return (
    <Animated.View style={[s.card, { transform: [{ scale: scaleAnim }] }]}>
      <View style={s.header}>
        <View style={s.iconCircle}>
          <Text style={s.emoji}>{config?.emoji ?? '\u26bd'}</Text>
        </View>
        <View style={s.titleArea}>
          <Text style={s.name} numberOfLines={1}>{config?.name ?? 'Upgrade'}</Text>
          <Text style={s.levelLine} numberOfLines={1}>
            Lv. {level}  {!isMax && (
              <Text style={s.nextBonus}>+{displayPerClick}{isIncome ? '/s' : '\u26a1'}</Text>
            )}
          </Text>
        </View>
      </View>

      {isMax ? (
        <View style={s.maxBadge}>
          <Text style={s.maxText}>MAX</Text>
        </View>
      ) : (
        <Pressable
          style={[s.upgradeBtn, !canAfford && s.disabledBtn]}
          onPress={handlePress}
          disabled={!canAfford}
          accessibilityLabel={`Upgrade ${config?.name ?? ''}`}
        >
          <Text style={[s.upgradeBtnText, !canAfford && s.disabledText]}>
            Upgrade {formatMoney(cost)}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

export default React.memo(UpgradeCard);

const s = StyleSheet.create({
  /* Grid card */
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flex: 1,
    margin: 4,
    ...cardShadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  emoji: { fontSize: 18 },
  titleArea: { flex: 1 },
  name: { fontSize: 13, fontWeight: '700', color: Colors.dark },
  levelLine: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary, marginTop: 2 },
  nextBonus: { color: Colors.green, fontWeight: '700' },
  upgradeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  disabledBtn: { backgroundColor: '#CBD5E1', opacity: 0.7 },
  upgradeBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  disabledText: { color: '#94A3B8' },
  maxBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: Radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  maxText: { color: Colors.warning, fontWeight: '800', fontSize: 13 },

  /* List card */
  listCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    ...cardShadow,
  },
  listTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listInfo: {
    flex: 1,
  },
  listNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buildingIncome: {
    fontSize: 12,
    fontWeight: '800',
    color: '#22C55E',
  },
  listBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginLeft: 8,
  },

  /* Progress bar */
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 44, // align with text (icon 36 + margin 8)
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    marginLeft: 6,
    minWidth: 24,
  },

  /* Staff row */
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    gap: 6,
  },
  staffEmoji: { fontSize: 16 },
  staffName: { fontSize: 11, fontWeight: '600', color: Colors.dark },
  staffBonus: { fontSize: 11, fontWeight: '800', color: '#22C55E' },
  staffPlaceholder: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  staffLockedText: { fontSize: 10, color: Colors.textMuted, marginLeft: 6, fontStyle: 'italic' },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
});
