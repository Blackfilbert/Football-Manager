import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SeasonCompleteInfo } from '../types';
import { LEAGUES } from '../constants';
import { formatMoney } from '../utils';
import FlagIcon from './FlagIcon';

const IMG_MONEY = require('../../assets/images/currency_money.png');
const IMG_TROPHY = require('../../assets/images/trophy_icon.png');

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0] || 'th';
}

interface Props {
  info: SeasonCompleteInfo;
  onDismiss: () => void;
  onConfirmPromotion: () => void;
}

export default function SeasonCompleteModal({ info, onDismiss, onConfirmPromotion }: Props) {
  const isGood = info.position <= 3;
  const nextStadium = LEAGUES[info.newLeagueIndex];
  const statusText = info.promoted
    ? `PROMOTION AVAILABLE → ${nextStadium?.name?.toUpperCase() ?? 'NEXT STADIUM'}`
    : `STAY IN ${info.leagueName.toUpperCase()}`;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.card}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
            {/* Header */}
            <View style={s.headerRow}>
              <Text style={s.title}>SEASON COMPLETE</Text>
              <Pressable onPress={onDismiss} hitSlop={14}>
                <Ionicons name="close" size={24} color="#334155" />
              </Pressable>
            </View>
            <Text style={s.subtitle}>{info.leagueName} finished</Text>

            {/* Hero banner */}
            <LinearGradient
              colors={isGood ? ['#1E3A8A', '#2563EB'] as const : ['#374151', '#6B7280'] as const}
              style={s.banner}
            >
              <View style={s.bannerContent}>
                <View style={s.placeRow}>
                  <Text style={s.placeNum}>{info.position}</Text>
                  <Text style={s.placeSuffix}>{ordinalSuffix(info.position)}</Text>
                </View>
                <Text style={s.placeLabel}>PLACE</Text>
                <View style={[s.statusBadge, info.promoted && s.statusPromo]}>
                  <Text style={s.statusText}>{statusText}</Text>
                </View>
                {info.promoted && (
                  <View style={s.multiplierRow}>
                    <View style={s.multiplierInner}>
                      <Image source={IMG_MONEY} style={s.multiplierIcon} />
                      <Text style={s.multiplierText}>
                        ×{LEAGUES[info.leagueIndex]?.multiplier ?? 1} → ×{LEAGUES[info.newLeagueIndex]?.multiplier ?? 1}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </LinearGradient>

            {/* Stadium earnings summary */}
            <View style={s.rewardHeader}>
              <View style={s.rewardLine} />
              <Text style={s.rewardTitle}>STADIUM SUMMARY</Text>
              <View style={s.rewardLine} />
            </View>
            <View style={s.rewardsRow}>
              <View style={s.rewardBox}>
                <Image source={IMG_MONEY} style={s.rewardIcon} resizeMode="contain" />
                <Text style={s.rewardVal}>{formatMoney(info.stadiumEarnings ?? 0)}</Text>
                <Text style={s.rewardLbl}>TOTAL EARNED</Text>
              </View>
              <View style={s.rewardBox}>
                <Image source={IMG_TROPHY} style={s.rewardIcon} resizeMode="contain" />
                <Text style={s.rewardVal}>+{info.rewardTrophies}</Text>
                <Text style={s.rewardLbl}>TROPHIES</Text>
              </View>
            </View>

            {/* Promotion warning */}
            {info.promoted && (
              <View style={s.promoWarning}>
                <Text style={s.promoWarningTitle}>⚠️ PROMOTION DETAILS</Text>
                <Text style={s.promoWarningLine}>🔄 Income upgrades will reset</Text>
                <Text style={s.promoWarningLine}>💰 Money resets to $0</Text>
                <Text style={s.promoWarningLine}>⚽ All your players are kept!</Text>
                <Text style={s.promoWarningLine}>🏆 Trophies are kept</Text>
                <Text style={s.promoWarningHint}>You can dismiss this and promote later from the Stadiums list</Text>
              </View>
            )}

            {/* Stadium Roadmap */}
            <View style={s.rewardHeader}>
              <View style={s.rewardLine} />
              <Text style={s.rewardTitle}>STADIUM ROADMAP</Text>
              <View style={s.rewardLine} />
            </View>
            {LEAGUES.filter((_, i) => i >= Math.max(0, info.newLeagueIndex - 1) && i <= info.newLeagueIndex + 1).reverse().map((lg) => {
              const i = lg.id;
              const isCurrent = i === info.newLeagueIndex;
              const isCompleted = i < info.newLeagueIndex;
              const isNext = i > info.newLeagueIndex;
              return (
                <View key={i} style={[
                  s.roadmapRow,
                  isCurrent && s.roadmapCurrent,
                ]}>
                  <FlagIcon code={lg.flag ?? ''} size={18} />
                  <View style={s.roadmapInfo}>
                    <Text style={[s.roadmapName, isNext && s.roadmapLocked]}>{lg.name}</Text>
                    <Text style={s.roadmapMeta}>
                      💲×{lg.multiplier}   👥 {lg.teamCount}   ⚽ {lg.totalMatches}
                    </Text>
                  </View>
                  {isCompleted && (
                    <View style={s.completedBadge}>
                      <Text style={s.completedTxt}>DONE</Text>
                      <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                    </View>
                  )}
                  {isCurrent && (
                    <View style={s.currentBadge}>
                      <Text style={s.currentTxt}>{info.promoted ? 'NEXT' : 'CURRENT'}</Text>
                    </View>
                  )}
                  {isNext && <Ionicons name="lock-closed" size={18} color="#CBD5E1" />}
                </View>
              );
            })}

            {/* Stats row */}
            <View style={s.statsRow}>
              <View style={s.statCell}>
                <Ionicons name="people" size={18} color="#2563EB" />
                <Text style={s.statLbl}>TEAMS</Text>
                <Text style={s.statVal}>{info.teamCount}</Text>
              </View>
              <View style={[s.statCell, s.statBorder]}>
                <Ionicons name="football" size={18} color="#2563EB" />
                <Text style={s.statLbl}>MATCHES</Text>
                <Text style={s.statVal}>{info.totalMatches}</Text>
              </View>
              <View style={s.statCell}>
                <Ionicons name="podium" size={18} color="#2563EB" />
                <Text style={s.statLbl}>POSITION</Text>
                <Text style={s.statVal}>{info.position}</Text>
              </View>
            </View>

          </ScrollView>

          {/* Action buttons */}
          <View style={s.btnArea}>
            {info.promoted && (
              <Pressable style={s.promoteBtn} onPress={onConfirmPromotion}>
                <LinearGradient colors={['#16A34A', '#15803D'] as const} style={s.continueBg}>
                  <Text style={s.continueTxt}>⬆️ CONFIRM PROMOTION</Text>
                </LinearGradient>
              </Pressable>
            )}
            <Pressable style={s.continueBtn} onPress={onDismiss}>
              <LinearGradient colors={['#2563EB', '#1D4ED8'] as const} style={s.continueBg}>
                <Text style={s.continueTxt}>{info.promoted ? 'STAY (PROMOTE LATER)' : 'CONTINUE'}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#F1F5F9', borderRadius: 16, width: '100%', maxHeight: '88%', borderWidth: 2, borderColor: '#1E3A8A', overflow: 'hidden' },
  scroll: { padding: 12, paddingBottom: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: '#0F172A', fontStyle: 'italic' },
  subtitle: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 6 },
  /* Banner */
  banner: { borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8 },
  bannerContent: { alignItems: 'center' },
  placeRow: { flexDirection: 'row', alignItems: 'baseline' },
  placeNum: { fontSize: 38, fontWeight: '900', color: '#FFF' },
  placeSuffix: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.75)', marginLeft: 2 },
  placeLabel: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.7)', marginTop: -2 },
  statusBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 5, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  statusPromo: { backgroundColor: '#16A34A' },
  statusText: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  multiplierRow: { alignItems: 'center', marginTop: 6 },
  multiplierInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  multiplierIcon: { width: 16, height: 16 },
  multiplierText: { fontSize: 13, fontWeight: '900', color: '#FDE68A' },
  /* Rewards */
  rewardHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: 6, gap: 6 },
  rewardLine: { flex: 1, height: 1, backgroundColor: '#CBD5E1' },
  rewardTitle: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 0.8 },
  rewardsRow: { flexDirection: 'row', gap: 8 },
  rewardBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 10, paddingVertical: 8, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  rewardIcon: { width: 22, height: 22, marginBottom: 2 },
  rewardVal: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  rewardLbl: { fontSize: 8, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  /* Promotion warning */
  promoWarning: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#FDE68A' },
  promoWarningTitle: { fontSize: 13, fontWeight: '900', color: '#92400E', marginBottom: 4 },
  promoWarningLine: { fontSize: 12, fontWeight: '600', color: '#78350F', marginBottom: 2 },
  promoHighlight: { fontWeight: '900', color: '#16A34A' },
  promoWarningHint: { fontSize: 10, fontWeight: '600', color: '#A16207', marginTop: 6, fontStyle: 'italic' },
  /* Roadmap */
  roadmapRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 4, gap: 8 },
  roadmapCurrent: { borderWidth: 1.5, borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  roadmapInfo: { flex: 1 },
  roadmapName: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  roadmapLocked: { color: '#94A3B8' },
  roadmapMeta: { fontSize: 9, fontWeight: '600', color: '#94A3B8', marginTop: 1 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  completedTxt: { fontSize: 8, fontWeight: '800', color: '#22C55E' },
  currentBadge: { backgroundColor: '#2563EB', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  currentTxt: { fontSize: 8, fontWeight: '800', color: '#FFF' },
  /* Stats */
  statsRow: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 10, marginTop: 6, paddingVertical: 8 },
  statCell: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E2E8F0' },
  statLbl: { fontSize: 7, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginTop: 1 },
  statVal: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  /* Buttons */
  btnArea: { padding: 12, paddingTop: 6, gap: 6 },
  promoteBtn: {},
  continueBtn: {},
  continueBg: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  continueTxt: { fontSize: 14, fontWeight: '900', color: '#FFF', letterSpacing: 0.8 },
});
