import React, { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import { useGame } from '../../src/context/GameContext';
import { SCOUT_TRAINING, SKILL_COSTS, SKILL_MAX_LEVEL, STAFF_CARDS, STAFF_LEVEL_TROPHY_COST, STAFF_MAX_LEVEL } from '../../src/constants';
import { Player } from '../../src/types';

function TabIcon({ name, label, color, badge }: { name: keyof typeof Ionicons.glyphMap; label: string; color: string; badge?: boolean }) {
  return (
    <View style={tabStyles.iconContainer}>
      <View>
        <Ionicons name={name} size={22} color={color} />
        {badge && <View style={tabStyles.badge} />}
      </View>
      <Text style={[tabStyles.label, { color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    minWidth: 58,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
});

const SLOT_POSITIONS = ['GK', 'LD', 'CD', 'CD', 'RD', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'];

function hasBenchUpgrade(players: Player[], startingIds: string[]): boolean {
  const idSet = new Set(startingIds);
  const starters = startingIds.map(id => players.find(p => p?.id === id)).filter(Boolean) as Player[];
  const bench = players.filter(p => !idSet.has(p?.id ?? ''));
  if (bench.length === 0 || starters.length === 0) return false;

  // Assign starters to slots (simplified: match positions first)
  const slots = SLOT_POSITIONS.map(pos => ({ pos, player: null as Player | null, inPos: false }));
  const unassigned = [...starters];
  for (const slot of slots) {
    const idx = unassigned.findIndex(p => p?.position === slot.pos);
    if (idx >= 0) { slot.player = unassigned[idx]; slot.inPos = true; unassigned.splice(idx, 1); }
  }
  for (const slot of slots) {
    if (!slot.player && unassigned.length > 0) { slot.player = unassigned.shift()!; slot.inPos = false; }
  }

  for (const bp of bench) {
    for (const slot of slots) {
      if (!slot.player) continue;
      const illMod = slot.player.illness ? slot.player.illness.effectiveness : 1;
      const starterEff = Math.floor((slot.player.overall ?? 0) * illMod * (slot.inPos ? 1 : 0.5));
      const bpIllMod = bp?.illness ? bp.illness.effectiveness : 1;
      const bpInPos = (bp?.position ?? '') === slot.pos;
      const bpEff = Math.floor((bp?.overall ?? 0) * bpIllMod * (bpInPos ? 1 : 0.5));
      if (bpEff > starterEff) return true;
    }
  }
  return false;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);
  const { gameState } = useGame();
  const showTransferBadge = !!(gameState?.marketUnlocked && !gameState?.marketNotifSeen);
  const showSettingsBadge = !(gameState?.teamNameSet ?? false);

  const showTeamBadge = useMemo(() =>
    hasBenchUpgrade(gameState?.players ?? [], gameState?.startingIds ?? []),
    [gameState?.players, gameState?.startingIds],
  );

  const hasSickPlayers = useMemo(() =>
    (gameState?.players ?? []).some(p => !!p.illness),
    [gameState?.players],
  );

  // Scout badge: can afford training & not already training
  const scoutLevel = gameState?.scoutLevel ?? 1;
  const isTraining = !!gameState?.scoutTrainingStart;
  const isMaxScout = scoutLevel >= 10;
  const scoutConfig = SCOUT_TRAINING?.find(t => t?.fromLevel === scoutLevel);
  const showScoutBadge = !isMaxScout && !isTraining && !!scoutConfig && (gameState?.money ?? 0) >= (scoutConfig?.cost ?? Infinity);

  // Activity badge: career mode unlocked but not yet seen, OR can upgrade skills
  const cp = gameState?.careerPlayer;
  const trophies = gameState?.trophies ?? 0;
  const canUpgradeAnySkill = !!cp && trophies >= 1 && (['shot','pass','dribbling','speed','stamina','tactics'] as const).some(
    sk => (cp.skills[sk] ?? 0) < SKILL_MAX_LEVEL && trophies >= (SKILL_COSTS[cp.skills[sk] ?? 0] ?? 999)
  );
  const BP_POWERS = [500,600,700,800,900,1000,1100,1200,1300,1400,1500,1600,1700,1800,1900];
  const freeClaimed = gameState?.battlePassClaimed ?? [];
  const teamPower = (gameState?.players ?? []).filter(p => (gameState?.startingIds ?? []).includes(p.id)).reduce((s, p) => s + (p.overall ?? 0), 0);
  const hasUnclaimedBP = (scoutLevel >= 3) && BP_POWERS.some((p, i) => !freeClaimed.includes(i) && teamPower >= p);
  const showActivityBadge = ((scoutLevel >= 3) && !(gameState?.careerModeSeen ?? false)) || canUpgradeAnySkill || hasUnclaimedBP;
  const showStaffBadge = useMemo(() => {
    if ((gameState?.freeStaffOpens ?? 0) > 0) return true;
    const gsFame = gameState?.fame ?? 0;
    const gsStaff = gameState?.staff ?? {};
    return STAFF_CARDS.some(c => {
      const own = gsStaff[c.id];
      if (!own || own.copies <= 0) return false;
      return own.level < STAFF_MAX_LEVEL && gsFame >= STAFF_LEVEL_TROPHY_COST(own.level);
    });
  }, [gameState?.freeStaffOpens, gameState?.fame, gameState?.staff]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 56 + bottomPad,
          paddingBottom: bottomPad,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" label="Home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="teamhub"
        options={{
          title: 'Team',
          tabBarIcon: ({ color }) => <TabIcon name="people" label="Team" color={color} badge={showTeamBadge || showTransferBadge || showScoutBadge || hasSickPlayers} />,
        }}
      />
      <Tabs.Screen
        name="transfers"
        options={{ title: 'Transfers', href: null }}
      />
      <Tabs.Screen
        name="team"
        options={{ title: 'My Team', href: null }}
      />
      <Tabs.Screen
        name="scout"
        options={{ title: 'Scout', href: null }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: 'Staff',
          href: (gameState?.leagueIndex ?? 0) >= 1 ? undefined : null,
          tabBarIcon: ({ color }) => <TabIcon name="briefcase" label="Staff" color={color} badge={showStaffBadge} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <TabIcon name="flash" label="Activity" color={color} badge={showActivityBadge} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => {
            const freeStaff = (gameState?.freeStaffOpens ?? 0) > 0 && (gameState?.leagueIndex ?? 0) >= 1;
            const FOUR_H = 4 * 60 * 60 * 1000;
            const rawStep = gameState?.freeMoneyShopStep ?? 0;
            const lastFMC = gameState?.lastFreeMoneyShopClaim ?? 0;
            const goldStep = rawStep === 2 && Date.now() >= (lastFMC + FOUR_H) ? 0 : rawStep;
            const freeGold = goldStep === 0 || goldStep === 1;
            return <TabIcon name="cart" label="Shop" color={color} badge={freeStaff || freeGold} />;
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Manager',
          href: null,
        }}
      />
      <Tabs.Screen
        name="ratings"
        options={{
          title: 'Ratings',
          href: null,
        }}
      />
      <Tabs.Screen
        name="career"
        options={{
          title: 'Career',
          href: null,
        }}
      />
      <Tabs.Screen
        name="streetcup"
        options={{
          title: 'Street Cup Online',
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="valorgp"
        options={{
          title: 'Valor Grand Prix',
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
