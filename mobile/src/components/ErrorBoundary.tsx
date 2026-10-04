import React from 'react';
import { Appearance, Pressable, StyleSheet, Text, View } from 'react-native';

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Hook your crash reporter here (Sentry, Firebase Crashlytics, ...)
    console.error('Unhandled UI error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const dark = (Appearance.getColorScheme() ?? 'light') === 'dark';
    return (
      <View
        style={[styles.wrap, { backgroundColor: dark ? '#0E1514' : '#F5F8F7' }]}
      >
        <Text style={[styles.title, { color: dark ? '#E1E9E7' : '#101414' }]}>
          Something went wrong
        </Text>
        <Text style={[styles.body, { color: dark ? '#B5C4C1' : '#3F4947' }]}>
          The app hit an unexpected problem. Your data is safe.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => this.setState({ hasError: false })}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  button: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
});
