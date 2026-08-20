import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, cardShadow } from '../theme';
import { useGame } from '../context/GameContext';
import { formatMoney, formatNumber } from '../utils';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: Props) {
  const { gameState, claimDailyReward, teamPower, matchProgression } = useGame();
  const today = new Date().toISOString().split('T')[0] ?? '';
  const dailyClaimed = gameState?.lastLoginDate === today;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen" statusBarTranslucent>
      <View style={s.overlay}>
        <Pressable style={s.overlayTap} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>👤 Profile</Text>
            <Pressable onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close-circle" size={28} color={Colors.textMuted} />
            </Pressable>
          </View>

          {/* Stats */}
          <View style={s.statsGrid}>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Total Earned</Text>
              <Text style={s.statValue}>{formatMoney(gameState?.totalEarned ?? 0)}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Record</Text>
              <Text style={s.statValue}>{gameState?.matchWins ?? 0}W / {gameState?.matchLosses ?? 0}L</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Stadium</Text>
              <Text style={s.statValue}>{matchProgression?.leagueEmoji} {matchProgression?.leagueName ?? 'Street Pitch'}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Team Power</Text>
              <Text style={s.statValue}>{formatNumber(teamPower ?? 0)}</Text>
            </View>
          </View>

          {/* Daily Reward */}
          <View style={s.rewardCard}>
            <Text style={s.rewardTitle}>🎁 Daily Login Reward</Text>
            {dailyClaimed ? (
              <Text style={s.claimedText}>✅ Claimed today!</Text>
            ) : (
              <Pressable style={s.claimBtn} onPress={claimDailyReward}>
                <Text style={s.claimBtnText}>Claim 10 💎</Text>
              </Pressable>
            )}
          </View>
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
    maxHeight: '80%',
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: Colors.dark },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  statCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    width: '48%',
    flexGrow: 1,
    ...cardShadow,
  },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500', marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.dark },
  rewardCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...cardShadow,
  },
  rewardTitle: { fontSize: 15, fontWeight: '700', color: Colors.dark, marginBottom: Spacing.sm },
  claimedText: { fontSize: 14, color: Colors.green, fontWeight: '600' },
  claimBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  claimBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
