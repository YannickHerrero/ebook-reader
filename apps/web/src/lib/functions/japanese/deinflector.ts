/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

/**
 * Japanese verb/adjective deinflector
 * Converts conjugated forms back to dictionary forms
 * Based on Yomitan's deinflection rules
 */

export interface DeinflectionResult {
  term: string;
  rules: string[];
  reasons: string[];
}

interface DeinflectionRule {
  kanaIn: string;
  kanaOut: string;
  rulesIn: string[];
  rulesOut: string[];
  reason: string;
}

// Verb/adjective type flags
const V1 = 'v1'; // Ichidan verb
const V5 = 'v5'; // Godan verb
const VS = 'vs'; // Suru verb
const VK = 'vk'; // Kuru verb
const _VZ = 'vz'; // Zuru verb (reserved for future use)
const ADJ_I = 'adj-i'; // I-adjective
const _V = 'v'; // Any verb (reserved for future use)

// Deinflection rules: [inflectedEnding, dictionaryEnding, inputRules, outputRules, reason]
const DEINFLECTION_RULES: DeinflectionRule[] = [
  // -て form (te-form)
  { kanaIn: 'て', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'te-form' },
  { kanaIn: 'いて', kanaOut: 'く', rulesIn: [], rulesOut: [V5], reason: 'te-form' },
  { kanaIn: 'いで', kanaOut: 'ぐ', rulesIn: [], rulesOut: [V5], reason: 'te-form' },
  { kanaIn: 'して', kanaOut: 'す', rulesIn: [], rulesOut: [V5], reason: 'te-form' },
  { kanaIn: 'って', kanaOut: 'う', rulesIn: [], rulesOut: [V5], reason: 'te-form' },
  { kanaIn: 'って', kanaOut: 'つ', rulesIn: [], rulesOut: [V5], reason: 'te-form' },
  { kanaIn: 'って', kanaOut: 'る', rulesIn: [], rulesOut: [V5], reason: 'te-form' },
  { kanaIn: 'んで', kanaOut: 'ぬ', rulesIn: [], rulesOut: [V5], reason: 'te-form' },
  { kanaIn: 'んで', kanaOut: 'ぶ', rulesIn: [], rulesOut: [V5], reason: 'te-form' },
  { kanaIn: 'んで', kanaOut: 'む', rulesIn: [], rulesOut: [V5], reason: 'te-form' },
  { kanaIn: 'して', kanaOut: 'する', rulesIn: [], rulesOut: [VS], reason: 'te-form' },
  { kanaIn: 'きて', kanaOut: 'くる', rulesIn: [], rulesOut: [VK], reason: 'te-form' },
  { kanaIn: '来て', kanaOut: '来る', rulesIn: [], rulesOut: [VK], reason: 'te-form' },

  // -た form (past tense)
  { kanaIn: 'た', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'past' },
  { kanaIn: 'いた', kanaOut: 'く', rulesIn: [], rulesOut: [V5], reason: 'past' },
  { kanaIn: 'いだ', kanaOut: 'ぐ', rulesIn: [], rulesOut: [V5], reason: 'past' },
  { kanaIn: 'した', kanaOut: 'す', rulesIn: [], rulesOut: [V5], reason: 'past' },
  { kanaIn: 'った', kanaOut: 'う', rulesIn: [], rulesOut: [V5], reason: 'past' },
  { kanaIn: 'った', kanaOut: 'つ', rulesIn: [], rulesOut: [V5], reason: 'past' },
  { kanaIn: 'った', kanaOut: 'る', rulesIn: [], rulesOut: [V5], reason: 'past' },
  { kanaIn: 'んだ', kanaOut: 'ぬ', rulesIn: [], rulesOut: [V5], reason: 'past' },
  { kanaIn: 'んだ', kanaOut: 'ぶ', rulesIn: [], rulesOut: [V5], reason: 'past' },
  { kanaIn: 'んだ', kanaOut: 'む', rulesIn: [], rulesOut: [V5], reason: 'past' },
  { kanaIn: 'した', kanaOut: 'する', rulesIn: [], rulesOut: [VS], reason: 'past' },
  { kanaIn: 'きた', kanaOut: 'くる', rulesIn: [], rulesOut: [VK], reason: 'past' },
  { kanaIn: '来た', kanaOut: '来る', rulesIn: [], rulesOut: [VK], reason: 'past' },
  { kanaIn: 'かった', kanaOut: 'い', rulesIn: [], rulesOut: [ADJ_I], reason: 'past' },

  // -ない form (negative)
  { kanaIn: 'ない', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'negative' },
  { kanaIn: 'かない', kanaOut: 'く', rulesIn: [], rulesOut: [V5], reason: 'negative' },
  { kanaIn: 'がない', kanaOut: 'ぐ', rulesIn: [], rulesOut: [V5], reason: 'negative' },
  { kanaIn: 'さない', kanaOut: 'す', rulesIn: [], rulesOut: [V5], reason: 'negative' },
  { kanaIn: 'たない', kanaOut: 'つ', rulesIn: [], rulesOut: [V5], reason: 'negative' },
  { kanaIn: 'なない', kanaOut: 'ぬ', rulesIn: [], rulesOut: [V5], reason: 'negative' },
  { kanaIn: 'ばない', kanaOut: 'ぶ', rulesIn: [], rulesOut: [V5], reason: 'negative' },
  { kanaIn: 'まない', kanaOut: 'む', rulesIn: [], rulesOut: [V5], reason: 'negative' },
  { kanaIn: 'らない', kanaOut: 'る', rulesIn: [], rulesOut: [V5], reason: 'negative' },
  { kanaIn: 'わない', kanaOut: 'う', rulesIn: [], rulesOut: [V5], reason: 'negative' },
  { kanaIn: 'しない', kanaOut: 'する', rulesIn: [], rulesOut: [VS], reason: 'negative' },
  { kanaIn: 'こない', kanaOut: 'くる', rulesIn: [], rulesOut: [VK], reason: 'negative' },
  { kanaIn: '来ない', kanaOut: '来る', rulesIn: [], rulesOut: [VK], reason: 'negative' },
  { kanaIn: 'くない', kanaOut: 'い', rulesIn: [], rulesOut: [ADJ_I], reason: 'negative' },

  // -ます form (polite)
  { kanaIn: 'ます', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'polite' },
  { kanaIn: 'います', kanaOut: 'う', rulesIn: [], rulesOut: [V5], reason: 'polite' },
  { kanaIn: 'きます', kanaOut: 'く', rulesIn: [], rulesOut: [V5], reason: 'polite' },
  { kanaIn: 'ぎます', kanaOut: 'ぐ', rulesIn: [], rulesOut: [V5], reason: 'polite' },
  { kanaIn: 'します', kanaOut: 'す', rulesIn: [], rulesOut: [V5], reason: 'polite' },
  { kanaIn: 'ちます', kanaOut: 'つ', rulesIn: [], rulesOut: [V5], reason: 'polite' },
  { kanaIn: 'にます', kanaOut: 'ぬ', rulesIn: [], rulesOut: [V5], reason: 'polite' },
  { kanaIn: 'びます', kanaOut: 'ぶ', rulesIn: [], rulesOut: [V5], reason: 'polite' },
  { kanaIn: 'みます', kanaOut: 'む', rulesIn: [], rulesOut: [V5], reason: 'polite' },
  { kanaIn: 'ります', kanaOut: 'る', rulesIn: [], rulesOut: [V5], reason: 'polite' },
  { kanaIn: 'します', kanaOut: 'する', rulesIn: [], rulesOut: [VS], reason: 'polite' },
  { kanaIn: 'きます', kanaOut: 'くる', rulesIn: [], rulesOut: [VK], reason: 'polite' },
  { kanaIn: '来ます', kanaOut: '来る', rulesIn: [], rulesOut: [VK], reason: 'polite' },

  // -ている/てる form (progressive/continuous)
  { kanaIn: 'ている', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'progressive' },
  { kanaIn: 'ていた', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'progressive past' },
  {
    kanaIn: 'てる',
    kanaOut: 'る',
    rulesIn: [],
    rulesOut: [V1],
    reason: 'progressive (colloquial)'
  },
  {
    kanaIn: 'てた',
    kanaOut: 'る',
    rulesIn: [],
    rulesOut: [V1],
    reason: 'progressive past (colloquial)'
  },
  { kanaIn: 'いている', kanaOut: 'く', rulesIn: [], rulesOut: [V5], reason: 'progressive' },
  { kanaIn: 'いでいる', kanaOut: 'ぐ', rulesIn: [], rulesOut: [V5], reason: 'progressive' },
  { kanaIn: 'している', kanaOut: 'す', rulesIn: [], rulesOut: [V5], reason: 'progressive' },
  { kanaIn: 'っている', kanaOut: 'う', rulesIn: [], rulesOut: [V5], reason: 'progressive' },
  { kanaIn: 'っている', kanaOut: 'つ', rulesIn: [], rulesOut: [V5], reason: 'progressive' },
  { kanaIn: 'っている', kanaOut: 'る', rulesIn: [], rulesOut: [V5], reason: 'progressive' },
  { kanaIn: 'んでいる', kanaOut: 'ぬ', rulesIn: [], rulesOut: [V5], reason: 'progressive' },
  { kanaIn: 'んでいる', kanaOut: 'ぶ', rulesIn: [], rulesOut: [V5], reason: 'progressive' },
  { kanaIn: 'んでいる', kanaOut: 'む', rulesIn: [], rulesOut: [V5], reason: 'progressive' },
  {
    kanaIn: 'いてる',
    kanaOut: 'く',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'progressive (colloquial)'
  },
  {
    kanaIn: 'いでる',
    kanaOut: 'ぐ',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'progressive (colloquial)'
  },
  {
    kanaIn: 'してる',
    kanaOut: 'す',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'progressive (colloquial)'
  },
  {
    kanaIn: 'ってる',
    kanaOut: 'う',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'progressive (colloquial)'
  },
  {
    kanaIn: 'ってる',
    kanaOut: 'つ',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'progressive (colloquial)'
  },
  {
    kanaIn: 'ってる',
    kanaOut: 'る',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'progressive (colloquial)'
  },
  {
    kanaIn: 'んでる',
    kanaOut: 'ぬ',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'progressive (colloquial)'
  },
  {
    kanaIn: 'んでる',
    kanaOut: 'ぶ',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'progressive (colloquial)'
  },
  {
    kanaIn: 'んでる',
    kanaOut: 'む',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'progressive (colloquial)'
  },
  { kanaIn: 'している', kanaOut: 'する', rulesIn: [], rulesOut: [VS], reason: 'progressive' },
  {
    kanaIn: 'してる',
    kanaOut: 'する',
    rulesIn: [],
    rulesOut: [VS],
    reason: 'progressive (colloquial)'
  },
  { kanaIn: 'きている', kanaOut: 'くる', rulesIn: [], rulesOut: [VK], reason: 'progressive' },
  {
    kanaIn: 'きてる',
    kanaOut: 'くる',
    rulesIn: [],
    rulesOut: [VK],
    reason: 'progressive (colloquial)'
  },

  // -たい form (want to)
  { kanaIn: 'たい', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'want to' },
  { kanaIn: 'いたい', kanaOut: 'う', rulesIn: [], rulesOut: [V5], reason: 'want to' },
  { kanaIn: 'きたい', kanaOut: 'く', rulesIn: [], rulesOut: [V5], reason: 'want to' },
  { kanaIn: 'ぎたい', kanaOut: 'ぐ', rulesIn: [], rulesOut: [V5], reason: 'want to' },
  { kanaIn: 'したい', kanaOut: 'す', rulesIn: [], rulesOut: [V5], reason: 'want to' },
  { kanaIn: 'ちたい', kanaOut: 'つ', rulesIn: [], rulesOut: [V5], reason: 'want to' },
  { kanaIn: 'にたい', kanaOut: 'ぬ', rulesIn: [], rulesOut: [V5], reason: 'want to' },
  { kanaIn: 'びたい', kanaOut: 'ぶ', rulesIn: [], rulesOut: [V5], reason: 'want to' },
  { kanaIn: 'みたい', kanaOut: 'む', rulesIn: [], rulesOut: [V5], reason: 'want to' },
  { kanaIn: 'りたい', kanaOut: 'る', rulesIn: [], rulesOut: [V5], reason: 'want to' },
  { kanaIn: 'したい', kanaOut: 'する', rulesIn: [], rulesOut: [VS], reason: 'want to' },
  { kanaIn: 'きたい', kanaOut: 'くる', rulesIn: [], rulesOut: [VK], reason: 'want to' },

  // Potential form
  { kanaIn: 'れる', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'potential' },
  { kanaIn: 'られる', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'potential/passive' },
  { kanaIn: 'える', kanaOut: 'う', rulesIn: [], rulesOut: [V5], reason: 'potential' },
  { kanaIn: 'ける', kanaOut: 'く', rulesIn: [], rulesOut: [V5], reason: 'potential' },
  { kanaIn: 'げる', kanaOut: 'ぐ', rulesIn: [], rulesOut: [V5], reason: 'potential' },
  { kanaIn: 'せる', kanaOut: 'す', rulesIn: [], rulesOut: [V5], reason: 'potential' },
  { kanaIn: 'てる', kanaOut: 'つ', rulesIn: [], rulesOut: [V5], reason: 'potential' },
  { kanaIn: 'ねる', kanaOut: 'ぬ', rulesIn: [], rulesOut: [V5], reason: 'potential' },
  { kanaIn: 'べる', kanaOut: 'ぶ', rulesIn: [], rulesOut: [V5], reason: 'potential' },
  { kanaIn: 'める', kanaOut: 'む', rulesIn: [], rulesOut: [V5], reason: 'potential' },
  { kanaIn: 'できる', kanaOut: 'する', rulesIn: [], rulesOut: [VS], reason: 'potential' },
  { kanaIn: 'これる', kanaOut: 'くる', rulesIn: [], rulesOut: [VK], reason: 'potential' },
  { kanaIn: '来れる', kanaOut: '来る', rulesIn: [], rulesOut: [VK], reason: 'potential' },

  // Passive form
  { kanaIn: 'かれる', kanaOut: 'く', rulesIn: [], rulesOut: [V5], reason: 'passive' },
  { kanaIn: 'がれる', kanaOut: 'ぐ', rulesIn: [], rulesOut: [V5], reason: 'passive' },
  { kanaIn: 'される', kanaOut: 'す', rulesIn: [], rulesOut: [V5], reason: 'passive' },
  { kanaIn: 'たれる', kanaOut: 'つ', rulesIn: [], rulesOut: [V5], reason: 'passive' },
  { kanaIn: 'なれる', kanaOut: 'ぬ', rulesIn: [], rulesOut: [V5], reason: 'passive' },
  { kanaIn: 'ばれる', kanaOut: 'ぶ', rulesIn: [], rulesOut: [V5], reason: 'passive' },
  { kanaIn: 'まれる', kanaOut: 'む', rulesIn: [], rulesOut: [V5], reason: 'passive' },
  { kanaIn: 'われる', kanaOut: 'う', rulesIn: [], rulesOut: [V5], reason: 'passive' },
  { kanaIn: 'られる', kanaOut: 'る', rulesIn: [], rulesOut: [V5], reason: 'passive' },
  { kanaIn: 'される', kanaOut: 'する', rulesIn: [], rulesOut: [VS], reason: 'passive' },
  { kanaIn: 'こられる', kanaOut: 'くる', rulesIn: [], rulesOut: [VK], reason: 'passive' },

  // Causative form
  { kanaIn: 'させる', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'causative' },
  { kanaIn: 'かせる', kanaOut: 'く', rulesIn: [], rulesOut: [V5], reason: 'causative' },
  { kanaIn: 'がせる', kanaOut: 'ぐ', rulesIn: [], rulesOut: [V5], reason: 'causative' },
  { kanaIn: 'させる', kanaOut: 'す', rulesIn: [], rulesOut: [V5], reason: 'causative' },
  { kanaIn: 'たせる', kanaOut: 'つ', rulesIn: [], rulesOut: [V5], reason: 'causative' },
  { kanaIn: 'なせる', kanaOut: 'ぬ', rulesIn: [], rulesOut: [V5], reason: 'causative' },
  { kanaIn: 'ばせる', kanaOut: 'ぶ', rulesIn: [], rulesOut: [V5], reason: 'causative' },
  { kanaIn: 'ませる', kanaOut: 'む', rulesIn: [], rulesOut: [V5], reason: 'causative' },
  { kanaIn: 'らせる', kanaOut: 'る', rulesIn: [], rulesOut: [V5], reason: 'causative' },
  { kanaIn: 'わせる', kanaOut: 'う', rulesIn: [], rulesOut: [V5], reason: 'causative' },
  { kanaIn: 'させる', kanaOut: 'する', rulesIn: [], rulesOut: [VS], reason: 'causative' },
  { kanaIn: 'こさせる', kanaOut: 'くる', rulesIn: [], rulesOut: [VK], reason: 'causative' },

  // Imperative form
  { kanaIn: 'ろ', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'imperative' },
  { kanaIn: 'よ', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'imperative' },
  { kanaIn: 'え', kanaOut: 'う', rulesIn: [], rulesOut: [V5], reason: 'imperative' },
  { kanaIn: 'け', kanaOut: 'く', rulesIn: [], rulesOut: [V5], reason: 'imperative' },
  { kanaIn: 'げ', kanaOut: 'ぐ', rulesIn: [], rulesOut: [V5], reason: 'imperative' },
  { kanaIn: 'せ', kanaOut: 'す', rulesIn: [], rulesOut: [V5], reason: 'imperative' },
  { kanaIn: 'て', kanaOut: 'つ', rulesIn: [], rulesOut: [V5], reason: 'imperative' },
  { kanaIn: 'ね', kanaOut: 'ぬ', rulesIn: [], rulesOut: [V5], reason: 'imperative' },
  { kanaIn: 'べ', kanaOut: 'ぶ', rulesIn: [], rulesOut: [V5], reason: 'imperative' },
  { kanaIn: 'め', kanaOut: 'む', rulesIn: [], rulesOut: [V5], reason: 'imperative' },
  { kanaIn: 'れ', kanaOut: 'る', rulesIn: [], rulesOut: [V5], reason: 'imperative' },
  { kanaIn: 'しろ', kanaOut: 'する', rulesIn: [], rulesOut: [VS], reason: 'imperative' },
  { kanaIn: 'せよ', kanaOut: 'する', rulesIn: [], rulesOut: [VS], reason: 'imperative' },
  { kanaIn: 'こい', kanaOut: 'くる', rulesIn: [], rulesOut: [VK], reason: 'imperative' },
  { kanaIn: '来い', kanaOut: '来る', rulesIn: [], rulesOut: [VK], reason: 'imperative' },

  // Volitional form
  { kanaIn: 'よう', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'volitional' },
  { kanaIn: 'おう', kanaOut: 'う', rulesIn: [], rulesOut: [V5], reason: 'volitional' },
  { kanaIn: 'こう', kanaOut: 'く', rulesIn: [], rulesOut: [V5], reason: 'volitional' },
  { kanaIn: 'ごう', kanaOut: 'ぐ', rulesIn: [], rulesOut: [V5], reason: 'volitional' },
  { kanaIn: 'そう', kanaOut: 'す', rulesIn: [], rulesOut: [V5], reason: 'volitional' },
  { kanaIn: 'とう', kanaOut: 'つ', rulesIn: [], rulesOut: [V5], reason: 'volitional' },
  { kanaIn: 'のう', kanaOut: 'ぬ', rulesIn: [], rulesOut: [V5], reason: 'volitional' },
  { kanaIn: 'ぼう', kanaOut: 'ぶ', rulesIn: [], rulesOut: [V5], reason: 'volitional' },
  { kanaIn: 'もう', kanaOut: 'む', rulesIn: [], rulesOut: [V5], reason: 'volitional' },
  { kanaIn: 'ろう', kanaOut: 'る', rulesIn: [], rulesOut: [V5], reason: 'volitional' },
  { kanaIn: 'しよう', kanaOut: 'する', rulesIn: [], rulesOut: [VS], reason: 'volitional' },
  { kanaIn: 'こよう', kanaOut: 'くる', rulesIn: [], rulesOut: [VK], reason: 'volitional' },

  // -ば conditional
  { kanaIn: 'れば', kanaOut: 'る', rulesIn: [], rulesOut: [V1, V5], reason: 'conditional' },
  { kanaIn: 'えば', kanaOut: 'う', rulesIn: [], rulesOut: [V5], reason: 'conditional' },
  { kanaIn: 'けば', kanaOut: 'く', rulesIn: [], rulesOut: [V5], reason: 'conditional' },
  { kanaIn: 'げば', kanaOut: 'ぐ', rulesIn: [], rulesOut: [V5], reason: 'conditional' },
  { kanaIn: 'せば', kanaOut: 'す', rulesIn: [], rulesOut: [V5], reason: 'conditional' },
  { kanaIn: 'てば', kanaOut: 'つ', rulesIn: [], rulesOut: [V5], reason: 'conditional' },
  { kanaIn: 'ねば', kanaOut: 'ぬ', rulesIn: [], rulesOut: [V5], reason: 'conditional' },
  { kanaIn: 'べば', kanaOut: 'ぶ', rulesIn: [], rulesOut: [V5], reason: 'conditional' },
  { kanaIn: 'めば', kanaOut: 'む', rulesIn: [], rulesOut: [V5], reason: 'conditional' },
  { kanaIn: 'すれば', kanaOut: 'する', rulesIn: [], rulesOut: [VS], reason: 'conditional' },
  { kanaIn: 'くれば', kanaOut: 'くる', rulesIn: [], rulesOut: [VK], reason: 'conditional' },
  { kanaIn: 'ければ', kanaOut: 'い', rulesIn: [], rulesOut: [ADJ_I], reason: 'conditional' },

  // -たら conditional
  { kanaIn: 'たら', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'conditional (tara)' },
  { kanaIn: 'いたら', kanaOut: 'く', rulesIn: [], rulesOut: [V5], reason: 'conditional (tara)' },
  { kanaIn: 'いだら', kanaOut: 'ぐ', rulesIn: [], rulesOut: [V5], reason: 'conditional (tara)' },
  { kanaIn: 'したら', kanaOut: 'す', rulesIn: [], rulesOut: [V5], reason: 'conditional (tara)' },
  { kanaIn: 'ったら', kanaOut: 'う', rulesIn: [], rulesOut: [V5], reason: 'conditional (tara)' },
  { kanaIn: 'ったら', kanaOut: 'つ', rulesIn: [], rulesOut: [V5], reason: 'conditional (tara)' },
  { kanaIn: 'ったら', kanaOut: 'る', rulesIn: [], rulesOut: [V5], reason: 'conditional (tara)' },
  { kanaIn: 'んだら', kanaOut: 'ぬ', rulesIn: [], rulesOut: [V5], reason: 'conditional (tara)' },
  { kanaIn: 'んだら', kanaOut: 'ぶ', rulesIn: [], rulesOut: [V5], reason: 'conditional (tara)' },
  { kanaIn: 'んだら', kanaOut: 'む', rulesIn: [], rulesOut: [V5], reason: 'conditional (tara)' },
  { kanaIn: 'したら', kanaOut: 'する', rulesIn: [], rulesOut: [VS], reason: 'conditional (tara)' },
  { kanaIn: 'きたら', kanaOut: 'くる', rulesIn: [], rulesOut: [VK], reason: 'conditional (tara)' },
  {
    kanaIn: 'かったら',
    kanaOut: 'い',
    rulesIn: [],
    rulesOut: [ADJ_I],
    reason: 'conditional (tara)'
  },

  // Adjective adverb form
  { kanaIn: 'く', kanaOut: 'い', rulesIn: [], rulesOut: [ADJ_I], reason: 'adverb' },
  { kanaIn: 'くて', kanaOut: 'い', rulesIn: [], rulesOut: [ADJ_I], reason: 'te-form' },

  // -ちゃう/-じゃう contraction
  { kanaIn: 'ちゃう', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'shimau contraction' },
  { kanaIn: 'いちゃう', kanaOut: 'く', rulesIn: [], rulesOut: [V5], reason: 'shimau contraction' },
  { kanaIn: 'いじゃう', kanaOut: 'ぐ', rulesIn: [], rulesOut: [V5], reason: 'shimau contraction' },
  { kanaIn: 'しちゃう', kanaOut: 'す', rulesIn: [], rulesOut: [V5], reason: 'shimau contraction' },
  { kanaIn: 'っちゃう', kanaOut: 'う', rulesIn: [], rulesOut: [V5], reason: 'shimau contraction' },
  { kanaIn: 'っちゃう', kanaOut: 'つ', rulesIn: [], rulesOut: [V5], reason: 'shimau contraction' },
  { kanaIn: 'っちゃう', kanaOut: 'る', rulesIn: [], rulesOut: [V5], reason: 'shimau contraction' },
  { kanaIn: 'んじゃう', kanaOut: 'ぬ', rulesIn: [], rulesOut: [V5], reason: 'shimau contraction' },
  { kanaIn: 'んじゃう', kanaOut: 'ぶ', rulesIn: [], rulesOut: [V5], reason: 'shimau contraction' },
  { kanaIn: 'んじゃう', kanaOut: 'む', rulesIn: [], rulesOut: [V5], reason: 'shimau contraction' },
  {
    kanaIn: 'しちゃう',
    kanaOut: 'する',
    rulesIn: [],
    rulesOut: [VS],
    reason: 'shimau contraction'
  },
  {
    kanaIn: 'きちゃう',
    kanaOut: 'くる',
    rulesIn: [],
    rulesOut: [VK],
    reason: 'shimau contraction'
  },

  // -ちゃった (past of -ちゃう)
  {
    kanaIn: 'ちゃった',
    kanaOut: 'る',
    rulesIn: [],
    rulesOut: [V1],
    reason: 'shimau contraction (past)'
  },
  {
    kanaIn: 'いちゃった',
    kanaOut: 'く',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'shimau contraction (past)'
  },
  {
    kanaIn: 'いじゃった',
    kanaOut: 'ぐ',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'shimau contraction (past)'
  },
  {
    kanaIn: 'しちゃった',
    kanaOut: 'す',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'shimau contraction (past)'
  },
  {
    kanaIn: 'っちゃった',
    kanaOut: 'う',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'shimau contraction (past)'
  },
  {
    kanaIn: 'っちゃった',
    kanaOut: 'つ',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'shimau contraction (past)'
  },
  {
    kanaIn: 'っちゃった',
    kanaOut: 'る',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'shimau contraction (past)'
  },
  {
    kanaIn: 'んじゃった',
    kanaOut: 'ぬ',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'shimau contraction (past)'
  },
  {
    kanaIn: 'んじゃった',
    kanaOut: 'ぶ',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'shimau contraction (past)'
  },
  {
    kanaIn: 'んじゃった',
    kanaOut: 'む',
    rulesIn: [],
    rulesOut: [V5],
    reason: 'shimau contraction (past)'
  },
  {
    kanaIn: 'しちゃった',
    kanaOut: 'する',
    rulesIn: [],
    rulesOut: [VS],
    reason: 'shimau contraction (past)'
  },
  {
    kanaIn: 'きちゃった',
    kanaOut: 'くる',
    rulesIn: [],
    rulesOut: [VK],
    reason: 'shimau contraction (past)'
  },

  // -なかった (past negative)
  { kanaIn: 'なかった', kanaOut: 'る', rulesIn: [], rulesOut: [V1], reason: 'past negative' },
  { kanaIn: 'かなかった', kanaOut: 'く', rulesIn: [], rulesOut: [V5], reason: 'past negative' },
  { kanaIn: 'がなかった', kanaOut: 'ぐ', rulesIn: [], rulesOut: [V5], reason: 'past negative' },
  { kanaIn: 'さなかった', kanaOut: 'す', rulesIn: [], rulesOut: [V5], reason: 'past negative' },
  { kanaIn: 'たなかった', kanaOut: 'つ', rulesIn: [], rulesOut: [V5], reason: 'past negative' },
  { kanaIn: 'ななかった', kanaOut: 'ぬ', rulesIn: [], rulesOut: [V5], reason: 'past negative' },
  { kanaIn: 'ばなかった', kanaOut: 'ぶ', rulesIn: [], rulesOut: [V5], reason: 'past negative' },
  { kanaIn: 'まなかった', kanaOut: 'む', rulesIn: [], rulesOut: [V5], reason: 'past negative' },
  { kanaIn: 'らなかった', kanaOut: 'る', rulesIn: [], rulesOut: [V5], reason: 'past negative' },
  { kanaIn: 'わなかった', kanaOut: 'う', rulesIn: [], rulesOut: [V5], reason: 'past negative' },
  { kanaIn: 'しなかった', kanaOut: 'する', rulesIn: [], rulesOut: [VS], reason: 'past negative' },
  { kanaIn: 'こなかった', kanaOut: 'くる', rulesIn: [], rulesOut: [VK], reason: 'past negative' },
  { kanaIn: 'くなかった', kanaOut: 'い', rulesIn: [], rulesOut: [ADJ_I], reason: 'past negative' }
];

