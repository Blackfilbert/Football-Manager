import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, Alert, Dimensions, Image, Modal, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../../src/context/GameContext';
import { Colors, Spacing } from '../../src/theme';
import { LEAGUES, STAFF_CARDS } from '../../src/constants';
import { formatMoneyRaw, formatNumber, generatePackPlayer } from '../../src/utils';
import { LinearGradient } from 'expo-linear-gradient';
import MiniScoreBar from '../../src/components/MiniScoreBar';
import CurrencyIcon from '../../src/components/CurrencyIcon';
import NotEnoughCrystalsModal from '../../src/components/NotEnoughCrystalsModal';
import ChestOpenModal from '../../src/components/ChestOpenModal';
import { StaffBoxOfferModal, EpicStaffOfferModal } from '../../src/components/StaffOfferModal';
import { trackEvent, trackRevenue } from '../../src/services/analytics';
import { generateChestPlayer } from '../../src/utils';
import { Player } from '../../src/types';
import { requestPurchase, PRODUCT_IDS } from '../../src/services/iap';
import StaffBulkOpenModal from '../../src/components/StaffBulkOpenModal';

const LEAGUE_PACK_IMAGES = {
  league2: require('../../assets/images/league2_pack.png'),
  league1: require('../../assets/images/league1_pack.png'),
  premier: require('../../assets/images/premier_pack.png'),
  champions: require('../../assets/images/champions_pack.png'),
};

const LEAGUE_PACKS_DATA: Array<{
  id: 'league2' | 'league1' | 'premier' | 'champions';
  price: string;
  minLeague: number;
  crystals: number;
  money: number;
  playerPos: string;
  playerOvr: number;
}> = [
  { id: 'league2', price: '$4.99', minLeague: 0, crystals: 50, money: 100_000, playerPos: 'CM', playerOvr: 79 },
  { id: 'league1', price: '$11.99', minLeague: 1, crystals: 100, money: 500_000, playerPos: 'ST', playerOvr: 99 },
  { id: 'premier', price: '$19.99', minLeague: 2, crystals: 200, money: 1_000_000, playerPos: 'CD', playerOvr: 150 },
  { id: 'champions', price: '$24.99', minLeague: 3, crystals: 500, money: 5_000_000, playerPos: 'RM', playerOvr: 300 },
];

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 8;
const CARD_W = Math.floor((SCREEN_W - 32 - CARD_GAP * 2) / 3);

interface DiamondPack {
  diamonds: number;
  bonus: number;
  price: string;
  emoji: string;
}

interface MoneyPack {
  baseGold: number; // base gold at x1 league multiplier
  cost: number; // crystals
}

const DIAMOND_PACKS: DiamondPack[] = [
  { diamonds: 3,    bonus: 0,   price: 'FREE',   emoji: '🎬' },
  { diamonds: 10,   bonus: 1,   price: '$0.99',  emoji: '💎' },
  { diamonds: 25,   bonus: 3,   price: '$1.99',  emoji: '💎' },
  { diamonds: 60,   bonus: 8,   price: '$4.99',  emoji: '💎' },
  { diamonds: 150,  bonus: 20,  price: '$9.99',  emoji: '💎' },
  { diamonds: 5000, bonus: 1000, price: '$99.99', emoji: '💎' },
];

// Gold = baseGold × leagueMultiplier
const MONEY_PACKS: MoneyPack[] = [
  { baseGold: 3_000,  cost: 0 },
  { baseGold: 15_000, cost: 12 },
  { baseGold: 50_000, cost: 35 },
];

function formatGold(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toString();
}

