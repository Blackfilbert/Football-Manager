import React from 'react';
import { Text, Platform } from 'react-native';

/** Renders a flag emoji. Works on iOS/Android natively. On web uses Twemoji font fallback. */
export default function FlagIcon({ code, size = 22 }: { code: string; size?: number }) {
  return (
    <Text
      style={{
        fontSize: size,
        lineHeight: size * 1.3,
        textAlign: 'center',
        ...(Platform.OS === 'web' ? { fontFamily: 'Twemoji Country Flags, Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif' } : {}),
      }}
    >
      {code || '\u26BD'}
    </Text>
  );
}
