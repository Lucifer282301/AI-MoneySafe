import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { APP_NAME, APP_TAGLINE, BRAND_GREEN, BRAND_INK } from '../config/brand';

// Same shapes as the app icon (drawn in a 100 x 100 box)
const SHIELD =
  'M50 0 C64 7 79 13 93 13 L93 55 C93 79 73 93 50 100 C27 93 7 79 7 55 L7 13 C21 13 36 7 50 0 Z';
const CHECK = 'M32 51 L45 64 L70 36';
const CHECK_LENGTH = 60;

// Must match the native launch screen: a 140 pt box with the shield at 80% of its width
const LOGO_SIZE = 140;
const MIN_DURATION = 1900;

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  ready: boolean; // the app has loaded its theme and session
  onFinish: () => void; // called after the fade-out, so the parent can remove the splash
}

export default function AnimatedSplash({ ready, onFinish }: Props) {
  const check = useRef(new Animated.Value(0)).current; // drawn with the JS driver
  const ring = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(1)).current;

  const [minElapsed, setMinElapsed] = useState(false);
  const exiting = useRef(false);

  // Intro animation
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let animation: Animated.CompositeAnimation | undefined;
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (cancelled) return;

      if (reduce) {
        // No movement: show the final state and leave sooner
        check.setValue(1);
        title.setValue(1);
        tagline.setValue(1);
        timer = setTimeout(() => setMinElapsed(true), 500);
        return;
      }

      animation = Animated.parallel([
        Animated.timing(check, {
          toValue: 1,
          duration: 550,
          delay: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(ring, {
          toValue: 1,
          duration: 900,
          delay: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(title, {
          toValue: 1,
          duration: 450,
          delay: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(tagline, {
          toValue: 1,
          duration: 450,
          delay: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
      animation.start();
      timer = setTimeout(() => setMinElapsed(true), MIN_DURATION);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      animation?.stop();
    };
  }, [check, ring, title, tagline]);

  // Leave only when the animation has had time to play AND the app is ready
  useEffect(() => {
    if (ready && minElapsed && !exiting.current) {
      exiting.current = true;
      Animated.timing(exit, {
        toValue: 0,
        duration: 380,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => onFinish());
    }
  }, [ready, minElapsed, exit, onFinish]);

  return (
    <Animated.View
      style={[styles.root, { opacity: exit }]}
      accessible
      accessibilityLabel={`${APP_NAME} is loading`}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.center}>
        <View style={styles.logoBox}>
          <Animated.View
            style={[
              styles.ring,
              {
                opacity: ring.interpolate({
                  inputRange: [0, 0.2, 1],
                  outputRange: [0, 0.45, 0],
                }),
                transform: [
                  {
                    scale: ring.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1.9],
                    }),
                  },
                ],
              },
            ]}
          />
          <Svg
            width={LOGO_SIZE}
            height={LOGO_SIZE}
            viewBox="-3.75 -3.75 107.5 107.5"
          >
            <Path d={SHIELD} fill={BRAND_GREEN} />
            <AnimatedPath
              d={CHECK}
              stroke={BRAND_INK}
              strokeWidth={9}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={[CHECK_LENGTH, CHECK_LENGTH]}
              strokeDashoffset={check.interpolate({
                inputRange: [0, 1],
                outputRange: [CHECK_LENGTH, 0],
              })}
            />
          </Svg>
        </View>
      </View>

      <View style={styles.below} pointerEvents="none">
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: title,
              transform: [
                {
                  translateY: title.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {APP_NAME}
        </Animated.Text>
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: tagline,
              transform: [
                {
                  translateY: tagline.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {APP_TAGLINE}
        </Animated.Text>
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
  logoBox: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: LOGO_SIZE * 0.8,
    height: LOGO_SIZE * 0.8,
    borderRadius: LOGO_SIZE * 0.4,
    borderWidth: 2,
    borderColor: BRAND_GREEN,
  },
  below: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: LOGO_SIZE / 2 + 12,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 6 },
});
