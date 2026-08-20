import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, Image, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../theme';
import { LEAGUES } from '../constants';
import FlagIcon from './FlagIcon';

const IMG_MONEY = require('../../assets/images/currency_money.png');
const IMG_DIAMOND = require('../../assets/images/currency_diamond.png');
const IMG_FAME = require('../../assets/images/currency_fame.png');
const IMG_TROPHY = require('../../assets/images/trophy_icon.png');
const IMG_STAFF_NORMAL = require('../../assets/images/staff_chest_normal.png');
const IMG_STAFF_EPIC = require('../../assets/images/staff_chest_epic.png');
const IMG_BOX_NORMAL = require('../../assets/images/box_normal.png');
const IMG_BOX_ELITE = require('../../assets/images/box_elite.png');
const IMG_KEY = require('../../assets/images/key_regular.png');
const IMG_KEY_GOLD = require('../../assets/images/key_gold.png');

// Reward types and their display config
type RewardType = 'gold' | 'crystals' | 'fame' | 'trophies' | 'staff_normal' | 'staff_epic' | 'box_normal' | 'box_elite' | 'keys' | 'keys_gold';

const REWARD_ICONS: Record<RewardType, ImageSourcePropType> = {
  gold: IMG_MONEY,
  crystals: IMG_DIAMOND,
  fame: IMG_FAME,
  trophies: IMG_TROPHY,
  staff_normal: IMG_STAFF_NORMAL,
  staff_epic: IMG_STAFF_EPIC,
  box_normal: IMG_BOX_NORMAL,
  box_elite: IMG_BOX_ELITE,
  keys: IMG_KEY,
  keys_gold: IMG_KEY_GOLD,
};

const REWARD_BG: Record<RewardType, string> = {
  gold: '#FEF3C7',
  crystals: '#EDE9FE',
  fame: '#FCE7F3',
  trophies: '#DBEAFE',
  staff_normal: '#E0F2FE',
  staff_epic: '#F3E8FF',
  box_normal: '#DBEAFE',
  box_elite: '#FEF3C7',
  keys: '#F0FDF4',
  keys_gold: '#FEF9C3',
};

const REWARD_BORDER: Record<RewardType, string> = {
  gold: '#F59E0B',
  crystals: '#8B5CF6',
  fame: '#EC4899',
  trophies: '#3B82F6',
  staff_normal: '#0EA5E9',
  staff_epic: '#A855F7',
  box_normal: '#3B82F6',
  box_elite: '#D97706',
  keys: '#22C55E',
  keys_gold: '#EAB308',
};

interface StadiumReward {
  type: RewardType;
  amount: number;
  label?: string; // short display label like "10K"
}

function formatRewardAmount(type: RewardType, amount: number): string {
  if (type === 'gold') {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
    if (amount >= 1_000) return `${Math.floor(amount / 1_000)}K`;
    return amount.toString();
  }
  return amount.toString();
}

// Stadium rewards table: index = league id (0 = starting, no reward)
const STADIUM_REWARDS: (StadiumReward | null)[] = [
  null,                                          // 0: Street Pitch (starting)
  { type: 'gold', amount: 10_000 },              // 1: City Stadium — софта
  { type: 'fame', amount: 50 },                  // 2: Valletta
  { type: 'box_normal', amount: 3 },             // 3: Nicosia
  { type: 'box_elite', amount: 1 },              // 4: Reykjavik
  { type: 'crystals', amount: 25 },              // 5: Ljubljana ★
  { type: 'staff_normal', amount: 3 },           // 6: Sofia
  { type: 'trophies', amount: 5 },               // 7: Belgrade
  { type: 'keys', amount: 10 },                  // 8: Zagreb
  { type: 'box_normal', amount: 5 },             // 9: Eindhoven
  { type: 'crystals', amount: 35 },              // 10: Porto ★
  { type: 'fame', amount: 200 },                 // 11: Sevilla
  { type: 'staff_epic', amount: 1 },             // 12: Glasgow
  { type: 'box_elite', amount: 2 },              // 13: Marseille
  { type: 'keys_gold', amount: 5 },              // 14: Dortmund
  { type: 'crystals', amount: 45 },              // 15: Lisbon ★
  { type: 'gold', amount: 500_000 },             // 16: Amsterdam
  { type: 'staff_normal', amount: 5 },           // 17: Istanbul
  { type: 'trophies', amount: 15 },              // 18: Naples
  { type: 'box_elite', amount: 3 },              // 19: Buenos Aires
  { type: 'crystals', amount: 55 },              // 20: Turin ★
  { type: 'fame', amount: 500 },                 // 21: Liverpool
  { type: 'staff_epic', amount: 2 },             // 22: Milan
  { type: 'keys_gold', amount: 10 },             // 23: Munich
  { type: 'box_normal', amount: 10 },            // 24: Paris
  { type: 'crystals', amount: 65 },              // 25: Rio ★
  { type: 'gold', amount: 2_000_000 },           // 26: Manchester
  { type: 'staff_epic', amount: 3 },             // 27: London
  { type: 'trophies', amount: 30 },              // 28: Barcelona
  { type: 'crystals', amount: 75 },              // 29: Madrid ★
];

