import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Colors, Spacing, Radius, cardShadow } from '../theme';
import { Player } from '../types';
import { RARITY_CONFIG, ILLNESS_TYPES } from '../constants';
import { formatMoney } from '../utils';
import CurrencyIcon from './CurrencyIcon';

const FLAG_CDN = 'https://flagcdn.com/w40/';

interface Props {
  player: Player;
  onAction?: () => void;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  actionColor?: string;
  actionDisabled?: boolean;
  showIncome?: boolean;
}

function PlayerCard({ player, onAction, actionLabel, actionIcon, actionColor, actionDisabled, showIncome }: Props) {
  const rarity = RARITY_CONFIG?.[player?.rarity ?? 'common'] ?? RARITY_CONFIG.common;
  const flagCode = (player?.country ?? 'br').toLowerCase();
  const illnessInfo = player?.illness ? ILLNESS_TYPES.find(i => i.type === player.illness?.type) : null;
  const isHealing = !!(player?.illness?.healingUntil && player.illness.healingUntil > Date.now());

  return (
    <View style={s.card}>
      {/* Rating circle */}
      <View style={[s.ratingCircle, { borderColor: rarity?.color ?? '#94A3B8' }]}>
        <Text style={s.posText}>{player?.position ?? 'CM'}</Text>
        <Text style={[s.ratingText, { color: rarity?.color ?? '#94A3B8' }]}>
          {player?.overall ?? 0}
        </Text>
        {illnessInfo && !isHealing && (
          <View style={s.illnessBadge}>
            <Text style={s.illnessEmoji}>{illnessInfo.emoji}</Text>
          </View>
        )}
        {isHealing && (
          <View style={s.healingBadge}>
            <Text style={s.healingCross}>✚</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>
          {player?.firstName ?? ''} {player?.lastName ?? ''}
        </Text>
        <View style={s.badges}>
          <View style={[s.rarityBadge, { backgroundColor: (rarity?.color ?? '#94A3B8') + '20' }]}>
            <Text style={[s.rarityText, { color: rarity?.color ?? '#94A3B8' }]}>
              {rarity?.label ?? 'Common'}
            </Text>
          </View>
          <Text style={s.levelText}>Lv. {player?.level ?? 1}</Text>
        </View>
        <View style={s.stats}>
          <Text style={s.atkStat}>⚔️ {player?.attack ?? 0}</Text>
          <Text style={s.defStat}>🛡️ {player?.defense ?? 0}</Text>
          <Image
            source={{ uri: FLAG_CDN + flagCode + '.png' }}
            style={s.flagIcon}
          />
          {showIncome && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><CurrencyIcon type="money" size={14} /><Text style={s.incomeStat}>{formatMoney(player?.income ?? 0)}/s</Text></View>
          )}
        </View>
        {illnessInfo && !isHealing && (
          <Text style={s.illnessText}>{illnessInfo.emoji} {illnessInfo.label} — {Math.round((player?.illness?.effectiveness ?? 1) * 100)}% eff.</Text>
        )}
        {isHealing && (
          <Text style={s.healingText}>✚ Healing...</Text>
        )}
      </View>

      {/* Action button */}
      {actionLabel && onAction && (
        <Pressable
          style={[
            s.actionBtn,
            { backgroundColor: actionColor ?? Colors.primary },
            actionDisabled && s.disabledBtn,
          ]}
          onPress={onAction}
          disabled={actionDisabled}
          accessibilityLabel={actionLabel}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            {actionIcon}
            <Text style={[s.actionText, actionDisabled && s.disabledText]}>
              {actionLabel}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

export default React.memo(PlayerCard);

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    ...cardShadow,
  },
  ratingCircle: {
    width: 44,
    height: 48,
    borderRadius: 22,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    marginRight: Spacing.md,
    paddingVertical: 2,
  },
  posText: { fontSize: 8, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.5 },
  ratingText: { fontSize: 16, fontWeight: '800', marginTop: -1 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.dark, marginBottom: 2 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  rarityBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  rarityText: { fontSize: 10, fontWeight: '700' },
  levelText: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  atkStat: { fontSize: 11, color: Colors.danger },
  defStat: { fontSize: 11, color: Colors.primary },
  flagIcon: { width: 18, height: 13, borderRadius: 2 },
  illnessBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FEF2F2', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FCA5A5' },
  illnessEmoji: { fontSize: 10 },
  illnessText: { fontSize: 9, fontWeight: '700', color: '#EF4444', marginTop: 2 },
  healingBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#F0FDF4', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#86EFAC' },
  healingCross: { fontSize: 10, color: '#22C55E', fontWeight: '900' },
  healingText: { fontSize: 9, fontWeight: '700', color: '#22C55E', marginTop: 2 },
  incomeStat: { fontSize: 11, color: Colors.green },
  actionBtn: {
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: Spacing.sm,
  },
  disabledBtn: { opacity: 0.5 },
  actionText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  disabledText: { color: '#E2E8F0' },
});
