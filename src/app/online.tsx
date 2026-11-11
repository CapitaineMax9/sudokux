import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useT, type StringKey } from '@/i18n';
import { LOCAL_CODE_LENGTH, formatCode, normalizeCode } from '@/net/localCode';
import {
  internetAvailable,
  localAvailable,
  useOnline,
  type OnlineError,
} from '@/net/online';
import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH, cleanName } from '@/net/protocol';
import { useProgress } from '@/store/progress';
import { Icon } from '@/ui/Icon';
import { NeonButton } from '@/ui/NeonButton';
import { Panel } from '@/ui/Panel';
import { Screen } from '@/ui/Screen';
import { C, F, alpha } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

function errorKey(error: OnlineError, mode: 'local' | 'internet' | null): StringKey | null {
  switch (error) {
    case null:
      return null;
    case 'unreachable':
      return mode === 'internet' ? 'online.err.internet' : 'online.err.unreachable';
    default:
      return `online.err.${error}` as StringKey;
  }
}

function CodeInput({
  value,
  onChange,
  length,
  testID,
}: {
  value: string;
  onChange: (code: string) => void;
  length: number;
  testID: string;
}) {
  return (
    <TextInput
      testID={testID}
      value={value}
      onChangeText={(text) => onChange(normalizeCode(text, length))}
      maxLength={length + 2}
      autoCorrect={false}
      autoCapitalize="characters"
      placeholder={'•'.repeat(length)}
      placeholderTextColor={C.textMuted}
      style={[styles.input, styles.codeInput]}
    />
  );
}

