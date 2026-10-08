import type { ImageSourcePropType } from 'react-native';
import type { MoodKey, JournalReflections } from '@/domain/journal/types';

export const JOURNAL_MOOD_ASSETS: Record<MoodKey, ImageSourcePropType> = {
  hard: require('../../assets/icons/journal/transparent_png/mood_hard.png'),
  okay: require('../../assets/icons/journal/transparent_png/mood_okay.png'),
  good: require('../../assets/icons/journal/transparent_png/mood_good.png'),
  great: require('../../assets/icons/journal/transparent_png/mood_great.png'),
  grateful: require('../../assets/icons/journal/transparent_png/mood_grateful.png'),
};

export const JOURNAL_REFLECTION_ASSETS: Record<keyof JournalReflections, ImageSourcePropType> = {
  gratitude: require('../../assets/icons/journal/transparent_png/gratitude_hands.png'),
  wentWell: require('../../assets/icons/journal/transparent_png/what_went_well_check.png'),
  improvement: require('../../assets/icons/journal/transparent_png/for_tomorrow_chart.png'),
  dua: require('../../assets/icons/journal/transparent_png/heartfelt_dua_moon.png'),
};

export const JOURNAL_HEADER_BADGE_ASSETS = {
  mood: require('../../assets/icons/journal/transparent_png/mood_good.png'),
  prompt: require('../../assets/icons/journal/transparent_png/heart_prompt_rays.png'),
  entry: require('../../assets/icons/journal/transparent_png/entry_clipboard.png'),
  muhasaba: require('../../assets/icons/journal/transparent_png/muhasaba_sun.png'),
  history: require('../../assets/icons/journal/transparent_png/entry_clipboard.png'),
} as const;

export const JOURNAL_ACTION_ASSETS = {
  headerLock: require('../../assets/icons/journal/transparent_png/header_lock.png'),
  headerSettings: require('../../assets/icons/journal/transparent_png/header_settings.png'),
  streakSprout: require('../../assets/icons/journal/transparent_png/streak_sprout.png'),
  chevronRightBlue: require('../../assets/icons/journal/transparent_png/chevron_right_blue.png'),
  collapseChevronUp: require('../../assets/icons/journal/transparent_png/collapse_chevron_up.png'),
  deleteTrash: require('../../assets/icons/journal/transparent_png/delete_trash.png'),
  focusPencilGreen: require('../../assets/icons/journal/transparent_png/focus_pencil_green.png'),
  expandArrowGreen: require('../../assets/icons/journal/transparent_png/expand_arrow_green.png'),
  sunsetEmoji: require('../../assets/icons/journal/transparent_png/sunset_emoji.png'),
  lightbulb: require('../../assets/icons/journal/transparent_png/lightbulb.png'),
  reflectionSparkle: require('../../assets/icons/journal/transparent_png/reflection_sparkle.png'),
} as const;

export const JOURNAL_PROMPT_DECK_ASSETS = {
  quoteMarks: require('../../assets/icons/journal/transparent_png/quote_marks.png'),
  prevArrow: require('../../assets/icons/journal/transparent_png/reflection_prev.png'),
  nextArrow: require('../../assets/icons/journal/transparent_png/reflection_next.png'),
  writePencilWhite: require('../../assets/icons/journal/transparent_png/write_pencil_white.png'),
  writeArrowWhite: require('../../assets/icons/journal/transparent_png/write_arrow_white.png'),
  swipeArrowBlue: require('../../assets/icons/journal/transparent_png/swipe_arrow_blue.png'),
  lanternArtwork: require('../../assets/icons/journal/illustrations/reflection_lantern_artwork_raw.png'),
} as const;

export const JOURNAL_NAV_ASSETS = {
  planner: require('../../assets/icons/journal/transparent_png/nav_planner.png'),
  calendar: require('../../assets/icons/journal/transparent_png/nav_calendar.png'),
  plusButton: require('../../assets/icons/journal/transparent_png/nav_plus_button.png'),
  journal: require('../../assets/icons/journal/transparent_png/nav_journal.png'),
  more: require('../../assets/icons/journal/transparent_png/nav_more.png'),
} as const;
