import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StatusBar, StyleSheet, View } from 'react-native';

import BrandGlyph from './BrandGlyph';
import { BRAND_INK } from '../config/brand';

const LOGO_SIZE = 140;

interface Props {
  ready: boolean;
  onFinish: () => void;
}

export default function AnimatedSplash({ ready, onFinish }: Props) {
  const exit = useRef(new Animated.Value(1)).current;
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const exiting = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinimumElapsed(true), 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready && minimumElapsed && !exiting.current) {
      exiting.current = true;
      Animated.timing(exit, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => onFinish());
    }
  }, [ready, minimumElapsed, exit, onFinish]);

  return (
    <Animated.View
      style={[styles.root, { opacity: exit }]}
      accessible
      accessibilityLabel="AI-MoneySafe is loading"
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.center}>
        <BrandGlyph size={LOGO_SIZE} strokeWidth={4.5} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: BRAND_INK },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
