/* ── VGP Leaderboard Screen ── */
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, FlatList, Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useValorGP } from './context';
import { VGP_LB_TIERS, VGP_LB_RANK_REWARDS } from './constants';

const { width: SW } = Dimensions.get('window');
const ROSE = 'rgba(232,180,180,';
const ROSE_TEXT = ROSE + '0.85)';
const ROSE_DIM = ROSE + '0.45)';
const GOLD = '#D4A854';
const GOLD_DIM = 'rgba(210,160,80,0.6)';

// Avatar color palette for fake players
const AVATAR_COLORS = [
  '#C07040', '#E06050', '#8060B0', '#50A070', '#D0A040',
  '#5080C0', '#C050A0', '#40B0C0', '#A06040', '#6060D0',
  '#D08050', '#50B060', '#C06080', '#7070C0', '#B0A050',
];

interface Props {
  onBack: () => void;
}

export default function VGPLeaderboardScreen({ onBack }: Props) {
  const { getLeaderboard, leaderboardId } = useValorGP();
  const [tab, setTab] = useState<'ranking' | 'rewards'>('ranking');

  const leaderboard = useMemo(() => getLeaderboard(), [getLeaderboard]);
  const playerEntry = useMemo(() => leaderboard.find(e => e.isPlayer), [leaderboard]);
  const playerRank = playerEntry?.rank ?? leaderboard.length;

  // Find which tier the player is in
  const playerTier = useMemo(() => {
    for (const tier of VGP_LB_TIERS) {
      if (playerRank >= tier.minRank && playerRank <= tier.maxRank) return tier;
    }
    return VGP_LB_TIERS[VGP_LB_TIERS.length - 1];
  }, [playerRank]);

  // Get players in the player's tier (show nearby players around them)
  const nearbyPlayers = useMemo(() => {
    if (!playerTier) return [];
    // Show players from the player's tier
    const tierPlayers = leaderboard.filter(
      e => e.rank >= playerTier!.minRank && e.rank <= playerTier!.maxRank
    );
    // If too many, show around player's position
    if (tierPlayers.length > 20) {
      const pIdx = tierPlayers.findIndex(e => e.isPlayer);
      const start = Math.max(0, pIdx - 5);
      return tierPlayers.slice(start, start + 15);
    }
    return tierPlayers;
  }, [leaderboard, playerTier]);

  const formatScore = (n: number) => n.toLocaleString();

  return (
    <View style={s.container}>
      {/* Background */}
      <Image source={require('../../assets/images/vgp_bg.png')} style={s.bgImage} resizeMode="cover" />
      <View style={s.bgOverlay} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Leaderboard</Text>
        <Text style={s.headerSub}>Leaderboard ID: {leaderboardId}</Text>
      </View>

      {/* Close button */}
      <Pressable onPress={onBack} style={s.closeBtn} hitSlop={14}>
        <Ionicons name="close" size={24} color={ROSE_DIM} />
      </Pressable>

      {/* Tabs */}
      <View style={s.tabRow}>
        <Pressable style={[s.tab, tab === 'ranking' && s.tabActive]} onPress={() => setTab('ranking')}>
          <Text style={[s.tabText, tab === 'ranking' && s.tabTextActive]}>Player Ranking</Text>
        </Pressable>
        <Pressable style={[s.tab, tab === 'rewards' && s.tabActive]} onPress={() => setTab('rewards')}>
          <Text style={[s.tabText, tab === 'rewards' && s.tabTextActive]}>Rank Rewards</Text>
        </Pressable>
      </View>

      {/* Content */}
      {tab === 'ranking' ? (
        <View style={s.content}>
          {/* Tier headers with point requirements */}
          <FlatList
            data={VGP_LB_TIERS}
            keyExtractor={t => t.label}
            style={s.tierList}
            ListFooterComponent={
              <View style={{ paddingBottom: 90 }}>
                {/* Show nearby player rows in player's tier */}
                {nearbyPlayers.map(entry => (
                  <View key={entry.rank + entry.name} style={[
                    s.playerRow,
                    entry.isPlayer && s.playerRowMe,
                  ]}>
                    <Text style={s.playerRankNum}>{entry.rank}</Text>
                    <View style={[s.avatar, { backgroundColor: AVATAR_COLORS[entry.rank % AVATAR_COLORS.length] }]}>
                      <Text style={s.avatarText}>{entry.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={s.playerInfo}>
                      <Text style={[s.playerName, entry.isPlayer && { color: '#4ADE80' }]} numberOfLines={1}>
                        {entry.isPlayer ? 'You' : entry.name}
                      </Text>
                      <View style={s.powerRow}>
                        <Ionicons name="flash" size={11} color={GOLD_DIM} />
                        <Text style={s.powerText}>{entry.power}</Text>
                      </View>
                    </View>
                    <View style={s.pointsCol}>
                      <Text style={s.pointsLabel}>Points</Text>
                      <Text style={[s.pointsValue, entry.isPlayer && { color: '#4ADE80' }]}>
                        {formatScore(entry.score)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            }
            renderItem={({ item: tier }) => {
              const isPlayerTier = playerTier?.label === tier.label;
              return (
                <View style={[s.tierHeader, isPlayerTier && s.tierHeaderActive]}>
                  <Text style={s.tierLabel}>Ranking: {tier.label}</Text>
                  {tier.pointReq > 0 && (
                    <Text style={s.tierReq}>Point Requirement: {formatScore(tier.pointReq)}</Text>
                  )}
                </View>
              );
            }}
          />

          {/* Sticky bottom — player's own row */}
          {playerEntry && (
            <View style={s.stickyBottom}>
              <View style={[s.playerRow, s.playerRowMe, { marginHorizontal: 0 }]}>
                <Text style={s.playerRankNum}>{playerEntry.rank}</Text>
                <View style={[s.avatar, { backgroundColor: '#4ADE80' }]}>
                  <Text style={s.avatarText}>Y</Text>
                </View>
                <View style={s.playerInfo}>
                  <Text style={[s.playerName, { color: '#4ADE80' }]}>You</Text>
                  <View style={s.powerRow}>
                    <Ionicons name="flash" size={11} color={GOLD_DIM} />
                    <Text style={s.powerText}>{playerEntry.power}</Text>
                  </View>
                </View>
                <View style={s.pointsCol}>
                  <Text style={s.pointsLabel}>Points <Ionicons name="help-circle-outline" size={11} color={ROSE_DIM} /></Text>
                  <Text style={[s.pointsValue, { color: '#4ADE80' }]}>
                    {formatScore(playerEntry.score)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      ) : (
        /* ── RANK REWARDS TAB ── */
        <View style={s.content}>
          <FlatList
            data={[
              { tierLabel: '1-20', trainingSkips: 3, money: 100000 },
              { tierLabel: '21-50', trainingSkips: 2, money: 50000 },
              { tierLabel: '51-100', trainingSkips: 1, money: 10000 },
              { tierLabel: '101-999', trainingSkips: 0, money: 0 },
            ]}
            keyExtractor={r => r.tierLabel}
            contentContainerStyle={{ paddingBottom: 30, paddingTop: 8 }}
            renderItem={({ item: reward }) => {
              const isMe = playerTier?.label === reward.tierLabel ||
                (reward.tierLabel === '101-999' && playerTier?.label === '101+');
              const hasRewards = reward.trainingSkips > 0 || reward.money > 0;
              return (
                <View style={[s.rewardCard, isMe && s.rewardCardMe]}>
                  {isMe && <Text style={s.rewardMeLabel}>Me</Text>}
                  <View style={s.rewardLeft}>
                    <Text style={[s.rewardTier, isMe && { color: '#4ADE80' }]}>{reward.tierLabel}</Text>
                  </View>
                  <View style={s.rewardRight}>
                    {hasRewards ? (
                      <>
                        {reward.trainingSkips > 0 && (
                          <View style={s.rewardIconWrap}>
                            <Image source={require('../../assets/images/training_skip.png')} style={s.rewardIcon} resizeMode="contain" />
                            <View style={s.rewardBadge}>
                              <Text style={s.rewardBadgeText}>{reward.trainingSkips}</Text>
                            </View>
                          </View>
                        )}
                        {reward.money > 0 && (
                          <View style={s.rewardIconWrap}>
                            <Image source={require('../../assets/images/currency_money.png')} style={s.rewardIcon} resizeMode="contain" />
                            <View style={s.rewardBadgeMoney}>
                              <Text style={s.rewardBadgeMoneyText}>{formatScore(reward.money)}</Text>
                            </View>
                          </View>
                        )}
                      </>
                    ) : (
                      <Text style={s.noRewardText}>—</Text>
                    )}
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 30, backgroundColor: '#0A0A0A' },
  bgImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,16,0.82)' },

  header: { alignItems: 'center', marginBottom: 6, paddingTop: 4 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: GOLD, textAlign: 'center' },
  headerSub: { fontSize: 10, fontWeight: '600', color: ROSE_DIM, marginTop: 1 },

  closeBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(232,180,180,0.08)',
    borderWidth: 1, borderColor: 'rgba(232,180,180,0.12)',
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 4,
    borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(232,180,180,0.12)',
  },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    backgroundColor: 'rgba(30,20,30,0.6)',
  },
  tabActive: {
    backgroundColor: 'rgba(210,160,80,0.15)',
    borderBottomWidth: 2, borderBottomColor: GOLD,
  },
  tabText: { fontSize: 13, fontWeight: '700', color: ROSE_DIM },
  tabTextActive: { color: GOLD },

  content: { flex: 1 },

  // ── RANKING TAB ──
  tierList: { flex: 1, paddingHorizontal: 12 },
  tierHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, marginTop: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(40,28,44,0.7)',
    borderWidth: 1, borderColor: 'rgba(232,180,180,0.1)',
  },
  tierHeaderActive: {
    borderColor: GOLD_DIM,
    backgroundColor: 'rgba(210,160,80,0.08)',
  },
  tierLabel: { fontSize: 14, fontWeight: '800', color: ROSE_TEXT },
  tierReq: { fontSize: 10, fontWeight: '600', color: ROSE_DIM },

  playerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8, marginTop: 4, marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(40,28,44,0.55)',
    borderWidth: 1, borderColor: 'rgba(232,180,180,0.08)',
  },
  playerRowMe: {
    borderColor: 'rgba(74,222,128,0.4)',
    backgroundColor: 'rgba(74,222,128,0.06)',
  },
  playerRankNum: { fontSize: 14, fontWeight: '900', color: ROSE_TEXT, width: 30, textAlign: 'center' },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: { fontSize: 16, fontWeight: '900', color: '#FFF' },
  playerInfo: { flex: 1, gap: 1 },
  playerName: { fontSize: 13, fontWeight: '700', color: ROSE_TEXT },
  powerRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  powerText: { fontSize: 10, fontWeight: '600', color: ROSE_DIM },
  pointsCol: { alignItems: 'flex-end', marginLeft: 8 },
  pointsLabel: { fontSize: 9, fontWeight: '600', color: ROSE_DIM },
  pointsValue: { fontSize: 16, fontWeight: '900', color: ROSE_TEXT },

  // Sticky bottom player bar
  stickyBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(10,8,16,0.92)',
    borderTopWidth: 1, borderTopColor: 'rgba(232,180,180,0.12)',
    paddingHorizontal: 12, paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 26 : 10,
  },

  // ── REWARDS TAB ──
  rewardCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 14, marginTop: 8, paddingVertical: 16, paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(40,28,44,0.65)',
    borderWidth: 1.5, borderColor: 'rgba(232,180,180,0.1)',
    position: 'relative',
  },
  rewardCardMe: {
    borderColor: 'rgba(74,222,128,0.4)',
    backgroundColor: 'rgba(74,222,128,0.06)',
  },
  rewardMeLabel: {
    position: 'absolute', top: 4, left: 10,
    fontSize: 8, fontWeight: '800', color: '#4ADE80',
  },
  rewardLeft: { flex: 1 },
  rewardTier: { fontSize: 22, fontWeight: '900', color: ROSE_TEXT },
  rewardRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rewardIconWrap: { alignItems: 'center', position: 'relative' },
  rewardIcon: { width: 48, height: 48 },
  rewardBadge: {
    position: 'absolute', bottom: -4, right: -4,
    backgroundColor: 'rgba(74,222,128,0.85)', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center',
  },
  rewardBadgeText: { fontSize: 10, fontWeight: '900', color: '#0A0A0A' },
  rewardBadgeMoney: {
    position: 'absolute', bottom: -4, right: -8,
    backgroundColor: 'rgba(210,160,80,0.85)', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1, minWidth: 24, alignItems: 'center',
  },
  rewardBadgeMoneyText: { fontSize: 9, fontWeight: '900', color: '#1A0E14' },
  noRewardText: { fontSize: 16, fontWeight: '700', color: ROSE_DIM },
});
