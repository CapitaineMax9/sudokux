import {
  Orbitron_500Medium,
  Orbitron_700Bold,
  Orbitron_900Black,
} from '@expo-google-fonts/orbitron';
import {
  Rajdhani_500Medium,
  Rajdhani_600SemiBold,
  Rajdhani_700Bold,
} from '@expo-google-fonts/rajdhani';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { installDevtools } from '@/game/devtools';
import { useProgressReady } from '@/store/progress';
import { C } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  // L'écran de démarrage est peut-être déjà masqué : sans conséquence.
});

installDevtools();

const NAV_THEME = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, primary: C.cyan, text: C.text },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Orbitron_500Medium,
    Orbitron_700Bold,
    Orbitron_900Black,
    Rajdhani_500Medium,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
  });
  const progressReady = useProgressReady();
  // Si une police ne se charge pas, on démarre quand même avec celle du système.
  const ready = (fontsLoaded || fontError !== null) && progressReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={NAV_THEME}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: C.bg },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="play" options={{ gestureEnabled: false }} />
      </Stack>
    </ThemeProvider>
  );
}
