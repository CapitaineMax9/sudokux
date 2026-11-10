import { useCallback } from 'react';

import { useLang } from '@/store/progress';

import { localize, translate, type L10n, type Params, type StringKey } from './strings';

export * from './strings';

export type Translate = (key: StringKey, params?: Params) => string;
export type Localize = (text: L10n, params?: Params) => string;

/** `t('home.story')` : texte d'interface dans la langue du joueur. */
export function useT(): Translate {
  const lang = useLang();
  return useCallback((key, params) => translate(lang, key, params), [lang]);
}

/** `l(level.title)` : texte de contenu (histoire, personnages) dans la langue du joueur. */
export function useL(): Localize {
  const lang = useLang();
  return useCallback((text, params) => localize(lang, text, params), [lang]);
}
