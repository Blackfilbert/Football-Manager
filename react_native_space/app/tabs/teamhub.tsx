import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Colors, Spacing } from '../../src/theme';
import TransfersScreen from '../../src/screens/TransfersScreen';
import TeamScreen from '../../src/screens/TeamScreen';
import ScoutScreen from '../../src/screens/ScoutScreen';
import { useGame } from '../../src/context/GameContext';
import { SCOUT_TRAINING, SCOUT_CHANCES } from '../../src/constants';
import TutorialOverlay from '../../src/components/TutorialOverlay';
import { Player } from '../../src/types';

const SLOT_POSITIONS = ['GK', 'LD', 'CD', 'CD', 'RD', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'];

function hasBenchUpgrade(players: Player[], startingIds: string[]): boolean {
  const idSet = new Set(startingIds);
  const starters = startingIds.map(id => players.find(p => p?.id === id)).filter(Boolean) as Player[];
  const bench = players.filter(p => !idSet.has(p?.id ?? ''));
  if (bench.length === 0 || starters.length === 0) return false;
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
      const starterEff = slot.inPos ? (slot.player.overall ?? 0) : Math.floor((slot.player.overall ?? 0) * 0.5);
      const bpInPos = (bp?.position ?? '') === slot.pos;
      const bpEff = bpInPos ? (bp?.overall ?? 0) : Math.floor((bp?.overall ?? 0) * 0.5);
      if (bpEff > starterEff) return true;
    }
  }
  return false;
}

type SubTab = 'transfers' | 'myteam' | 'scout';

const SUB_TABS: { key: SubTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'transfers', label: 'Transfers', icon: 'swap-horizontal' },
  { key: 'myteam', label: 'My Team', icon: 'people' },
  { key: 'scout', label: 'Scout', icon: 'search' },
];

export default function TeamHubScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<SubTab>('myteam');
  const [tutBuyDismissed, setTutBuyDismissed] = useState(false);
  const [tutPlaceDismissed, setTutPlaceDismissed] = useState(false);
  const [tutScoutDismissed, setTutScoutDismissed] = useState(false);
  const [tutSkipDismissed, setTutSkipDismissed] = useState(false);
  const insets = useSafeAreaInsets();
  const { gameState, setTutorialStep } = useGame();
  const tutStep = gameState?.tutorialStep;

  // Apply tab from query param
  useEffect(() => {
    if (params.tab === 'myteam' || params.tab === 'transfers' || params.tab === 'scout') {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  // Auto-switch tab for tutorial
  useEffect(() => {
    if (tutStep === 'transfer_buy') setActiveTab('transfers');
    else if (tutStep === 'transfer_place') setActiveTab('myteam');
    else if (tutStep === 'scout_hint' || tutStep === 'scout_upgrade' || tutStep === 'scout_skip') setActiveTab('scout');
  }, [tutStep]);

  // Badges
  const showTransferBadge = !!(gameState?.marketUnlocked && !gameState?.marketNotifSeen);
  const showTeamBadge = useMemo(() =>
    hasBenchUpgrade(gameState?.players ?? [], gameState?.startingIds ?? []),
    [gameState?.players, gameState?.startingIds],
  );
  const scoutLevel = gameState?.scoutLevel ?? 1;
  const isTraining = !!gameState?.scoutTrainingStart;
  const isMaxScout = scoutLevel >= 10;
  const scoutConfig = SCOUT_TRAINING?.find(t => t?.fromLevel === scoutLevel);
  const showScoutBadge = !isMaxScout && !isTraining && !!scoutConfig && (gameState?.money ?? 0) >= (scoutConfig?.cost ?? Infinity);

  // Block Scout tab until first transfer purchase
  const scoutLocked = !(gameState?.hasEverBoughtPlayer ?? false);

  const badges: Record<SubTab, boolean> = {
    transfers: showTransferBadge,
    myteam: showTeamBadge,
    scout: showScoutBadge,
  };

  return (
    <View style={s.container}>
      <View style={s.content}>
        {activeTab === 'transfers' && <TransfersScreen />}
        {activeTab === 'myteam' && <TeamScreen />}
        {activeTab === 'scout' && <ScoutScreen />}
      </View>
      <View style={[s.subTabBar]}>
        {SUB_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const locked = tab.key === 'scout' && scoutLocked;
          return (
            <Pressable
              key={tab.key}
              style={[s.subTab, isActive && s.subTabActive, locked && { opacity: 0.4 }]}
              onPress={() => { if (!locked) setActiveTab(tab.key); }}
            >
              <View>
                <Ionicons
                  name={locked ? 'lock-closed' : tab.icon}
                  size={18}
                  color={isActive ? Colors.primary : Colors.textMuted}
                />
                {badges[tab.key] && !locked && <View style={s.badge} />}
              </View>
              <Text
                style={[
                  s.subTabLabel,
                  isActive && s.subTabLabelActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Tutorial overlays */}
      <TutorialOverlay
        visible={tutStep === 'transfer_buy' && !tutBuyDismissed}
        emoji="🛒"
        text="Buy Your First Player!"
        subText="Find the affordable player at the top of the list and tap 'Buy'."
        buttonText="OK"
        onPress={() => setTutBuyDismissed(true)}
        position="top"
      />
      <TutorialOverlay
        visible={tutStep === 'transfer_place' && !tutPlaceDismissed}
        emoji="⚽"
        text="Great Signing!"
        subText="Now swap your new player into the starting lineup — tap a starter, then tap the new player on the bench."
        buttonText="OK"
        onPress={() => setTutPlaceDismissed(true)}
        position="top"
      />
      <TutorialOverlay
        visible={tutStep === 'scout_hint'}
        emoji="🔍"
        text="Upgrade Your Scout!"
        subText="A better scout finds higher-rated players in transfers. Let's upgrade for free!"
        buttonText="Let's Go!"
        onPress={() => setTutorialStep('scout_upgrade')}
      />
      <TutorialOverlay
        visible={tutStep === 'scout_upgrade' && !tutScoutDismissed}
        emoji="⬆️"
        text="Tap 'Upgrade' to improve your scout!"
        subText="This first upgrade is free. Better scouts unlock rarer players."
        buttonText="OK"
        onPress={() => setTutScoutDismissed(true)}
        position="top"
      />
      <TutorialOverlay
        visible={tutStep === 'scout_skip' && !tutSkipDismissed}
        emoji="⏩"
        text="Skip the training time!"
        subText="Tap 'Speed Up' to finish instantly — it's free this time!"
        buttonText="OK"
        onPress={() => setTutSkipDismissed(true)}
        position="top"
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 6,
    paddingBottom: 4,
  },
  subTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  subTabActive: {
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    marginTop: -1,
  },
  subTabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  subTabLabelActive: {
    color: Colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#FFF',
  },
});
