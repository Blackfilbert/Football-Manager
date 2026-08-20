import React from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, cardShadow } from '../theme';
import { useGame } from '../context/GameContext';
import { LEAGUES } from '../constants';
import { formatMoney, formatNumber } from '../utils';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function LeaguesModal({ visible, onClose }: Props) {
  const { gameState, matchProgression } = useGame();
  const currentLeagueIdx = gameState?.leagueIndex ?? 0;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen" statusBarTranslucent>
      <View style={s.overlay}>
        <Pressable style={s.overlayTap} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>🏆 Stadium Progression</Text>
            <Pressable onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close-circle" size={28} color={Colors.textMuted} />
            </Pressable>
          </View>

          {/* Current progress summary */}
          <View style={s.summaryCard}>
            <Text style={s.summaryText}>
              {matchProgression?.leagueEmoji} {matchProgression?.leagueName} • Wins {Math.max(0, (matchProgression?.matchInLeague ?? 1) - 1)}/{matchProgression?.totalMatchesInLeague}
            </Text>
            <View style={s.summaryProgressBg}>
              <View
                style={[
                  s.summaryProgressFill,
                  { width: `${Math.round((Math.max(0, (matchProgression?.matchInLeague ?? 1) - 1) / (matchProgression?.totalMatchesInLeague ?? 10)) * 100)}%` },
                ]}
              />
            </View>
            <Text style={s.summaryStats}>
              Wins: {gameState?.matchWins ?? 0} • Losses: {gameState?.matchLosses ?? 0}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {LEAGUES?.map((league, idx) => {
              const isCurrent = idx === currentLeagueIdx;
              const isComplete = idx < currentLeagueIdx;
              const isLocked = idx > currentLeagueIdx;

              // Progress within this league
              let leagueProgress = 0;
              if (isComplete) leagueProgress = 1;
              else if (isCurrent) {
                leagueProgress = Math.max(0, (matchProgression?.matchInLeague ?? 1) - 1) / (matchProgression?.totalMatchesInLeague ?? 10);
              }

              return (
                <View key={league?.id ?? idx} style={[s.card, isCurrent && s.currentCard, isLocked && s.lockedCard]}>
                  <View style={s.cardHeader}>
                    <Text style={s.leagueEmoji}>{league?.emoji ?? '🏆'}</Text>
                    <View style={s.cardInfo}>
                      <Text style={[s.leagueName, isLocked && s.lockedText]}>{league?.name ?? 'League'}</Text>
                      <Text style={s.multiplier}>x{league?.multiplier?.toFixed?.(1) ?? '1.0'} Income • {league?.totalMatches ?? 10} matches</Text>
                    </View>
                    {isCurrent && (
                      <View style={s.currentBadge}>
                        <Text style={s.currentBadgeText}>Current</Text>
                      </View>
                    )}
                    {isComplete && <Ionicons name="checkmark-circle" size={24} color={Colors.green} />}
                    {isLocked && <Ionicons name="lock-closed" size={20} color={Colors.textMuted} />}
                  </View>

                  <Text style={[s.unlocks, isLocked && s.lockedText]}>
                    Players: {(league?.unlockedRarities ?? []).map(r => (r?.[0]?.toUpperCase?.() ?? '') + (r?.slice?.(1) ?? '')).join(', ')}
                  </Text>

                  {/* Progress bar */}
                  {(isCurrent || isComplete) && (
                    <View style={s.progressBg}>
                      <View style={[s.progressFill, { width: `${Math.round(leagueProgress * 100)}%` }]} />
                    </View>
                  )}

                  {/* Promotion bonus info */}
                  {idx > 0 && !isComplete && (
                    <Text style={s.bonusReward}>
                      Promotion bonus: {formatMoney(league?.bonusMoney ?? 0)} + {league?.bonusCrystals ?? 0}💎
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  overlayTap: { flex: 1 },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: Colors.dark },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...cardShadow,
  },
  summaryText: { fontSize: 16, fontWeight: '800', color: Colors.dark, marginBottom: Spacing.sm },
  summaryProgressBg: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  summaryProgressFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  summaryStats: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...cardShadow,
  },
  currentCard: { borderWidth: 2, borderColor: Colors.green },
  lockedCard: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  leagueEmoji: { fontSize: 28, marginRight: Spacing.md },
  cardInfo: { flex: 1 },
  leagueName: { fontSize: 16, fontWeight: '700', color: Colors.dark },
  lockedText: { color: Colors.textMuted },
  multiplier: { fontSize: 13, color: Colors.green, fontWeight: '600' },
  currentBadge: { backgroundColor: '#ECFDF5', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  currentBadgeText: { color: Colors.green, fontWeight: '700', fontSize: 11 },
  unlocks: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  progressBg: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: 6, backgroundColor: Colors.green, borderRadius: 3 },
  bonusReward: { fontSize: 11, color: Colors.warning, marginTop: 4, fontWeight: '600' },
});