/**
 * Deinflect a word to find possible dictionary forms
 */
export function deinflect(word: string): DeinflectionResult[] {
  const results: DeinflectionResult[] = [];
  const seen = new Set<string>();

  // Always include the original word
  results.push({ term: word, rules: [], reasons: [] });
  seen.add(word);

  // Apply deinflection rules
  const queue: DeinflectionResult[] = [{ term: word, rules: [], reasons: [] }];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const rule of DEINFLECTION_RULES) {
      if (current.term.endsWith(rule.kanaIn)) {
        const newTerm =
          current.term.slice(0, current.term.length - rule.kanaIn.length) + rule.kanaOut;

        if (newTerm.length > 0 && !seen.has(newTerm)) {
          seen.add(newTerm);

          const newResult: DeinflectionResult = {
            term: newTerm,
            rules: [...current.rules, ...rule.rulesOut],
            reasons: [...current.reasons, rule.reason]
          };

          results.push(newResult);
          queue.push(newResult);
        }
      }
    }
  }

  return results;
}

/**
 * Get the most likely dictionary form from deinflection results
 */
export function getMostLikelyDictionaryForm(results: DeinflectionResult[]): string {
  // Prefer results with fewer transformations
  const sorted = [...results].sort((a, b) => a.reasons.length - b.reasons.length);
  return sorted[0]?.term || '';
}
