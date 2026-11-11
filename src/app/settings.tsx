import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { haptics } from '@/game/haptics';
import { useT, type Lang } from '@/i18n';
import { useLang, useProgress } from '@/store/progress';
import { CloudSaveSection } from '@/ui/CloudSaveSection';
import { NeonButton } from '@/ui/NeonButton';
import { Panel } from '@/ui/Panel';
import { Screen } from '@/ui/Screen';
import { C, alpha, glow } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

const LANGUAGES: { id: Lang; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
];

function Choice({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[
        styles.choice,
        {
          borderColor: alpha(C.cyan, active ? 1 : 0.3),
          backgroundColor: alpha(C.cyan, active ? 0.16 : 0.04),
        },
        active ? glow(C.cyan, 10, 0.4) : null,
      ]}>
      <Txt variant="title" color={active ? C.cyan : C.textDim} size={13}>
        {label.toUpperCase()}
      </Txt>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const hapticsOn = useProgress((state) => state.haptics);
  const setLang = useProgress((state) => state.setLang);
  const setHaptics = useProgress((state) => state.setHaptics);
  const reset = useProgress((state) => state.reset);
  const [confirming, setConfirming] = useState(false);
  const version = Constants.expoConfig?.version ?? '0.1.0';

  return (
    <Screen title={t('settings.title')} onBack={() => router.back()} scroll>
      <Panel style={styles.section}>
        <Txt variant="label" color={C.textDim} size={10}>
          {t('settings.language')}
        </Txt>
        <View style={styles.row}>
          {LANGUAGES.map((option) => (
            <Choice
              key={option.id}
              testID={`lang-${option.id}`}
              label={option.label}
              active={lang === option.id}
              onPress={() => setLang(option.id)}
            />
          ))}
        </View>
      </Panel>

      <Panel style={styles.section}>
        <Txt variant="label" color={C.textDim} size={10}>
          {t('settings.haptics')}
        </Txt>
        <Txt variant="small" color={C.textDim}>
          {t('settings.hapticsHint')}
        </Txt>
        <View style={styles.row}>
          <Choice
            testID="haptics-on"
            label={t('settings.on')}
            active={hapticsOn}
            onPress={() => setHaptics(true)}
          />
          <Choice
            testID="haptics-off"
            label={t('settings.off')}
            active={!hapticsOn}
            onPress={() => setHaptics(false)}
          />
        </View>
      </Panel>

      <CloudSaveSection />

      <Panel color={C.red} style={styles.section}>
        <Txt variant="label" color={C.red} size={10}>
          {t('settings.reset')}
        </Txt>
        {confirming ? (
          <>
            <Txt variant="body" color={C.text}>
              {t('settings.resetConfirm')}
            </Txt>
            <View style={styles.row}>
              <NeonButton
                testID="reset-cancel"
                label={t('common.cancel')}
                color={C.textDim}
                onPress={() => setConfirming(false)}
                style={styles.flex}
              />
              <NeonButton
                testID="reset-confirm"
                label={t('settings.resetYes')}
                color={C.red}
                variant="solid"
                onPress={() => {
                  reset();
                  setConfirming(false);
                }}
                style={styles.flex}
              />
            </View>
          </>
        ) : (
          <NeonButton
            testID="reset"
            label={t('settings.reset')}
            color={C.red}
            variant="ghost"
            onPress={() => setConfirming(true)}
          />
        )}
      </Panel>

      <Txt variant="small" color={C.textMuted} center style={styles.version}>
        SUDOKU X · {t('settings.version', { v: version })}
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  choice: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 6,
  },
  version: {
    marginTop: 10,
  },
});
