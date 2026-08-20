import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, ScrollView, Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../../src/context/GameContext';
import { ValorGPProvider, useValorGP } from '../../src/valorGP/context';
import { VGP_MILESTONES, VGP_MAX_ATTEMPTS, VP_TIERS, getVpLevelInfo } from '../../src/valorGP/constants';
import { VGP_ATTEMPT_COST } from '../../src/valorGP/context';
import { getOpponentPower } from '../../src/valorGP/matchEngine';
import { VGP_BASE_OPPONENT_POWER, VGP_POWER_SCALE_PER_DIFF } from '../../src/valorGP/constants';
import VGPMatchScreen from '../../src/valorGP/MatchScreen';
import VGPPlayersScreen from '../../src/valorGP/VGPPlayersScreen';
import VGPLeaderboardScreen from '../../src/valorGP/VGPLeaderboardScreen';
import VGPValorPassScreen from '../../src/valorGP/VGPValorPassScreen';
import CurrencyIcon from '../../src/components/CurrencyIcon';

const { width: SW, height: SH } = Dimensions.get('window');
const ROSE = 'rgba(232,180,180,';
const ROSE_TEXT = ROSE + '0.85)';
const ROSE_DIM = ROSE + '0.45)';
const ROSE_FAINT = ROSE + '0.2)';

