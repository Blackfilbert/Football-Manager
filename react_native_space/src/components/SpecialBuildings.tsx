import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, cardShadow } from '../theme';
import { useGame } from '../context/GameContext';
import { useRouter } from 'expo-router';
import {
  SPECIAL_BUILDINGS, STAFF_CARDS, ILLNESS_TYPES,
  STRATEGY_GEN_FIRST, STRATEGY_GEN_INTERVAL, STRATEGY_DURATION,
  TRAINING_TIERS, TRAINING_MAX_DURATION,
} from '../constants';
import { getStaffBonus, getStaffStars } from '../utils';
import StaffAssignModal from './StaffAssignModal';
import CurrencyIcon from './CurrencyIcon';

function formatTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function ProgressBar({ progress, color = Colors.primary }: { progress: number; color?: string }) {
  const pct = Math.min(1, Math.max(0, progress));
  return (
    <View style={s.progressBg}>
      <View style={[s.progressFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}

export default function SpecialBuildings() {
  const { gameState, trainPlayer, activateStrategy, healPlayer, speedUpHeal, skipTrainingCooldown, skipStrategyCooldown, skipStrategyGeneration, assignStaff } = useGame();
  const router = useRouter();
  const [assignModal, setAssignModal] = useState<{ buildingId: string; name: string } | null>(null);
  const [trainModal, setTrainModal] = useState(false);
  const [healModal, setHealModal] = useState(false);
  const [, setTick] = useState(0);

  React.useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const now = Date.now();
  const assigned = gameState?.staffAssigned ?? {};
  const staff = gameState?.staff ?? {};
  const players = gameState?.players ?? [];
  const startingIds = gameState?.startingIds ?? [];
  const boosts = (gameState?.trainingBoosts ?? []).filter(b => b.expiresAt > now);
  const activeStrats = (gameState?.activeStrategies ?? []).filter(s => s.expiresAt > now);
  const strategiesReady = gameState?.strategiesReady ?? 0;
  const trainingCooldown = gameState?.trainingCooldown ?? 0;
  const strategyCooldown = gameState?.strategyCooldown ?? 0;
  const strategyLastGenTime = gameState?.strategyLastGenTime ?? 0;
  const sickPlayers = players.filter(p => !!p.illness);
  const healingPlayers = players.filter(p => p.illness?.healingUntil && p.illness.healingUntil > now);
  const unhealedSick = sickPlayers.filter(p => !p.illness?.healingUntil);
  const crystals = gameState?.crystals ?? 0;

  // Strategy generation progress
  const hasStratTrainer = !!(assigned['strategy_room']);
  const isFirstStratGen = strategiesReady === 0 && activeStrats.length === 0;
  const stratGenInterval = isFirstStratGen ? STRATEGY_GEN_FIRST : STRATEGY_GEN_INTERVAL;
  const stratGenElapsed = strategyLastGenTime > 0 ? now - strategyLastGenTime : 0;
  const stratGenRemaining = Math.max(0, stratGenInterval - stratGenElapsed);
  const stratGenProgress = strategyLastGenTime > 0 && stratGenInterval > 0 ? Math.min(1, stratGenElapsed / stratGenInterval) : 0;
  const stratGenSkipCost = Math.max(1, Math.ceil(stratGenRemaining / 60_000));

  // Training cooldown progress (use stored total, fallback to reasonable estimate)
  const trainingCdTotal = gameState?.trainingCooldownTotal ?? TRAINING_TIERS[0].cooldown;
  const trainingCdRemaining = Math.max(0, trainingCooldown - now);
  const trainingCdProgress = trainingCooldown > now && trainingCdTotal > 0 ? 1 - trainingCdRemaining / trainingCdTotal : 1;

  const getStaffInfo = (buildingId: string) => {
    const staffId = assigned[buildingId];
    if (!staffId) return null;
    const def = STAFF_CARDS.find(c => c.id === staffId);
    const own = staff[staffId];
    if (!def || !own) return null;
    return { def, own, bonus: getStaffBonus(def, own) };
  };

  const assignedStaffIds = new Set(Object.values(assigned));
  const canAssignToBuilding = (buildingId: string): boolean => {
    if (assigned[buildingId]) return false;
    return STAFF_CARDS.some(c => {
      const own = staff[c.id];
      if (!own || own.copies <= 0) return false;
      if (assignedStaffIds.has(c.id)) return false;
      return c.buildings.includes(buildingId);
    });
  };

  const getSkipCost = (remaining: number) => Math.max(1, Math.ceil(remaining / 60_000));

  return (
    <View style={s.container}>
      <Text style={s.sectionTitle}>🏗️ SPECIAL BUILDINGS</Text>

      {SPECIAL_BUILDINGS.map(b => {
        const staffInfo = getStaffInfo(b.id);
        const hasStaff = !!staffInfo;

        return (
          <View key={b.id} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardEmoji}>{b.emoji}</Text>
              <View style={s.cardTitleArea}>
                <Text style={s.cardName}>{b.name}</Text>
                <Text style={s.cardDesc}>{b.desc}</Text>
              </View>
            </View>

            <Pressable style={s.staffRow} onPress={() => setAssignModal({ buildingId: b.id, name: b.name })}>
              {staffInfo ? (
                <>
                  <Text style={s.staffEmoji}>{staffInfo.def.emoji}</Text>
                  <Text style={s.staffName}>{staffInfo.def.name}</Text>
                  <Text style={s.staffBonus}>+{Math.round(staffInfo.bonus * 100)}% {staffInfo.def.role === 'doctor' ? 'heal' : 'duration'}</Text>
                </>
              ) : (
                <View style={s.staffPlaceholderRow}>
                  <Ionicons name="person-add-outline" size={14} color={Colors.textMuted} />
                  <Text style={s.staffPlaceholder}>Assign Staff</Text>
                  {canAssignToBuilding(b.id) && <View style={s.redDot} />}
                </View>
              )}
              <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
            </Pressable>

            {/* Training Hall */}
            {b.id === 'training_hall' && (
              <View style={s.actionArea}>
                {!hasStaff ? (
                  <Text style={s.noStaffHint}>Assign a trainer to start training</Text>
                ) : trainingCooldown > now ? (
                  <View>
                    <View style={s.progressRow}>
                      <Text style={s.cooldownText}>⏳ Cooldown: {formatTime(trainingCdRemaining)}</Text>
                    </View>
                    <ProgressBar progress={trainingCdProgress} color="#F59E0B" />
                    <Pressable style={s.skipBtn} onPress={() => {
                      const cost = getSkipCost(trainingCooldown - now);
                      if (crystals < cost) { router.push('/tabs/shop'); return; }
                      skipTrainingCooldown();
                    }}>
                      <Text style={s.skipBtnText}>⚡ Skip</Text>
                      <CurrencyIcon type="diamond" size={14} />
                      <Text style={[s.skipBtnCost, crystals < getSkipCost(trainingCooldown - now) && { color: '#EF4444' }]}>{getSkipCost(trainingCooldown - now)}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={s.actionBtn} onPress={() => setTrainModal(true)}>
                    <Text style={s.actionBtnText}>🏃 Train Player</Text>
                  </Pressable>
                )}
                {boosts.length > 0 && (
                  <View style={s.boostList}>
                    <Text style={s.boostTitle}>Active Boosts ({boosts.length})</Text>
                    {boosts.map(bo => {
                      const pl = players.find(p => p.id === bo.playerId);
                      return pl ? (
                        <Text key={bo.playerId} style={s.boostItem}>
                          {pl.firstName} {pl.lastName} +{Math.round((bo.multiplier - 1) * 100)}% ({formatTime(bo.expiresAt - now)})
                        </Text>
                      ) : null;
                    })}
                  </View>
                )}
              </View>
            )}

            {/* Strategy Room */}
            {b.id === 'strategy_room' && (
              <View style={s.actionArea}>
                {!hasStaff ? (
                  <Text style={s.noStaffHint}>Assign a trainer to generate strategies</Text>
                ) : (
                  <View>
                    <Text style={s.stratCount}>📜 Strategies ready: {strategiesReady}</Text>

                    {/* Strategy generation progress */}
                    {hasStratTrainer && strategyLastGenTime > 0 && strategiesReady < 9 && stratGenRemaining > 0 && (
                      <View style={s.genSection}>
                        <View style={s.progressRow}>
                          <Text style={s.genLabel}>⚙️ Generating: {formatTime(stratGenRemaining)}</Text>
                        </View>
                        <ProgressBar progress={stratGenProgress} color="#3B82F6" />
                        <Pressable style={s.skipBtn} onPress={() => {
                          if (crystals < stratGenSkipCost) { router.push('/tabs/shop'); return; }
                          skipStrategyGeneration();
                        }}>
                          <Text style={s.skipBtnText}>⚡ Skip</Text>
                          <CurrencyIcon type="diamond" size={14} />
                          <Text style={[s.skipBtnCost, crystals < stratGenSkipCost && { color: '#EF4444' }]}>{stratGenSkipCost}</Text>
                        </Pressable>
                      </View>
                    )}

                    {/* Activate button (no activation cooldown) */}
                    <Pressable
                      style={[s.actionBtn, strategiesReady <= 0 && s.actionBtnDisabled]}
                      onPress={() => activateStrategy()}
                      disabled={strategiesReady <= 0}
                    >
                      <Text style={s.actionBtnText}>⚡ Activate Strategy</Text>
                    </Pressable>
                  </View>
                )}
                {activeStrats.length > 0 && (
                  <View style={s.boostList}>
                    <Text style={s.boostTitle}>Active Strategies ({activeStrats.length})</Text>
                    {activeStrats.map(st => (
                      <Text key={st.id} style={s.boostItem}>
                        +{st.boostPct}% team power ({formatTime(st.expiresAt - now)})
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Infirmary */}
            {b.id === 'infirmary' && (
              <View style={s.actionArea}>
                {!hasStaff ? (
                  <Text style={s.noStaffHint}>Assign a doctor to heal players</Text>
                ) : sickPlayers.length === 0 ? (
                  <Text style={s.noStaffHint}>✅ All players healthy!</Text>
                ) : (
                  <View>
                    {unhealedSick.length > 0 && (
                      <Pressable style={s.actionBtn} onPress={() => setHealModal(true)}>
                        <Text style={s.actionBtnText}>💊 Heal Player ({unhealedSick.length} sick)</Text>
                      </Pressable>
                    )}
                    {healingPlayers.map(pl => {
                      const illInfo = ILLNESS_TYPES.find(i => i.type === pl.illness?.type);
                      const healTime = illInfo?.healTime ?? 300_000;
                      const healEnd = pl.illness?.healingUntil ?? 0;
                      const remaining = Math.max(0, healEnd - now);
                      const progress = healTime > 0 ? 1 - remaining / healTime : 1;
                      const cost = getSkipCost(remaining);
                      return (
                        <View key={pl.id} style={s.healingSection}>
                          <View style={s.progressRow}>
                            <Text style={s.cooldownText}>
                              {illInfo?.emoji ?? '🤒'} {pl.firstName} {pl.lastName}: {formatTime(remaining)}
                            </Text>
                          </View>
                          <ProgressBar progress={progress} color="#22C55E" />
                          <Pressable style={s.skipBtn} onPress={() => {
                            if (crystals < cost) { router.push('/tabs/shop'); return; }
                            speedUpHeal(pl.id);
                          }}>
                            <Text style={s.skipBtnText}>⚡ Skip</Text>
                            <CurrencyIcon type="diamond" size={14} />
                            <Text style={[s.skipBtnCost, crystals < cost && { color: '#EF4444' }]}>{cost}</Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}

      {assignModal && (
        <StaffAssignModal
          buildingId={assignModal.buildingId}
          buildingName={assignModal.name}
          visible={true}
          onClose={() => setAssignModal(null)}
        />
      )}

      {/* Train player picker */}
      <Modal visible={trainModal} transparent animationType="slide" onRequestClose={() => setTrainModal(false)} statusBarTranslucent>
        <Pressable style={s.modalOverlay} onPress={() => setTrainModal(false)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Train Player</Text>
              <Pressable onPress={() => setTrainModal(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={s.modalList}>
              {startingIds.map(id => {
                const pl = players.find(p => p.id === id);
                if (!pl) return null;
                const hasBo = boosts.some(b => b.playerId === id);
                const isSick = !!pl.illness;
                return (
                  <Pressable
                    key={id}
                    style={[s.playerRow, hasBo && s.playerRowBoosted]}
                    onPress={() => {
                      if (!hasBo && !isSick) {
                        trainPlayer(id);
                        setTrainModal(false);
                      }
                    }}
                    disabled={hasBo || isSick}
                  >
                    <Text style={s.playerName}>{pl.firstName} {pl.lastName}</Text>
                    <Text style={s.playerOvr}>{pl.overall} OVR</Text>
                    {isSick && <Text style={s.sickBadge}>{ILLNESS_TYPES.find(i => i.type === pl.illness?.type)?.emoji ?? '🤒'}</Text>}
                    {hasBo ? (
                      <Text style={s.boostedBadge}>✅ Boosted</Text>
                    ) : isSick ? (
                      <Text style={s.sickLabel}>Sick</Text>
                    ) : (
                      <Text style={s.trainBtn}>Train</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Heal player picker */}
      <Modal visible={healModal} transparent animationType="slide" onRequestClose={() => setHealModal(false)} statusBarTranslucent>
        <Pressable style={s.modalOverlay} onPress={() => setHealModal(false)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Heal Player</Text>
              <Pressable onPress={() => setHealModal(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={s.healHint}>Player stays in lineup but heals over time</Text>
            <ScrollView style={s.modalList}>
              {unhealedSick.map(pl => {
                const illInfo = ILLNESS_TYPES.find(i => i.type === pl.illness?.type);
                return (
                  <Pressable
                    key={pl.id}
                    style={s.playerRow}
                    onPress={() => {
                      healPlayer(pl.id);
                      if (unhealedSick.length <= 1) setHealModal(false);
                    }}
                  >
                    <Text style={s.sickEmoji}>{illInfo?.emoji ?? '🤒'}</Text>
                    <View style={s.sickInfo}>
                      <Text style={s.playerName}>{pl.firstName} {pl.lastName}</Text>
                      <Text style={s.sickLabel}>{illInfo?.label ?? 'Sick'} — heals in {formatTime(illInfo?.healTime ?? 300_000)}</Text>
                    </View>
                    <Text style={s.healBtn}>💊 Heal</Text>
                  </Pressable>
                );
              })}
              {unhealedSick.length === 0 && (
                <Text style={s.emptyHeal}>All sick players are being healed!</Text>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 1, marginBottom: 6 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 8,
    ...cardShadow,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardEmoji: { fontSize: 22, marginRight: 10 },
  cardTitleArea: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '800', color: Colors.dark },
  cardDesc: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  staffRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 6, borderTopWidth: 0.5, borderTopColor: Colors.border,
  },
  staffEmoji: { fontSize: 16 },
  staffName: { fontSize: 11, fontWeight: '600', color: Colors.dark },
  staffBonus: { fontSize: 11, fontWeight: '800', color: '#22C55E' },
  staffPlaceholderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  staffPlaceholder: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  actionArea: { marginTop: 8 },
  progressBg: { height: 6, backgroundColor: Colors.border, borderRadius: 3, marginVertical: 4, overflow: 'hidden' as const },
  progressFill: { height: 6, borderRadius: 3 },
  progressRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  genSection: { marginBottom: 6 },
  genLabel: { fontSize: 11, fontWeight: '700' as const, color: '#3B82F6' },
  noStaffHint: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' },
  cooldownText: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  actionBtn: {
    backgroundColor: Colors.primary, borderRadius: 8,
    paddingVertical: 8, alignItems: 'center', marginTop: 4,
  },
  actionBtnDisabled: { backgroundColor: '#CBD5E1', opacity: 0.6 },
  actionBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  stratCount: { fontSize: 12, fontWeight: '700', color: Colors.dark, marginBottom: 4 },
  boostList: { marginTop: 6, backgroundColor: Colors.background, borderRadius: 6, padding: 6 },
  boostTitle: { fontSize: 10, fontWeight: '800', color: Colors.textSecondary, marginBottom: 2 },
  boostItem: { fontSize: 10, color: Colors.dark, marginTop: 1 },
  skipBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: '#7C3AED', borderRadius: 8, paddingVertical: 6, marginTop: 4,
  },
  skipBtnSmall: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#7C3AED', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8,
  },
  skipBtnText: { color: '#FFF', fontWeight: '800', fontSize: 11 },
  skipBtnCost: { color: '#FFF', fontWeight: '700', fontSize: 11 },
  healingSection: { marginTop: 8 },
  healingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  healHint: { fontSize: 11, color: '#F59E0B', fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  /* Modals */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, paddingBottom: 30, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: Colors.dark },
  modalList: { flexGrow: 0 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.background, borderRadius: 8,
    padding: 10, marginBottom: 6,
  },
  playerRowBoosted: { opacity: 0.5 },
  playerName: { fontSize: 13, fontWeight: '700', color: Colors.dark, flex: 1 },
  playerOvr: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  sickBadge: { fontSize: 14 },
  boostedBadge: { fontSize: 11, fontWeight: '700', color: '#22C55E' },
  trainBtn: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  sickEmoji: { fontSize: 22 },
  sickInfo: { flex: 1 },
  sickLabel: { fontSize: 10, color: '#EF4444', fontWeight: '600' },
  healBtn: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  emptyHeal: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },
});
