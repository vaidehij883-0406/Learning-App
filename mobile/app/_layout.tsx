import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { DownloadProvider } from '../src/context/DownloadContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <DownloadProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#ffffff' },
            headerTintColor: '#0f172a',
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="batch/[id]" options={{ title: 'Batch Details' }} />
          <Stack.Screen name="lecture/[id]" options={{ title: 'Lecture Player' }} />
          <Stack.Screen name="quiz/[id]" options={{ title: 'Assessment Quiz' }} />
        </Stack>
      </DownloadProvider>
    </AuthProvider>
  );
}