function VGPHub() {
  const router = useRouter();
  const { state, isLoaded, matchState, opponentName, opponentPower, startRun, startMatch, endRun, abandonRun, claimMilestone, getTimeRemaining, buyAttempt } = useValorGP();
  const { teamPower, setVgpPaused, gameState: gs } = useGame();
  const crystals = gs?.crystals ?? 0;

  // Pause main game while VGP tab is focused, unpause on blur
  useFocusEffect(
    useCallback(() => {
      setVgpPaused(true);
      return () => setVgpPaused(false);
    }, [setVgpPaused])
  );
  const [timer, setTimer] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showMatch, setShowMatch] = useState(false);
  const [showResult, setShowResult] = useState<'won' | 'lost' | null>(null);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showValorPass, setShowValorPass] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setTimer(getTimeRemaining()), 1000);
    return () => clearInterval(iv);
  }, [getTimeRemaining]);

  useEffect(() => {
    if (!matchState) return;
    if (matchState.status === 'won' || matchState.status === 'lost') {
      setTimeout(() => setShowResult(matchState.status as 'won' | 'lost'), 1500);
    }
  }, [matchState?.status]);

  const handleChallenge = useCallback(() => {
    let isNewRun = false;
    if (!state.isInRun) {
      const ok = startRun();
      if (!ok) return;
      isNewRun = true;
    }
    setShowResult(null);
    startMatch(isNewRun ? 1 : undefined); // force difficulty 1 for new run (stateRef is stale)
    setShowMatch(true);
  }, [state.isInRun, startRun, startMatch]);

  const handleContinue = useCallback(() => {
    setShowResult(null);
    startMatch();
  }, [startMatch]);

  const handleRunEnd = useCallback(() => {
    setShowResult(null);
    setShowMatch(false);
    endRun();
  }, [endRun]);

  if (!isLoaded) return <View style={s.container}><Text style={{ color: ROSE_DIM, textAlign: 'center', marginTop: 100 }}>Loading...</Text></View>;

  if (showMatch && matchState) {
    return (
      <VGPMatchScreen
        matchState={matchState}
        difficulty={state.currentDifficulty}
        runWins={state.runWins}
        showResult={showResult}
        opponentName={opponentName}
        opponentPower={opponentPower}
        onContinue={handleContinue}
        onEndRun={handleRunEnd}
        onBack={() => { setShowMatch(false); abandonRun(); }}
      />
    );
  }

  if (showLeaderboard) {
    return <VGPLeaderboardScreen onBack={() => setShowLeaderboard(false)} />;
  }

  // Check if there are claimable VP rewards
  const vpLevel = getVpLevelInfo(state.vpXp).level;
  const freeCl = state.vpFreeClaimed ?? [];
  const grandCl = state.vpGrandClaimed ?? [];
  const goldCl = state.vpGoldClaimed ?? [];
  const hasVpClaimable =
    VP_TIERS.some((t, i) => i < vpLevel && !freeCl.includes(i) && t.f > 0) ||
    (state.vpGrandPurchased && VP_TIERS.some((t, i) => i < vpLevel && !grandCl.includes(i) && t.g > 0)) ||
    (state.vpGoldPurchased && VP_TIERS.some((t, i) => i < vpLevel && !goldCl.includes(i) && t.d > 0));

  if (showValorPass) {
    return <VGPValorPassScreen onBack={() => setShowValorPass(false)} />;
  }

  if (showPlayers) {
    return <VGPPlayersScreen onBack={() => setShowPlayers(false)} />;
  }

  const timerStr = `${String(timer.hours).padStart(2, '0')}H${String(timer.minutes).padStart(2, '0')}M${String(timer.seconds).padStart(2, '0')}S`;
  const timerFull = timer.days > 0 ? `${timer.days}D ${timerStr}` : timerStr;
  const hasAttempts = state.attempts > 0 || state.isInRun;

  // Milestone progress: based on bestWinStreak, fills the track
  const lastMs = VGP_MILESTONES[VGP_MILESTONES.length - 1];
  const maxWins = lastMs?.winsRequired ?? 18;
  const trackPct = Math.min(100, (state.bestWinStreak / maxWins) * 100);
  const allCleared = state.bestWinStreak >= maxWins && state.claimedMilestones.length >= VGP_MILESTONES.length;

  return (
    <View style={s.container}>
      {/* Background image — centered, covers full screen */}
      <Image
        source={require('../../assets/images/vgp_bg.png')}
        style={s.bgImage}
        resizeMode="cover"
      />
      {/* Dark overlay for readability */}
      <View style={s.bgOverlay} />

      {/* ── CLOSE BUTTON (top-right) ── */}
      <Pressable onPress={() => router.back()} style={s.closeBtn} hitSlop={14}>
        <Ionicons name="close" size={24} color={ROSE_DIM} />
      </Pressable>

      {/* ── TOP: Title ── */}
      <View style={s.topRow}>
        <View style={s.titleWrap}>
          <View style={s.titleAccent} />
          <Text style={s.title}>Valor Grand Prix</Text>
          <Pressable hitSlop={10}>
            <Ionicons name="help-circle-outline" size={20} color={ROSE_DIM} />
          </Pressable>
        </View>
      </View>

      {/* ── SEASON + TIMER (one row) ── */}
      <View style={s.seasonTimerRow}>
        <LinearGradient
          colors={['rgba(80,50,60,0.6)', 'rgba(60,35,50,0.8)', 'rgba(80,50,60,0.6)'] as const}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.seasonBadge}
        >
          <Text style={s.seasonText}>Season {state.season ?? 1}</Text>
        </LinearGradient>
        <View style={s.timerPill}>
          <Ionicons name="time-outline" size={11} color={ROSE_DIM} />
          <Text style={s.timerText}>Ends in: {timerFull}</Text>
        </View>
      </View>

      {/* ── SIDE BUTTONS ── */}
      <View style={s.sideCol}>
        <Pressable style={s.sideBtn} onPress={() => setShowLeaderboard(true)}>
          <Image source={require('../../assets/images/button_leaderboard.png')} style={s.sideBtnImg} />
          <Text style={s.sideBtnLabel}>Leaderboard</Text>
        </Pressable>
        <Pressable style={s.sideBtn} onPress={() => setShowValorPass(true)}>
          <View style={{ position: 'relative' }}>
            <Image source={require('../../assets/images/button_valorpass.png')} style={s.sideBtnImg} />
            {hasVpClaimable && (
              <View style={s.sideBtnBadge}>
                <Text style={s.sideBtnBadgeText}>!</Text>
              </View>
            )}
          </View>
          <Text style={s.sideBtnLabel}>Valor Pass</Text>
        </Pressable>
        <Pressable style={s.sideBtn} onPress={() => setShowPlayers(true)}>
          <Image source={require('../../assets/images/button_players.png')} style={s.sideBtnImg} />
          <Text style={s.sideBtnLabel}>Players</Text>
        </Pressable>
      </View>

      {/* ── SPACER (flex area where bg image shows through) ── */}
      <View style={s.visualArea} />

      {/* Streak */}
      <Text style={s.streakText}>Winstreak: {state.bestWinStreak}</Text>

      {/* ── CHALLENGE BUTTON (compact) ── */}
      <Pressable onPress={handleChallenge} disabled={!hasAttempts} style={s.challengeWrap}>
        {({ pressed }) => (
          <LinearGradient
            colors={hasAttempts
              ? (['#E8CC7A', '#D4A854', '#C49638', '#D4A854', '#E8CC7A'] as const)
              : (['#4B4040', '#3A3030', '#4B4040'] as const)}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[s.challengeBtn, pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] }]}
          >
            <Text style={s.challengeBtnText}>Challenge</Text>
          </LinearGradient>
        )}
      </Pressable>

      {/* ── ATTEMPTS ── */}
      <View style={s.attemptsWrap}>
        <LinearGradient
          colors={['rgba(80,50,60,0.5)', 'rgba(60,35,50,0.7)', 'rgba(80,50,60,0.5)'] as const}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.attemptsPill}
        >
          <Text style={s.attemptsText}>Challenge Attempts {state.attempts}/{VGP_MAX_ATTEMPTS}</Text>
          <Pressable style={s.plusBtn} onPress={() => setShowBuyModal(true)}>
            <Ionicons name="add" size={11} color="#D4A054" />
          </Pressable>
        </LinearGradient>
      </View>

      {/* ── MILESTONE TRACK ── */}
      <View style={s.milestoneArea}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.milestoneScroll}>
          {VGP_MILESTONES.map((m, i) => {
            const reached = state.bestWinStreak >= m.winsRequired;
            const claimed = state.claimedMilestones.includes(i);
            // Pick icon based on reward type
            const isTraining = (m.reward.trainingSkips ?? 0) > 0;
            const isPlayerChest = (m.reward.playerChestSkips ?? 0) > 0;
            const rewardCount = isTraining ? m.reward.trainingSkips : isPlayerChest ? m.reward.playerChestSkips : 1;
            const rewardIcon = isTraining
              ? require('../../assets/images/training_skip.png')
              : require('../../assets/images/key_regular.png');
            return (
              <Pressable key={i} style={s.msItem} onPress={() => reached && !claimed && claimMilestone(i)}>
                <View style={[
                  s.msCard,
                  reached && !claimed && s.msCardReady,
                  claimed && s.msCardClaimed,
                ]}>
                  {claimed
                    ? <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    : (
                      <View style={s.msIconInner}>
                        <Image source={rewardIcon} style={isTraining ? s.msRewardImgLg : s.msRewardImg} resizeMode="contain" />
                        {(rewardCount ?? 0) > 1 && (
                          <View style={s.msCountBadge}>
                            <Text style={s.msCountText}>×{rewardCount}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  {reached && !claimed && (
                    <View style={s.msClaimDot}><Text style={s.msClaimDotText}>!</Text></View>
                  )}
                </View>
                <Text style={s.msWinNum}>{m.winsRequired}</Text>
              </Pressable>
            );
          })}
          {/* Clear card */}
          <View style={s.msItem}>
            <LinearGradient
              colors={allCleared
                ? (['rgba(210,160,80,0.3)', 'rgba(210,160,80,0.12)'] as const)
                : (['rgba(60,35,55,0.8)', 'rgba(60,35,55,0.6)'] as const)}
              style={[s.msCard, allCleared && { borderColor: 'rgba(210,160,80,0.6)' }]}
            >
              <View style={s.msIconInner}>
                <Image source={require('../../assets/images/key_gold.png')} style={s.msRewardImg} resizeMode="contain" />
                <View style={s.msCountBadge}>
                  <Text style={s.msCountText}>×2</Text>
                </View>
              </View>
            </LinearGradient>
            <Text style={s.msClearLabel}>Clear</Text>
          </View>
        </ScrollView>
        {/* Track progress bar under milestones */}
        <View style={s.trackBarWrap}>
          <View style={s.trackBarBg}>
            <LinearGradient
              colors={['#A07830', '#D4A854'] as const}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.trackBarFill, { width: `${trackPct}%` }]}
            />
          </View>
        </View>
      </View>

      {/* ── BUY ATTEMPTS MODAL ── */}
      {showBuyModal && (
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Buy Attempts</Text>

            {/* Crystal counter — tap to go to shop */}
            <Pressable style={s.modalCrystalRow} onPress={() => { setShowBuyModal(false); router.push('/tabs/shop'); }}>
              <CurrencyIcon type="diamond" size={18} />
              <Text style={s.modalCrystalCount}>{crystals}</Text>
              <View style={s.modalCrystalPlus}>
                <Ionicons name="add" size={10} color="#A855F7" />
              </View>
            </Pressable>

            <View style={s.modalBody}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Text style={s.modalDesc}>Spend</Text>
                <CurrencyIcon type="diamond" size={16} />
                <Text style={[s.modalDesc, { color: '#C084FC' }]}>{VGP_ATTEMPT_COST}</Text>
                <Text style={s.modalDesc}>to purchase 1 challenge attempt?</Text>
              </View>
            </View>
            <View style={s.modalBtnRow}>
              <Pressable style={s.modalBtnCancel} onPress={() => setShowBuyModal(false)}>
                <Text style={s.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.modalBtnConfirm, crystals < VGP_ATTEMPT_COST && { opacity: 0.4 }]}
                onPress={() => {
                  if (buyAttempt()) setShowBuyModal(false);
                }}
                disabled={crystals < VGP_ATTEMPT_COST}
              >
                <LinearGradient colors={['#D4A854', '#A07830'] as const} style={s.modalBtnConfirmGrad}>
                  <Text style={s.modalBtnConfirmText}>Confirm</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export default function ValorGrandPrixScreen() {
  const { teamPower, vgpResetCount, gameState, cheatAddCrystals, addKeys } = useGame();
  const allPlayers = gameState?.players ?? [];
  const crystals = gameState?.crystals ?? 0;
  const handleSpendCrystals = React.useCallback((amount: number) => {
    cheatAddCrystals(-amount);
  }, [cheatAddCrystals]);
  // Calculate upgrade power bonus (same as calculateTeamPower in utils.ts)
  const upgradePower = React.useMemo(() => {
    let total = 0;
    const UPGRADES = require('../../src/constants').UPGRADES as { id: string; type?: string; powerPerClick?: number }[];
    for (const u of UPGRADES ?? []) {
      if (u?.type !== 'power') continue;
      const lvl = gameState?.upgrades?.[u?.id ?? ''] ?? 0;
      total += (u?.powerPerClick ?? 1) * lvl;
    }
    return total;
  }, [gameState?.upgrades]);
  return (
    <ValorGPProvider teamPower={teamPower} allPlayers={allPlayers} upgradePower={upgradePower} crystals={crystals} onSpendCrystals={handleSpendCrystals} onAddKeys={addKeys} resetSignal={vgpResetCount}>
      <VGPHub />
    </ValorGPProvider>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 30, backgroundColor: '#0A0A0A' },
  bgImage: {
    position: 'absolute', top: 0, left: 0,
    width: SW, height: SH,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,10,18,0.55)',
  },

  // ── CLOSE BUTTON ──
  closeBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(232,180,180,0.08)',
    borderWidth: 1, borderColor: 'rgba(232,180,180,0.12)',
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
  },

  // ── SEASON + TIMER ROW ──
  seasonTimerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 2, gap: 8 },
  seasonBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(232,180,180,0.12)',
  },
  seasonText: { fontSize: 10, fontWeight: '700', color: ROSE_DIM },

  // ── TOP ──
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 2,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleAccent: { width: 3, height: 20, backgroundColor: '#E11D48', borderRadius: 2 },
  title: { fontSize: 17, fontWeight: '800', color: ROSE_TEXT },
  timerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(232,180,180,0.06)',
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(232,180,180,0.08)',
  },
  timerText: { fontSize: 10, color: ROSE_DIM, fontWeight: '600' },

  // ── SIDE BUTTONS ──
  sideCol: {
    position: 'absolute', right: 8, top: Platform.OS === 'ios' ? 155 : 135,
    gap: 12, zIndex: 10, alignItems: 'center',
  },
  sideBtn: { alignItems: 'center', gap: 3 },
  sideBtnImg: { width: 52, height: 52, resizeMode: 'contain' },
  sideBtnLabel: { fontSize: 8, fontWeight: '700', color: ROSE_DIM, textAlign: 'center' },
  sideBtnBadge: {
    position: 'absolute', top: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#E11D48', alignItems: 'center', justifyContent: 'center',
  },
  sideBtnBadgeText: { fontSize: 10, fontWeight: '900', color: '#FFF' },

  // ── CENTER SPACER ──
  visualArea: { flex: 1 },

  // ── STREAK ──
  streakText: {
    fontSize: 14, fontWeight: '700', color: '#D4A054',
    textAlign: 'center', marginBottom: 6,
  },

  // ── CHALLENGE (compact) ──
  challengeWrap: { alignSelf: 'center', width: SW * 0.55, marginBottom: 6 },
  challengeBtn: {
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#C8A84E', shadowOpacity: 0.35, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  challengeBtnText: { fontSize: 16, fontWeight: '900', color: '#2A1520' },

  // ── ATTEMPTS ──
  attemptsWrap: { alignItems: 'center', marginBottom: 8 },
  attemptsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(232,180,180,0.12)',
  },
  attemptsText: { fontSize: 10, fontWeight: '700', color: ROSE_TEXT },
  plusBtn: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(210,160,80,0.2)', borderWidth: 1, borderColor: 'rgba(210,160,80,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── MILESTONES ──
  milestoneArea: { paddingBottom: Platform.OS === 'ios' ? 26 : 14 },
  milestoneScroll: { paddingHorizontal: 16, alignItems: 'flex-end', paddingTop: 4 },
  msItem: { alignItems: 'center', marginRight: 4, width: 44 },
  msCard: {
    width: 40, height: 40, borderRadius: 7,
    backgroundColor: 'rgba(60,35,55,0.8)',
    borderWidth: 1.5, borderColor: 'rgba(232,180,180,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2, position: 'relative',
  },
  msCardReady: {
    borderColor: 'rgba(210,160,80,0.6)', backgroundColor: 'rgba(210,160,80,0.12)',
  },
  msCardClaimed: { borderColor: 'rgba(16,185,129,0.3)', opacity: 0.5 },
  msIconInner: { alignItems: 'center', justifyContent: 'center' },
  msRewardImg: { width: 31, height: 31 },
  msRewardImgLg: { width: 37, height: 37 },
  msCountBadge: {
    position: 'absolute', bottom: -4, right: -8,
    backgroundColor: 'rgba(210,160,80,0.85)', borderRadius: 6,
    paddingHorizontal: 3, paddingVertical: 1,
  },
  msCountText: { fontSize: 7, fontWeight: '900', color: '#1A0E14' },
  msClaimDot: {
    position: 'absolute', top: -3, right: -3,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#E11D48', alignItems: 'center', justifyContent: 'center',
  },
  msClaimDotText: { fontSize: 8, fontWeight: '900', color: '#FFF' },
  msWinNum: { fontSize: 9, fontWeight: '800', color: ROSE_DIM },
  msClearLabel: { fontSize: 8, fontWeight: '800', color: '#D4A054' },

  // Track progress bar
  trackBarWrap: { paddingHorizontal: 16, marginTop: 4 },
  trackBarBg: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2, overflow: 'hidden',
  },
  trackBarFill: { height: '100%', borderRadius: 2 },

  // ── BUY ATTEMPTS MODAL ──
  modalOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCard: {
    width: SW * 0.85, borderRadius: 16,
    backgroundColor: 'rgba(30,18,28,0.95)',
    borderWidth: 1.5, borderColor: 'rgba(210,160,80,0.35)',
    paddingTop: 20, paddingBottom: 18, alignItems: 'center',
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18, fontWeight: '900', color: '#D4A854',
    textAlign: 'center', marginBottom: 10,
  },
  modalCrystalRow: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    marginLeft: 18, marginBottom: 12, gap: 4,
  },
  modalCrystalCount: { fontSize: 14, fontWeight: '800', color: '#C084FC' },
  modalCrystalPlus: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(168,85,247,0.2)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)',
    alignItems: 'center', justifyContent: 'center', marginLeft: 2,
  },
  modalBody: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, marginHorizontal: 16, paddingVertical: 28, paddingHorizontal: 20,
    borderWidth: 1, borderColor: 'rgba(210,160,80,0.15)',
    width: SW * 0.85 - 32, alignItems: 'center', justifyContent: 'center',
  },
  modalDesc: {
    fontSize: 15, fontWeight: '700', color: ROSE_TEXT,
    textAlign: 'center', lineHeight: 24,
  },
  modalBtnRow: {
    flexDirection: 'row', gap: 14, marginTop: 18, paddingHorizontal: 16,
    width: SW * 0.85 - 32,
  },
  modalBtnCancel: {
    flex: 1, height: 48, borderRadius: 10,
    backgroundColor: 'rgba(232,180,180,0.12)',
    borderWidth: 1, borderColor: 'rgba(232,180,180,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBtnCancelText: { fontSize: 15, fontWeight: '800', color: ROSE_DIM },
  modalBtnConfirm: { flex: 1.3, height: 48, borderRadius: 10, overflow: 'hidden' },
  modalBtnConfirmGrad: {
    flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10,
  },
  modalBtnConfirmText: { fontSize: 15, fontWeight: '900', color: '#1A0E14' },
});
