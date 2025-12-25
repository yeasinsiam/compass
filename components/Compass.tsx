import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type MagnetometerReading = {
  x: number;
  y: number;
  z: number;
};

function clampHeadingDegrees(deg: number) {
  const v = deg % 360;
  return v < 0 ? v + 360 : v;
}

function shortestDeltaDegrees(fromDeg: number, toDeg: number) {
  const a = clampHeadingDegrees(fromDeg);
  const b = clampHeadingDegrees(toDeg);
  return ((b - a + 540) % 360) - 180;
}

function headingFromMagnetometer({ x, y }: MagnetometerReading) {
  // Axis correction for typical phone orientation
  const angleRad = Math.atan2(-x, y); // <- corrects for orientation
  const angleDeg = (angleRad * 180) / Math.PI;
  return clampHeadingDegrees(angleDeg);
}

function cardinalFromHeading(deg: number) {
  const headings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(clampHeadingDegrees(deg) / 45) % 8;
  return headings[idx];
}

export function Compass() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [heading, setHeading] = useState(0);
  const [accuracyHint, setAccuracyHint] = useState<string | null>(null);

  const rotationDeg = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [pulse]);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;

    (async () => {
      const isAvailable = await Magnetometer.isAvailableAsync();
      setAvailable(isAvailable);
      if (!isAvailable) return;

      Magnetometer.setUpdateInterval(100);

      sub = Magnetometer.addListener((data) => {
        const h = headingFromMagnetometer(data as MagnetometerReading);

        // Smooth rotation
        const current = rotationDeg.value % 360;
        const delta = shortestDeltaDegrees(current, h);
        const next = current + delta;

        rotationDeg.value = withTiming(next, {
          duration: 150,
          easing: Easing.out(Easing.cubic),
        });

        setHeading(Math.round(h));

        // Calibration hint
        const mag = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
        if (mag < 25 || mag > 65) {
          setAccuracyHint('Move phone in a figure‑8 to calibrate');
        } else {
          setAccuracyHint(null);
        }
      });
    })();

    return () => {
      sub?.remove();
    };
  }, [rotationDeg]);

  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-rotationDeg.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => {
    const scale = 1 + 0.03 * pulse.value;
    const opacity = 0.18 + 0.08 * (1 - pulse.value);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const cardSubtitle = useMemo(() => {
    if (available === false) return 'Magnetometer unavailable on this device';
    if (Platform.OS === 'web') return 'Compass works best on a real device';
    return accuracyHint ?? 'Align the top edge with your direction';
  }, [accuracyHint, available]);

  return (
    <View className="w-full max-w-md items-center">
      <View className="w-full rounded-3xl bg-zinc-900/60 p-5">
        <View className="mb-3">
          <Text className="text-sm font-medium text-zinc-400">Heading</Text>
          <View className="mt-1 flex-row items-end justify-between">
            <Text className="text-4xl font-semibold text-zinc-50">{Math.round(heading)}°</Text>
            <Text className="text-lg font-semibold text-zinc-200">
              {cardinalFromHeading(heading)}
            </Text>
          </View>
          <Text className="mt-1 text-xs text-zinc-400">{cardSubtitle}</Text>
        </View>

        <View className="items-center justify-center">
          <View className="h-72 w-72 items-center justify-center">
            <Animated.View
              className="absolute h-72 w-72 rounded-full bg-zinc-500/10"
              style={pulseStyle}
            />

            <Animated.View
              style={dialStyle}
              className="absolute inset-0 items-center justify-center"
            >
              <View className="absolute h-72 w-72 rounded-full border border-zinc-700/70 bg-zinc-950/40" />
              <View className="absolute inset-0 items-center justify-start pt-4">
                <Text className="text-sm font-semibold text-zinc-100">N</Text>
              </View>
              <View className="absolute inset-0 items-center justify-end pb-4">
                <Text className="text-sm font-semibold text-zinc-300">S</Text>
              </View>
              <View className="absolute inset-0 items-start justify-center pl-4">
                <Text className="text-sm font-semibold text-zinc-300">W</Text>
              </View>
              <View className="absolute inset-0 items-end justify-center pr-4">
                <Text className="text-sm font-semibold text-zinc-300">E</Text>
              </View>
            </Animated.View>

            <View className="absolute inset-0 items-center justify-start">
              <View className="mt-4 items-center">
                <View className="h-4 w-4 rotate-45 rounded-sm bg-zinc-50" />
                <View className="-mt-1 h-9 w-1 rounded-full bg-zinc-50" />
              </View>
            </View>

            <View className="absolute h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950">
              <View className="h-2 w-2 rounded-full bg-zinc-50" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
