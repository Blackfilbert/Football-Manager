import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Dimensions, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useGame } from '../../src/context/GameContext';
import { Colors, Spacing, Radius } from '../../src/theme';
import CurrencyIcon from '../../src/components/CurrencyIcon';
// MiniScoreBar hidden on this screen to avoid confusion with cup matches
import {
  getCurrentRound, hasMatchTimePassed, getTimeUntilMatch, isCupExpired,
  isPlayerAlive, getRoundLabel, getPlayerMatchInRound,
  getMatchIndex, matchesInRound, getOpponentPowerForMatch, getCupDayIndex,
} from '../../src/streetCupHelpers';
import {
  STREET_CUP_REWARDS, STREET_CUP_MATCH_HOUR,
} from '../../src/constants';
import { formatMoney } from '../../src/utils';
import { showRewarded } from '../../src/services/ads';

const SW = Dimensions.get('window').width;

// Colors for the cup theme — dark navy palette (like OSM reference)
const CUP = {
  bg: '#1A2340',
  card: '#243058',
  cardBorder: '#344178',
  orange: '#F97316',
  orangeDim: 'rgba(249,115,22,0.15)',
  gold: '#FBBF24',
  green: '#22C55E',
  red: '#EF4444',
  textPrimary: '#F0F4FF',
  textSecondary: '#8B9ACA',
  textMuted: '#5B6A9A',
  playerHighlight: '#F97316',
};

// ── Bracket layout constants ──
const MATCH_W = 150;
const MATCH_H = 54;
const B_GAP = 8;
const B_STEP = MATCH_H + B_GAP; // 62
const CONN_W = 24;
const COL_W = MATCH_W + CONN_W; // 174
const B_HEADER_H = 28;
const TROPHY_W = 70;
const LINE_W = 1.5;
const LINE_COLOR = 'rgba(160,180,220,0.3)';
const LINE_COLOR_PLAYER = 'rgba(249,115,22,0.6)';

function calcBracketPositions(): number[][] {
  const pos: number[][] = [];
  pos.push(Array.from({ length: 8 }, (_, i) => i * B_STEP));
  for (let r = 1; r < 4; r++) {
    const prev = pos[r - 1];
    const curr: number[] = [];
    for (let i = 0; i < prev.length / 2; i++) {
      const tc = prev[i * 2] + MATCH_H / 2;
      const bc = prev[i * 2 + 1] + MATCH_H / 2;
      curr.push((tc + bc) / 2 - MATCH_H / 2);
    }
    pos.push(curr);
  }
  return pos;
}
const B_POS = calcBracketPositions();
const BRACKET_H = B_POS[0][7] + MATCH_H; // total match area height
const BRACKET_TOTAL_H = BRACKET_H + B_HEADER_H + 8;
const BRACKET_W = 4 * COL_W + TROPHY_W;

