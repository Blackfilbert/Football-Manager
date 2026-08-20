import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert, ActivityIndicator, TextInput, ScrollView, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, Radius, cardShadow } from '../../src/theme';
import { useGame } from '../../src/context/GameContext';
import { formatMoney, formatNumber } from '../../src/utils';
import { TEAM_COLORS, COUNTRIES } from '../../src/constants';
import CurrencyIcon from '../../src/components/CurrencyIcon';

const FLAG_CDN = 'https://flagcdn.com/w40/';

export default function SettingsScreen() {
  const {
    gameState, resetGame, incomePerSecond, matchProgression,
    claimDailyReward, updateTeamName, updateTeamColor, updateTeamCountry, updateTeamLogo,
    cheatAddMoney, cheatAddCrystals, addKeys, cheatScoutUp, cheatResetStreetCup, cheatLeagueUp, cheatUnlockActivities, cheatEndSeason,
  } = useGame();
  const [resetting, setResetting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(gameState?.teamName ?? 'My Team');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const today = new Date().toISOString().split('T')[0] ?? '';
  const dailyClaimed = gameState?.lastLoginDate === today;
  const teamColor = gameState?.teamColor ?? '#3B82F6';
  const teamCountry = gameState?.teamCountry ?? '';
  const teamLogo = gameState?.teamLogo ?? null;

  const handleReset = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('\u26a0\ufe0f Reset Game?\n\nAll progress will be lost! This cannot be undone.')) {
        doReset();
      }
    } else {
      Alert.alert(
        '\u26a0\ufe0f Reset Game',
        'All progress will be lost! This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reset', style: 'destructive', onPress: doReset },
        ],
      );
    }
  };

  const doReset = async () => {
    setResetting(true);
    await resetGame();
    setNameInput('My Team');
    setResetting(false);
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed.length > 0) {
      updateTeamName(trimmed);
    } else {
      setNameInput(gameState?.teamName ?? 'My Team');
    }
    setEditingName(false);
  };

  const handlePickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.5,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        updateTeamLogo(result.assets[0].uri);
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <Ionicons name="person" size={28} color={Colors.dark} />
        <Text style={s.headerTitle}>Manager</Text>
      </View>

      {/* Team Identity — Logo + Name combined */}
      <View style={[s.card, !(gameState?.teamNameSet) && s.highlightCard]}>
        <View style={s.identityRow}>
          {/* Left: Logo */}
          <View style={s.logoCol}>
            <Pressable style={[s.logoCircle, { borderColor: teamColor }]} onPress={handlePickLogo}>
              {teamLogo ? (
                <Image source={{ uri: teamLogo }} style={s.logoImage} />
              ) : (
                <Ionicons name="shield" size={32} color={teamColor} />
              )}
            </Pressable>
            <Text style={s.logoHint}>Tap to upload</Text>
          </View>

          {/* Right: Name */}
          <View style={s.nameCol}>
            <View style={s.nameRow}>
              {editingName ? (
                <TextInput
                  style={s.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  maxLength={24}
                  autoFocus
                  onBlur={handleSaveName}
                  onSubmitEditing={handleSaveName}
                  returnKeyType="done"
                  placeholder="Enter team name"
                  placeholderTextColor={Colors.textMuted}
                />
              ) : (
                <Text style={[s.nameText, { color: teamColor }]} numberOfLines={1}>{gameState?.teamName ?? 'My Team'}</Text>
              )}
              <Pressable
                style={s.editBtn}
                onPress={() => {
                  if (editingName) {
                    handleSaveName();
                  } else {
                    setNameInput(gameState?.teamName ?? 'My Team');
                    setEditingName(true);
                  }
                }}
              >
                <Ionicons name={editingName ? 'checkmark' : 'pencil'} size={18} color={Colors.primary} />
              </Pressable>
              {!(gameState?.teamNameSet) && <View style={s.redDot} />}
            </View>
            {teamCountry ? (
              <Image source={{ uri: FLAG_CDN + teamCountry.toLowerCase() + '.png' }} style={s.teamFlag} />
            ) : null}
          </View>
        </View>
      </View>

      {/* Team Color */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🎨 Team Color</Text>
        <View style={s.colorGrid}>
          {TEAM_COLORS.map(c => (
            <Pressable
              key={c}
              style={[
                s.colorDot,
                { backgroundColor: c },
                c === '#FFFFFF' && s.colorDotWhite,
                teamColor === c && s.colorDotSelected,
              ]}
              onPress={() => updateTeamColor(c)}
            >
              {teamColor === c && (
                <Ionicons name="checkmark" size={14} color={c === '#FFFFFF' || c === '#F59E0B' ? '#000' : '#FFF'} />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* Team Country */}
      <View style={s.card}>
        <Pressable style={s.countryHeader} onPress={() => setShowCountryPicker(!showCountryPicker)}>
          <Text style={s.cardTitle}>🌍 Team Country</Text>
          <View style={s.countrySelected}>
            {teamCountry ? (
              <Image source={{ uri: FLAG_CDN + teamCountry.toLowerCase() + '.png' }} style={s.countryFlagSmall} />
            ) : (
              <Text style={s.countryNone}>None</Text>
            )}
            <Ionicons name={showCountryPicker ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
          </View>
        </Pressable>
        {showCountryPicker && (
          <View style={s.countryGrid}>
            <Pressable
              style={[s.countryItem, !teamCountry && s.countryItemSelected]}
              onPress={() => { updateTeamCountry(''); setShowCountryPicker(false); }}
            >
              <Text style={s.countryNoneLabel}>None</Text>
            </Pressable>
            {COUNTRIES.map(c => (
              <Pressable
                key={c.code}
                style={[s.countryItem, teamCountry === c.code && s.countryItemSelected]}
                onPress={() => { updateTeamCountry(c.code); setShowCountryPicker(false); }}
              >
                <Image source={{ uri: FLAG_CDN + c.code.toLowerCase() + '.png' }} style={s.countryFlag} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Daily Reward */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🎁 Daily Login Reward</Text>
        {dailyClaimed ? (
          <Text style={s.claimedText}>✅ Claimed today!</Text>
        ) : (
          <Pressable style={s.claimBtn} onPress={claimDailyReward}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text style={s.claimBtnText}>Claim 10</Text><CurrencyIcon type="diamond" size={16} /></View>
          </Pressable>
        )}
      </View>

      {/* Game Stats */}
      <View style={s.card}>
        <Text style={s.cardTitle}>📊 Game Stats</Text>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Balance</Text>
          <Text style={s.statValue}>{formatMoney(gameState?.money ?? 0)}</Text>
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Income/s</Text>
          <Text style={[s.statValue, { color: Colors.green }]}>{formatMoney(incomePerSecond)}</Text>
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Crystals</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><CurrencyIcon type="diamond" size={14} /><Text style={[s.statValue, { color: Colors.cyan }]}>{formatNumber(gameState?.crystals ?? 0)}</Text></View>
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Total Earned</Text>
          <Text style={s.statValue}>{formatMoney(gameState?.totalEarned ?? 0)}</Text>
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>League</Text>
          <Text style={s.statValue}>{matchProgression?.leagueEmoji} {matchProgression?.leagueName}</Text>
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Record</Text>
          <Text style={s.statValue}>{gameState?.matchWins ?? 0}W / {gameState?.matchDraws ?? 0}D / {gameState?.matchLosses ?? 0}L</Text>
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Match</Text>
          <Text style={s.statValue}>{matchProgression?.matchInLeague}/{matchProgression?.totalMatchesInLeague}</Text>
        </View>
      </View>

      {/* Privacy & Legal */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🔒 Privacy & Legal</Text>
        {Platform.OS !== 'web' && (
          <Pressable
            style={({ pressed }) => [s.privacyBtn, pressed && { opacity: 0.7 }]}
            onPress={() => {
              try {
                const { showPrivacySettings } = require('../../src/services/ads');
                showPrivacySettings();
              } catch (_) {}
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color="#FFF" />
            <Text style={s.privacyBtnText}>Manage Privacy Settings</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [s.privacyBtn, pressed && { opacity: 0.7 }]}
          onPress={() => Linking.openURL('https://payge.games/privacypolicy')}
        >
          <Ionicons name="document-text-outline" size={18} color="#FFF" />
          <Text style={s.privacyBtnText}>Privacy Policy</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.privacyBtn, pressed && { opacity: 0.7 }]}
          onPress={() => Linking.openURL('https://payge.games/tos')}
        >
          <Ionicons name="reader-outline" size={18} color="#FFF" />
          <Text style={s.privacyBtnText}>Terms of Service</Text>
        </Pressable>
      </View>

      {/* Dev Cheats – only in development */}
      {__DEV__ && (
      <View style={s.card}>
        <Text style={s.cardTitle}>🛠️ Dev Cheats</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <Pressable style={s.cheatBtn} onPress={() => cheatAddMoney(100000)}><Text style={s.cheatBtnText}>+$100K</Text></Pressable>
          <Pressable style={s.cheatBtn} onPress={() => cheatAddMoney(1000000)}><Text style={s.cheatBtnText}>+$1M</Text></Pressable>
          <Pressable style={s.cheatBtn} onPress={() => cheatAddCrystals(100)}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Text style={s.cheatBtnText}>+100</Text><CurrencyIcon type="diamond" size={14} /></View></Pressable>
          <Pressable style={s.cheatBtn} onPress={() => cheatAddCrystals(1000)}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Text style={s.cheatBtnText}>+1K</Text><CurrencyIcon type="diamond" size={14} /></View></Pressable>
          <Pressable style={s.cheatBtn} onPress={() => addKeys('regular', 10)}><Text style={s.cheatBtnText}>+10 Keys</Text></Pressable>
          <Pressable style={s.cheatBtn} onPress={() => addKeys('gold', 10)}><Text style={s.cheatBtnText}>+10 Gold Keys</Text></Pressable>
          <Pressable style={s.cheatBtn} onPress={() => cheatScoutUp()}><Text style={s.cheatBtnText}>Scout +1</Text></Pressable>
          <Pressable style={s.cheatBtn} onPress={() => cheatLeagueUp()}><Text style={s.cheatBtnText}>League Up</Text></Pressable>
          <Pressable style={s.cheatBtn} onPress={() => cheatResetStreetCup()}><Text style={s.cheatBtnText}>Reset Cup</Text></Pressable>
          <Pressable style={[s.cheatBtn, { backgroundColor: '#F59E0B' }]} onPress={() => cheatEndSeason()}><Text style={s.cheatBtnText}>🏆 End Season</Text></Pressable>
          <Pressable style={[s.cheatBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => cheatUnlockActivities()}><Text style={s.cheatBtnText}>🔓 Unlock Activities</Text></Pressable>
        </View>
      </View>
      )}

      <View style={s.card}>
        <Text style={s.cardTitle}>⚠️ Reset Game</Text>
        <Pressable
          style={({ pressed }) => [s.resetButton, pressed && s.resetButtonPressed]}
          onPress={handleReset}
          disabled={resetting}
          accessibilityLabel="Reset game to start from zero"
        >
          {resetting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color="#FFF" />
              <Text style={s.resetButtonText}>Start Game From Zero</Text>
            </>
          )}
        </Pressable>
      </View>

      <Text style={s.version}>Football Manager Tycoon v1.0</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.dark,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...cardShadow,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  highlightCard: {
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },

  // Identity combined
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoCol: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  logoImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  logoHint: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 3,
  },
  nameCol: {
    flex: 1,
    gap: 4,
  },
  teamFlag: {
    width: 24,
    height: 16,
    borderRadius: 2,
    marginTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Color picker
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotWhite: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  colorDotSelected: {
    borderWidth: 2.5,
    borderColor: Colors.dark,
  },

  // Country picker
  countryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countrySelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countryFlagSmall: {
    width: 24,
    height: 16,
    borderRadius: 2,
  },
  countryNone: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.md,
  },
  countryItem: {
    width: 40,
    height: 30,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  countryItemSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  countryFlag: {
    width: 28,
    height: 19,
    borderRadius: 2,
  },
  countryNoneLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
  },

  // Daily reward
  claimedText: {
    fontSize: 14,
    color: Colors.green,
    fontWeight: '600',
  },
  claimBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  claimBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  // Stats
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  privacyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  privacyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.danger,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
  },
  resetButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  cheatBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cheatBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
  },
});
