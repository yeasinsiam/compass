import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Compass } from '../components/Compass';

export default function Home() {
  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <StatusBar style="light" />

      <View className="flex-1 items-center justify-center px-5">
        <View className="w-full max-w-md">
          <Text className="text-2xl font-semibold text-zinc-50">Compass</Text>
          <Text className="mt-1 text-sm text-zinc-400">Find your direction at a glance</Text>
        </View>

        <View className="mt-6 w-full items-center">
          <Compass />
        </View>
      </View>
    </SafeAreaView>
  );
}
