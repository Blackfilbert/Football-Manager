import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Image, ImageSourcePropType, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');

const PACK_IMAGES: Record<string, ImageSourcePropType> = {
  league2: require('../../assets/images/league2_pack.png'),
  league1: require('../../assets/images/league1_pack.png'),
  premier: require('../../assets/images/premier_pack.png'),
  champions: require('../../assets/images/champions_pack.png'),
};

interface Props {
  visible: boolean;
  packId: 'league2' | 'league1' | 'premier' | 'champions';
  price: string;
  onBuy: () => void;
  onDismiss: () => void;
}

export default function LeaguePackOfferModal({ visible, packId, price, onBuy, onDismiss }: Props) {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        {/* Close button — top right */}
        <Pressable style={s.closeBtn} onPress={onDismiss} hitSlop={14}>
          <View style={s.closeBg}>
            <Ionicons name="close" size={22} color="#FFF" />
          </View>
        </Pressable>

        {/* Banner + Buy button wrapper */}
        <View style={s.bannerWrap}>
          <Image
            source={PACK_IMAGES[packId]}
            style={s.banner}
            resizeMode="contain"
          />

          {/* Buy button pinned to bottom of banner */}
          <Pressable style={s.buyBtn} onPress={onBuy}>
            <LinearGradient
              colors={['#22C55E', '#16A34A'] as const}
              style={s.buyGradient}
            >
              <Text style={s.buyText}>BUY NOW</Text>
              <View style={s.priceBadge}>
                <Text style={s.priceText}>{price}</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  closeBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerWrap: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: undefined,
    aspectRatio: 577 / 433,
    borderRadius: 16,
  },
  buyBtn: {
    position: 'absolute',
    bottom: '8%',
    alignSelf: 'center',
  },
  buyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 18,
    gap: 7,
  },
  buyText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  priceBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF',
  },
});
