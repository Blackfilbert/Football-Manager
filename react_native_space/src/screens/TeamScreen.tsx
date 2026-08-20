import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '../context/GameContext';
import { Colors, Spacing, Radius, cardShadow } from '../theme';
import { RARITY_CONFIG, ILLNESS_TYPES } from '../constants';
import { formatMoney, formatMoneyRaw, formatNumber } from '../utils';
import { Player } from '../types';
import CurrencyIcon from '../components/CurrencyIcon';
import MiniScoreBar from '../components/MiniScoreBar';
import PlayerInfoModal, { calcSellPrice } from '../components/PlayerInfoModal';

const SCREEN_W = Dimensions.get('window').width;
const PITCH_W = Math.min(SCREEN_W - 32, 400);
const PITCH_H = PITCH_W * 1.2;

// Formation slots: each slot has a position and an x/y on pitch
const FORMATION_SLOTS: { pos: string; x: number; y: number }[] = [
  // GK (bottom)
  { pos: 'GK', x: 50, y: 90 },
  // DEF: LD, CD, CD, RD
  { pos: 'LD', x: 15, y: 70 },
  { pos: 'CD', x: 38, y: 70 },
  { pos: 'CD', x: 62, y: 70 },
  { pos: 'RD', x: 85, y: 70 },
  // MID: LM, CM, CM, RM
  { pos: 'LM', x: 15, y: 44 },
  { pos: 'CM', x: 38, y: 44 },
  { pos: 'CM', x: 62, y: 44 },
  { pos: 'RM', x: 85, y: 44 },
  // FWD: ST, ST (top)
  { pos: 'ST', x: 35, y: 16 },
  { pos: 'ST', x: 65, y: 16 },
];

// Map player to best matching formation slot, track if position matches
function assignPlayersToSlots(players: Player[]): { player: Player; x: number; y: number; inPosition: boolean; slotPos: string }[] {
  // Map players 1:1 to formation slots by startingIds order — no re-sorting
  return FORMATION_SLOTS.map((slot, i) => {
    const player = players[i];
    if (!player) return null;
    return { player, x: slot.x, y: slot.y, inPosition: player.position === slot.pos, slotPos: slot.pos };
  }).filter(Boolean) as { player: Player; x: number; y: number; inPosition: boolean; slotPos: string }[];
}

interface SwapToast {
  oldPower: number;
  newPower: number;
  oldIncome: number;
  newIncome: number;
  timestamp: number;
}

type TeamTab = 'team' | 'training';

