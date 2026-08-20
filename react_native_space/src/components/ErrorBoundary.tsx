import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors } from '../theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error?.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Text style={s.emoji}>⚠️</Text>
          <Text style={s.title}>Something went wrong</Text>
          <Text style={s.message}>{this.state.error}</Text>
          <Pressable style={s.btn} onPress={() => this.setState({ hasError: false, error: '' })}>
            <Text style={s.btnText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: Colors.background },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.dark, marginBottom: 8 },
  message: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
