import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

export function AdsIcon({ color = '#FFFFFF', size = 26 }: { color?: string; size?: number }) {
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(0.7);

  useEffect(() => {
    scaleValue.value = withRepeat(
      withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    opacityValue.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
      opacity: opacityValue.value,
    };
  });

  return (
    <Animated.View style={[
      animatedStyle,
      { 
        justifyContent: 'center', 
        alignItems: 'center',
        height: size,
        width: size * 1.5,
        backgroundColor: 'transparent'
      }
    ]}>
      <Text style={[styles.text, { color, fontSize: size * 0.75 }]}>
        ads
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: '900',
    letterSpacing: -1,
    fontStyle: 'italic',
  }
});
