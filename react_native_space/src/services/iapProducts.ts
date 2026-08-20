/**
 * IAP Product IDs — safe to import from any platform (no native deps).
 */
export const PRODUCT_IDS = {
  // Diamond packs
  diamonds_10: 'diamonds_10',
  diamonds_25: 'diamonds_25_v2',
  diamonds_60: 'diamonds_60_v2',
  diamonds_150: 'diamonds_150_v2',
  diamonds_5000: 'diamonds_5000_v2',
  // Premium packs
  premium_noAds: 'premium_no_ads',
  premium_2xIncome: 'premium_2x_income',
  premium_3xIdle: 'premium_3x_idle',
  premium_3xIncome: 'premium_3x_income',
  // League packs
  league_pack_league2: 'league_pack_league2',
  league_pack_league1: 'league_pack_league1',
  league_pack_premier: 'league_pack_premier',
  league_pack_champions: 'league_pack_champions',
  // Career Battle Pass
  career_bp_premium: 'career_bp_premium',
  career_bp_vip: 'career_bp_vip',
  // Bonus pack
  bonus_pack: 'bonus_pack',
  // Ultimate player offer
  ultimate_player: 'ultimate_player',
  // Season Pass
  season_pass_silver: 'season_pass_silver',
  season_pass_gold: 'season_pass_gold',
  // Valor Pass
  valor_pass_gold: 'valor_pass_gold',
  // Staff Offers
  staff_offer_legendary: 'staff_offer_legendary',
  staff_offer_epic: 'staff_offer_epic',
  // Special offers
  offer_uniform_5: 'offer_uniform_5',
  offer_player_5: 'offer_player_5',
} as const;

export const ALL_PRODUCT_IDS = Object.values(PRODUCT_IDS);
