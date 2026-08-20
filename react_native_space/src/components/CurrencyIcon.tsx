import React from 'react';
import { Image, StyleSheet } from 'react-native';

const MONEY_IMG = require('../../assets/images/currency_money.png');
const DIAMOND_IMG = require('../../assets/images/currency_diamond.png');
const FAME_IMG = require('../../assets/images/currency_fame.png');

interface Props {
  type: 'money' | 'diamond' | 'fame';
  size?: number;
}

const SOURCE_MAP = {
  money: MONEY_IMG,
  diamond: DIAMOND_IMG,
  fame: FAME_IMG,
} as const;

export default function CurrencyIcon({ type, size = 16 }: Props) {
  return (
    <Image
      source={SOURCE_MAP[type]}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
