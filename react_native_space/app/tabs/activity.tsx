import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, ImageBackground, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../../src/theme';
import MiniScoreBar from '../../src/components/MiniScoreBar';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../../src/context/GameContext';
import { useRouter } from 'expo-router';
import TutorialOverlay from '../../src/components/TutorialOverlay';
import { SKILL_COSTS, SKILL_MAX_LEVEL, LEAGUES } from '../../src/constants';
import { getTimeUntilMatch, getCurrentRound, hasMatchTimePassed, getRoundLabel, isPlayerAlive, getCupDayIndex } from '../../src/streetCupHelpers';
import { STREET_CUP_CYCLE_DAYS } from '../../src/constants';

type Activity = {
  id: string;
  title: string;
  subtitle: string;
  image: any;
  locked: boolean;
  lockText?: string;
  accentColor: string;
  gradientColors: readonly [string, string];
  isNew?: boolean;
  hasNotif?: boolean;
};

export default function ActivityScreen() {
  const router = useRouter();
  const { gameState, markCareerModeSeen, teamPower, setTutorialStep } = useGame();
  const scoutLevel = gameState?.scoutLevel ?? 1;
  const careerUnlocked = scoutLevel >= 3;
  const careerIsNew = careerUnlocked && !(gameState?.careerModeSeen ?? false);

  // Battle pass unclaimed notification
  const BP_POWERS = [500,600,700,800,900,1000,1100,1200,1300,1400,1500,1600,1700,1800,1900];
  const freeClaimed = gameState?.battlePassClaimed ?? [];
  const hasUnclaimedBP = careerUnlocked && BP_POWERS.some((p, i) => !freeClaimed.includes(i) && teamPower >= p);
  const streetUnlocked = gameState?.streetCupUnlocked ?? false;

  // VGP notification — check if attempts available OR VP rewards claimable
  const [vgpHasNotif, setVgpHasNotif] = useState(false);
  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('vgp_state').then(raw => {
      if (!raw) { setVgpHasNotif(true); return; } // default state has 3 attempts
      try {
        const st = JSON.parse(raw);
        const hasAttempts = (st.attempts ?? 0) > 0;
        // Check VP claimable rewards
        const { getVpLevelInfo, VP_TIERS } = require('../../src/valorGP/constants');
        const vpLvl = getVpLevelInfo(st.vpXp ?? 0).level;
        const freeCl: number[] = st.vpFreeClaimed ?? [];
        const grandCl: number[] = st.vpGrandClaimed ?? [];
        const goldCl: number[] = st.vpGoldClaimed ?? [];
        const hasVpClaim =
          VP_TIERS.some((t: any, i: number) => i < vpLvl && !freeCl.includes(i) && t.f > 0) ||
          (st.vpGrandPurchased && VP_TIERS.some((t: any, i: number) => i < vpLvl && !grandCl.includes(i) && t.g > 0)) ||
          (st.vpGoldPurchased && VP_TIERS.some((t: any, i: number) => i < vpLvl && !goldCl.includes(i) && t.d > 0));
        setVgpHasNotif(hasAttempts || hasVpClaim);
      } catch { setVgpHasNotif(false); }
    }).catch(() => {});
  }, []));

  // Check if player can upgrade any skill
  const cp = gameState?.careerPlayer;
  const trophies = gameState?.trophies ?? 0;
  const canUpgradeSkill = !!cp && trophies >= 1 && (['shot','pass','dribbling','speed','stamina','tactics'] as const).some(
    sk => (cp.skills[sk] ?? 0) < SKILL_MAX_LEVEL && trophies >= (SKILL_COSTS[cp.skills[sk] ?? 0] ?? 999)
  );

  // Street Cup countdown — only show for player's own upcoming matches
  const cup = gameState?.streetCup;
  const [streetCountdown, setStreetCountdown] = useState('');
  const [streetStatus, setStreetStatus] = useState('');
  const [showStreetTimer, setShowStreetTimer] = useState(false);
  useEffect(() => {
    if (!streetUnlocked) return;
    const update = () => {
      const now = new Date();
      const cupStart = cup?.cupStartDate;
      const round = getCurrentRound(now, cupStart);
      const passed = hasMatchTimePassed(now);

      let alive = true;
      if (!cup) {
        setStreetStatus('New tournament');
        setShowStreetTimer(true);
      } else {
        const checkRound = passed ? Math.min(round, 4) : Math.max(0, round - 1);
        alive = isPlayerAlive(cup, checkRound);

        if (!alive) {
          setStreetStatus('Eliminated');
          setShowStreetTimer(true);
        } else if (round === 0) {
          setStreetStatus('Rest day');
          setShowStreetTimer(true);
        } else if (passed) {
          if (round < 4) {
            setStreetStatus(getRoundLabel(round + 1));
          } else {
            setStreetStatus('Cup winner! 🏆');
          }
          setShowStreetTimer(true);
        } else {
          setStreetStatus(getRoundLabel(round));
          setShowStreetTimer(true);
        }
      }

      const ms = getTimeUntilMatch(now);
      const hrs = Math.floor(ms / 3600000);
      const mins = Math.floor((ms % 3600000) / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      const hms = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      if (!alive && cupStart) {
        const dayIdx = getCupDayIndex(cupStart, now);
        const dl = Math.max(0, STREET_CUP_CYCLE_DAYS - dayIdx);
        setStreetCountdown(`${dl}d ${hms}`);
      } else {
        setStreetCountdown(hms);
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [streetUnlocked, cup, showStreetTimer]);

  const ACTIVITIES: Activity[] = [
    {
      id: 'career',
      title: 'CAREER MODE',
      subtitle: 'Train your career player to become a sports star',
      image: require('../../assets/career_mode.png'),
      locked: !careerUnlocked,
      lockText: 'Reach Scout LV.3 to unlock',
      accentColor: '#6366F1',
      gradientColors: ['rgba(99,102,241,0.85)', 'rgba(99,102,241,0.1)'] as const,
      isNew: careerIsNew,
      hasNotif: hasUnclaimedBP,
    },
    {
      id: 'valor',
      title: 'VALOR GRAND PRIX',
      subtitle: '5v5 battles for Valor tokens',
      image: require('../../assets/valor_gp.png'),
      locked: (gameState?.maxLeagueReached ?? 0) < 2,
      lockText: `Reach ${LEAGUES[2]?.name ?? 'Stadium 3'} to unlock`,
      accentColor: '#E11D48',
      gradientColors: ['rgba(225,29,72,0.85)', 'rgba(225,29,72,0.1)'] as const,
      hasNotif: vgpHasNotif,
    },
    {
      id: 'street',
      title: 'STREET CUP ONLINE',
      subtitle: 'Compete in gritty street football tournaments',
      image: require('../../assets/street_cup.png'),
      locked: (gameState?.leagueIndex ?? 0) < 2,
      lockText: `Reach ${LEAGUES[2]?.name ?? 'Stadium 3'} to unlock`,
      accentColor: '#F97316',
      gradientColors: ['rgba(249,115,22,0.85)', 'rgba(249,115,22,0.1)'] as const,
    },
    {
      id: 'country',
      title: 'COUNTRY CUP',
      subtitle: 'Represent your nation in the national championship',
      image: require('../../assets/country_cup.png'),
      locked: true,
      lockText: 'Reach Stadium 1 to unlock',
      accentColor: '#22C55E',
      gradientColors: ['rgba(34,197,94,0.85)', 'rgba(34,197,94,0.1)'] as const,
    },
    {
      id: 'champions',
      title: 'CHAMPIONS CUP',
      subtitle: 'The ultimate tournament for elite clubs',
      image: require('../../assets/champions_cup.png'),
      locked: true,
      lockText: 'Reach Premier Stadium to unlock',
      accentColor: '#EAB308',
      gradientColors: ['rgba(234,179,8,0.85)', 'rgba(234,179,8,0.1)'] as const,
    },
  ];

  const handlePress = (act: Activity) => {
    if (act.id === 'career') {
      if (careerIsNew) markCareerModeSeen();
      router.push('/tabs/career');
    } else if (act.id === 'street') {
      router.push('/tabs/streetcup');
    } else if (act.id === 'valor') {
      router.push('/tabs/valorgp');
    }
  };

  return (
    <View style={s.container}>
      <MiniScoreBar />
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Activities</Text>

        {ACTIVITIES.map((act) => (
          <Pressable
            key={act.id}
            style={({ pressed }) => [s.card, pressed && !act.locked && s.cardPressed]}
            disabled={act.locked}
            onPress={() => handlePress(act)}
          >
            <ImageBackground
              source={act.image}
              style={s.cardBg}
              imageStyle={[s.cardImage, act.locked && s.cardImageLocked]}
              resizeMode="cover"
            >
              <LinearGradient
                colors={act.locked ? ['rgba(30,30,30,0.92)', 'rgba(30,30,30,0.6)'] as const : act.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.gradient}
              >
                {act.locked ? (
                  <View style={s.lockedContent}>
                    <Ionicons name="lock-closed" size={32} color="#6B7280" />
                    <Text style={s.lockedTitle}>{act.title}</Text>
                    <Text style={s.lockedSubtitle}>{act.lockText}</Text>
                  </View>
                ) : (
                  <View style={s.unlockedContent}>
                    <View style={s.titleRow}>
                      <Text style={s.cardTitle}>{act.title}</Text>
                      {act.isNew && (
                        <View style={s.newBadge}>
                          <Text style={s.newBadgeText}>NEW</Text>
                        </View>
                      )}
                    </View>
                    {act.id === 'street' && streetUnlocked ? (
                      <View style={s.streetInfoRow}>
                        <Text style={s.cardSubtitle}>{streetStatus}</Text>
                        {showStreetTimer && (
                          <View style={s.countdownPill}>
                            <Ionicons name="time-outline" size={12} color="#FFF" />
                            <Text style={s.countdownPillText}>{streetCountdown}</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <Text style={s.cardSubtitle}>{act.subtitle}</Text>
                    )}
                  </View>
                )}
              </LinearGradient>
            </ImageBackground>
            {act.hasNotif && !act.locked && (
              <View style={s.notifDot} />
            )}
          </Pressable>
        ))}

        <View style={s.comingSoon}>
          <Text style={s.comingSoonText}>MORE COMING SOON!</Text>
        </View>
      </ScrollView>

      <TutorialOverlay
        visible={gameState?.tutorialStep === 'career_go'}
        emoji="🏃"
        text="Open Career Mode!"
        subText="Tap 'Career Mode' to create your personal player and start training!"
        buttonText="Open Career"
        onPress={() => { setTutorialStep('career_trophies'); markCareerModeSeen(); router.push('/tabs/career'); }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'ios' ? 44 : 28,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  cardBg: {
    width: '100%',
    height: 140,
  },
  cardImage: {
    borderRadius: Radius.lg,
  },
  cardImageLocked: {
    opacity: 0.3,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.md,
  },
  unlockedContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    fontStyle: 'italic',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFF',
    zIndex: 10,
  },
  newBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  cardSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  lockedContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#9CA3AF',
    marginTop: 8,
    letterSpacing: 1,
  },
  lockedSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  streetInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  countdownPillText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  comingSoon: {
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: Spacing.xs,
  },
  comingSoonText: {
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});