/** Duel contre un autre joueur : à côté (sans Internet) ou par Internet. */
export default function OnlineScreen() {
  const router = useRouter();
  const t = useT();
  const phase = useOnline((state) => state.phase);
  const mode = useOnline((state) => state.mode);
  const error = useOnline((state) => state.error);
  const code = useOnline((state) => state.code);
  const rival = useOnline((state) => state.rival);
  const playerName = useProgress((state) => state.playerName);
  const [name, setName] = useState(playerName);
  const [localCode, setLocalCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const local = localAvailable();
  const internet = internetAvailable();

  // Adversaire trouvé : direction l'écran de jeu.
  useEffect(() => {
    if (phase === 'matched') router.push({ pathname: '/play', params: { kind: 'online' } });
  }, [phase, router]);

  const saveName = () => {
    const cleaned = cleanName(name);
    if (cleaned && cleaned !== playerName) useProgress.getState().setPlayerName(cleaned);
    setName(cleaned || playerName);
  };

  const leave = () => {
    useOnline.getState().cancel();
    router.back();
  };

  const online = useOnline.getState();
  const message = errorKey(error, mode);
  const idle = phase === 'idle';

  return (
    <Screen title={t('online.title')} onBack={leave} scroll tint={C.coral}>
      <Panel style={styles.section}>
        <Txt variant="label" color={C.textDim} size={10}>
          {t('online.name')}
        </Txt>
        <TextInput
          testID="online-name"
          value={name}
          onChangeText={setName}
          onBlur={saveName}
          onSubmitEditing={saveName}
          maxLength={MAX_NAME_LENGTH}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
          editable={idle}
          style={styles.input}
        />
      </Panel>

      {message ? (
        <Panel color={C.orange} style={styles.section}>
          <Txt variant="bodyBold" color={C.orange} size={15} testID="online-error">
            {t(message)}
          </Txt>
        </Panel>
      ) : null}

      {phase === 'busy' ? (
        <Panel color={C.cyan} style={styles.section}>
          <Txt variant="heading" color={C.cyan} glow={8} size={17} center testID="online-busy">
            {t('online.busy')}
          </Txt>
          <NeonButton testID="online-cancel" label={t('common.cancel')} color={C.textDim} onPress={online.cancel} />
        </Panel>
      ) : phase === 'hosting' && code ? (
        <Panel color={C.yellow} style={styles.section}>
          <Txt variant="label" color={C.textDim} size={10} center>
            {t('online.code')}
          </Txt>
          <Txt variant="display" color={C.yellow} glow={14} size={mode === 'local' ? 34 : 44} center testID="online-code">
            {formatCode(code)}
          </Txt>
          <Txt variant="small" color={C.textDim} center>
            {t(mode === 'local' ? 'online.codeHintLocal' : 'online.codeHintInternet')}
          </Txt>
          <NeonButton testID="online-cancel" label={t('common.cancel')} color={C.textDim} onPress={online.cancel} />
        </Panel>
      ) : phase === 'searching' ? (
        <Panel color={C.cyan} style={styles.section}>
          <Txt variant="heading" color={C.cyan} glow={8} size={17} center testID="online-searching">
            {t('online.searching')}
          </Txt>
          <NeonButton testID="online-cancel" label={t('common.cancel')} color={C.textDim} onPress={online.cancel} />
        </Panel>
      ) : phase === 'paired' || phase === 'waitingRematch' ? (
        <Panel color={C.coral} style={styles.section}>
          <Txt variant="heading" color={C.coral} glow={8} size={17} center testID="online-paired">
            {t(phase === 'paired' ? 'online.paired' : 'online.waitingRematch', { name: rival ?? '?' })}
          </Txt>
          <NeonButton
            testID="online-rematch"
            label={t('online.rematch')}
            icon="retry"
            variant="solid"
            color={C.coral}
            disabled={phase !== 'paired'}
            onPress={online.rematch}
          />
          <NeonButton testID="online-quit" label={t('online.quit')} color={C.textDim} onPress={online.cancel} />
        </Panel>
      ) : (
        <>
          <Panel color={C.green} style={styles.section}>
            <View style={styles.head}>
              <Icon name="sonar" size={22} color={local ? C.green : C.textMuted} />
              <Txt variant="heading" color={local ? C.green : C.textMuted} size={16}>
                {t('online.local').toUpperCase()}
              </Txt>
            </View>
            <Txt variant="small" color={C.textDim}>
              {t(local ? 'online.localSub' : 'online.localUnavailable')}
            </Txt>
            <NeonButton
              testID="online-host-local"
              label={t('online.host')}
              icon="bolt"
              variant="solid"
              color={C.green}
              disabled={!local || !idle}
              onPress={() => online.hostLocal()}
            />
            <View style={styles.joinRow}>
              <CodeInput
                testID="online-local-input"
                value={localCode}
                onChange={setLocalCode}
                length={LOCAL_CODE_LENGTH}
              />
              <NeonButton
                testID="online-join-local"
                label={t('online.join')}
                color={C.green}
                disabled={!local || !idle || localCode.length !== LOCAL_CODE_LENGTH}
                onPress={() => online.joinLocal(localCode)}
                style={styles.flex}
              />
            </View>
          </Panel>

          <Panel color={C.coral} style={styles.section}>
            <View style={styles.head}>
              <Icon name="globe" size={22} color={internet ? C.coral : C.textMuted} />
              <Txt variant="heading" color={internet ? C.coral : C.textMuted} size={16}>
                {t('online.internet').toUpperCase()}
              </Txt>
            </View>
            <Txt variant="small" color={C.textDim}>
              {t(internet ? 'online.internetSub' : 'online.internetUnavailable')}
            </Txt>
            <NeonButton
              testID="online-quick"
              label={t('online.quick')}
              icon="duel"
              variant="solid"
              color={C.coral}
              disabled={!internet || !idle}
              onPress={() => online.quickMatch()}
            />
            <NeonButton
              testID="online-create"
              label={t('online.create')}
              icon="lock"
              color={C.yellow}
              disabled={!internet || !idle}
              onPress={() => online.createRoom()}
            />
            <View style={styles.joinRow}>
              <CodeInput
                testID="online-room-input"
                value={roomCode}
                onChange={setRoomCode}
                length={ROOM_CODE_LENGTH}
              />
              <NeonButton
                testID="online-join-room"
                label={t('online.join')}
                color={C.violet}
                disabled={!internet || !idle || roomCode.length !== ROOM_CODE_LENGTH}
                onPress={() => online.joinRoom(roomCode)}
                style={styles.flex}
              />
            </View>
          </Panel>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    marginBottom: 14,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flex: {
    flex: 1,
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
  },
  codeInput: {
    width: 130,
    textAlign: 'center',
    letterSpacing: 3,
  },
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
