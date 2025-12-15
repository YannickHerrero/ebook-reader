/**
 * Type declarations for kuroshiro
 */
declare module 'kuroshiro' {
  interface ConvertOptions {
    to?: 'hiragana' | 'katakana' | 'romaji';
    mode?: 'normal' | 'spaced' | 'okurigana' | 'furigana';
    romajiSystem?: 'nippon' | 'passport' | 'hepburn';
    delimiter_start?: string;
    delimiter_end?: string;
  }

  interface Analyzer {
    init(): Promise<void>;
    parse(text: string): Promise<unknown[]>;
  }

  class Kuroshiro {
    constructor();
    init(analyzer: Analyzer): Promise<void>;
    convert(text: string, options?: ConvertOptions): Promise<string>;
  }

  export default Kuroshiro;
}