const REWARD_LABELS: Record<RewardType, string> = {
  gold: 'Gold',
  crystals: 'Diamonds',
  fame: 'Fame Tokens',
  trophies: 'Trophies',
  staff_normal: 'Staff Chests',
  staff_epic: 'Epic Staff Chests',
  box_normal: 'Player Boxes',
  box_elite: 'Elite Player Boxes',
  keys: 'Keys',
  keys_gold: 'Gold Keys',
};

export { STADIUM_REWARDS, REWARD_ICONS, REWARD_LABELS, REWARD_BG, REWARD_BORDER, formatRewardAmount };
export type { StadiumReward, RewardType };

const ROW_HEIGHT = 64;

interface Props {
  visible: boolean;
  currentIndex: number;
  maxReached: number;
  canPromote: boolean;
  onPromote: () => void;
  onClose: () => void;
}

export default function LocationsModal({ visible, currentIndex, maxReached, canPromote, onPromote, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // Scroll so current stadium is visible (roughly centered)
  useEffect(() => {
    if (visible && scrollRef.current) {
      setTimeout(() => {
        // List is reversed: top = last stadium, bottom = first
        const reversedIdx = LEAGUES.length - 1 - currentIndex;
        const y = Math.max(0, reversedIdx * ROW_HEIGHT - 120);
        scrollRef.current?.scrollTo({ y, animated: true });
      }, 250);
    }
  }, [visible, currentIndex]);

  const nextIndex = currentIndex + 1;
  const canAdvance = canPromote && nextIndex < LEAGUES.length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.overlay}>
        {/* Tap-to-close area above sheet */}
        <Pressable style={s.overlayTap} onPress={onClose} />
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Handle bar */}
          <View style={s.handleBar} />
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Stadiums</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* List — bottom to top (reversed) */}
          <ScrollView ref={scrollRef} style={s.list} showsVerticalScrollIndicator={false}>
            {[...LEAGUES].reverse().map((loc) => {
              const isCurrent = loc.id === currentIndex;
              const isUnlocked = loc.id <= maxReached;
              const isLocked = loc.id > maxReached;
              const isNext = loc.id === nextIndex;
              const reward = STADIUM_REWARDS[loc.id] ?? null;
              const rewardClaimed = loc.id <= maxReached; // already been to this stadium

              return (
                <View key={loc.id} style={[s.row, isCurrent && s.rowCurrent]}>
                  {/* Left: stadium info */}
                  <View style={s.rowLeft}>
                    <FlagIcon code={loc.flag ?? ''} size={20} />
                    <View style={s.rowInfo}>
                      <Text style={[s.locName, isCurrent && s.locNameCurrent, isLocked && s.locNameLocked]} numberOfLines={1}>
                        {loc.name}
                      </Text>
                      <View style={s.locMetaRow}>
                        <Text style={s.locMeta}>{loc.city}  · </Text>
                        <Image source={IMG_MONEY} style={s.moneyIcon} />
                        <Text style={s.locMetaMult}>×{loc.multiplier}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Center: status */}
                  <View style={s.rowCenter}>
                    {isCurrent && (
                      <View style={s.currentBadge}>
                        <Text style={s.currentBadgeText}>HERE</Text>
                      </View>
                    )}
                    {isNext && canAdvance && (
                      <Pressable style={s.advanceBtn} onPress={() => { onPromote(); onClose(); }}>
                        <Text style={s.advanceBtnText}>Move</Text>
                      </Pressable>
                    )}
                    {!isCurrent && isUnlocked && !isNext && (
                      <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                    )}
                    {isLocked && !(isNext && canAdvance) && (
                      <Ionicons name="lock-closed" size={16} color={Colors.textMuted} />
                    )}
                  </View>

                  {/* Right: reward box */}
                  {reward ? (
                    <View style={[
                      s.rewardBox,
                      { backgroundColor: rewardClaimed ? '#F3F4F6' : (REWARD_BG[reward.type] ?? '#F3F4F6') },
                      { borderColor: rewardClaimed ? '#D1D5DB' : (REWARD_BORDER[reward.type] ?? '#D1D5DB') },
                    ]}>
                      <Image
                        source={REWARD_ICONS[reward.type]}
                        style={[s.rewardIcon, rewardClaimed && { opacity: 0.4 }]}
                      />
                      <Text style={[s.rewardAmount, rewardClaimed && { color: Colors.textMuted }]}>
                        {formatRewardAmount(reward.type, reward.amount)}
                      </Text>
                      {rewardClaimed && (
                        <View style={s.rewardCheck}>
                          <Ionicons name="checkmark" size={10} color="#22C55E" />
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={s.rewardBoxEmpty} />
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayTap: {
    height: '15%',
  },
  sheet: {
    flex: 1,
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: Spacing.md,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.dark,
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    minHeight: ROW_HEIGHT,
    gap: 6,
  },
  rowCurrent: {
    backgroundColor: Colors.primary + '12',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  rowInfo: {
    flex: 1,
  },
  locName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.dark,
  },
  locNameCurrent: {
    color: Colors.primary,
  },
  locNameLocked: {
    color: Colors.textMuted,
  },
  locMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  locMeta: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  moneyIcon: {
    width: 11,
    height: 11,
    marginRight: 2,
  },
  locMetaMult: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22C55E',
  },
  rowCenter: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  advanceBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  advanceBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  // Reward box
  rewardBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rewardIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  rewardAmount: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.dark,
    marginTop: 1,
  },
  rewardCheck: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardBoxEmpty: {
    width: 44,
    height: 44,
  },
});