/* ── VGP Players Screen: Diamond 5v5 squad selection ── */
import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../context/GameContext';
import { useValorGP } from './context';
import { RARITY_CONFIG } from '../constants';
import { Player, Position } from '../types';

const SW = Dimensions.get('window').width;
const SH = Dimensions.get('window').height;
const PITCH_W = Math.min(SW - 48, 340);
const PITCH_H = PITCH_W * 1.35;

const ROSE = 'rgba(232,180,180,';
const ROSE_TEXT = ROSE + '0.85)';
const ROSE_DIM = ROSE + '0.45)';

// Diamond formation: GK, CD, LM, RM, ST
// Positions as % of pitch
const VGP_SLOTS: { pos: Position; x: number; y: number; label: string }[] = [
  { pos: 'GK', x: 50, y: 88, label: 'GK' },
  { pos: 'CD', x: 50, y: 62, label: 'CD' },
  { pos: 'LM', x: 15, y: 42, label: 'LM' },
  { pos: 'RM', x: 85, y: 42, label: 'RM' },
  { pos: 'ST', x: 50, y: 14, label: 'ST' },
];

interface Props {
  onBack: () => void;
}

export default function VGPPlayersScreen({ onBack }: Props) {
  const { gameState } = useGame();
  const { state, setSquadIds, vgpPower: contextVgpPower } = useValorGP();
  const allPlayers = gameState?.players ?? [];
  const startingIds = gameState?.startingIds ?? [];

  // Current squad IDs — validate they still exist
  const squadIds = useMemo(() => {
    const ids = state.squadIds ?? [];
    const playerIdSet = new Set(allPlayers.map(p => p?.id));
    return ids.map(id => playerIdSet.has(id) ? id : '');
  }, [state.squadIds, allPlayers]);

  // Auto-fill empty slots from starting lineup
  const effectiveSquad = useMemo(() => {
    const result = [...squadIds];
    // Ensure 5 slots
    while (result.length < 5) result.push('');
    const usedIds = new Set(result.filter(Boolean));

    // Fill empty slots from starting lineup, preferring position-matched players
    for (let i = 0; i < 5; i++) {
      if (result[i]) continue;
      const slot = VGP_SLOTS[i];
      // Find best available player for this position
      const candidates = allPlayers
        .filter(p => !usedIds.has(p?.id ?? '') && p?.position === slot.pos)
        .sort((a, b) => (b?.overall ?? 0) - (a?.overall ?? 0));
      if (candidates.length > 0) {
        result[i] = candidates[0]?.id ?? '';
        usedIds.add(result[i]);
      }
    }
    // Fill remaining with strongest available
    for (let i = 0; i < 5; i++) {
      if (result[i]) continue;
      const candidate = allPlayers
        .filter(p => !usedIds.has(p?.id ?? ''))
        .sort((a, b) => (b?.overall ?? 0) - (a?.overall ?? 0))[0];
      if (candidate) {
        result[i] = candidate?.id ?? '';
        usedIds.add(result[i]);
      }
    }
    return result;
  }, [squadIds, allPlayers]);

  const [localSquad, setLocalSquad] = useState<string[]>(effectiveSquad);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFrom, setSelectedFrom] = useState<'pitch' | 'bench' | null>(null);

  const playerMap = useMemo(() => {
    const m = new Map<string, Player>();
    allPlayers.forEach(p => { if (p?.id) m.set(p.id, p); });
    return m;
  }, [allPlayers]);

  // Calculate upgrade power bonus
  const upgradePower = useMemo(() => {
    let total = 0;
    const UPGRADES = require('../constants').UPGRADES as { id: string; type?: string; powerPerClick?: number }[];
    for (const u of UPGRADES ?? []) {
      if (u?.type !== 'power') continue;
      const lvl = gameState?.upgrades?.[u?.id ?? ''] ?? 0;
      total += (u?.powerPerClick ?? 1) * lvl;
    }
    return total;
  }, [gameState?.upgrades]);

  // Calculate VGP squad power (players + upgrades)
  const vgpPower = useMemo(() => {
    let total = 0;
    localSquad.forEach((id, i) => {
      const p = playerMap.get(id);
      if (!p) return;
      const slot = VGP_SLOTS[i];
      const inPos = p.position === slot.pos;
      total += Math.floor(p.overall * (inPos ? 1 : 0.5));
    });
    return Math.max(total + upgradePower, 10);
  }, [localSquad, playerMap, upgradePower]);

  // Bench: all players not in localSquad
  const benchPlayers = useMemo(() => {
    const squadSet = new Set(localSquad);
    return allPlayers
      .filter(p => !squadSet.has(p?.id ?? ''))
      .sort((a, b) => (b?.overall ?? 0) - (a?.overall ?? 0));
  }, [allPlayers, localSquad]);

  // When a bench player is selected, highlight matching pitch slots
  const selectedBenchPos = useMemo(() => {
    if (selectedFrom !== 'bench' || !selectedId) return null;
    const p = allPlayers.find(pl => pl?.id === selectedId);
    return p?.position ?? null;
  }, [selectedId, selectedFrom, allPlayers]);

  const highlightSlots = useMemo(() => {
    if (!selectedBenchPos) return new Set<string>();
    return new Set([selectedBenchPos]);
  }, [selectedBenchPos]);

  const handlePlayerTap = useCallback((playerId: string, from: 'pitch' | 'bench') => {
    if (selectedId && selectedFrom && selectedFrom !== from) {
      // Cross-tap: swap!
      const pitchId = from === 'pitch' ? playerId : selectedId;
      const benchId = from === 'bench' ? playerId : selectedId;
      const slotIdx = localSquad.indexOf(pitchId);
      if (slotIdx >= 0) {
        const newSquad = [...localSquad];
        newSquad[slotIdx] = benchId;
        setLocalSquad(newSquad);
        setSquadIds(newSquad);
      }
      setSelectedId(null);
      setSelectedFrom(null);
    } else if (selectedId === playerId) {
      // Deselect
      setSelectedId(null);
      setSelectedFrom(null);
    } else {
      // Select
      setSelectedId(playerId);
      setSelectedFrom(from);
    }
  }, [selectedId, selectedFrom, localSquad, setSquadIds]);

  const renderSlotPlayer = (slotIdx: number) => {
    const slot = VGP_SLOTS[slotIdx];
    const playerId = localSquad[slotIdx] ?? '';
    const player = playerMap.get(playerId);
    const isSelected = selectedId === playerId && selectedFrom === 'pitch';
    const isSwapTarget = selectedFrom === 'bench' && selectedId !== null;
    const isHighlighted = highlightSlots.has(slot.pos);
    const inPos = player ? player.position === slot.pos : false;
    const rarity = player ? RARITY_CONFIG?.[player.rarity ?? 'common'] : null;
    const SLOT_W = 64;
    const SLOT_H = 72;
    const pxLeft = (slot.x / 100) * PITCH_W - SLOT_W / 2;
    const pxTop = (slot.y / 100) * PITCH_H - SLOT_H / 2;

    return (
      <Pressable
        key={slotIdx}
        style={[
          ms.pitchSlot,
          { left: pxLeft, top: pxTop, width: SLOT_W, height: SLOT_H },
          isSelected && ms.pitchSlotSelected,
          isSwapTarget && !isSelected && ms.pitchSlotSwapTarget,
          isSwapTarget && isHighlighted && !isSelected && ms.pitchSlotHighlight,
        ]}
        onPress={() => player && handlePlayerTap(playerId, 'pitch')}
      >
        {/* Slot bounding box — matches My Team style */}
        <View style={ms.slotBox}>
          <Text style={ms.slotBoxLabel}>{slot.label}</Text>
        </View>
        {player ? (
          <>
            <View style={[ms.playerCircle, { borderColor: rarity?.color ?? '#94A3B8' }]}>
              <Text style={ms.playerPos}>{player.position}</Text>
              <Text style={ms.playerOvr}>{player.overall}</Text>
              {!inPos && (
                <View style={ms.outOfPosBadge}>
                  <Text style={ms.outOfPosText}>▼</Text>
                </View>
              )}
            </View>
            <Text style={ms.playerName} numberOfLines={1}>
              {player.lastName || player.firstName || '?'}
            </Text>
          </>
        ) : (
          <View style={ms.emptySlot}>
            <Ionicons name="add-circle-outline" size={24} color="rgba(255,255,255,0.3)" />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={ms.container}>
      {/* Background image — same as hub */}
      <Image
        source={require('../../assets/images/vgp_bg.png')}
        style={ms.bgImage}
        resizeMode="cover"
      />
      <View style={ms.bgOverlay} />

      {/* Close button (top-right, same as VGP hub) */}
      <Pressable onPress={onBack} style={ms.closeBtn} hitSlop={14}>
        <Ionicons name="close" size={24} color={ROSE_DIM} />
      </Pressable>

      {/* Header */}
      <View style={ms.header}>
        <Text style={ms.headerTitle}>Team</Text>
        <View style={ms.powerRow}>
          <Text style={ms.powerIcon}>⚡</Text>
          <Text style={ms.powerValue}>{vgpPower}</Text>
        </View>
      </View>

      <ScrollView style={ms.scroll} contentContainerStyle={ms.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Pitch */}
        <View style={[ms.pitchWrap, { width: PITCH_W, height: PITCH_H }]}>
          <View style={ms.pitch}>
            {/* Field markings */}
            <View style={ms.centerLine} />
            <View style={ms.centerCircle} />
            <View style={ms.penaltyTop} />
            <View style={ms.penaltyBottom} />
            <View style={ms.goalTop} />
            <View style={ms.goalBottom} />

            {/* Slots */}
            {VGP_SLOTS.map((_, i) => renderSlotPlayer(i))}
          </View>
        </View>

        {/* Hint */}
        {selectedId && (
          <View style={ms.hintRow}>
            <Ionicons name="swap-vertical" size={14} color="#F59E0B" />
            <Text style={ms.hintText}>
              {selectedFrom === 'pitch'
                ? 'Tap a bench player to swap'
                : 'Tap a starting player to swap'}
            </Text>
          </View>
        )}

        {/* Bench */}
        {benchPlayers.length > 0 && (
          <View style={ms.benchSection}>
            <Text style={ms.benchTitle}>AVAILABLE PLAYERS</Text>
            <View style={ms.benchGrid}>
              {benchPlayers.map(player => {
                const rarity = RARITY_CONFIG?.[player?.rarity ?? 'common'];
                const isSel = selectedId === player?.id && selectedFrom === 'bench';
                const isSwapTarget = selectedFrom === 'pitch' && selectedId !== null;
                return (
                  <Pressable
                    key={player?.id}
                    style={[
                      ms.benchCard,
                      isSel && ms.benchCardSelected,
                      isSwapTarget && !isSel && ms.benchCardSwapTarget,
                    ]}
                    onPress={() => handlePlayerTap(player?.id ?? '', 'bench')}
                  >
                    <View style={[ms.benchDot, { borderColor: rarity?.color ?? '#94A3B8' }]}>
                      <Text style={ms.benchPos}>{player?.position ?? 'CM'}</Text>
                      <Text style={[ms.benchOvr, { color: rarity?.color ?? '#94A3B8' }]}>
                        {player?.overall ?? 0}
                      </Text>
                    </View>
                    <Text style={ms.benchName} numberOfLines={1}>
                      {player?.lastName || player?.firstName || '?'}
                    </Text>
                    <Text style={[ms.benchRarity, { color: rarity?.color ?? '#94A3B8' }]}>
                      {rarity?.label ?? 'Common'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const ms = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  bgImage: { position: 'absolute', top: 0, left: 0, width: SW, height: SH },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,10,18,0.55)' },

  closeBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(232,180,180,0.08)',
    borderWidth: 1, borderColor: 'rgba(232,180,180,0.12)',
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 34, paddingBottom: 6,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  powerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
  },
  powerIcon: { fontSize: 14 },
  powerValue: { fontSize: 14, fontWeight: '800', color: '#F59E0B' },

  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center', paddingBottom: 40 },

  pitchWrap: {
    borderRadius: 10, overflow: 'hidden',
    marginTop: 10,
  },
  pitch: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    position: 'relative',
  },
  centerLine: {
    position: 'absolute', top: '50%', left: 0, right: 0, height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  centerCircle: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    top: '50%', left: '50%', marginTop: -30, marginLeft: -30,
  },
  penaltyTop: {
    position: 'absolute', top: 0, left: '50%', marginLeft: -50,
    width: 100, height: 40,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', borderTopWidth: 0,
  },
  penaltyBottom: {
    position: 'absolute', bottom: 0, left: '50%', marginLeft: -50,
    width: 100, height: 40,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', borderBottomWidth: 0,
  },
  goalTop: {
    position: 'absolute', top: -2, left: '50%', marginLeft: -22,
    width: 44, height: 5,
    backgroundColor: 'rgba(255,255,255,0.35)', borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
  },
  goalBottom: {
    position: 'absolute', bottom: -2, left: '50%', marginLeft: -22,
    width: 44, height: 5,
    backgroundColor: 'rgba(255,255,255,0.35)', borderTopLeftRadius: 4, borderTopRightRadius: 4,
  },

  // Pitch player slots — matching My Team slotBox style
  pitchSlot: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
  },
  pitchSlotSelected: {
    transform: [{ scale: 1.15 }],
    zIndex: 10,
  },
  pitchSlotSwapTarget: {
    opacity: 0.5,
  },
  pitchSlotHighlight: {
    opacity: 1,
    backgroundColor: 'rgba(250,204,21,0.3)',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FACC15',
  },
  slotBox: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 8, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  slotBoxLabel: {
    position: 'absolute', top: 2, left: 4,
    fontSize: 8, fontWeight: '800',
    color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5,
  },
  playerCircle: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 2.5, backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
      android: { elevation: 4 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
    }),
  },
  playerPos: { fontSize: 8, fontWeight: '800', color: '#6B7280', letterSpacing: 0.5 },
  playerOvr: { fontSize: 14, fontWeight: '800', color: '#111', marginTop: -1 },
  outOfPosBadge: {
    position: 'absolute', top: -4, right: -6,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
  },
  outOfPosText: { fontSize: 8, color: '#FFF', fontWeight: '800', marginTop: -1 },
  playerName: {
    fontSize: 9, fontWeight: '700', color: '#FFF', marginTop: 2, textAlign: 'center',
  },
  emptySlot: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },

  // Hint
  hintRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingHorizontal: 16,
  },
  hintText: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },

  // Bench
  benchSection: { width: '100%', paddingHorizontal: 16, marginTop: 16 },
  benchTitle: {
    fontSize: 12, fontWeight: '800', color: ROSE_DIM,
    letterSpacing: 1, marginBottom: 8,
  },
  benchGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  benchCard: {
    width: (SW - 56) / 4, alignItems: 'center', paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  benchCardSelected: {
    borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.15)',
    transform: [{ scale: 1.05 }],
  },
  benchCardSwapTarget: {
    opacity: 0.6,
  },
  benchDot: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 3,
  },
  benchPos: { fontSize: 7, fontWeight: '700', color: '#374151' },
  benchOvr: { fontSize: 13, fontWeight: '900' },
  benchName: {
    fontSize: 8, fontWeight: '600', color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  benchRarity: { fontSize: 7, fontWeight: '700', textAlign: 'center', marginTop: 1 },
});
