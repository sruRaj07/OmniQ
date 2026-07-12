import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

export function AdsIcon({ color = '#FFFFFF', size = 26 }: { color?: string; size?: number }) {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 1.15,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          })
        ]),
        Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 0.7,
            duration: 1200,
            useNativeDriver: true,
          })
        ]),
      ])
    ).start();
  }, [scaleValue, opacityValue]);

  return (
    <Animated.View style={{ 
      transform: [{ scale: scaleValue }], 
      opacity: opacityValue,
      justifyContent: 'center', 
      alignItems: 'center',
      height: size,
      width: size * 1.5,
      backgroundColor: 'transparent'
    }}>
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