export default function TeamScreen() {
  const router = useRouter();
  const { gameState, sellPlayer, swapPlayer, teamPower } = useGame();
  const careerPlayerId = gameState?.careerPlayer?.id ?? '';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFrom, setSelectedFrom] = useState<'starting' | 'bench' | null>(null);
  const [swapToast, setSwapToast] = useState<SwapToast | null>(null);
  const [activeTab, setActiveTab] = useState<TeamTab>('team');
  const [popupPlayerId, setPopupPlayerId] = useState<string | null>(null);
  const [infoPlayer, setInfoPlayer] = useState<Player | null>(null);
  const trainingBoosts = gameState?.trainingBoosts ?? [];

  const startingIds = useMemo(() => new Set(gameState?.startingIds ?? []), [gameState?.startingIds]);
  const allPlayers = gameState?.players ?? [];

  const startingPlayers = useMemo(() => {
    const ids = gameState?.startingIds ?? [];
    const playerMap = new Map(allPlayers.map(p => [p?.id, p]));
    return ids.map(id => playerMap.get(id)).filter(Boolean) as Player[];
  }, [allPlayers, gameState?.startingIds]);

  const benchPlayers = useMemo(() => {
    return allPlayers
      .filter(p => !startingIds.has(p?.id ?? ''))
      .sort((a, b) => (b?.overall ?? 0) - (a?.overall ?? 0));
  }, [allPlayers, startingIds]);

  // Bench players that are stronger than at least one starting player in some slot
  const strongBenchIds = useMemo(() => {
    const slots = assignPlayersToSlots(startingPlayers);
    const set = new Set<string>();
    for (const bp of benchPlayers) {
      for (const slot of slots) {
        const starter = slot.player;
        const starterEffective = slot.inPosition ? (starter?.overall ?? 0) : Math.floor((starter?.overall ?? 0) * 0.5);
        const bpInPos = (bp?.position ?? '') === slot.slotPos;
        const bpEffective = bpInPos ? (bp?.overall ?? 0) : Math.floor((bp?.overall ?? 0) * 0.5);
        if (bpEffective > starterEffective) {
          set.add(bp?.id ?? '');
          break;
        }
      }
    }
    return set;
  }, [startingPlayers, benchPlayers]);

  // Auto-hide toast
  useEffect(() => {
    if (!swapToast) return;
    const t = setTimeout(() => setSwapToast(null), 2500);
    return () => clearTimeout(t);
  }, [swapToast]);

  // Position of the selected bench player — used to highlight matching slots on pitch
  const selectedBenchPos = useMemo(() => {
    if (selectedFrom !== 'bench' || !selectedId) return null;
    const p = allPlayers.find(pl => pl?.id === selectedId);
    return p?.position ?? null;
  }, [selectedId, selectedFrom, allPlayers]);

  // Map positions to compatible slot positions for highlighting
  const highlightSlots = useMemo(() => {
    if (!selectedBenchPos) return new Set<string>();
    // Direct match + compatible positions
    return new Set([selectedBenchPos]);
  }, [selectedBenchPos]);

  /** Get effective OVR and color accounting for buffs/debuffs */
  const getEffectiveOvr = useCallback((player: Player): { ovr: number; color: string | null } => {
    const base = player?.overall ?? 0;
    let mult = 1.0;
    let hasDebuff = false;
    let hasBuff = false;
    if (player?.illness) {
      mult *= player.illness.effectiveness;
      hasDebuff = true;
    }
    const now = Date.now();
    const boost = trainingBoosts.find(b => b.playerId === player?.id && b.expiresAt > now);
    if (boost) {
      mult *= boost.multiplier;
      hasBuff = true;
    }
    const effective = Math.round(base * mult);
    // Debuff takes priority for color if both present
    const color = hasDebuff ? '#EF4444' : hasBuff ? '#16A34A' : null;
    return { ovr: effective, color };
  }, [trainingBoosts]);

  /** Get buff/debuff status icons for a player */
  const getStatusIcons = useCallback((player: Player): string[] => {
    const icons: string[] = [];
    const now = Date.now();
    // Illness debuff
    if (player?.illness) {
      const illnessInfo = ILLNESS_TYPES.find(i => i.type === player.illness?.type);
      if (illnessInfo) icons.push(illnessInfo.emoji);
    }
    // Training boost
    const hasBoost = trainingBoosts.some(b => b.playerId === player?.id && b.expiresAt > now);
    if (hasBoost) icons.push('💪');
    return icons;
  }, [trainingBoosts]);

  const handlePlayerTap = useCallback((playerId: string, from: 'starting' | 'bench') => {
    // If there's a swap in progress (selected from opposite side), do the swap
    if (selectedId && selectedFrom && selectedFrom !== from) {
      const startId = from === 'starting' ? playerId : selectedId;
      const benchId = from === 'bench' ? playerId : selectedId;
      const result = swapPlayer(startId, benchId);
      if (result) {
        setSwapToast({ ...result, timestamp: Date.now() });
      }
      setSelectedId(null);
      setSelectedFrom(null);
      setPopupPlayerId(null);
      return;
    }

    // Toggle popup for this player
    if (popupPlayerId === playerId) {
      setPopupPlayerId(null);
      setSelectedId(null);
      setSelectedFrom(null);
    } else {
      setPopupPlayerId(playerId);
      setSelectedId(playerId);
      setSelectedFrom(from);
    }
  }, [selectedId, selectedFrom, swapPlayer, popupPlayerId]);

  const renderPitchPlayer = (player: Player, pos: { x: number; y: number }, idx: number, inPosition: boolean, slotPos: string) => {
    const rarity = RARITY_CONFIG?.[player?.rarity ?? 'common'];
    const isSelected = selectedId === player?.id;
    const isSwapTarget = selectedFrom === 'bench' && selectedId !== null;
    const isCareer = player?.id === careerPlayerId;
    const isHighlighted = highlightSlots.has(slotPos);
    const showPopup = popupPlayerId === player?.id;
    const statusIcons = getStatusIcons(player);
    const { ovr: effectiveOvr, color: ovrColor } = getEffectiveOvr(player);
    const isTopRow = pos.y <= 20; // ST row — popup should appear below
    const SLOT_W = 64;
    const SLOT_H = 72;
    const pxLeft = (pos.x / 100) * PITCH_W - SLOT_W / 2;
    const pxTop = (pos.y / 100) * PITCH_H - SLOT_H / 2;

    return (
      <Pressable
        key={player?.id ?? idx}
        style={[
          s.pitchPlayer,
          { left: pxLeft, top: pxTop, width: SLOT_W, height: SLOT_H },
          isSelected && s.pitchPlayerSelected,
          isSwapTarget && !isSelected && s.pitchPlayerSwapTarget,
          isSwapTarget && isHighlighted && !isSelected && s.pitchPlayerHighlight,
        ]}
        onPress={() => handlePlayerTap(player?.id ?? '', 'starting')}
      >
        {/* Status icons above player */}
        {statusIcons.length > 0 && (
          <View style={s.statusRow}>
            {statusIcons.map((icon, i) => (
              <Text key={i} style={s.statusIcon}>{icon}</Text>
            ))}
          </View>
        )}
        {/* Popup with info button */}
        {showPopup && (
          <View style={isTopRow ? s.popupBubbleBottom : s.popupBubble}>
            <Pressable
              style={s.popupInfoBtn}
              onPress={() => { setInfoPlayer(player); setPopupPlayerId(null); }}
              hitSlop={4}
            >
              <Ionicons name="information-circle" size={16} color="#FFF" />
              <Text style={s.popupInfoText}>Info</Text>
            </Pressable>
            {benchPlayers.length > 0 && (
              <Text style={s.popupHint}>Tap bench to swap</Text>
            )}
          </View>
        )}
        {/* Slot box with required position label */}
        <View style={s.slotBox}>
          <Text style={s.slotLabel}>{slotPos}</Text>
        </View>
        <View style={[s.playerDot, { borderColor: rarity?.color ?? '#94A3B8' }]}>
          <Text style={s.playerPos}>{player?.position ?? 'CM'}</Text>
          <Text style={[s.playerOvr, ovrColor ? { color: ovrColor } : undefined]}>{effectiveOvr}</Text>
          {!inPosition && (
            <View style={s.outOfPosBadge}>
              <Text style={s.outOfPosArrow}>▼</Text>
            </View>
          )}
        </View>
        {isCareer ? (
          <View style={s.careerNameTag}>
            <Text style={s.careerStar}>⭐</Text>
            <Text style={s.careerNamePitch} numberOfLines={1}>{player?.lastName || player?.firstName || '?'}</Text>
          </View>
        ) : (
          <Text style={s.playerName} numberOfLines={1}>{player?.lastName || player?.firstName || '?'}</Text>
        )}
      </Pressable>
    );
  };

  const increased = swapToast ? swapToast.newPower > swapToast.oldPower : false;

  return (
    <View style={s.container}>
      <MiniScoreBar />
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={s.teamIdentity}>
            {gameState?.teamLogo ? (
              <Image source={{ uri: gameState.teamLogo }} style={[s.teamLogo, { borderColor: gameState?.teamColor ?? Colors.primary }]} />
            ) : (
              <View style={[s.teamLogoPlaceholder, { borderColor: gameState?.teamColor ?? Colors.primary }]}>
                <Ionicons name="shield" size={18} color={gameState?.teamColor ?? Colors.primary} />
              </View>
            )}
            <Text style={[s.headerTitle, { color: gameState?.teamColor ?? Colors.dark }]} numberOfLines={1}>{gameState?.teamName ?? 'My Team'}</Text>
          </View>
          <View style={s.balanceRow}>
            <Pressable style={s.balancePill} onPress={() => router.push('/tabs/shop')}><CurrencyIcon type="money" size={16} /><Text style={s.balanceText}>{formatMoneyRaw(gameState?.money ?? 0)}</Text></Pressable>
            <Pressable style={s.balancePill} onPress={() => router.push('/tabs/shop')}><CurrencyIcon type="diamond" size={16} /><Text style={s.balanceText}>{formatNumber(gameState?.crystals ?? 0)}</Text></Pressable>
          </View>
        </View>
        <View style={s.powerRow}>
          <Text style={s.powerLabel}>⚡ Team Power</Text>
          <Text style={s.powerValue}>{teamPower}</Text>
        </View>
        {/* Tab Switcher */}
        <View style={s.tabSwitcher}>
          <Pressable
            style={[s.tabBtn, activeTab === 'team' && s.tabBtnActive]}
            onPress={() => setActiveTab('team')}
          >
            <Text style={[s.tabBtnText, activeTab === 'team' && s.tabBtnTextActive]}>Team</Text>
          </Pressable>
          <Pressable
            style={[s.tabBtn, activeTab === 'training' && s.tabBtnActive]}
            onPress={() => setActiveTab('training')}
          >
            <Text style={[s.tabBtnText, activeTab === 'training' && s.tabBtnTextActive]}>Training</Text>
          </Pressable>
        </View>
      </View>

      {activeTab === 'training' ? (
        <View style={s.trainingPlaceholder}>
          <Ionicons name="barbell-outline" size={48} color={Colors.textMuted} />
          <Text style={s.trainingPlaceholderText}>Training coming soon</Text>
        </View>
      ) : (
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Pitch */}
        <View style={s.pitchContainer}>
          <View style={[s.pitch, { width: PITCH_W, height: PITCH_H }]}>
            {/* Pitch lines */}
            <View style={s.pitchCenter}>
              <View style={s.centerCircle} />
              <View style={s.centerLine} />
            </View>
            <View style={s.penaltyTop} />
            <View style={s.penaltyBottom} />
            <View style={s.goalTop} />
            <View style={s.goalBottom} />

            {/* Players on pitch */}
            {assignPlayersToSlots(startingPlayers).map((slot, idx) =>
              renderPitchPlayer(slot.player, { x: slot.x, y: slot.y }, idx, slot.inPosition, slot.slotPos)
            )}
          </View>

          {/* Swap toast overlay */}
          {swapToast && (
            <View style={[s.swapToast, increased ? s.swapToastUp : s.swapToastDown]}>
              <Text style={s.swapToastTitle}>
                {increased ? 'Team power increased!' : 'Team power decreased!'}
              </Text>
              <View style={s.swapToastRow}>
                <Text style={s.swapToastEmoji}>⚡</Text>
                <Text style={s.swapToastOld}>{swapToast.oldPower}</Text>
                <Text style={s.swapToastArrow}>»»</Text>
                <Text style={s.swapToastNew}>{swapToast.newPower}</Text>
              </View>

            </View>
          )}
        </View>

        {/* Selection hint */}
        {selectedId && (
          <View style={s.hintRow}>
            <Ionicons name="swap-vertical" size={16} color={Colors.primary} />
            <Text style={s.hintText}>
              {selectedFrom === 'starting'
                ? 'Tap a bench player to swap'
                : 'Tap a starting player to swap'}
            </Text>
          </View>
        )}

        {/* Bench */}
        {benchPlayers.length > 0 && (
          <View style={s.benchSection}>
            <Text style={s.benchTitle}>BENCH</Text>
            <View style={s.benchGrid}>
              {benchPlayers.map(player => {
                const rarity = RARITY_CONFIG?.[player?.rarity ?? 'common'];
                const isSelected = selectedId === player?.id;
                const isSwapTarget = selectedFrom === 'starting' && selectedId !== null;
                const isCp = player?.id === careerPlayerId;
                const statusIcons = getStatusIcons(player);
                const showPopup = popupPlayerId === player?.id;
                const { ovr: bEffOvr, color: bOvrColor } = getEffectiveOvr(player);
                return (
                  <Pressable
                    key={player?.id}
                    style={[
                      s.benchCard,
                      isCp && s.benchCardCareer,
                      isSelected && s.benchCardSelected,
                      isSwapTarget && !isSelected && s.benchCardSwapTarget,
                    ]}
                    onPress={() => handlePlayerTap(player?.id ?? '', 'bench')}
                  >
                    {/* Status icons */}
                    {statusIcons.length > 0 && (
                      <View style={s.benchStatusRow}>
                        {statusIcons.map((icon, i) => (
                          <Text key={i} style={s.benchStatusIcon}>{icon}</Text>
                        ))}
                      </View>
                    )}
                    {/* Popup */}
                    {showPopup && (
                      <View style={s.benchPopupBubble}>
                        <Pressable
                          style={s.popupInfoBtn}
                          onPress={() => { setInfoPlayer(player); setPopupPlayerId(null); }}
                          hitSlop={4}
                        >
                          <Ionicons name="information-circle" size={16} color="#FFF" />
                          <Text style={s.popupInfoText}>Info</Text>
                        </Pressable>
                      </View>
                    )}
                    <View style={[s.benchDot, { borderColor: isCp ? '#F59E0B' : (rarity?.color ?? '#94A3B8') }]}>
                      <Text style={s.benchPos}>{player?.position ?? 'CM'}</Text>
                      <Text style={[s.benchOvr, { color: bOvrColor ?? (isCp ? '#F59E0B' : (rarity?.color ?? '#94A3B8')) }]}>{bEffOvr}</Text>
                      {strongBenchIds.has(player?.id ?? '') && (
                        <View style={s.strongBenchDot} />
                      )}
                    </View>
                    {isCp ? (
                      <View style={s.careerBenchNameRow}>
                        <Text style={s.careerStar}>⭐</Text>
                        <Text style={s.careerBenchName} numberOfLines={1}>{player?.lastName || player?.firstName || '?'}</Text>
                      </View>
                    ) : (
                      <Text style={s.benchName} numberOfLines={1}>{player?.lastName || player?.firstName || '?'}</Text>
                    )}
                    <Text style={[s.benchRarity, { color: rarity?.color ?? '#94A3B8' }]}>{rarity?.label ?? 'Common'}</Text>
                    {!isCp && selectedId !== player?.id && (
                      <Pressable style={s.sellBtn} onPress={() => sellPlayer(player?.id ?? '')}>
                        <Text style={s.sellBtnText}>Sell {formatMoney(calcSellPrice(player, trainingBoosts))}</Text>
                      </Pressable>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {allPlayers.length === 0 && (
          <View style={s.emptyContainer}>
            <Text style={s.emptyEmoji}>👋</Text>
            <Text style={s.emptyText}>No players yet</Text>
            <Text style={s.emptySubtext}>Visit the Transfer Market to buy players!</Text>
          </View>
        )}
      </ScrollView>
      )}

      {/* Player Info Modal */}
      <PlayerInfoModal
        visible={!!infoPlayer}
        player={infoPlayer}
        trainingBoosts={trainingBoosts}
        onClose={() => setInfoPlayer(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: Platform.OS === 'ios' ? 44 : 28 },
  header: {
    backgroundColor: Colors.card,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    ...(Platform.OS === 'android' ? { elevation: 4 } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  teamIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  teamLogo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
  },
  teamLogoPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.dark },
  balanceRow: { flexDirection: 'row', gap: 8 },
  balancePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1FCFF', borderRadius: 8, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)', paddingHorizontal: 10, paddingVertical: 4, gap: 4 },
  balanceText: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  powerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  powerLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  powerValue: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Pitch
  pitchContainer: { position: 'relative', alignItems: 'center', padding: Spacing.lg },
  pitch: {
    backgroundColor: '#2D8B4E',
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
    position: 'relative',
  },
  pitchCenter: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -1 }],
  },
  centerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  centerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    transform: [{ translateY: -30 }],
  },
  penaltyTop: {
    position: 'absolute',
    top: 0,
    left: '25%',
    width: '50%',
    height: '15%',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  penaltyBottom: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    width: '50%',
    height: '15%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  goalTop: {
    position: 'absolute',
    top: 0,
    left: '37%',
    width: '26%',
    height: '5%',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  goalBottom: {
    position: 'absolute',
    bottom: 0,
    left: '37%',
    width: '26%',
    height: '5%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // Pitch players
  pitchPlayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pitchPlayerSelected: {
    transform: [{ scale: 1.15 }],
    zIndex: 10,
  },
  pitchPlayerSwapTarget: {
    opacity: 0.5,
  },
  pitchPlayerHighlight: {
    opacity: 1,
    backgroundColor: 'rgba(250,204,21,0.3)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FACC15',
  },
  slotBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  slotLabel: {
    position: 'absolute',
    top: 2,
    left: 4,
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  playerDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: { elevation: 4 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
    }),
  },
  playerPos: { fontSize: 8, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.5 },
  playerOvr: { fontSize: 14, fontWeight: '800', color: Colors.dark, marginTop: -1 },
  outOfPosBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfPosArrow: { fontSize: 8, color: '#FFF', fontWeight: '800', marginTop: -1 },
  strongBenchDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  playerName: { fontSize: 9, fontWeight: '700', color: '#FFF', marginTop: 2, textAlign: 'center' },
  careerNameTag: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2, backgroundColor: 'rgba(245,158,11,0.25)', borderRadius: 6, paddingHorizontal: 3, paddingVertical: 1 },
  careerStar: { fontSize: 8 },
  careerNamePitch: { fontSize: 9, fontWeight: '900', color: '#FDE68A', marginLeft: 2, textAlign: 'center' },

  // Swap toast
  swapToast: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '42%',
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 20,
  },
  swapToastUp: {
    backgroundColor: 'rgba(16, 185, 129, 0.92)',
  },
  swapToastDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
  },
  swapToastTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  swapToastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  swapToastEmoji: { fontSize: 20 },
  swapToastOld: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  swapToastArrow: { fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.7)' },
  swapToastNew: { fontSize: 22, fontWeight: '800', color: '#FFF' },

  // Hint
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginHorizontal: Spacing.lg,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  hintText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // Bench
  benchSection: {
    paddingHorizontal: Spacing.lg,
  },
  benchTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  benchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  benchCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    width: (SCREEN_W - 64) / 3,
    ...cardShadow,
  },
  benchCardSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(59,130,246,0.05)',
  },
  benchCardSwapTarget: {
    opacity: 0.6,
  },
  benchDot: {
    width: 42,
    height: 46,
    borderRadius: 21,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    marginBottom: 4,
    paddingVertical: 2,
  },
  benchPos: { fontSize: 8, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.5 },
  benchOvr: { fontSize: 15, fontWeight: '800', marginTop: -1 },
  benchName: { fontSize: 11, fontWeight: '700', color: Colors.dark, textAlign: 'center' },
  benchCardCareer: { borderWidth: 2, borderColor: '#F59E0B' },
  careerBenchNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  careerBenchName: { fontSize: 11, fontWeight: '900', color: '#B45309' },
  benchRarity: { fontSize: 9, fontWeight: '700', marginTop: 1 },
  sellBtn: {
    backgroundColor: Colors.danger,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  sellBtnText: { fontSize: 9, fontWeight: '700', color: '#FFF' },

  // Empty
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.dark },
  emptySubtext: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },

  // Tab Switcher
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    ...cardShadow,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: Colors.dark,
  },

  // Training placeholder
  trainingPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  trainingPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textMuted,
  },

  // Status icons (buffs/debuffs above pitch players)
  statusRow: {
    position: 'absolute',
    top: -14,
    flexDirection: 'row',
    gap: 1,
    zIndex: 15,
  },
  statusIcon: {
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    overflow: 'hidden',
    paddingHorizontal: 2,
  },

  // Bench status icons
  benchStatusRow: {
    position: 'absolute',
    top: -6,
    right: -4,
    flexDirection: 'row',
    gap: 2,
    zIndex: 5,
  },
  benchStatusIcon: {
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 2,
  },

  // Popup bubble (pitch)
  popupBubble: {
    position: 'absolute',
    top: -42,
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    zIndex: 30,
    minWidth: 70,
  },
  popupBubbleBottom: {
    position: 'absolute',
    bottom: -46,
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    zIndex: 30,
    minWidth: 70,
  },
  benchPopupBubble: {
    position: 'absolute',
    top: -32,
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    zIndex: 30,
  },
  popupInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  popupInfoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  popupHint: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
});