export default function StreetCupScreen() {
  const router = useRouter();
  const { gameState, checkStreetCup, boostStreetCup, teamPower } = useGame();
  const cup = gameState?.streetCup;
  const [countdown, setCountdown] = useState('');
  const [now, setNow] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      checkStreetCup();
    }, [checkStreetCup])
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const n = new Date();
      setNow(n);
      const ms = getTimeUntilMatch(n);
      const hrs = Math.floor(ms / 3600000);
      const mins = Math.floor((ms % 3600000) / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setCountdown(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => { checkStreetCup(); }, 5000);
    return () => clearInterval(timer);
  }, [checkStreetCup]);

  const cupStart = cup?.cupStartDate;
  const currentRound = getCurrentRound(now, cupStart);
  const matchTimePassed = hasMatchTimePassed(now);
  const playerAlive = cup ? isPlayerAlive(cup, currentRound > 0 ? Math.min(currentRound, 4) : 0) : true;
  const isRestDay = currentRound === 0;
  const cupDayIdx = cupStart ? getCupDayIndex(cupStart, now) : -1;
  const cupDaysLeft = cupStart ? Math.max(0, 5 - cupDayIdx) : null;

  const handleBoost = async () => {
    try {
      await showRewarded(() => { boostStreetCup(); }, 'street_cup_boost');
    } catch { /* ad not available — boost anyway in dev */ if (__DEV__) boostStreetCup(); }
  };

  if (!cup) {
    return (
      <View style={s.container}>
        <Header onBack={() => router.back()} />
        <View style={s.emptyContainer}>
          <Text style={s.emptyText}>Loading tournament...</Text>
        </View>
      </View>
    );
  }

  const boostedRounds: number[] = cup.boostedRounds ?? (cup.boostedRound != null ? [cup.boostedRound] : []);
  const isBoostedThisRound = boostedRounds.includes(currentRound);
  const canBoost = currentRound >= 1 && currentRound <= 4 && !matchTimePassed
    && !isBoostedThisRound && playerAlive;

  return (
    <View style={s.container}>
      <Header onBack={() => router.back()} />
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <StatusBanner
          isRestDay={isRestDay}
          currentRound={currentRound}
          matchTimePassed={matchTimePassed}
          playerAlive={playerAlive}
          countdown={countdown}
          cup={cup}
          teamName={gameState?.teamName ?? 'My Team'}
          teamCountry={gameState?.teamCountry || 'gb'}
          teamPowerVal={teamPower}
          cupDaysLeft={cupDaysLeft}
        />

        {/* Boost Button */}
        {currentRound >= 1 && currentRound <= 4 && !matchTimePassed && playerAlive && (
          <Pressable
            style={[s.boostBtn, !canBoost && s.boostBtnDisabled, isBoostedThisRound && s.boostBtnUsed]}
            onPress={handleBoost}
            disabled={!canBoost}
          >
            <LinearGradient
              colors={isBoostedThisRound ? ['#374151', '#1F2937'] as const : ['#374151', '#1F2937'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.boostGradient}
            >
              <Text style={s.boostEmoji}>{isBoostedThisRound ? '✅' : '🔥'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.boostTitle}>
                  {isBoostedThisRound ? 'Team Motivation Active' : 'Team Motivation'}
                </Text>
                <Text style={s.boostSub}>
                  {isBoostedThisRound ? '+15% power applied' : '+15% power for next match'}
                </Text>
              </View>
              {!isBoostedThisRound && (
                <LinearGradient
                  colors={['#F59E0B', '#D97706'] as const}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.freeBadge}
                >
                  <Text style={s.freeBadgeIcon}>🎬</Text>
                  <Text style={s.freeBadgeText}>FREE</Text>
                </LinearGradient>
              )}
            </LinearGradient>
          </Pressable>
        )}

        {/* Rewards Preview */}
        {currentRound >= 1 && currentRound <= 4 && (
          <RewardsBar round={4} />
        )}

        {/* Horizontal Bracket */}
        <BracketView
          cup={cup}
          currentRound={currentRound}
          matchTimePassed={matchTimePassed}
          teamName={gameState?.teamName ?? 'My Team'}
          teamCountry={gameState?.teamCountry || 'gb'}
          playerAlive={playerAlive}
        />

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ── Header ──
function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={s.header}>
      <View style={{ width: 36 }} />
      <Text style={s.headerTitle}>STREET CUP ONLINE</Text>
      <Pressable onPress={onBack} style={s.closeBtn} hitSlop={14}>
        <Ionicons name="close" size={22} color={CUP.textPrimary} />
      </Pressable>
    </View>
  );
}

