import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../theme';

interface Props {
  visible: boolean;
  text: string;
  subText?: string;
  emoji?: string;
  buttonText?: string;
  onPress?: () => void;
  position?: 'top' | 'center' | 'bottom';
  /** When true, overlay blocks all interaction until button pressed */
  blocking?: boolean;
}

export default function TutorialOverlay({ visible, text, subText, emoji, buttonText, onPress, position = 'center', blocking = true }: Props) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={[s.overlay, position === 'top' && s.overlayTop, position === 'bottom' && s.overlayBottom]}>
        <View style={s.card}>
          {emoji && <Text style={s.emoji}>{emoji}</Text>}
          <Text style={s.text}>{text}</Text>
          {subText && <Text style={s.subText}>{subText}</Text>}
          {buttonText && onPress && (
            <Pressable style={s.btn} onPress={onPress}>
              <Text style={s.btnText}>{buttonText}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  overlayTop: { justifyContent: 'flex-start', paddingTop: 120 },
  overlayBottom: { justifyContent: 'flex-end', paddingBottom: 120 },
  card: { backgroundColor: '#1E293B', borderRadius: 20, padding: 24, alignItems: 'center', maxWidth: 340, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  emoji: { fontSize: 48, marginBottom: 12 },
  text: { fontSize: 17, fontWeight: '800', color: '#F8FAFC', textAlign: 'center', lineHeight: 24 },
  subText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 18 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 20 },
  btnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
});
