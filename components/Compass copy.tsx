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
  // Basic magnetic heading. Note: device axis conventions differ slightly by platform.
  // This mapping is a pragmatic default for Expo apps.
  const angleRad = Math.atan2(y, x);
  const angleDeg = (angleRad * 180) / Math.PI;
  // Rotate so that 0° ~= North.
  return clampHeadingDegrees(angleDeg + 90);
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

      // A bit smoother than default; adjust if you want snappier.
      Magnetometer.setUpdateInterval(80);

      sub = Magnetometer.addListener((data) => {
        const h = headingFromMagnetometer(data as MagnetometerReading);
        setHeading(h);

        const current = rotationDeg.value;
        const delta = shortestDeltaDegrees(current, h);
        const next = current + delta;
        rotationDeg.value = withTiming(next, {
          duration: 140,
          easing: Easing.out(Easing.cubic),
        });

        // Very lightweight “calibration” hint: if the field magnitude is weird, suggest a figure-8.
        const mag = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
        if (mag < 15 || mag > 80) setAccuracyHint('Move phone in a figure‑8 to calibrate');
        else setAccuracyHint(null);
      });
    })();

    return () => {
      sub?.remove();
    };
  }, [rotationDeg]);

  const needleStyle = useAnimatedStyle(() => {
    // Needle points toward North; when heading is 90° (East), north is to the left => rotate -90.
    return {
      transform: [{ rotate: `${-rotationDeg.value}deg` }],
    };
  });

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

            {/* Outer ring */}
            <View className="absolute h-72 w-72 rounded-full border border-zinc-700/70 bg-zinc-950/40" />

            {/* Cardinal markers */}
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

            {/* Needle */}
            <Animated.View
              style={needleStyle}
              className="absolute h-72 w-72 items-center justify-start">
              <View className="mt-10 h-24 w-2 overflow-hidden rounded-full bg-zinc-50" />
              <View className="-mt-1 h-10 w-10 rotate-45 rounded-md bg-zinc-50" />
            </Animated.View>

            {/* Center cap */}
            <View className="absolute h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950">
              <View className="h-2 w-2 rounded-full bg-zinc-50" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