// ── Status Banner ──
function StatusBanner({ isRestDay, currentRound, matchTimePassed, playerAlive, countdown, cup, teamName, teamCountry, teamPowerVal, cupDaysLeft }: {
  isRestDay: boolean; currentRound: number; matchTimePassed: boolean;
  playerAlive: boolean; countdown: string; cup: any; teamName: string; teamCountry: string; teamPowerVal: number; cupDaysLeft: number | null;
}) {
  if (isRestDay) {
    return (
      <LinearGradient colors={['#1E293B', '#0F172A'] as const} style={s.statusBanner}>
        <Text style={s.statusEmoji}>🌙</Text>
        <Text style={s.statusTitle}>Rest Day</Text>
        <Text style={s.statusSub}>New tournament round starts tomorrow</Text>
        <View style={s.countdownRow}>
          <Text style={s.countdownLabel}>Next match in</Text>
          <Text style={s.countdownText}>{countdown}</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!playerAlive) {
    let lostRound = 0;
    let opponentName = '???';
    let opponentCountry = 'gb';
    for (let r = 1; r <= 4; r++) {
      const pos = getPlayerMatchInRound(cup, r);
      if (pos < 0) break;
      const midx = getMatchIndex(r, pos);
      const res = cup.results[midx];
      if (res == null) break;
      const teams = getMatchTeams(cup, r, pos, teamName, teamCountry);
      const playerIsTop = teams.topIsPlayer;
      const playerWon = playerIsTop ? res === 'W' : res === 'L';
      if (!playerWon) {
        lostRound = r;
        opponentName = playerIsTop ? teams.bottomName : teams.topName;
        opponentCountry = playerIsTop ? teams.bottomCountry : teams.topCountry;
        break;
      }
    }
    const reward = lostRound > 0 ? STREET_CUP_REWARDS[lostRound - 1] : null;
    let playerScore = 0;
    let oppScore = 0;
    if (lostRound > 0) {
      const pos = getPlayerMatchInRound(cup, lostRound);
      if (pos >= 0) {
        const midx = getMatchIndex(lostRound, pos);
        const sc = cup.scores?.[midx];
        if (sc) {
          const teams2 = getMatchTeams(cup, lostRound, pos, teamName, teamCountry);
          if (teams2.topIsPlayer) { playerScore = sc[0]; oppScore = sc[1]; }
          else { playerScore = sc[1]; oppScore = sc[0]; }
        }
      }
    }
    return (
      <LinearGradient colors={['#7F1D1D', '#450A0A'] as const} style={s.statusBanner}>
        <Text style={s.preMatchRound}>{lostRound > 0 ? getRoundLabel(lostRound) : 'ELIMINATED'}</Text>
        {lostRound > 0 && (
          <View style={s.preMatchRow}>
            <View style={s.preMatchTeam}>
              <Image source={{ uri: getFlagUrl(teamCountry) }} style={s.preMatchFlag} />
              <Text style={[s.preMatchName, { color: CUP.red }]} numberOfLines={1}>{teamName}</Text>
              <Text style={[s.preMatchPower, { color: 'rgba(255,255,255,0.5)' }]}>LOSS</Text>
            </View>
            <View style={s.postMatchScoreBox}>
              <Text style={s.postMatchScore}>{playerScore} - {oppScore}</Text>
            </View>
            <View style={s.preMatchTeam}>
              <Image source={{ uri: getFlagUrl(opponentCountry) }} style={s.preMatchFlag} />
              <Text style={[s.preMatchName, { color: CUP.green }]} numberOfLines={1}>{opponentName}</Text>
              <Text style={[s.preMatchPower, { color: 'rgba(255,255,255,0.5)' }]}>WIN</Text>
            </View>
          </View>
        )}
        {reward && (reward.loseMoney > 0 || reward.loseCrystals > 0) && (
          <Text style={s.eliminatedReward}>
            Consolation: {formatMoney(reward.loseMoney)}
            {reward.loseCrystals > 0 ? ` +${reward.loseCrystals}\uD83D\uDC8E` : ''}
          </Text>
        )}
        {cupDaysLeft != null && cupDaysLeft > 0 && (
          <View style={s.countdownRow}>
            <Text style={s.countdownLabel}>New tournament in</Text>
            <Text style={s.countdownText}>{cupDaysLeft}d {countdown}</Text>
          </View>
        )}
      </LinearGradient>
    );
  }

  if (matchTimePassed) {
    const playerMatch = getPlayerMatchInRound(cup, currentRound);
    const matchIdx = playerMatch >= 0 ? getMatchIndex(currentRound, playerMatch) : -1;
    const result = matchIdx >= 0 ? cup.results[matchIdx] : null;

    if (result === 'W') {
      const reward = STREET_CUP_REWARDS[currentRound - 1];
      const nextRound = currentRound + 1;
      let nextOppName = '???';
      let nextOppCountry = 'gb';
      let nextOppPower = 0;
      if (nextRound <= 4) {
        const nextPos = getPlayerMatchInRound(cup, nextRound);
        if (nextPos >= 0) {
          const nextTeams = getMatchTeams(cup, nextRound, nextPos, teamName, teamCountry);
          nextOppName = nextTeams.topIsPlayer ? nextTeams.bottomName : nextTeams.topName;
          nextOppCountry = nextTeams.topIsPlayer ? nextTeams.bottomCountry : nextTeams.topCountry;
          nextOppPower = getOpponentPowerForMatch(cup, nextRound, nextPos);
        }
      }
      return (
        <LinearGradient colors={['#14532D', '#052E16'] as const} style={s.statusBanner}>
          <Text style={s.preMatchRound}>
            {getRoundLabel(currentRound)} won • +{formatMoney(reward?.winMoney ?? 0)}
            {(reward?.winCrystals ?? 0) > 0 ? <Text> +{reward?.winCrystals}<CurrencyIcon type="diamond" size={12} /></Text> : null}
            {(reward?.winTrophies ?? 0) > 0 ? ` +${reward?.winTrophies}🏆` : ''}
          </Text>
          {currentRound < 4 ? (
            <>
              <Text style={[s.statusTitle, { fontSize: 16, marginTop: 8, marginBottom: 4 }]}>Next: {getRoundLabel(nextRound)}</Text>
              <View style={s.preMatchRow}>
                <View style={s.preMatchTeam}>
                  <Image source={{ uri: getFlagUrl(teamCountry) }} style={s.preMatchFlag} />
                  <Text style={s.preMatchName} numberOfLines={1}>{teamName}</Text>
                  <Text style={s.preMatchPower}>⚡ {teamPowerVal}</Text>
                </View>
                <View style={s.preMatchVs}>
                  <Text style={s.preMatchVsText}>VS</Text>
                </View>
                <View style={s.preMatchTeam}>
                  <Image source={{ uri: getFlagUrl(nextOppCountry) }} style={s.preMatchFlag} />
                  <Text style={s.preMatchName} numberOfLines={1}>{nextOppName}</Text>
                  <Text style={s.preMatchPower}>⚡ {nextOppPower}</Text>
                </View>
              </View>
              <View style={s.countdownRow}>
                <Text style={[s.countdownLabel, { color: 'rgba(255,255,255,0.7)' }]}>Starts in</Text>
                <Text style={s.countdownText}>{countdown}</Text>
              </View>
            </>
          ) : (
            <Text style={[s.statusTitle, { marginTop: 8 }]}>🏆 Cup Winner!</Text>
          )}
        </LinearGradient>
      );
    } else if (result === 'L') {
      const reward = STREET_CUP_REWARDS[currentRound - 1];
      const teams = playerMatch >= 0 ? getMatchTeams(cup, currentRound, playerMatch, teamName, teamCountry) : null;
      const sc = matchIdx >= 0 ? cup.scores?.[matchIdx] : null;
      let pScore = 0;
      let oScore = 0;
      let oppN = '???';
      let oppC = 'gb';
      if (teams && sc) {
        if (teams.topIsPlayer) { pScore = sc[0]; oScore = sc[1]; oppN = teams.bottomName; oppC = teams.bottomCountry; }
        else { pScore = sc[1]; oScore = sc[0]; oppN = teams.topName; oppC = teams.topCountry; }
      }
      return (
        <LinearGradient colors={['#7F1D1D', '#450A0A'] as const} style={s.statusBanner}>
          <Text style={s.preMatchRound}>{getRoundLabel(currentRound)}</Text>
          <View style={s.preMatchRow}>
            <View style={s.preMatchTeam}>
              <Image source={{ uri: getFlagUrl(teamCountry) }} style={s.preMatchFlag} />
              <Text style={[s.preMatchName, { color: CUP.red }]} numberOfLines={1}>{teamName}</Text>
              <Text style={[s.preMatchPower, { color: 'rgba(255,255,255,0.5)' }]}>LOSS</Text>
            </View>
            <View style={s.postMatchScoreBox}>
              <Text style={s.postMatchScore}>{pScore} - {oScore}</Text>
            </View>
            <View style={s.preMatchTeam}>
              <Image source={{ uri: getFlagUrl(oppC) }} style={s.preMatchFlag} />
              <Text style={[s.preMatchName, { color: CUP.green }]} numberOfLines={1}>{oppN}</Text>
              <Text style={[s.preMatchPower, { color: 'rgba(255,255,255,0.5)' }]}>WIN</Text>
            </View>
          </View>
          {reward && (reward.loseMoney > 0 || reward.loseCrystals > 0) && (
            <Text style={s.eliminatedReward}>
              Consolation: {formatMoney(reward.loseMoney)}
              {reward.loseCrystals > 0 ? <Text> +{reward.loseCrystals}<CurrencyIcon type="diamond" size={12} /></Text> : null}
            </Text>
          )}
          {cupDaysLeft != null && cupDaysLeft > 0 && (
            <View style={s.countdownRow}>
              <Text style={s.countdownLabel}>New tournament in</Text>
              <Text style={s.countdownText}>{cupDaysLeft}d {countdown}</Text>
            </View>
          )}
        </LinearGradient>
      );
    }

    return (
      <LinearGradient colors={['#1E293B', '#0F172A'] as const} style={s.statusBanner}>
        <Text style={s.statusEmoji}>⚽</Text>
        <Text style={s.statusTitle}>{getRoundLabel(currentRound)}</Text>
        <Text style={s.statusSub}>Match completed</Text>
      </LinearGradient>
    );
  }

  // Before match time
  const playerPos = getPlayerMatchInRound(cup, currentRound);
  const matchup = playerPos >= 0 ? getMatchTeams(cup, currentRound, playerPos, teamName, teamCountry) : null;
  const oppPower = playerPos >= 0 ? getOpponentPowerForMatch(cup, currentRound, playerPos) : 0;
  const oppName = matchup ? (matchup.topIsPlayer ? matchup.bottomName : matchup.topName) : '???';
  const oppCountryCode = matchup ? (matchup.topIsPlayer ? matchup.bottomCountry : matchup.topCountry) : 'gb';

  return (
    <LinearGradient colors={['#F97316', '#EA580C'] as const} style={s.statusBanner}>
      <Text style={s.preMatchRound}>{getRoundLabel(currentRound)}</Text>
      <View style={s.preMatchRow}>
        <View style={s.preMatchTeam}>
          <Image source={{ uri: getFlagUrl(teamCountry) }} style={s.preMatchFlag} />
          <Text style={s.preMatchName} numberOfLines={1}>{teamName}</Text>
          <Text style={s.preMatchPower}>⚡ {teamPowerVal}</Text>
        </View>
        <View style={s.preMatchVs}>
          <Text style={s.preMatchVsText}>VS</Text>
        </View>
        <View style={s.preMatchTeam}>
          <Image source={{ uri: getFlagUrl(oppCountryCode) }} style={s.preMatchFlag} />
          <Text style={s.preMatchName} numberOfLines={1}>{oppName}</Text>
          <Text style={s.preMatchPower}>⚡ {oppPower}</Text>
        </View>
      </View>
      <View style={s.countdownRow}>
        <Text style={[s.countdownLabel, { color: 'rgba(255,255,255,0.8)' }]}>Starts in</Text>
        <Text style={s.countdownText}>{countdown}</Text>
      </View>
    </LinearGradient>
  );
}

// ── Rewards Bar ──
function RewardsBar({ round }: { round: number }) {
  const reward = STREET_CUP_REWARDS[round - 1];
  if (!reward) return null;
  return (
    <View style={s.rewardBar}>
      <Text style={s.rewardLabel}>Cup Reward:</Text>
      <Text style={s.rewardValue}>{formatMoney(reward.winMoney)}</Text>
      {reward.winCrystals > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Text style={s.rewardValue}>+{reward.winCrystals}</Text><CurrencyIcon type="diamond" size={14} /></View>}
      {reward.winTrophies > 0 && <Text style={s.rewardValue}>+{reward.winTrophies}🏆</Text>}
    </View>
  );
}

// ── Bracket View (horizontal tournament bracket) ──
function BracketView({ cup, currentRound, matchTimePassed, teamName, teamCountry, playerAlive }: {
  cup: any; currentRound: number; matchTimePassed: boolean;
  teamName: string; teamCountry: string; playerAlive: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);

  // Compute player match positions for highlighting path
  const playerPosInRound: number[] = [];
  for (let r = 1; r <= 4; r++) {
    playerPosInRound.push(getPlayerMatchInRound(cup, r));
  }

  // Auto-scroll to current round
  useEffect(() => {
    if (currentRound >= 2) {
      const targetX = Math.max(0, (currentRound - 1) * COL_W - 30);
      setTimeout(() => scrollRef.current?.scrollTo({ x: targetX, animated: true }), 350);
    }
  }, [currentRound]);

  const roundLabels = ['Round of 16', 'Quarter-Finals', 'Semi-Finals', 'Final'];

  return (
    <View style={s.bracketContainer}>
      <Text style={s.bracketTitle}>Tournament Bracket</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ width: BRACKET_W, height: BRACKET_TOTAL_H }}
      >
        {/* Round headers */}
        {[0, 1, 2, 3].map(ri => (
          <View key={`hdr-${ri}`} style={{
            position: 'absolute',
            left: ri * COL_W,
            top: 0,
            width: MATCH_W,
            alignItems: 'center',
          }}>
            <Text style={[
              s.bracketRoundLabel,
              ri + 1 === currentRound && matchTimePassed && s.bracketRoundLabelActive,
            ]}>{roundLabels[ri]}</Text>
          </View>
        ))}

        {/* Connector lines */}
        {[0, 1, 2].map(ri => {
          const curr = B_POS[ri];
          const next = B_POS[ri + 1];
          const els: React.ReactNode[] = [];
          const startX = ri * COL_W + MATCH_W;
          const midX = startX + CONN_W / 2;

          for (let i = 0; i < next.length; i++) {
            const topMatchIdx = i * 2;
            const botMatchIdx = i * 2 + 1;
            const isPlayerPath = playerPosInRound[ri] === topMatchIdx || playerPosInRound[ri] === botMatchIdx;
            const lc = isPlayerPath ? LINE_COLOR_PLAYER : LINE_COLOR;

            const tY = B_HEADER_H + curr[topMatchIdx] + MATCH_H / 2;
            const bY = B_HEADER_H + curr[botMatchIdx] + MATCH_H / 2;
            const nY = B_HEADER_H + next[i] + MATCH_H / 2;

            // Horizontal from top match right edge to midpoint
            els.push(<View key={`ct-${ri}-${i}`} style={{
              position: 'absolute', left: startX, top: tY - LINE_W / 2,
              width: CONN_W / 2, height: LINE_W, backgroundColor: lc,
            }} />);
            // Horizontal from bottom match right edge to midpoint
            els.push(<View key={`cb-${ri}-${i}`} style={{
              position: 'absolute', left: startX, top: bY - LINE_W / 2,
              width: CONN_W / 2, height: LINE_W, backgroundColor: lc,
            }} />);
            // Vertical connecting top to bottom at midpoint
            els.push(<View key={`cv-${ri}-${i}`} style={{
              position: 'absolute', left: midX - LINE_W / 2, top: tY,
              width: LINE_W, height: bY - tY, backgroundColor: lc,
            }} />);
            // Horizontal from midpoint to next round match
            els.push(<View key={`cn-${ri}-${i}`} style={{
              position: 'absolute', left: midX, top: nY - LINE_W / 2,
              width: CONN_W / 2, height: LINE_W, backgroundColor: lc,
            }} />);
          }
          return els;
        })}

        {/* Final → Trophy connector */}
        {(() => {
          const finalY = B_HEADER_H + B_POS[3][0] + MATCH_H / 2;
          const startX = 3 * COL_W + MATCH_W;
          return (
            <View key="ct-final" style={{
              position: 'absolute', left: startX, top: finalY - LINE_W / 2,
              width: CONN_W, height: LINE_W, backgroundColor: LINE_COLOR,
            }} />
          );
        })()}

        {/* Match cards for each round */}
        {[0, 1, 2, 3].map(ri => {
          const round = ri + 1;
          const isUnplayed = round > currentRound || (round === currentRound && !matchTimePassed);
          // Only dim future rounds if player is eliminated
          const isFuture = isUnplayed && !playerAlive;
          const isActive = round === currentRound && matchTimePassed;
          return B_POS[ri].map((y, mi) => (
            <View key={`m-${ri}-${mi}`} style={{
              position: 'absolute',
              left: ri * COL_W,
              top: B_HEADER_H + y,
              width: MATCH_W,
              height: MATCH_H,
            }}>
              <BracketMatch
                round={round}
                posInRound={mi}
                cup={cup}
                isFuture={isFuture}
                isActive={isActive}
                teamName={teamName}
                teamCountry={teamCountry}
              />
            </View>
          ));
        })}

        {/* Trophy at the end */}
        <View style={{
          position: 'absolute',
          left: 4 * COL_W,
          top: B_HEADER_H + B_POS[3][0],
          width: TROPHY_W,
          height: MATCH_H,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 30 }}>🏆</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Bracket Match Card (compact) ──
function BracketMatch({ round, posInRound, cup, isFuture, isActive, teamName, teamCountry }: {
  round: number; posInRound: number; cup: any;
  isFuture: boolean; isActive: boolean; teamName: string; teamCountry: string;
}) {
  const matchIdx = getMatchIndex(round, posInRound);
  const result = cup.results[matchIdx];
  const score: [number, number] | null = cup.scores?.[matchIdx] ?? null;
  const playerMatchPos = getPlayerMatchInRound(cup, round);
  const isPlayerMatch = posInRound === playerMatchPos && playerMatchPos >= 0;

  const { topName, bottomName, topCountry, bottomCountry, topIsPlayer, bottomIsPlayer } =
    getMatchTeams(cup, round, posInRound, teamName, teamCountry);

  const topWon = result === 'W';
  const bottomWon = result === 'L';
  const hasResult = result != null;

  return (
    <View style={[
      s.bMatch,
      isPlayerMatch && s.bMatchPlayer,
      isActive && isPlayerMatch && s.bMatchActive,
      isFuture && s.bMatchFuture,
    ]}>
      <BracketTeamRow
        name={topName}
        country={topCountry}
        isPlayer={topIsPlayer}
        won={topWon && hasResult}
        lost={bottomWon && hasResult}
        isFuture={isFuture}
        score={score ? score[0] : null}
      />
      <View style={s.bDivider} />
      <BracketTeamRow
        name={bottomName}
        country={bottomCountry}
        isPlayer={bottomIsPlayer}
        won={bottomWon && hasResult}
        lost={topWon && hasResult}
        isFuture={isFuture}
        score={score ? score[1] : null}
      />
    </View>
  );
}

// ── Bracket Team Row ──
function BracketTeamRow({ name, country, isPlayer, won, lost, isFuture, score }: {
  name: string; country: string; isPlayer: boolean;
  won: boolean; lost: boolean; isFuture: boolean; score: number | null;
}) {
  return (
    <View style={[s.bTeamRow, won && s.bTeamRowWon, lost && s.bTeamRowLost]}>
      <Image source={{ uri: getFlagUrl(country) }} style={s.bFlag} />
      <Text
        style={[
          s.bTeamName,
          isPlayer && s.bTeamNamePlayer,
          won && s.bTeamNameWon,
          lost && s.bTeamNameLost,
          isFuture && !won && !lost && s.bTeamNameFuture,
        ]}
        numberOfLines={1}
      >
        {isPlayer ? `⭐ ${name}` : name}
      </Text>
      {score != null ? (
        <View style={[s.bScoreBox, won && s.bScoreBoxWon, lost && s.bScoreBoxLost]}>
          <Text style={[s.bScore, won && s.bScoreWon, lost && s.bScoreLost]}>{score}</Text>
        </View>
      ) : (
        <View style={s.bScoreBox}>
          <Text style={s.bScoreTbd}>{isFuture ? '' : '-'}</Text>
        </View>
      )}
    </View>
  );
}

// ── Helper: flag URL ──
function getFlagUrl(code: string): string {
  return 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Flag_of_Afghanistan_%282013%E2%80%932021%29.svg/960px-Flag_of_Afghanistan_%282013%E2%80%932021%29.svg.png' + code.toLowerCase() + '.png';
}

// ── Helper: get team names for a match ──
function getMatchTeams(
  cup: any, round: number, posInRound: number,
  teamName: string, teamCountry: string
): { topName: string; bottomName: string; topCountry: string; bottomCountry: string; topIsPlayer: boolean; bottomIsPlayer: boolean } {
  if (round === 1) {
    const topIdx = posInRound * 2;
    const botIdx = posInRound * 2 + 1;
    const topOpp = cup.bracket[topIdx];
    const botOpp = cup.bracket[botIdx];
    return {
      topName: topIdx === cup.playerSlot ? teamName : (topOpp?.name ?? 'TBD'),
      bottomName: botIdx === cup.playerSlot ? teamName : (botOpp?.name ?? 'TBD'),
      topCountry: topIdx === cup.playerSlot ? teamCountry : (topOpp?.country ?? 'gb'),
      bottomCountry: botIdx === cup.playerSlot ? teamCountry : (botOpp?.country ?? 'gb'),
      topIsPlayer: topIdx === cup.playerSlot,
      bottomIsPlayer: botIdx === cup.playerSlot,
    };
  }

  const topPrevPos = posInRound * 2;
  const botPrevPos = posInRound * 2 + 1;
  const topTeam = traceWinner(cup, round - 1, topPrevPos, teamName, teamCountry);
  const botTeam = traceWinner(cup, round - 1, botPrevPos, teamName, teamCountry);
  return {
    topName: topTeam.name,
    bottomName: botTeam.name,
    topCountry: topTeam.country,
    bottomCountry: botTeam.country,
    topIsPlayer: topTeam.isPlayer,
    bottomIsPlayer: botTeam.isPlayer,
  };
}

function traceWinner(
  cup: any, round: number, posInRound: number,
  teamName: string, teamCountry: string
): { name: string; country: string; isPlayer: boolean } {
  const matchIdx = getMatchIndex(round, posInRound);
  const result = cup.results[matchIdx];
  if (!result) return { name: '???', country: 'gb', isPlayer: false };

  const winnerIsTop = result === 'W';

  if (round === 1) {
    const slotIdx = posInRound * 2 + (winnerIsTop ? 0 : 1);
    if (slotIdx === cup.playerSlot) {
      return { name: teamName, country: teamCountry, isPlayer: true };
    }
    const opp = cup.bracket[slotIdx];
    return { name: opp?.name ?? 'Unknown', country: opp?.country ?? 'gb', isPlayer: false };
  }

  const prevPos = posInRound * 2 + (winnerIsTop ? 0 : 1);
  return traceWinner(cup, round - 1, prevPos, teamName, teamCountry);
}

// ── Styles ──
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CUP.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: CUP.orange,
    letterSpacing: 2,
    fontStyle: 'italic',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: CUP.textSecondary,
    fontSize: 16,
  },

  // Status Banner
  statusBanner: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  statusEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  statusSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  eliminatedReward: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  countdownLabel: {
    fontSize: 13,
    color: CUP.textSecondary,
  },
  countdownText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  preMatchRound: { fontSize: 13, fontWeight: '800', color: '#FFF', letterSpacing: 1, marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  preMatchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 8 },
  preMatchTeam: { flex: 1, alignItems: 'center', gap: 4 },
  preMatchFlag: { width: 32, height: 22, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  preMatchName: { fontSize: 13, fontWeight: '800', color: '#FFF', textAlign: 'center', maxWidth: 100, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  preMatchPower: { fontSize: 12, fontWeight: '700', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  preMatchVs: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  preMatchVsText: { fontSize: 13, fontWeight: '900', color: '#FFF' },
  postMatchScoreBox: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginHorizontal: 4, alignItems: 'center' as const, justifyContent: 'center' as const },
  postMatchScore: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3, fontVariant: ['tabular-nums'] as any },

  // Boost
  boostBtn: { borderRadius: Radius.md, overflow: 'hidden', marginBottom: Spacing.md },
  boostBtnDisabled: { opacity: 0.5 },
  boostBtnUsed: { opacity: 0.7 },
  boostGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: 12 },
  boostEmoji: { fontSize: 28 },
  boostTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  boostSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  freeBadgeIcon: { fontSize: 14 },
  freeBadgeText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },

  // Rewards
  rewardBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CUP.card,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: CUP.cardBorder,
  },
  rewardLabel: { fontSize: 13, color: CUP.textSecondary, fontWeight: '600' },
  rewardValue: { fontSize: 14, fontWeight: '800', color: CUP.gold },

  // Bracket container
  bracketContainer: {
    marginTop: Spacing.sm,
  },
  bracketTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: CUP.textPrimary,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  bracketRoundLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: CUP.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  bracketRoundLabelActive: {
    color: CUP.orange,
  },

  // Bracket Match Card
  bMatch: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(160,180,220,0.25)',
    backgroundColor: '#2A3968',
    overflow: 'hidden',
  },
  bMatchPlayer: {
    borderColor: CUP.orange,
    borderWidth: 1.5,
  },
  bMatchActive: {
    borderColor: CUP.green,
    borderWidth: 1.5,
  },
  bMatchFuture: {
    opacity: 0.35,
    backgroundColor: 'rgba(160,180,220,0.08)',
  },
  bDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(160,180,220,0.2)',
  },

  // Bracket Team Row
  bTeamRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5,
    gap: 3,
  },
  bTeamRowWon: {
    backgroundColor: 'rgba(240,244,255,0.92)',
  },
  bTeamRowLost: {
    backgroundColor: '#1E2D52',
  },
  bFlag: {
    width: 16,
    height: 11,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  bTeamName: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: '#D0D8F0',
  },
  bTeamNamePlayer: {
    color: CUP.orange,
    fontWeight: '800',
  },
  bTeamNameWon: {
    color: '#1A2340',
    fontWeight: '800',
  },
  bTeamNameLost: {
    color: '#5B6A9A',
  },
  bTeamNameFuture: {
    color: '#5B6A9A',
  },
  bScoreBox: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  bScoreBoxWon: {
    backgroundColor: 'rgba(200,210,230,0.85)',
  },
  bScoreBoxLost: {
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  bScore: {
    fontSize: 11,
    fontWeight: '900',
    color: '#D0D8F0',
  },
  bScoreWon: {
    color: '#1A2340',
  },
  bScoreLost: {
    color: '#5B6A9A',
  },
  bScoreTbd: {
    fontSize: 9,
    color: '#5B6A9A',
  },
});
