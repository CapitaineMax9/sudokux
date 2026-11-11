import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useT, type StringKey } from '@/i18n';
import { normalizeCode } from '@/net/localCode';
import {
  SAVE_CODE_LENGTH,
  formatSaveCode,
  linkSaveCode,
  syncNow,
  useCloud,
  type LinkResult,
} from '@/net/cloudSave';
import { useProgress } from '@/store/progress';

import { NeonButton } from './NeonButton';
import { Panel } from './Panel';
import { C, F, alpha, glow } from './theme';
import { Txt } from './Txt';

const RESULT_KEYS: Record<LinkResult, StringKey> = {
  linked: 'cloud.linked',
  notFound: 'cloud.notFound',
  badCode: 'cloud.badCode',
  offline: 'cloud.offlineError',
};

/** Réglages : code de sauvegarde en ligne et récupération sur un autre appareil. */
export function CloudSaveSection() {
  const t = useT();
  const status = useCloud((state) => state.status);
  const code = useProgress((state) => state.cloudKey);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LinkResult | null>(null);
  const [copied, setCopied] = useState(false);

  const color = status === 'synced' ? C.green : status === 'offline' ? C.orange : C.cyan;

  if (status === 'off') {
    return (
      <Panel color={C.textDim} style={styles.section}>
        <Txt variant="label" color={C.textDim} size={10}>
          {t('cloud.title')}
        </Txt>
        <Txt variant="small" color={C.textMuted}>
          {t('cloud.off')}
        </Txt>
      </Panel>
    );
  }

  return (
    <Panel color={color} style={styles.section}>
      <Txt variant="label" color={C.textDim} size={10}>
        {t('cloud.title')}
      </Txt>
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: color }, glow(color, 8)]} />
        <Txt variant="small" color={C.text} size={15} style={styles.flex} testID="cloud-status">
          {t(`cloud.${status}` as StringKey)}
        </Txt>
      </View>
      {status === 'offline' ? (
        <NeonButton testID="cloud-retry" label={t('cloud.retry')} size="sm" color={C.orange} onPress={() => syncNow()} />
      ) : null}

      {code ? (
        <>
          <Txt variant="label" color={C.textDim} size={10} style={styles.gapTop}>
            {t('cloud.code')}
          </Txt>
          <View style={styles.codeRow}>
            <Txt variant="num" color={C.yellow} glow={8} size={22} style={styles.flex} selectable testID="cloud-code">
              {formatSaveCode(code)}
            </Txt>
            <NeonButton
              testID="cloud-copy"
              label={t(copied ? 'cloud.copied' : 'cloud.copy')}
              size="sm"
              color={C.yellow}
              onPress={() => {
                Clipboard.setStringAsync(formatSaveCode(code)).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            />
          </View>
          <Txt variant="small" color={C.textDim}>
            {t('cloud.codeHint')}
          </Txt>
        </>
      ) : null}

      <Txt variant="label" color={C.textDim} size={10} style={styles.gapTop}>
        {t('cloud.restore')}
      </Txt>
      <Txt variant="small" color={C.textDim}>
        {t('cloud.restoreHint')}
      </Txt>
      <TextInput
        testID="cloud-input"
        value={input}
        onChangeText={(text) => {
          setInput(formatSaveCode(normalizeCode(text, SAVE_CODE_LENGTH)));
          setResult(null);
        }}
        autoCorrect={false}
        autoCapitalize="characters"
        placeholder="XXXX-XXXX-XXXX"
        placeholderTextColor={C.textMuted}
        style={styles.input}
      />
      <NeonButton
        testID="cloud-restore"
        label={t('cloud.restoreButton')}
        color={C.cyan}
        disabled={busy || normalizeCode(input, SAVE_CODE_LENGTH).length !== SAVE_CODE_LENGTH}
        onPress={async () => {
          setBusy(true);
          const outcome = await linkSaveCode(input);
          setBusy(false);
          setResult(outcome);
          if (outcome === 'linked') setInput('');
        }}
      />
      {result ? (
        <Txt
          variant="bodyBold"
          size={15}
          color={result === 'linked' ? C.green : C.orange}
          testID="cloud-result">
          {t(RESULT_KEYS[result])}
        </Txt>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    marginBottom: 14,
  },
  flex: {
    flex: 1,
  },
  gapTop: {
    marginTop: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: alpha(C.cyan, 0.4),
    borderRadius: 6,
    backgroundColor: alpha(C.bg, 0.7),
    color: C.text,
    fontFamily: F.bodyBold,
    fontSize: 18,
    letterSpacing: 2,
    textAlign: 'center',
  },
});
