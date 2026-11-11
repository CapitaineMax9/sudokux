import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useT } from '@/i18n';
import { useOnline } from '@/net/online';
import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH, cleanName, normalizeRoomCode } from '@/net/protocol';
import { useProgress } from '@/store/progress';
import { NeonButton } from '@/ui/NeonButton';
import { Panel } from '@/ui/Panel';
import { Screen } from '@/ui/Screen';
import { C, F, alpha, glow } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

/** Mise en relation pour un duel en ligne : partie rapide ou salon entre amis. */
export default function OnlineScreen() {
  const router = useRouter();
  const t = useT();
  const phase = useOnline((state) => state.phase);
  const error = useOnline((state) => state.error);
  const roomCode = useOnline((state) => state.roomCode);
  const url = useOnline((state) => state.url);
  const playerName = useProgress((state) => state.playerName);
  const [name, setName] = useState(playerName);
  const [code, setCode] = useState('');

  // On se connecte en arrivant et on se déconnecte en repartant vers les menus.
  useEffect(() => {
    useOnline.getState().connect();
  }, []);

  // Adversaire trouvé : direction l'écran de jeu.
  useEffect(() => {
    if (phase === 'matched') router.push({ pathname: '/play', params: { kind: 'online' } });
  }, [phase, router]);

  const saveName = () => {
    const cleaned = cleanName(name);
    if (!cleaned || cleaned === playerName) {
      setName(playerName);
      return;
    }
    useProgress.getState().setPlayerName(cleaned);
    setName(cleaned);
    // Le serveur apprend le pseudo à la connexion : on se reconnecte pour le mettre à jour.
    useOnline.getState().disconnect();
    useOnline.getState().connect();
  };

  const leave = () => {
    useOnline.getState().disconnect();
    router.back();
  };

  const ready = phase === 'lobby';
  const statusColor = phase === 'offline' ? C.red : phase === 'connecting' ? C.orange : C.green;
  const statusText =
    phase === 'connecting'
      ? t('online.connecting')
      : phase === 'offline'
        ? t(error === 'lost' ? 'online.lost' : error === 'badVersion' ? 'online.badVersion' : 'online.unreachable')
        : t('online.connected');

  return (
    <Screen title={t('online.title')} onBack={leave} scroll tint={C.coral}>
      <Panel color={statusColor} style={styles.section}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: statusColor }, glow(statusColor, 8)]} />
          <Txt variant="small" color={C.text} size={15} style={styles.flex} testID="online-status">
            {statusText}
          </Txt>
        </View>
        <Txt variant="small" color={C.textMuted} size={12}>
          {t('online.server', { url })}
        </Txt>
        {phase === 'offline' ? (
          <NeonButton
            testID="online-retry"
            label={t('online.retry')}
            icon="retry"
            color={C.cyan}
            onPress={() => useOnline.getState().connect()}
          />
        ) : null}
      </Panel>

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
          editable={phase !== 'queued' && phase !== 'hosting'}
          placeholderTextColor={C.textMuted}
          style={styles.input}
        />
      </Panel>

      {phase === 'queued' ? (
        <Panel color={C.cyan} style={styles.section}>
          <Txt variant="heading" color={C.cyan} glow={8} size={17} center testID="online-searching">
            {t('online.searching')}
          </Txt>
          <NeonButton
            testID="online-cancel"
            label={t('common.cancel')}
            color={C.textDim}
            onPress={() => useOnline.getState().cancel()}
          />
        </Panel>
      ) : phase === 'hosting' ? (
        <Panel color={C.yellow} style={styles.section}>
          <Txt variant="label" color={C.textDim} size={10} center>
            {t('online.roomCode')}
          </Txt>
          <Txt variant="display" color={C.yellow} glow={14} size={44} center testID="online-code">
            {roomCode ?? ''}
          </Txt>
          <Txt variant="small" color={C.textDim} center>
            {t('online.roomHint')}
          </Txt>
          <NeonButton
            testID="online-cancel"
            label={t('common.cancel')}
            color={C.textDim}
            onPress={() => useOnline.getState().cancel()}
          />
        </Panel>
      ) : (
        <>
          <NeonButton
            testID="online-quick"
            label={t('online.quick')}
            sub={t('online.quickSub')}
            icon="duel"
            size="lg"
            variant="solid"
            color={C.coral}
            disabled={!ready}
            onPress={() => useOnline.getState().quickMatch()}
            style={styles.gap}
          />
          <NeonButton
            testID="online-create"
            label={t('online.create')}
            sub={t('online.createSub')}
            icon="lock"
            size="lg"
            color={C.yellow}
            disabled={!ready}
            onPress={() => useOnline.getState().createRoom()}
            style={styles.gap}
          />
          <Panel color={C.violet} style={styles.section}>
            <Txt variant="label" color={C.textDim} size={10}>
              {t('online.joinTitle')}
            </Txt>
            <View style={styles.joinRow}>
              <TextInput
                testID="online-code-input"
                value={code}
                onChangeText={(text) => setCode(normalizeRoomCode(text))}
                maxLength={ROOM_CODE_LENGTH}
                autoCorrect={false}
                autoCapitalize="characters"
                placeholder="ABCD"
                placeholderTextColor={C.textMuted}
                style={[styles.input, styles.codeInput]}
              />
              <NeonButton
                testID="online-join"
                label={t('online.join')}
                color={C.violet}
                disabled={!ready || code.length !== ROOM_CODE_LENGTH}
                onPress={() => useOnline.getState().joinRoom(code)}
                style={styles.flex}
              />
            </View>
            {error === 'roomNotFound' ? (
              <Txt variant="bodyBold" color={C.orange} size={15} testID="online-error">
                {t('online.roomNotFound')}
              </Txt>
            ) : null}
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
  gap: {
    marginBottom: 14,
  },
  flex: {
    flex: 1,
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
    width: 110,
    textAlign: 'center',
    letterSpacing: 4,
  },
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
