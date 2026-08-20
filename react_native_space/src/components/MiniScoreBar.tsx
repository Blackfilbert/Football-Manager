import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useGame } from '../context/GameContext';
import { Colors, Spacing } from '../theme';
import { MATCH_DURATION } from '../constants';
import { calculateWinChance } from '../utils';

export default function MiniScoreBar() {
  const { matchState, displayScore, gameState, teamPower, winChance } = useGame();
  const teamColor = gameState?.teamColor ?? Colors.primary;

  const matchTime = matchState?.matchTime ?? 0;
  const isPlaying = matchTime > 0 && matchTime <= MATCH_DURATION;
  const footballMinute = Math.min(90, Math.round((Math.min(matchTime, MATCH_DURATION) / MATCH_DURATION) * 90));

  const homeScore = displayScore.home;
  const awayScore = displayScore.away;
  const teamName = gameState?.teamName ?? 'My Team';
  const oppName = matchState?.opponentName ?? 'Opponent';
  const oppPower = matchState?.opponentPower ?? 0;

  // Pulse animation on goal
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevScoreRef = useRef(homeScore + awayScore);

  useEffect(() => {
    const total = homeScore + awayScore;
    if (total > prevScoreRef.current) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
    prevScoreRef.current = total;
  }, [homeScore, awayScore]);

  return (
    <Animated.View style={[s.container, { transform: [{ scale: pulseAnim }] }]}>
      {/* Home */}
      <View style={s.teamSide}>
        <Text style={[s.teamName, { color: teamColor }]} numberOfLines={1}>
          ({teamPower}) {teamName.toUpperCase()}
        </Text>
        <Text style={[s.winPct, { color: teamColor }]}>win chance {Math.round(winChance)}%</Text>
      </View>

      {/* Score */}
      <View style={s.center}>
        <View style={s.scoreRow}>
          <Text style={[s.score, { color: teamColor }]}>{homeScore}</Text>
          <Text style={s.minute}>{isPlaying ? `${footballMinute}'` : 'FT'}</Text>
          <Text style={[s.score, { color: Colors.danger }]}>{awayScore}</Text>
        </View>
      </View>

      {/* Away */}
      <View style={[s.teamSide, { alignItems: 'flex-end' }]}>
        <View style={s.awayNameRow}>
          <Text style={[s.teamName, { color: Colors.danger, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
            {oppName}
          </Text>
          <Text style={[s.teamName, { color: Colors.danger, flexShrink: 0 }]}> ({oppPower})</Text>
        </View>
        <Text style={[s.winPct, { color: Colors.danger }]}>win chance {Math.round(100 - winChance)}%</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  teamSide: {
    flex: 1,
  },
  teamName: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  awayNameRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  winPct: {
    fontSize: 8,
    fontWeight: '600',
    opacity: 0.7,
    marginTop: 1,
  },
  center: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  score: {
    fontSize: 18,
    fontWeight: '900',
  },
  minute: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
});
