
import { Language } from './types';

export const LANGUAGES: Language[] = [
  { code: 'EN', name: 'English' },
  { code: 'ES', name: 'Spanish' },
  { code: 'FR', name: 'French' },
  { code: 'DE', name: 'German' },
  { code: 'JP', name: 'Japanese' },
  { code: 'CN', name: 'Chinese' },
  { code: 'KR', name: 'Korean' },
];

export const YOUTUBE_ID_REGEX = /^((?:https?:)?\/\/)?((?:www|m|gaming)\.)?((?:youtu.be|youtube.com)(?:\/(?:[\w\-]+\?v=|embed\/|shorts\/|live\/|v\/)?))([\w\-]{11})(\S+)?$/;
