import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const IMG_CRYSTALS = require('../../assets/images/currency_diamond.png');
const IMG_MONEY = require('../../assets/images/currency_money.png');
const IMG_KEY = require('../../assets/images/key_gold.png');
const IMG_TROPHY = require('../../assets/images/trophy_icon.png');

const DAILY_REWARDS = [
  { day: 1, type: 'crystals' as const, amount: 10, label: '10 Crystals', emoji: false },
  { day: 2, type: 'money' as const, amount: 50_000, label: '50,000 Money', emoji: false },
  { day: 3, type: 'cups' as const, amount: 1, label: '1 Cup', emoji: true },
  { day: 4, type: 'keys' as const, amount: 5, label: '5 Keys', emoji: false },
  { day: 5, type: 'money' as const, amount: 100_000, label: '100,000 Money', emoji: false },
  { day: 6, type: 'crystals' as const, amount: 30, label: '30 Crystals', emoji: false },
  { day: 7, type: 'cups' as const, amount: 5, label: '5 Cups', emoji: true },
];

export { DAILY_REWARDS };

function RewardIcon({ type, size }: { type: string; size: number }) {
  if (type === 'cups') return <Image source={IMG_TROPHY} style={{ width: size, height: size, resizeMode: 'contain' }} />;
  const src = type === 'crystals' ? IMG_CRYSTALS : type === 'keys' ? IMG_KEY : IMG_MONEY;
  return <Image source={src} style={{ width: size, height: size, resizeMode: 'contain' }} />;
}

interface Props {
  visible: boolean;
  currentDay: number;
  claimedDays: number;
  canClaim: boolean;
  onClaim: () => void;
  onClose: () => void;
}

export default function DailyRewardsModal({ visible, currentDay, claimedDays, canClaim, onClaim, onClose }: Props) {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>
          <Pressable style={s.closeBtn} onPress={onClose} hitSlop={14}>
            <Ionicons name="close" size={24} color="#334155" />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
            <Text style={s.title}>DAILY REWARDS</Text>
            <Text style={s.subtitle}>Log in every day to claim rewards</Text>
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divIcon}>{'\u26bd'}</Text>
              <View style={s.divLine} />
            </View>

            {/* Days 1-6 grid */}
            <View style={s.grid}>
              {DAILY_REWARDS.slice(0, 6).map((r) => {
                const claimed = r.day <= claimedDays;
                const isToday = r.day === currentDay;
                return (
                  <View key={r.day} style={[
                    s.dayCard,
                    claimed && s.dayCardClaimed,
                    isToday && !claimed && s.dayCardToday,
                  ]}>
                    <LinearGradient
                      colors={['#1E3A8A', '#2563EB'] as const}
                      style={s.dayBadge}
                    >
                      <Text style={s.dayBadgeText}>DAY {r.day}</Text>
                    </LinearGradient>
                    <View style={s.rewardIconWrap}>
                      <RewardIcon type={r.type} size={36} />
                    </View>
                    <Text style={[s.rewardLabel, claimed && s.rewardLabelClaimed]}>{r.label}</Text>
                    {claimed && (
                      <View style={s.checkOverlay}>
                        <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Day 7 */}
            {(() => {
              const r7 = DAILY_REWARDS[6]!;
              const claimed7 = 7 <= claimedDays;
              const isToday7 = currentDay === 7;
              return (
                <LinearGradient
                  colors={['#DBEAFE', '#93C5FD'] as const}
                  style={[
                    s.day7Card,
                    isToday7 && !claimed7 && s.dayCardToday,
                    claimed7 && s.dayCardClaimed,
                  ]}
                >
                  <LinearGradient
                    colors={['#1E3A8A', '#2563EB'] as const}
                    style={[s.dayBadge, { alignSelf: 'center' }]}
                  >
                    <Text style={s.dayBadgeText}>DAY 7</Text>
                  </LinearGradient>
                  <Text style={s.day7Emoji}>{'\ud83c\udfc6'}</Text>
                  <Text style={s.day7Label}>{r7.label}</Text>
                  {claimed7 && (
                    <View style={s.checkOverlay}>
                      <Ionicons name="checkmark-circle" size={36} color="#22C55E" />
                    </View>
                  )}
                </LinearGradient>
              );
            })()}

            {/* Progress bar */}
            <View style={s.progressRow}>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const done = d <= claimedDays;
                const isToday = d === currentDay;
                return (
                  <React.Fragment key={d}>
                    {d > 1 && <View style={[s.progressLine, done && s.progressLineDone]} />}
                    <View style={[
                      s.progressDot,
                      done && s.progressDotDone,
                      isToday && !done && s.progressDotToday,
                    ]}>
                      <Text style={[s.progressNum, done && s.progressNumDone]}>
                        {d === 7 ? '\ud83c\udfc6' : d}
                      </Text>
                      {done && <Ionicons name="checkmark" size={10} color="#22C55E" style={s.progressCheck} />}
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          </ScrollView>

          <Pressable
            style={[s.claimWrapper, !canClaim && { opacity: 0.5 }]}
            onPress={canClaim ? onClaim : undefined}
            disabled={!canClaim}
          >
            <LinearGradient colors={['#2563EB', '#1D4ED8'] as const} style={s.claimBtn}>
              <Text style={s.claimText}>{canClaim ? 'CLAIM' : 'CLAIMED'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#F1F5F9', borderRadius: 16, width: '100%', maxHeight: '88%', borderWidth: 2, borderColor: '#1E3A8A', overflow: 'hidden' },
  scroll: { padding: 16, paddingBottom: 4 },
  closeBtn: { position: 'absolute', top: 12, right: 12, zIndex: 10 },
  title: { fontSize: 22, fontWeight: '900', color: '#0F172A', textAlign: 'center', fontStyle: 'italic', marginTop: 4 },
  subtitle: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 2 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, gap: 8 },
  divLine: { flex: 1, height: 1, backgroundColor: '#CBD5E1' },
  divIcon: { fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  dayCard: {
    width: '30%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  dayCardClaimed: { opacity: 0.5 },
  dayCardToday: { borderColor: '#2563EB', borderWidth: 2, backgroundColor: '#EFF6FF' },
  dayBadge: { position: 'absolute', top: 0, left: 0, right: 0, paddingVertical: 3, alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  dayBadgeText: { fontSize: 9, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
  rewardIconWrap: { marginTop: 6, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  rewardLabel: { fontSize: 10, fontWeight: '700', color: '#0F172A', marginTop: 4, textAlign: 'center' },
  rewardLabelClaimed: { color: '#94A3B8' },
  checkOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  day7Card: {
    marginTop: 8,
    borderRadius: 14,
    paddingTop: 22,
    paddingBottom: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  day7Emoji: { fontSize: 30 },
  day7Label: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 10 },
  progressLine: { width: 14, height: 3, backgroundColor: '#CBD5E1', borderRadius: 2 },
  progressLineDone: { backgroundColor: '#2563EB' },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotDone: { borderColor: '#2563EB', backgroundColor: '#DBEAFE' },
  progressDotToday: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  progressNum: { fontSize: 9, fontWeight: '800', color: '#94A3B8' },
  progressNumDone: { color: '#2563EB' },
  progressCheck: { position: 'absolute', bottom: -6 },
  claimWrapper: { margin: 12, marginTop: 6 },
  claimBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  claimText: { fontSize: 18, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
});