export default function ShopScreen() {
  const { gameState, incomePerSecond, cheatAddCrystals, cheatAddMoney, addChestPlayers, addKeys, buyPremiumPack, claimFreeGems, claimFreeGold, claimFirstPurchaseBonus, claimFreeChest, markLeaguePackPurchased, addQuestProgress, openStaffBox, openStaffBoxBulk, openFreeStaffBox, claimStaffBoxOffer, claimEpicStaffOffer, activateStaffOffers } = useGame();
  const crystals = gameState?.crystals ?? 0;
  const noAds = gameState?.noAds ?? false;
  const keysRegular = gameState?.keysRegular ?? 0;
  const keysGold = gameState?.keysGold ?? 0;
  const [chestPlayers, setChestPlayers] = React.useState<Player[]>([]);
  const [leaguePackIdx, setLeaguePackIdx] = useState(0);

  const [showStaffBoxOfferModal, setShowStaffBoxOfferModal] = useState(false);
  const [showEpicStaffOfferModal, setShowEpicStaffOfferModal] = useState(false);

  // Activate pending staff offers when shop tab gains focus (or on re-entry)
  useFocusEffect(useCallback(() => { activateStaffOffers(); }, [activateStaffOffers]));

  // Legacy migration: activate any old pending flags on focus
  // (new triggers set shown=true directly, no pending step needed)

  // Countdown timer for legendary staff offer
  const [staffOfferCountdown, setStaffOfferCountdown] = useState('');
  const staffOfferExpiresAt = gameState?.staffBoxOfferExpiresAt ?? 0;
  const staffOfferActive = !!(gameState?.staffBoxOfferShown && !gameState?.staffBoxOfferClaimed && staffOfferExpiresAt > 0 && staffOfferExpiresAt > Date.now());
  useEffect(() => {
    if (!staffOfferActive) { setStaffOfferCountdown(''); return; }
    const tick = () => {
      const rem = Math.max(0, staffOfferExpiresAt - Date.now());
      if (rem <= 0) { setStaffOfferCountdown(''); return; }
      const h = Math.floor(rem / 3600000);
      const m = Math.floor((rem % 3600000) / 60000);
      const sec = Math.floor((rem % 60000) / 1000);
      setStaffOfferCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [staffOfferActive, staffOfferExpiresAt]);

  // Swipe support for league packs carousel
  const leaguePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_: GestureResponderEvent, gs: PanResponderGestureState) => Math.abs(gs.dx) > 15 && Math.abs(gs.dy) < 30,
      onPanResponderRelease: (_: GestureResponderEvent, gs: PanResponderGestureState) => {
        if (gs.dx < -40) {
          setLeaguePackIdx(i => i + 1); // swipe left → next (clamped in render)
        } else if (gs.dx > 40) {
          setLeaguePackIdx(i => Math.max(0, i - 1)); // swipe right → prev
        }
      },
    })
  ).current;
  const [chestModalVisible, setChestModalVisible] = React.useState(false);
  const [staffBoxResult, setStaffBoxResult] = useState<string | null>(null);
  const [staffBulkResult, setStaffBulkResult] = useState<string[]>([]);
  const [crystalAlert, setCrystalAlert] = useState<{ needed: number } | null>(null);
  const leagueIdx = gameState?.leagueIndex ?? 0;
  const freeStaffOpens = gameState?.freeStaffOpens ?? 0;
  const money = gameState?.money ?? 0;
  const income = Math.max(incomePerSecond ?? 1, 1);

  // Free staff cooldown timer
  const FREE_STAFF_COOLDOWN = 24 * 60 * 60 * 1000;
  const lastFreeStaffClaim = gameState?.lastFreeStaffClaimTime;
  const cooldownEnd = lastFreeStaffClaim ? lastFreeStaffClaim + FREE_STAFF_COOLDOWN : 0;
  const [freeStaffCountdown, setFreeStaffCountdown] = useState('');
  const isCooldownActive = freeStaffOpens === 0 && !!lastFreeStaffClaim && cooldownEnd > Date.now();

  useEffect(() => {
    if (!isCooldownActive) { setFreeStaffCountdown(''); return; }
    const tick = () => {
      const remaining = Math.max(0, cooldownEnd - Date.now());
      if (remaining <= 0) { setFreeStaffCountdown(''); return; }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const sec = Math.floor((remaining % 60000) / 1000);
      setFreeStaffCountdown(`${h}h ${m}m ${sec}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [isCooldownActive, cooldownEnd]);

  const today = new Date().toISOString().split('T')[0] ?? '';
  const freeGemClaims = (gameState?.freeGemClaimDate === today) ? (gameState?.freeGemClaimsToday ?? 0) : 0;
  const freeGemsLeft = 3 - freeGemClaims;

  // Free money shop — step 0: free, step 1: ad, step 2: 4h cooldown → resets to 0
  const FOUR_HOURS = 4 * 60 * 60 * 1000;
  const lastFreeMoneyShop = gameState?.lastFreeMoneyShopClaim ?? 0;
  const freeMoneyShopCooldownEnd = lastFreeMoneyShop ? lastFreeMoneyShop + FOUR_HOURS : 0;
  const rawStep = gameState?.freeMoneyShopStep ?? 0;
  // If step==2 (cooldown) and cooldown expired → reset to 0 (free again)
  const goldStep: 0 | 1 | 2 = rawStep === 2 && Date.now() >= freeMoneyShopCooldownEnd ? 0 : rawStep;
  const goldOnCooldown = goldStep === 2;
  const freeGoldAvailable = goldStep === 0 || goldStep === 1; // free or ad available
  const [freeGoldCountdown, setFreeGoldCountdown] = useState('');

  useEffect(() => {
    if (!goldOnCooldown) { setFreeGoldCountdown(''); return; }
    const tick = () => {
      const remaining = Math.max(0, freeMoneyShopCooldownEnd - Date.now());
      if (remaining <= 0) { setFreeGoldCountdown(''); return; }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const sec = Math.floor((remaining % 60000) / 1000);
      setFreeGoldCountdown(`${h}h ${m}m ${sec}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [goldOnCooldown, freeMoneyShopCooldownEnd]);
  const chestDateIsToday = gameState?.freeChestClaimDate === today;
  const freePlayerChestClaimed = chestDateIsToday && (gameState?.freeChestPlayerClaimed ?? false);
  const freeStarChestClaimed = chestDateIsToday && (gameState?.freeChestStarClaimed ?? false);

  const handleFreeChest = (type: 'player' | 'star') => {
    const alreadyClaimed = type === 'player' ? freePlayerChestClaimed : freeStarChestClaimed;
    if (alreadyClaimed) {
      Alert.alert('Already claimed', 'You can claim 1 free chest per day.');
      return;
    }
    const grantReward = () => {
      const ok = claimFreeChest(type);
      if (!ok) return;
      const generated: Player[] = [generateChestPlayer(type, leagueIdx)];
      addChestPlayers(generated);
      setChestPlayers(generated);
      setChestModalVisible(true);
      trackEvent('rewards', { [`free_chest_${type}`]: '1' });
    };
    if (noAds) {
      grantReward();
    } else {
      const { showRewarded } = require('../../src/services/ads');
      showRewarded(() => { grantReward(); addQuestProgress('watch_ad', 1); }, 'free_reward');
    }
  };

  const handleBuyDiamonds = async (pack: DiamondPack, index: number) => {
    if (index === 0) {
      // Free reward pack
      if (freeGemsLeft <= 0) {
        Alert.alert('Limit reached', 'You can claim free gems 3 times per day.');
        return;
      }
      const grantGems = () => {
        const ok = claimFreeGems();
        if (ok) Alert.alert('💎 Reward!', 'You got 3 diamonds!');
      };
      if (noAds) {
        grantGems();
      } else {
        const { showRewarded } = require('../../src/services/ads');
        showRewarded(() => { grantGems(); addQuestProgress('watch_ad', 1); }, 'free_diamonds');
      }
      return;
    }
    // Real IAP purchase
    const productId = `diamonds_${pack.diamonds}` as keyof typeof PRODUCT_IDS;
    const sku = (PRODUCT_IDS as any)[productId] ?? `diamonds_${pack.diamonds}`;
    const purchased = await requestPurchase(sku);
    if (!purchased) return;
    const total = pack.diamonds + pack.bonus;
    cheatAddCrystals(total);
    trackEvent('purchases', { [`diamonds_${pack.diamonds}`]: '1' });
    addQuestProgress('real_purchase_w', 1, true);
    const priceNum = parseFloat(pack.price.replace('$', ''));
    if (priceNum > 0) trackRevenue(priceNum, 'USD', `diamonds_${pack.diamonds}`);
    Alert.alert('💎 Purchased!', `You got ${pack.diamonds} + ${pack.bonus} bonus = ${total} diamonds!`);
    tryFirstPurchaseBonus();
  };

  const leagueMult = LEAGUES?.[leagueIdx]?.multiplier ?? 1;
  const getGold = (pack: MoneyPack) => Math.floor(pack.baseGold * leagueMult);

  // First purchase bonus helper
  const tryFirstPurchaseBonus = () => {
    if (gameState?.firstPurchaseClaimed) return;
    const ok = claimFirstPurchaseBonus();
    if (!ok) return;
    // 1 epic staff box (free, no cost)
    openStaffBox(0, 'crystals', 'epic');
    // 5 normal player chests
    const players: Player[] = [];
    for (let i = 0; i < 5; i++) players.push(generateChestPlayer('player', leagueIdx));
    addChestPlayers(players);
    Alert.alert(
      '🎉 First Purchase Bonus!',
      '💎 100 Crystals\n🏆 200 Fame\n💰 100K Gold\n📦 1 Epic Staff Chest\n🃏 5 Player Chests\n\nCheck your team for new players!',
    );
  };

  const handleChestOpen = (type: 'player' | 'star', count: number, diamondCost: number) => {
    const keyType = type === 'player' ? 'regular' : 'gold';
    const availableKeys = type === 'player' ? keysRegular : keysGold;
    let costType = '';
    
    if (availableKeys >= count) {
      addKeys(keyType, -count);
      costType = 'keys';
    } else if (crystals >= diamondCost) {
      cheatAddCrystals(-diamondCost);
      costType = 'diamonds';
    } else {
      setCrystalAlert({ needed: diamondCost });
      return;
    }
    const generated: Player[] = [];
    for (let i = 0; i < count; i++) {
      generated.push(generateChestPlayer(type, leagueIdx));
    }
    addChestPlayers(generated);
    setChestPlayers(generated);
    setChestModalVisible(true);
    trackEvent('team.chest_opened', { type, count: count.toString(), cost_type: costType, cost_amount: (costType === 'keys' ? count : diamondCost).toString() });
    if (type === 'star') addQuestProgress('open_star_chest_w', count, true);
  };

  const handleBuyPremium = async (pack: 'noAds' | '2xIncome' | '3xIdle' | '3xIncome') => {
    const skuMap: Record<string, string> = { noAds: PRODUCT_IDS.premium_noAds, '2xIncome': PRODUCT_IDS.premium_2xIncome, '3xIdle': PRODUCT_IDS.premium_3xIdle, '3xIncome': PRODUCT_IDS.premium_3xIncome };
    const purchased = await requestPurchase(skuMap[pack]!);
    if (!purchased) return;
    buyPremiumPack(pack);
    addQuestProgress('real_purchase_w', 1, true);
    Alert.alert('Purchased!', 'Premium pack activated!');
    tryFirstPurchaseBonus();
  };

  const handleBuyBonusPack = async () => {
    const purchased = await requestPurchase(PRODUCT_IDS.bonus_pack);
    if (!purchased) return;
    buyPremiumPack('bonusPack');
    addQuestProgress('real_purchase_w', 1, true);
    Alert.alert('Purchased!', 'Bonus Pack activated! +100 💎 +$500,000');
    tryFirstPurchaseBonus();
  };

  const handleBuyLeaguePack = async (pack: typeof LEAGUE_PACKS_DATA[number]) => {
    const purchased = await requestPurchase(`league_pack_${pack.id}`);
    if (!purchased) return;
    cheatAddCrystals(pack.crystals);
    cheatAddMoney(pack.money);
    addChestPlayers([generatePackPlayer(pack.playerPos as any, pack.playerOvr)]);
    markLeaguePackPurchased(pack.id);
    trackEvent('purchases', { [`league_pack_${pack.id}`]: '1' });
    addQuestProgress('real_purchase_w', 1, true);
    const lpPrice = parseFloat(pack.price.replace('$', ''));
    if (lpPrice > 0) trackRevenue(lpPrice, 'USD', `league_pack_${pack.id}`);
    Alert.alert('Pack Purchased!', `You got ${pack.crystals} diamonds, ${formatGold(pack.money)} gold and a new player!`);
    tryFirstPurchaseBonus();
  };

  const handleBuyGold = (pack: MoneyPack, index: number) => {
    const gold = getGold(pack);
    if (index === 0) {
      if (goldOnCooldown) {
        Alert.alert('Cooldown', `Free gold available in ${freeGoldCountdown || 'a few hours'}.`);
        return;
      }
      if (goldStep === 0) {
        // Step 0: completely free — no ad
        const ok = claimFreeGold(gold, 'free');
        if (ok) Alert.alert('🪙 Reward!', `You got ${formatGold(gold)} gold!`);
      } else if (goldStep === 1) {
        // Step 1: watch ad
        if (noAds) {
          const ok = claimFreeGold(gold, 'ad');
          if (ok) Alert.alert('🪙 Reward!', `You got ${formatGold(gold)} gold!`);
        } else {
          const { showRewarded } = require('../../src/services/ads');
          showRewarded(() => {
            const ok = claimFreeGold(gold, 'ad');
            if (ok) Alert.alert('🪙 Reward!', `You got ${formatGold(gold)} gold!`);
            addQuestProgress('watch_ad', 1);
          }, 'free_gold');
        }
      }
      return;
    }
    if (crystals < pack.cost) {
      setCrystalAlert({ needed: pack.cost });
      return;
    }
    cheatAddCrystals(-pack.cost);
    cheatAddMoney(gold);
    trackEvent('purchases', { [`gold_${pack.baseGold}`]: '1' });
    Alert.alert('🪙 Purchased!', `You got ${formatGold(gold)} gold!`);
  };

  return (
    <View style={s.container}>
      <MiniScoreBar />
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Balance row */}
        <View style={s.balanceBar}>
          <View style={s.balancePill}><Image source={require('../../assets/images/key_regular.png')} style={s.keyIcon} /><Text style={s.balanceText}>{keysRegular}</Text></View>
          <View style={s.balancePill}><Image source={require('../../assets/images/key_gold.png')} style={s.keyIcon} /><Text style={s.balanceText}>{keysGold}</Text></View>
          <View style={s.balancePill}><CurrencyIcon type="money" size={16} /><Text style={s.balanceText}>{formatMoneyRaw(money)}</Text></View>
          <View style={s.balancePill}><CurrencyIcon type="diamond" size={16} /><Text style={s.balanceText}>{formatNumber(crystals)}</Text></View>
        </View>

        {/* ── FIRST PURCHASE BONUS ── */}
        {!gameState?.firstPurchaseClaimed && (
          <View style={s.fpbWrap}>
            <View style={s.fpbBanner}>
              <View style={s.fpbImageClip}>
                <Image source={require('../../assets/images/first_purchase_bonus.png')} style={s.fpbImage} resizeMode="cover" />
              </View>
              {/* Reward grid overlaid on image */}
              <View style={s.fpbRewardsRow}>
                <View style={s.fpbRewardsScroll}>
                  <View style={s.fpbRewardItem}>
                    <View style={s.fpbRewardIcon}>
                      <CurrencyIcon type="diamond" size={16} />
                    </View>
                    <View style={s.fpbQtyBadge}><Text style={s.fpbQtyText}>x100</Text></View>
                  </View>
                  <View style={s.fpbRewardItem}>
                    <View style={s.fpbRewardIcon}>
                      <Image source={require('../../assets/images/currency_fame.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
                    </View>
                    <View style={s.fpbQtyBadge}><Text style={s.fpbQtyText}>x200</Text></View>
                  </View>
                  <View style={s.fpbRewardItem}>
                    <View style={s.fpbRewardIcon}>
                      <CurrencyIcon type="money" size={16} />
                    </View>
                    <View style={s.fpbQtyBadge}><Text style={s.fpbQtyText}>100K</Text></View>
                  </View>
                  <View style={s.fpbRewardItem}>
                    <View style={s.fpbRewardIcon}>
                      <Image source={require('../../assets/images/staff_chest_epic.png')} style={s.fpbChestImg} resizeMode="contain" />
                    </View>
                    <View style={s.fpbQtyBadge}><Text style={s.fpbQtyText}>x1</Text></View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Chests Section */}
        <LinearGradient
          colors={['#1E3A5F', '#2563EB'] as const}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.sectionHeader}
        >
          <View style={s.sectionStripe} />
          <Text style={s.sectionTitle}>PLAYER CHESTS</Text>
          <View style={s.sectionStripe} />
        </LinearGradient>

        <View style={s.chestBanner}>
          <Image source={require('../../assets/images/chest_player.png')} style={s.chestImage} resizeMode="stretch" />
          <View style={s.chestOverlay}>
            <View style={s.chestButtons}>
              <View style={s.chestBtnCol}>
                <Pressable style={({ pressed }) => [s.chestBtn, pressed && { opacity: 0.8 }]}
                  onPress={() => handleChestOpen('player', 1, 10)}>
                  <Text style={s.chestBtnText}>OPEN x1</Text>
                </Pressable>
                <View style={s.chestPriceRow}>
                  {keysRegular >= 1 ? (
                    <><Image source={require('../../assets/images/key_regular.png')} style={s.keyIconSmall} /><Text style={s.chestPriceText}>1</Text></>
                  ) : (
                    <><CurrencyIcon type="diamond" size={14} /><Text style={s.chestPriceText}>10</Text></>
                  )}
                </View>
              </View>
              <View style={s.chestBtnCol}>
                <Pressable style={({ pressed }) => [s.chestBtn, pressed && { opacity: 0.8 }]}
                  onPress={() => handleChestOpen('player', 10, 90)}>
                  <Text style={s.chestBtnText}>OPEN x10</Text>
                </Pressable>
                <View style={s.chestPriceRow}>
                  {keysRegular >= 10 ? (
                    <><Image source={require('../../assets/images/key_regular.png')} style={s.keyIconSmall} /><Text style={s.chestPriceText}>10</Text></>
                  ) : (
                    <><CurrencyIcon type="diamond" size={14} /><Text style={s.chestPriceText}>90</Text></>
                  )}
                </View>
              </View>
            </View>
          </View>
          <Pressable
            style={[s.freeChestBtn, freePlayerChestClaimed && { opacity: 0 }]}
            onPress={() => handleFreeChest('player')}
            disabled={freePlayerChestClaimed}
          >
            <LinearGradient colors={noAds ? (['#EAB308', '#CA8A04'] as const) : (['#F59E0B', '#D97706'] as const)} style={s.freeChestGradient}>
              {!noAds && <Text style={s.freeChestText}>🎬</Text>}
              <Text style={s.freeChestLabel}>FREE</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={s.chestBanner}>
          <Image source={require('../../assets/images/chest_star.png')} style={s.chestImage} resizeMode="stretch" />
          <View style={s.chestOverlay}>
            <View style={s.chestButtons}>
              <View style={s.chestBtnCol}>
                <Pressable style={({ pressed }) => [s.chestBtn, s.chestBtnPremium, pressed && { opacity: 0.8 }]}
                  onPress={() => handleChestOpen('star', 1, 50)}>
                  <Text style={s.chestBtnText}>OPEN x1</Text>
                </Pressable>
                <View style={s.chestPriceRow}>
                  {keysGold >= 1 ? (
                    <><Image source={require('../../assets/images/key_gold.png')} style={s.keyIconSmall} /><Text style={s.chestPriceText}>1</Text></>
                  ) : (
                    <><CurrencyIcon type="diamond" size={14} /><Text style={s.chestPriceText}>50</Text></>
                  )}
                </View>
              </View>
              <View style={s.chestBtnCol}>
                <Pressable style={({ pressed }) => [s.chestBtn, s.chestBtnPremium, pressed && { opacity: 0.8 }]}
                  onPress={() => handleChestOpen('star', 10, 450)}>
                  <Text style={s.chestBtnText}>OPEN x10</Text>
                </Pressable>
                <View style={s.chestPriceRow}>
                  {keysGold >= 10 ? (
                    <><Image source={require('../../assets/images/key_gold.png')} style={s.keyIconSmall} /><Text style={s.chestPriceText}>10</Text></>
                  ) : (
                    <><CurrencyIcon type="diamond" size={14} /><Text style={s.chestPriceText}>450</Text></>
                  )}
                </View>
              </View>
            </View>
          </View>
          <Pressable
            style={[s.freeChestBtn, freeStarChestClaimed && { opacity: 0 }]}
            onPress={() => handleFreeChest('star')}
            disabled={freeStarChestClaimed}
          >
            <LinearGradient colors={noAds ? (['#EAB308', '#CA8A04'] as const) : (['#F59E0B', '#D97706'] as const)} style={s.freeChestGradient}>
              {!noAds && <Text style={s.freeChestText}>🎬</Text>}
              <Text style={s.freeChestLabel}>FREE</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ── STAFF CHESTS — boxes section ── */}
        {leagueIdx >= 1 && (
          <>
            <LinearGradient
              colors={['#7C3AED', '#A855F7'] as const}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.sectionHeader}
            >
              <View style={s.sectionStripe} />
              <Text style={s.sectionTitle}>STAFF CHESTS</Text>
              <View style={s.sectionStripe} />
            </LinearGradient>

            {/* 3-column staff chests */}
            <View style={s.scRow}>
              {/* Normal */}
              <View style={s.scCol}>
                <View style={[s.scSpriteWrap, { borderColor: '#64748B' }]}>  
                  {freeStaffOpens > 0 && <View style={s.alertDotChest} />}
                  <Image source={require('../../assets/images/staff_chest_normal.png')} style={s.scSpriteImg} resizeMode="contain" />
                  {/* Cooldown / free badge overlay on top of sprite */}
                  {(freeStaffOpens > 0 || (isCooldownActive && freeStaffOpens === 0)) && (
                    <View style={s.scBadge}>
                      {freeStaffOpens > 0 ? (
                        <Text style={s.scBadgeText}>{freeStaffOpens} free</Text>
                      ) : (
                        <Text style={s.scBadgeTimer}>{freeStaffCountdown}</Text>
                      )}
                    </View>
                  )}
                </View>
                <View style={[s.scFrame, { borderColor: '#64748B' }]}>
                  <Text style={[s.scTitle, { color: '#94A3B8' }]}>Normal</Text>
                  <View style={s.scBtnRow}>
                    <View style={s.scBtnCol}>
                      <Pressable style={({ pressed }) => [s.scBtn, pressed && { opacity: 0.8 }]}
                        onPress={() => {
                          if (freeStaffOpens > 0) {
                            const id = openFreeStaffBox();
                            if (id) setStaffBoxResult(id);
                          } else {
                            if (crystals < 15) { setCrystalAlert({ needed: 15 }); return; }
                            const id = openStaffBox(15, 'crystals', 'normal');
                            if (id) setStaffBoxResult(id);
                          }
                        }}>
                        <Text style={s.scBtnText}>x1</Text>
                      </Pressable>
                      <View style={s.scPriceRow}>
                        {freeStaffOpens > 0 ? (
                          <Text style={[s.scPriceText, { color: '#22C55E' }]}>FREE</Text>
                        ) : (
                          <><CurrencyIcon type="diamond" size={11} /><Text style={s.scPriceText}>15</Text></>
                        )}
                      </View>
                    </View>
                    <View style={s.scBtnCol}>
                      <Pressable style={({ pressed }) => [s.scBtn, pressed && { opacity: 0.8 }]}
                        onPress={() => {
                          if (staffBulkResult.length > 0) return;
                          if (crystals < 135) { setCrystalAlert({ needed: 135 }); return; }
                          const ids = openStaffBoxBulk(10, 135, 'crystals', 'normal');
                          if (ids && ids.length > 0) setStaffBulkResult(ids);
                        }}>
                        <Text style={s.scBtnText}>x10</Text>
                      </Pressable>
                      <View style={s.scPriceRow}>
                        <CurrencyIcon type="diamond" size={11} /><Text style={s.scPriceText}>135</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Epic */}
              <View style={s.scCol}>
                <View style={[s.scSpriteWrap, { borderColor: '#7C3AED' }]}>
                  <Image source={require('../../assets/images/staff_chest_epic.png')} style={s.scSpriteImg} resizeMode="contain" />
                </View>
                <View style={[s.scFrame, { borderColor: '#7C3AED' }]}>
                  <Text style={[s.scTitle, { color: '#A855F7' }]}>Epic</Text>
                  <View style={s.scBtnRow}>
                    <View style={s.scBtnCol}>
                      <Pressable style={({ pressed }) => [s.scBtn, s.scBtnEpic, pressed && { opacity: 0.8 }]}
                        onPress={() => {
                          if (crystals < 50) { setCrystalAlert({ needed: 50 }); return; }
                          const id = openStaffBox(50, 'crystals', 'epic');
                          if (id) setStaffBoxResult(id);
                        }}>
                        <Text style={s.scBtnText}>x1</Text>
                      </Pressable>
                      <View style={s.scPriceRow}>
                        <CurrencyIcon type="diamond" size={11} /><Text style={s.scPriceText}>50</Text>
                      </View>
                    </View>
                    <View style={s.scBtnCol}>
                      <Pressable style={({ pressed }) => [s.scBtn, s.scBtnEpic, pressed && { opacity: 0.8 }]}
                        onPress={() => {
                          if (staffBulkResult.length > 0) return;
                          if (crystals < 450) { setCrystalAlert({ needed: 450 }); return; }
                          const ids = openStaffBoxBulk(10, 450, 'crystals', 'epic');
                          if (ids && ids.length > 0) setStaffBulkResult(ids);
                        }}>
                        <Text style={s.scBtnText}>x10</Text>
                      </Pressable>
                      <View style={s.scPriceRow}>
                        <CurrencyIcon type="diamond" size={11} /><Text style={s.scPriceText}>450</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Legendary */}
              <View style={s.scCol}>
                <View style={[s.scSpriteWrap, { borderColor: '#B45309' }]}>
                  <Image source={require('../../assets/images/staff_chest_legendary.png')} style={s.scSpriteImg} resizeMode="contain" />
                </View>
                <View style={[s.scFrame, { borderColor: '#B45309' }]}>
                  <Text style={[s.scTitle, { color: '#F59E0B' }]}>Legendary</Text>
                  <View style={s.scBtnRow}>
                    <View style={s.scBtnCol}>
                      <Pressable style={({ pressed }) => [s.scBtn, s.scBtnLeg, pressed && { opacity: 0.8 }]}
                        onPress={() => {
                          if (crystals < 100) { setCrystalAlert({ needed: 100 }); return; }
                          const id = openStaffBox(100, 'crystals', 'legendary');
                          if (id) setStaffBoxResult(id);
                        }}>
                        <Text style={s.scBtnText}>x1</Text>
                      </Pressable>
                      <View style={s.scPriceRow}>
                        <CurrencyIcon type="diamond" size={11} /><Text style={s.scPriceText}>100</Text>
                      </View>
                    </View>
                    <View style={s.scBtnCol}>
                      <Pressable style={({ pressed }) => [s.scBtn, s.scBtnLeg, pressed && { opacity: 0.8 }]}
                        onPress={() => {
                          if (staffBulkResult.length > 0) return;
                          if (crystals < 900) { setCrystalAlert({ needed: 900 }); return; }
                          const ids = openStaffBoxBulk(10, 900, 'crystals', 'legendary');
                          if (ids && ids.length > 0) setStaffBulkResult(ids);
                        }}>
                        <Text style={s.scBtnText}>x10</Text>
                      </Pressable>
                      <View style={s.scPriceRow}>
                        <CurrencyIcon type="diamond" size={11} /><Text style={s.scPriceText}>900</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

          </>
        )}

        {/* Diamond Shop Section */}
        <LinearGradient
          colors={['#1E40AF', '#3B82F6'] as const}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.sectionHeader}
        >
          <View style={s.sectionStripe} />
          <Text style={s.sectionTitle}>DIAMOND SHOP</Text>
          <View style={s.sectionStripe} />
        </LinearGradient>

        <View style={s.grid}>
          {DIAMOND_PACKS.map((pack, i) => {
            const isFree = i === 0;
            const freeDisabled = isFree && freeGemsLeft <= 0;
            // Image index: free pack uses diamonds_1, rest shift by 1
            const imgIdx = isFree ? 0 : i;
            return (
              <Pressable
                key={i}
                style={({ pressed }) => [s.card, pressed && s.cardPressed, freeDisabled && { opacity: 0.5 }]}
                onPress={() => handleBuyDiamonds(pack, i)}
                disabled={freeDisabled}
              >
                <Text style={s.cardTitle}>{isFree ? '3 Diamonds' : pack.diamonds >= 1000 ? (pack.diamonds / 1000) + 'K Diamonds' : pack.diamonds + ' Diamonds'}</Text>
                <View style={s.cardImageArea}>
                  {imgIdx === 0 ? (
                    <Image source={require('../../assets/images/diamonds_1.png')} style={s.cardImage} resizeMode="contain" />
                  ) : imgIdx === 1 ? (
                    <Image source={require('../../assets/images/diamonds_1.png')} style={s.cardImage} resizeMode="contain" />
                  ) : imgIdx === 2 ? (
                    <Image source={require('../../assets/images/diamonds_2.png')} style={s.cardImage} resizeMode="contain" />
                  ) : imgIdx === 3 ? (
                    <Image source={require('../../assets/images/diamonds_3.png')} style={s.cardImage} resizeMode="contain" />
                  ) : imgIdx === 4 ? (
                    <Image source={require('../../assets/images/diamonds_4.png')} style={s.cardImage} resizeMode="contain" />
                  ) : (
                    <Image source={require('../../assets/images/diamonds_5.png')} style={s.cardImage} resizeMode="contain" />
                  )}
                </View>
                {isFree ? (
                  <View style={s.bonusBadge}>
                    <Text style={s.bonusText}>{freeGemsLeft}/3 left today</Text>
                  </View>
                ) : pack.bonus > 0 ? (
                  <View style={s.bonusBadge}>
                    <Text style={s.bonusText}>Bonus +{pack.bonus}</Text>
                  </View>
                ) : null}
                <LinearGradient
                  colors={isFree ? (noAds ? (['#EAB308', '#CA8A04'] as const) : (['#F59E0B', '#D97706'] as const)) : (['#1E40AF', '#2563EB'] as const)}
                  style={s.priceBtn}
                >
                  <Text style={s.priceText}>{isFree ? (noAds ? 'FREE' : '🎬 FREE') : pack.price}</Text>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>

        {/* Money Shop Section */}
        <LinearGradient
          colors={['#92400E', '#D97706'] as const}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.sectionHeader}
        >
          <View style={s.sectionStripe} />
          <Text style={s.sectionTitle}>MONEY SHOP</Text>
          <View style={s.sectionStripe} />
        </LinearGradient>

        <View style={s.grid}>
          {MONEY_PACKS.map((pack, i) => {
            const isFreeGold = i === 0;
            const freeGoldOnCooldown = isFreeGold && !freeGoldAvailable;
            return (
              <Pressable
                key={i}
                style={({ pressed }) => [s.card, s.goldCard, pressed && s.cardPressed, freeGoldOnCooldown && { opacity: 0.55 }]}
                onPress={() => handleBuyGold(pack, i)}
              >
                {/* Alert dot for free gold available */}
                {isFreeGold && freeGoldAvailable && <View style={s.alertDot} />}
                <Text style={s.cardTitle}>{formatGold(getGold(pack))} Gold</Text>
                <View style={s.cardImageArea}>
                {i === 0 ? (
                  <Image source={require('../../assets/images/money_1.png')} style={s.cardImage} resizeMode="contain" />
                ) : i === 1 ? (
                  <Image source={require('../../assets/images/money_2.png')} style={s.cardImage} resizeMode="contain" />
                ) : (
                  <Image source={require('../../assets/images/money_3.png')} style={s.cardImage} resizeMode="contain" />
                )}
              </View>
                
                <LinearGradient
                  colors={isFreeGold ? (freeGoldAvailable ? (['#EAB308', '#CA8A04'] as const) : (['#6B7280', '#4B5563'] as const)) : (['#1E40AF', '#2563EB'] as const)}
                  style={s.priceBtn}
                >
                  {isFreeGold ? (
                    goldOnCooldown ? (
                      <Text style={[s.priceText, { fontSize: 11 }]}>{freeGoldCountdown || '...'}</Text>
                    ) : goldStep === 0 ? (
                      <Text style={s.priceText}>FREE</Text>
                    ) : (
                      <Text style={s.priceText}>🎬 FREE</Text>
                    )
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><CurrencyIcon type="diamond" size={14} /><Text style={s.priceText}>{pack.cost}</Text></View>
                  )}
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>

        {/* ── LEAGUE PACKS ── */}
        <LinearGradient
          colors={['#0E7490', '#06B6D4'] as const}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.sectionHeader}
        >
          <View style={s.sectionStripe} />
          <Text style={s.sectionTitle}>LEAGUE PACKS</Text>
          <View style={s.sectionStripe} />
        </LinearGradient>

        {(() => {
          const purchasedList = gameState?.purchasedLeaguePacks ?? [];
          const availablePacks = LEAGUE_PACKS_DATA.filter(p => !purchasedList.includes(p.id));
          if (availablePacks.length === 0) return null;
          const safeIdx = Math.min(leaguePackIdx, availablePacks.length - 1);
          const pack = availablePacks[safeIdx]!;
          const maxLeague = gameState?.maxLeagueReached ?? gameState?.leagueIndex ?? 0;
          const unlocked = maxLeague >= pack.minLeague;
          return (
            <View style={s.leagueBanner} {...leaguePanResponder.panHandlers}>
              <Image source={LEAGUE_PACK_IMAGES[pack.id]} style={s.leagueBannerImg} resizeMode="cover" />
              {!unlocked && (
                <View style={s.leagueLockOverlay}>
                  <Ionicons name="lock-closed" size={36} color="#FFF" />
                  <Text style={s.leagueLockText}>
                    Unlocks after finishing{'\n'}{LEAGUES[pack.minLeague - 1]?.name ?? 'unknown'}
                  </Text>
                </View>
              )}
              {unlocked && (
                <View style={s.leaguePackOverlay}>
                    <Pressable onPress={() => handleBuyLeaguePack(pack)}>
                      <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={s.leagueBuyBtn}>
                        <Text style={s.leagueBuyText}>BUY NOW</Text>
                        <View style={s.leaguePriceBadge}><Text style={s.leaguePriceText}>{pack.price}</Text></View>
                      </LinearGradient>
                    </Pressable>
                </View>
              )}
              {/* Left arrow */}
              {safeIdx > 0 && (
                <Pressable style={s.leagueArrowLeft} onPress={() => setLeaguePackIdx(i => Math.max(0, i - 1))} hitSlop={16}>
                  <Ionicons name="chevron-back" size={28} color="#FFF" />
                </Pressable>
              )}
              {/* Right arrow */}
              {safeIdx < availablePacks.length - 1 && (
                <Pressable style={s.leagueArrowRight} onPress={() => setLeaguePackIdx(i => Math.min(availablePacks.length - 1, i + 1))} hitSlop={16}>
                  <Ionicons name="chevron-forward" size={28} color="#FFF" />
                </Pressable>
              )}
              {/* Dots */}
              <View style={s.leagueDots}>
                {availablePacks.map((_, i) => (
                  <View key={i} style={[s.leagueDot, i === safeIdx && s.leagueDotActive]} />
                ))}
              </View>
            </View>
          );
        })()}

        {/* ── PREMIUM PACKS ── */}
        <LinearGradient
          colors={['#7C3AED', '#A855F7'] as const}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.sectionHeader}
        >
          <View style={s.sectionStripe} />
          <Text style={s.sectionTitle}>PREMIUM PACKS</Text>
          <View style={s.sectionStripe} />
        </LinearGradient>

        <View style={[s.chestBanner, { marginBottom: 2 }]}>
          <Image source={require('../../assets/images/no_ads.png')} style={[s.chestImage, { height: (SCREEN_W - 32 - 3) / (717 / 239) }]} resizeMode="stretch" />
          <View style={s.premiumOverlay}>
            {gameState?.noAds ? (
              <View style={s.purchasedBadge}><Text style={s.purchasedText}>✓</Text></View>
            ) : (
              <Pressable onPress={() => handleBuyPremium('noAds')}>
                <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={s.premiumBuyBtn}>
                  <Text style={s.premiumBuyText}>BUY NOW</Text>
                  <View style={s.premiumPriceBadge}><Text style={s.premiumPriceText}>$11.99</Text></View>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>

        <View style={[s.chestBanner, { marginBottom: 2 }]}>
          <Image source={require('../../assets/images/2x_income.png')} style={[s.chestImage, { height: (SCREEN_W - 32 - 3) / (717 / 239) }]} resizeMode="stretch" />
          <View style={s.premiumOverlay}>
            {(gameState?.incomeMultiplier ?? 1) >= 2 ? (
              <View style={s.purchasedBadge}><Text style={s.purchasedText}>✓</Text></View>
            ) : (
              <Pressable onPress={() => handleBuyPremium('2xIncome')}>
                <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={s.premiumBuyBtn}>
                  <Text style={s.premiumBuyText}>BUY NOW</Text>
                  <View style={s.premiumPriceBadge}><Text style={s.premiumPriceText}>$9.99</Text></View>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>

        <View style={[s.chestBanner, { marginBottom: 2 }]}>
          <Image source={require('../../assets/images/3x_income.png')} style={[s.chestImage, { height: (SCREEN_W - 32 - 3) / (717 / 239) }]} resizeMode="stretch" />
          <View style={s.premiumOverlay}>
            {(gameState?.incomeMultiplier ?? 1) >= 3 ? (
              <View style={s.purchasedBadge}><Text style={s.purchasedText}>✓</Text></View>
            ) : (
              <Pressable onPress={() => handleBuyPremium('3xIncome')}>
                <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={s.premiumBuyBtn}>
                  <Text style={s.premiumBuyText}>BUY NOW</Text>
                  <View style={s.premiumPriceBadge}><Text style={s.premiumPriceText}>$29.99</Text></View>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>

        <View style={[s.chestBanner, { marginBottom: 2 }]}>
          <Image source={require('../../assets/images/3x_idle.png')} style={[s.chestImage, { height: (SCREEN_W - 32 - 3) / (717 / 239) }]} resizeMode="stretch" />
          <View style={s.premiumOverlay}>
            {(gameState?.idleMultiplier ?? 1) >= 3 ? (
              <View style={s.purchasedBadge}><Text style={s.purchasedText}>✓</Text></View>
            ) : (
              <Pressable onPress={() => handleBuyPremium('3xIdle')}>
                <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={s.premiumBuyBtn}>
                  <Text style={s.premiumBuyText}>BUY NOW</Text>
                  <View style={s.premiumPriceBadge}><Text style={s.premiumPriceText}>$4.99</Text></View>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Staff Starter Pack offer banner (image) ── */}
        {!!(gameState?.staffBoxOfferShown && !gameState?.staffBoxOfferClaimed) && (
          <Pressable
            style={[s.chestBanner, { marginBottom: 2 }]}
            onPress={() => setShowStaffBoxOfferModal(true)}
          >
            <Image source={require('../../assets/images/offer_legendary_staff_cards_chests.png')} style={[s.chestImage, { height: (SCREEN_W - 32 - 3) / (717 / 239) }]} resizeMode="stretch" />
            {/* Ribbon */}
            <Image source={require('../../assets/images/ribbon_red.png')} style={s.ribbonImg} resizeMode="contain" />
            <Text style={s.ribbonText}>1200%</Text>
            <View style={s.staffOfferOverlay}>
              {!!staffOfferCountdown && (
                <View style={s.staffOfferTimerPill}>
                  <Ionicons name="time-outline" size={12} color="#FFF" />
                  <Text style={s.staffOfferTimerText}>{staffOfferCountdown}</Text>
                </View>
              )}
              <Pressable onPress={() => setShowStaffBoxOfferModal(true)}>
                <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={s.premiumBuyBtn}>
                  <Text style={s.premiumBuyText}>BUY NOW</Text>
                  <View style={s.premiumPriceBadge}><Text style={s.premiumPriceText}>$7.99</Text></View>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        )}

        {/* ── Epic Trainer Deal offer banner (image) ── */}
        {!!(gameState?.epicStaffOfferShown && !gameState?.epicStaffOfferClaimed && gameState?.epicStaffOfferCardId) && (
          <Pressable
            style={[s.chestBanner, { marginBottom: 2 }]}
            onPress={() => setShowEpicStaffOfferModal(true)}
          >
            <Image source={require('../../assets/images/offer_epic_staff_powerup.png')} style={[s.chestImage, { height: (SCREEN_W - 32 - 3) / (717 / 239) }]} resizeMode="stretch" />
            {/* Ribbon */}
            <Image source={require('../../assets/images/ribbon_red.png')} style={s.ribbonImg} resizeMode="contain" />
            <Text style={s.ribbonText}>500%</Text>
            <View style={s.premiumOverlay}>
              <Pressable onPress={() => setShowEpicStaffOfferModal(true)}>
                <LinearGradient colors={['#22C55E', '#16A34A'] as const} style={s.premiumBuyBtn}>
                  <Text style={s.premiumBuyText}>BUY NOW</Text>
                  <View style={s.premiumPriceBadge}><Text style={s.premiumPriceText}>$4.99</Text></View>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <ChestOpenModal
        visible={chestModalVisible}
        players={chestPlayers}
        onClose={() => setChestModalVisible(false)}
      />
      <NotEnoughCrystalsModal
        visible={!!crystalAlert}
        needed={crystalAlert?.needed ?? 0}
        current={crystals}
        onGoToShop={() => setCrystalAlert(null)}
        onClose={() => setCrystalAlert(null)}
      />

      {/* ── Staff box result popup ── */}
      <Modal visible={!!staffBoxResult} transparent animationType="fade" onRequestClose={() => setStaffBoxResult(null)}>
        {(() => {
          const def = staffBoxResult ? STAFF_CARDS.find(c => c.id === staffBoxResult) : null;
          if (!def) return null;
          const RARITY_COL: Record<string, string> = { rare: '#22C55E', epic: '#7C3AED', legendary: '#F59E0B' };
          const RARITY_GRAD: Record<string, readonly [string, string, string]> = {
            rare: ['#065F46', '#059669', '#10B981'] as const,
            epic: ['#4C1D95', '#7C3AED', '#A855F7'] as const,
            legendary: ['#78350F', '#B45309', '#F59E0B'] as const,
          };
          const col = RARITY_COL[def.rarity] ?? '#888';
          const grad = RARITY_GRAD[def.rarity] ?? (['#374151', '#6B7280', '#9CA3AF'] as const);
          const ROLE_LABEL: Record<string, string> = { marketer: 'Marketer', trainer: 'Trainer', doctor: 'Doctor' };
          return (
            <Pressable style={s.staffPopupOverlay} onPress={() => setStaffBoxResult(null)}>
              <View style={s.staffPopupCard}>
                <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.staffPopupGrad}>
                  <View style={[s.staffPopupRarityBadge, { backgroundColor: col }]}>
                    <Text style={s.staffPopupRarityText}>{def.rarity.toUpperCase()}</Text>
                  </View>
                  <Text style={s.staffPopupEmoji}>{def.emoji}</Text>
                  <Text style={s.staffPopupName}>{def.name}</Text>
                  <Text style={s.staffPopupRole}>{ROLE_LABEL[def.role] ?? def.role}</Text>
                  <Text style={s.staffPopupBonus}>+{(def.baseMult * 100).toFixed(1)}% bonus</Text>
                  <View style={s.staffPopupBuildings}>
                    {def.buildings.map(b => (
                      <View key={b} style={s.staffPopupBuildingTag}>
                        <Text style={s.staffPopupBuildingText}>{b.replace(/_/g, ' ')}</Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
                <Pressable style={s.staffPopupDismissBtn} onPress={() => setStaffBoxResult(null)}>
                  <Text style={s.staffPopupDismissText}>TAP TO CONTINUE</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })()}
      </Modal>

      {/* ── Staff bulk open modal ── */}
      <StaffBulkOpenModal
        visible={staffBulkResult.length > 0}
        cardIds={staffBulkResult}
        onClose={() => { setStaffBulkResult([]); activateStaffOffers(); }}
      />

      {/* ── Staff offer modals ── */}
      <StaffBoxOfferModal
        visible={showStaffBoxOfferModal}
        expiresAt={gameState?.staffBoxOfferExpiresAt}
        onBuy={async () => {
          const purchased = await requestPurchase(PRODUCT_IDS.staff_offer_legendary);
          if (!purchased) return;
          setShowStaffBoxOfferModal(false);
          claimStaffBoxOffer();
          tryFirstPurchaseBonus();
        }}
        onDismiss={() => setShowStaffBoxOfferModal(false)}
      />
      <EpicStaffOfferModal
        visible={showEpicStaffOfferModal}
        cardId={gameState?.epicStaffOfferCardId}
        onBuy={async () => {
          const purchased = await requestPurchase(PRODUCT_IDS.staff_offer_epic);
          if (!purchased) return;
          setShowEpicStaffOfferModal(false);
          claimEpicStaffOffer();
          tryFirstPurchaseBonus();
        }}
        onDismiss={() => setShowEpicStaffOfferModal(false)}
      />


    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF2F7',
    paddingTop: Platform.OS === 'ios' ? 44 : 28,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Balance bar
  balanceBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1FCFF',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  balanceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    borderRadius: 4,
    paddingVertical: 5,
    gap: 8,
  },
  sectionStripe: {
    width: 14,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: CARD_GAP,
  },

  // Card
  card: {
    width: CARD_W,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 4,
    ...(Platform.OS === 'android' ? { elevation: 3 } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
  },
  goldCard: {
    borderColor: '#D97706',
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 2,
  },
  cardImageArea: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardImage: {
    width: 80,
    height: 55,
  },
  cardEmoji: {
    fontSize: 32,
  },
  bonusBadge: {
    backgroundColor: 'rgba(30, 64, 175, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginBottom: 3,
  },
  bonusText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#1E40AF',
  },
  chestBanner: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  chestImage: {
    width: '100%',
    height: (SCREEN_W - 32 - 3) / (543 / 181),
  },
  chestOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 30,
    paddingBottom: 24,
  },
  chestButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  chestBtnCol: {
    alignItems: 'center',
  },
  chestBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 7,
    paddingVertical: 5,
    paddingHorizontal: 13,
    minWidth: 69,
    alignItems: 'center',
  },
  chestBtnPremium: {
    backgroundColor: '#7C3AED',
  },
  freeChestBtn: {
    position: 'absolute',
    bottom: 0,
    left: 41,
    zIndex: 10,
  },
  freeChestGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 7,
    paddingVertical: 5,
    paddingHorizontal: 11,
    gap: 3,
  },
  freeChestText: {
    fontSize: 12,
  },
  freeChestLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  chestBtnText: {
    color: '#FFF',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  chestPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 3,
  },
  keyIcon: {
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  keyIconSmall: {
    width: 15,
    height: 15,
    borderRadius: 2,
  },
  chestPriceText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E3A5F',
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  priceBtn: {
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 6,
    width: '90%',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  premiumOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 11,
  },
  premiumBuyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingVertical: 5.25,
    paddingHorizontal: 10.5,
    gap: 4,
    transform: [{ scale: 1.12 }],
  },
  premiumBuyText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  premiumPriceBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  premiumPriceText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#FFF',
  },
  leagueBanner: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    position: 'relative',
  },
  leagueBannerImg: {
    width: '100%',
    height: (SCREEN_W - 32 - 3) / (577 / 433),
  },
  leagueLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leagueLockText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  leagueArrowLeft: {
    position: 'absolute',
    left: 8,
    top: '38%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 18,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  leagueArrowRight: {
    position: 'absolute',
    right: 8,
    top: '38%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 18,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  leagueDots: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  leagueDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  leagueDotActive: {
    backgroundColor: '#FFF',
  },
  leaguePackOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  leagueBuyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    gap: 5,
    transform: [{ scale: 1.3 }],
  },
  leagueBuyText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.4,
  },
  leaguePriceBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  leaguePriceText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFF',
  },
  purchasedBadge: {
    backgroundColor: 'rgba(34,197,94,0.85)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  purchasedText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
  },
  // ── Staff chest 3-column layout ──
  scRow: {
    flexDirection: 'row' as const,
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
  },
  scCol: {
    flex: 1,
    alignItems: 'center' as const,
  },
  scSpriteWrap: {
    width: 78,
    height: 78,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: -20,
    zIndex: 2,
    overflow: 'visible' as const,
  },
  scSpriteImg: {
    width: 62,
    height: 62,
  },
  scBadge: {
    position: 'absolute' as const,
    top: -10,
    alignSelf: 'center' as const,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#475569',
    zIndex: 3,
  },
  scBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#86EFAC',
    textAlign: 'center' as const,
  },
  scBadgeTimer: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#FDE68A',
    fontVariant: ['tabular-nums'] as any,
    textAlign: 'center' as const,
  },
  scFrame: {
    width: '100%' as const,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingTop: 24,
    paddingBottom: 10,
    paddingHorizontal: 6,
    alignItems: 'center' as const,
  },
  scTitle: {
    fontSize: 13,
    fontWeight: '900' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  scBtnRow: {
    flexDirection: 'row' as const,
    gap: 4,
    marginTop: 4,
    width: '100%' as const,
  },
  scBtnCol: {
    flex: 1,
    alignItems: 'center' as const,
  },
  scBtn: {
    width: '100%' as const,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#475569',
  },
  scBtnEpic: {
    backgroundColor: '#7C3AED',
  },
  scBtnLeg: {
    backgroundColor: '#B45309',
  },
  scBtnText: {
    fontSize: 12,
    fontWeight: '900' as const,
    color: '#FFF',
  },
  scPriceRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 3,
    marginTop: 3,
  },
  scPriceText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#CBD5E1',
  },
  // Alert dots
  alertDot: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: Colors.card,
    zIndex: 10,
  },
  alertDotChest: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  // Staff box result popup
  staffPopupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  staffPopupCard: { width: 260, borderRadius: 20, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  staffPopupGrad: { alignItems: 'center', paddingTop: 28, paddingBottom: 20, paddingHorizontal: 20, position: 'relative' },
  staffPopupRarityBadge: { position: 'absolute', top: 12, right: 12, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  staffPopupRarityText: { fontSize: 10, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  staffPopupEmoji: { fontSize: 56, marginBottom: 8 },
  staffPopupName: { fontSize: 22, fontWeight: '900', color: '#FFF', textAlign: 'center', marginBottom: 2 },
  staffPopupRole: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  staffPopupBonus: { fontSize: 16, fontWeight: '800', color: '#FFF', marginBottom: 10 },
  staffPopupBuildings: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  staffPopupBuildingTag: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  staffPopupBuildingText: { fontSize: 11, fontWeight: '700', color: '#FFF', textTransform: 'capitalize' },
  staffPopupDismissBtn: { backgroundColor: 'rgba(0,0,0,0.3)', paddingVertical: 14, alignItems: 'center' },
  staffPopupDismissText: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 1 },
  // Ribbon on offer banners
  ribbonImg: {
    position: 'absolute' as const,
    top: -22,
    left: -14,
    width: 90,
    height: 90,
    zIndex: 5,
  },
  ribbonText: {
    position: 'absolute' as const,
    top: 14,
    left: 7,
    zIndex: 6,
    fontSize: 10,
    fontWeight: '900' as const,
    color: '#FFF',
    transform: [{ rotate: '-36deg' }],
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Offer banners in premium packs
  offerBannerBg: { width: '100%', height: (SCREEN_W - 32 - 3) / (717 / 239), justifyContent: 'center', paddingLeft: 14, position: 'relative' },
  offerBannerValueBadge: { position: 'absolute', top: 8, left: 10, backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  offerBannerValueText: { fontSize: 10, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
  offerBannerLeft: { maxWidth: '60%' },
  offerBannerTitle: { fontSize: 14, fontWeight: '900', color: '#FFF', marginBottom: 3, marginTop: 10 },
  offerBannerDesc: { fontSize: 10, color: 'rgba(255,255,255,0.9)', lineHeight: 14 },
  // Staff offer overlay with timer + buy button
  staffOfferOverlay: {
    position: 'absolute', right: 8, top: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'flex-end', gap: 4,
  },
  staffOfferTimerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  staffOfferTimerText: {
    fontSize: 11, fontWeight: '800', color: '#FFF', fontVariant: ['tabular-nums'],
  },
  /* ── First Purchase Bonus ── */
  fpbWrap: { marginHorizontal: 16, marginBottom: 20 },
  fpbBanner: {
    borderRadius: 12, overflow: 'visible', height: 96,
    shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3,
  },
  fpbImageClip: { ...StyleSheet.absoluteFillObject, borderRadius: 12, overflow: 'hidden' } as any,
  fpbImage: { width: '100%', height: '100%' },
  fpbRewardsRow: {
    position: 'absolute', bottom: -12, left: 0, right: 0,
    zIndex: 10, alignItems: 'center',
  },
  fpbRewardsScroll: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  fpbRewardItem: { alignItems: 'center', overflow: 'visible' },
  fpbRewardIcon: {
    width: 34, height: 34, borderRadius: 8, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  fpbQtyBadge: {
    marginTop: -4,
    backgroundColor: '#1F2937', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1,
    minWidth: 22, alignItems: 'center', zIndex: 10,
  },
  fpbQtyText: { fontSize: 7, fontWeight: '900', color: '#FFF' },
  fpbChestImg: { width: 24, height: 24 },
});