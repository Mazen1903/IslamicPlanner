import { TASK_ICON_ASSETS } from './taskIconAssets';

export type IconFamily = 'MaterialCommunityIcons' | 'Ionicons';

export interface TaskIconDef {
  id: string;
  label: string;
  category: TaskIconCategory;
  family: IconFamily;
  iconName: string;
  keywords: string[];
  imageAsset?: any;
}

export type TaskIconCategory =
  | 'all'
  | 'deen'
  | 'routine'
  | 'work_study'
  | 'health'
  | 'home'
  | 'family'
  | 'leisure'
  | 'productivity';

export interface TaskIconCategoryMeta {
  key: TaskIconCategory;
  label: string;
  icon: string;
}

export const TASK_ICON_CATEGORIES: TaskIconCategoryMeta[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'deen', label: 'Deen', icon: 'mosque' },
  { key: 'routine', label: 'Routine', icon: 'sunny' },
  { key: 'work_study', label: 'Work & Study', icon: 'laptop' },
  { key: 'health', label: 'Health', icon: 'barbell' },
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'family', label: 'Family', icon: 'people' },
  { key: 'leisure', label: 'Leisure', icon: 'color-palette' },
  { key: 'productivity', label: 'Productivity', icon: 'target' },
];

export const ALL_TASK_ICONS: TaskIconDef[] = [
  // ─── 🕌 Deen & Worship ────────────────────────────────────────────────────────
  {
    id: 'mosque',
    label: 'Mosque',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'mosque',
    keywords: ['mosque', 'masjid', 'jamaah', 'prayer', 'salah', 'jummah', 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha'],
  },
  {
    id: 'quran',
    label: 'Quran',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'book-open-page-variant',
    keywords: ['quran', 'koran', 'mushaf', 'surah', 'ayah', 'read', 'tilawah', 'hifz', 'recitation', 'tadabbur'],
  },
  {
    id: 'kaaba',
    label: 'Kaaba',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'cube-outline',
    keywords: ['kaaba', 'makkah', 'hajj', 'umrah', 'pilgrimage', 'mecca', 'qibla'],
  },
  {
    id: 'crescent',
    label: 'Crescent Moon',
    category: 'deen',
    family: 'Ionicons',
    iconName: 'moon',
    keywords: ['moon', 'crescent', 'ramadan', 'hilal', 'fasting', 'sawm', 'shawwal', 'night'],
  },
  {
    id: 'beads',
    label: 'Tasbeeh',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'dots-horizontal-circle-outline',
    keywords: ['tasbeeh', 'dhikr', 'subhanallah', 'alhamdulillah', 'allahu akbar', 'beads', 'azkar', 'adhkar'],
  },
  {
    id: 'charity',
    label: 'Charity',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'hand-heart',
    keywords: ['sadaqah', 'zakat', 'charity', 'donation', 'give', 'help', 'poor', 'volunteer'],
  },
  {
    id: 'duaa',
    label: 'Duaa',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'hands-pray',
    keywords: ['duaa', 'dua', 'supplication', 'prayer', 'ask', 'tahajjud', 'istighfar'],
  },
  {
    id: 'fasting',
    label: 'Fasting / Iftar',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'silverware-fork-knife',
    keywords: ['fasting', 'sawm', 'iftar', 'suhoor', 'food', 'sunnah', 'ashura', 'arafah'],
  },
  {
    id: 'lectures',
    label: 'Halaqah',
    category: 'deen',
    family: 'Ionicons',
    iconName: 'volume-high',
    keywords: ['halaqah', 'lecture', 'talk', 'dars', 'class', 'knowledge', 'ilm', 'scholar'],
  },
  {
    id: 'water-wudu',
    label: 'Wudu',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'water-outline',
    keywords: ['wudu', 'ablution', 'taharah', 'purification', 'wash for prayer'],
  },
  {
    id: 'heart-deen',
    label: 'Good Deed',
    category: 'deen',
    family: 'Ionicons',
    iconName: 'heart',
    keywords: ['good deed', 'hasanat', 'akhlaq', 'manners', 'kindness', 'charity', 'sunnah'],
  },
  {
    id: 'star-islamic',
    label: 'Islamic Star',
    category: 'deen',
    family: 'Ionicons',
    iconName: 'star',
    keywords: ['star', 'blessed', 'barakah', 'sunnah', 'islamic'],
  },

  // ─── ☀️ Routine & Daily Life ──────────────────────────────────────────────────
  {
    id: 'sun',
    label: 'Morning',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'sunny',
    keywords: ['morning', 'sunrise', 'wake', 'day', 'early', 'routine', 'sun'],
  },
  {
    id: 'moon-sleep',
    label: 'Sleep',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'bed-outline',
    keywords: ['sleep', 'bed', 'rest', 'night', 'nap', 'bedtime', 'adhkar'],
  },
  {
    id: 'coffee',
    label: 'Coffee',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'cafe-outline',
    keywords: ['coffee', 'caffeine', 'espresso', 'latte', 'cafe'],
  },
  {
    id: 'tea',
    label: 'Tea',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'tea',
    keywords: ['tea', 'chai', 'relax', 'evening', 'hot drink', 'infusion'],
  },
  {
    id: 'breakfast',
    label: 'Breakfast',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'egg-fried',
    keywords: ['breakfast', 'morning meal', 'eat', 'food', 'suhoor'],
  },
  {
    id: 'shower',
    label: 'Shower',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'shower',
    keywords: ['shower', 'bath', 'ghusl', 'hygiene', 'clean', 'wash'],
  },
  {
    id: 'water-hydration',
    label: 'Hydration',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'water-outline',
    keywords: ['water', 'drink', 'hydrate', 'bottle', 'health', 'daily'],
  },
  {
    id: 'walk',
    label: 'Walk',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'walk-outline',
    keywords: ['walk', 'steps', 'stroll', 'outside', 'fresh air', 'evening walk'],
  },
  {
    id: 'journal',
    label: 'Journal',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'journal-outline',
    keywords: ['journal', 'diary', 'write', 'reflection', 'gratitude', 'thoughts'],
  },
  {
    id: 'alarm',
    label: 'Wake Up / Alarm',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'alarm-outline',
    keywords: ['alarm', 'clock', 'wake', 'fajr alarm', 'reminder', 'early'],
  },

  // ─── 💼 Work & Study ──────────────────────────────────────────────────────────
  {
    id: 'laptop',
    label: 'Work / Laptop',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'laptop-outline',
    keywords: ['work', 'laptop', 'computer', 'desk', 'office', 'job', 'coding'],
  },
  {
    id: 'book',
    label: 'Study / Book',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'book-outline',
    keywords: ['study', 'book', 'reading', 'library', 'revision', 'course', 'exam'],
  },
  {
    id: 'graduation',
    label: 'Graduation / College',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'school-outline',
    keywords: ['college', 'university', 'school', 'degree', 'lecture', 'student'],
  },
  {
    id: 'briefcase',
    label: 'Office / Business',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'briefcase-outline',
    keywords: ['office', 'business', 'briefcase', 'client', 'meeting', 'career', 'job'],
  },
  {
    id: 'pencil',
    label: 'Writing',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'pencil-outline',
    keywords: ['pencil', 'pen', 'write', 'draft', 'essay', 'notes', 'homework'],
  },
  {
    id: 'document',
    label: 'Document',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'document-text-outline',
    keywords: ['document', 'report', 'contract', 'paper', 'pdf', 'file'],
  },
  {
    id: 'presentation',
    label: 'Presentation',
    category: 'work_study',
    family: 'MaterialCommunityIcons',
    iconName: 'presentation',
    keywords: ['presentation', 'slides', 'meeting', 'pitch', 'conference', 'demo'],
  },
  {
    id: 'code',
    label: 'Programming',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'code-slash-outline',
    keywords: ['code', 'developer', 'programming', 'software', 'git', 'bug', 'app'],
  },
  {
    id: 'calculator',
    label: 'Finance / Math',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'calculator-outline',
    keywords: ['calculator', 'budget', 'finance', 'taxes', 'money', 'math', 'accounting'],
  },
  {
    id: 'email',
    label: 'Email',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'mail-outline',
    keywords: ['email', 'inbox', 'message', 'mail', 'correspondence', 'reply'],
  },

  // ─── 🏃 Health & Fitness ──────────────────────────────────────────────────────
  {
    id: 'dumbbell',
    label: 'Gym / Workout',
    category: 'health',
    family: 'Ionicons',
    iconName: 'barbell-outline',
    keywords: ['gym', 'workout', 'weights', 'lifting', 'strength', 'training', 'fitness', 'dumbbell', 'barbell'],
  },
  {
    id: 'running',
    label: 'Running',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'run',
    keywords: ['running', 'jogging', 'cardio', 'sprint', 'treadmill', 'marathon'],
  },
  {
    id: 'cycling',
    label: 'Cycling',
    category: 'health',
    family: 'Ionicons',
    iconName: 'bicycle-outline',
    keywords: ['cycling', 'bike', 'bicycle', 'ride', 'spin', 'cardio'],
  },
  {
    id: 'yoga',
    label: 'Stretching',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'yoga',
    keywords: ['stretching', 'yoga', 'mobility', 'posture', 'flexibility'],
  },
  {
    id: 'pill',
    label: 'Medication',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'pill',
    keywords: ['pill', 'medication', 'vitamins', 'medicine', 'prescription', 'supplements', 'pharmacy'],
  },
  {
    id: 'doctor',
    label: 'Doctor Checkup',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'stethoscope',
    keywords: ['doctor', 'clinic', 'hospital', 'checkup', 'appointment', 'health'],
  },
  {
    id: 'dentist',
    label: 'Dentist',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'tooth-outline',
    keywords: ['dentist', 'teeth', 'tooth', 'cleaning', 'dental', 'brush'],
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    category: 'health',
    family: 'Ionicons',
    iconName: 'nutrition-outline',
    keywords: ['nutrition', 'apple', 'diet', 'healthy', 'salad', 'vitamins', 'food'],
  },
  {
    id: 'pulse',
    label: 'Heart / Cardio',
    category: 'health',
    family: 'Ionicons',
    iconName: 'pulse-outline',
    keywords: ['heart', 'pulse', 'cardio', 'blood pressure', 'health', 'fitness'],
  },

  // ─── 🏠 Home & Chores ─────────────────────────────────────────────────────────
  {
    id: 'home',
    label: 'Home',
    category: 'home',
    family: 'Ionicons',
    iconName: 'home-outline',
    keywords: ['home', 'house', 'apartment', 'indoor', 'household'],
  },
  {
    id: 'groceries',
    label: 'Groceries',
    category: 'home',
    family: 'Ionicons',
    iconName: 'cart-outline',
    keywords: ['groceries', 'supermarket', 'shopping', 'cart', 'buy food', 'market'],
  },
  {
    id: 'cooking',
    label: 'Cooking / Dinner',
    category: 'home',
    family: 'Ionicons',
    iconName: 'restaurant-outline',
    keywords: ['cooking', 'cook', 'bake', 'dinner', 'lunch', 'meal', 'chef', 'kitchen'],
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    category: 'home',
    family: 'MaterialCommunityIcons',
    iconName: 'broom',
    keywords: ['cleaning', 'clean', 'sweep', 'vacuum', 'tidy', 'mop', 'dishes', 'chores'],
  },
  {
    id: 'laundry',
    label: 'Laundry',
    category: 'home',
    family: 'MaterialCommunityIcons',
    iconName: 'washing-machine',
    keywords: ['laundry', 'clothes', 'wash', 'dry', 'iron', 'fold'],
  },
  {
    id: 'car',
    label: 'Car / Driving',
    category: 'home',
    family: 'Ionicons',
    iconName: 'car-outline',
    keywords: ['car', 'drive', 'auto', 'gas', 'mechanic', 'oil change', 'commute'],
  },
  {
    id: 'trash',
    label: 'Trash',
    category: 'home',
    family: 'Ionicons',
    iconName: 'trash-outline',
    keywords: ['trash', 'garbage', 'bin', 'recycle', 'waste', 'disposal'],
  },
  {
    id: 'repair',
    label: 'Fix / DIY',
    category: 'home',
    family: 'Ionicons',
    iconName: 'hammer-outline',
    keywords: ['hammer', 'repair', 'tools', 'fix', 'diy', 'maintenance'],
  },
  {
    id: 'plant',
    label: 'Gardening / Plants',
    category: 'home',
    family: 'Ionicons',
    iconName: 'leaf-outline',
    keywords: ['plants', 'water plants', 'garden', 'nature', 'flowers', 'green'],
  },
  {
    id: 'package',
    label: 'Delivery / Mail',
    category: 'home',
    family: 'Ionicons',
    iconName: 'cube-outline',
    keywords: ['package', 'delivery', 'mail', 'post', 'amazon', 'parcel', 'box'],
  },

  // ─── 👥 Family & Social ───────────────────────────────────────────────────────
  {
    id: 'family',
    label: 'Family Time',
    category: 'family',
    family: 'Ionicons',
    iconName: 'people-outline',
    keywords: ['family', 'parents', 'siblings', 'relatives', 'together', 'home'],
  },
  {
    id: 'baby',
    label: 'Kids / Child',
    category: 'family',
    family: 'MaterialCommunityIcons',
    iconName: 'baby-carriage',
    keywords: ['kids', 'baby', 'child', 'children', 'toddler', 'school pickup', 'parenting'],
  },
  {
    id: 'call',
    label: 'Phone Call',
    category: 'family',
    family: 'Ionicons',
    iconName: 'call-outline',
    keywords: ['call', 'phone', 'ring', 'parents', 'contact', 'telecom', 'silat ar-rahim'],
  },
  {
    id: 'chat',
    label: 'Message',
    category: 'family',
    family: 'Ionicons',
    iconName: 'chatbubble-ellipses-outline',
    keywords: ['message', 'chat', 'whatsapp', 'text', 'talk', 'reply'],
  },
  {
    id: 'gift',
    label: 'Gift',
    category: 'family',
    family: 'Ionicons',
    iconName: 'gift-outline',
    keywords: ['gift', 'present', 'eid', 'birthday', 'surprise', 'celebrate'],
  },
  {
    id: 'party',
    label: 'Gathering / Eid',
    category: 'family',
    family: 'MaterialCommunityIcons',
    iconName: 'party-popper',
    keywords: ['party', 'eid', 'gathering', 'guests', 'visit', 'celebration', 'walimah'],
  },
  {
    id: 'pet',
    label: 'Pet Care',
    category: 'family',
    family: 'Ionicons',
    iconName: 'paw-outline',
    keywords: ['pet', 'cat', 'dog', 'feed', 'vet', 'animal'],
  },

  // ─── 🎨 Leisure & Hobbies ─────────────────────────────────────────────────────
  {
    id: 'palette',
    label: 'Art & Design',
    category: 'leisure',
    family: 'Ionicons',
    iconName: 'color-palette-outline',
    keywords: ['art', 'draw', 'paint', 'design', 'craft', 'hobby', 'creative'],
  },
  {
    id: 'camera',
    label: 'Photography',
    category: 'leisure',
    family: 'Ionicons',
    iconName: 'camera-outline',
    keywords: ['photo', 'camera', 'pictures', 'shoot', 'video'],
  },
  {
    id: 'headphones',
    label: 'Audio / Podcast',
    category: 'leisure',
    family: 'Ionicons',
    iconName: 'headset-outline',
    keywords: ['audio', 'podcast', 'listen', 'headphones', 'sound', 'lecture'],
  },
  {
    id: 'airplane',
    label: 'Travel',
    category: 'leisure',
    family: 'Ionicons',
    iconName: 'airplane-outline',
    keywords: ['travel', 'flight', 'trip', 'airport', 'holiday', 'vacation', 'journey'],
  },
  {
    id: 'gaming',
    label: 'Gaming',
    category: 'leisure',
    family: 'Ionicons',
    iconName: 'game-controller-outline',
    keywords: ['game', 'gaming', 'play', 'video game', 'console'],
  },
  {
    id: 'shopping-bag',
    label: 'Shopping',
    category: 'leisure',
    family: 'Ionicons',
    iconName: 'bag-handle-outline',
    keywords: ['shopping', 'mall', 'buy', 'clothes', 'store', 'retail'],
  },

  // ─── ⭐ Productivity & Goals ──────────────────────────────────────────────────
  {
    id: 'target',
    label: 'Goal / Target',
    category: 'productivity',
    family: 'MaterialCommunityIcons',
    iconName: 'target',
    keywords: ['goal', 'target', 'objective', 'aim', 'focus', 'mission', 'milestone'],
  },
  {
    id: 'bulb',
    label: 'Idea',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'bulb-outline',
    keywords: ['idea', 'brainstorm', 'think', 'innovation', 'inspiration', 'solution'],
  },
  {
    id: 'fire',
    label: 'Urgent / Focus',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'flame-outline',
    keywords: ['fire', 'urgent', 'priority', 'focus', 'streak', 'hot'],
  },
  {
    id: 'trophy',
    label: 'Milestone / Win',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'trophy-outline',
    keywords: ['trophy', 'win', 'achievement', 'success', 'reward', 'victory'],
  },
  {
    id: 'flag',
    label: 'Priority',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'flag-outline',
    keywords: ['flag', 'priority', 'important', 'action', 'mark'],
  },
  {
    id: 'pin',
    label: 'Pin',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'pin-outline',
    keywords: ['pin', 'note', 'reminder', 'remember', 'sticky'],
  },
  {
    id: 'clock',
    label: 'Time Limit',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'time-outline',
    keywords: ['time', 'clock', 'duration', 'timer', 'deadline', 'schedule'],
  },
  {
    id: 'checkmark',
    label: 'Task',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'checkmark-circle-outline',
    keywords: ['task', 'check', 'done', 'todo', 'complete', 'action'],
  },
];

export const TASK_ICON_MAP: Record<string, TaskIconDef> = ALL_TASK_ICONS.reduce(
  (acc, item) => {
    acc[item.id] = {
      ...item,
      imageAsset: TASK_ICON_ASSETS[item.id] ?? item.imageAsset,
    };
    return acc;
  },
  {} as Record<string, TaskIconDef>
);

/**
 * Filter icons by search query and category
 */
export function searchTaskIcons(
  query: string,
  category: TaskIconCategory = 'all'
): TaskIconDef[] {
  const normalized = query.trim().toLowerCase();

  return ALL_TASK_ICONS.filter(icon => {
    // 1. Category check
    if (category !== 'all' && icon.category !== category) {
      return false;
    }

    // 2. Query check
    if (!normalized) {
      return true;
    }

    if (icon.label.toLowerCase().includes(normalized)) {
      return true;
    }

    return icon.keywords.some(k => k.toLowerCase().includes(normalized));
  });
}

/**
 * Extract icon ID from tags array (e.g. ['work', 'icon:quran'] => 'quran')
 */
export function getIconIdFromTags(tags?: string[] | null): string | null {
  if (!tags || !Array.isArray(tags)) return null;
  const tag = tags.find(t => t.startsWith('icon:'));
  return tag ? tag.slice(5) : null;
}

/**
 * Set or replace the icon tag in a tags array
 */
export function setIconInTags(tags: string[] | undefined | null, iconId: string | null | undefined): string[] {
  const filtered = (tags || []).filter(t => !t.startsWith('icon:'));
  if (!iconId) return filtered;
  return [...filtered, `icon:${iconId}`];
}

/**
 * Smart automatic fallback icon detection based on task title
 */
export function detectTaskIcon(title?: string | null, tags?: string[] | null): string {
  // 1. Check explicit tag first
  const explicit = getIconIdFromTags(tags);
  if (explicit && TASK_ICON_MAP[explicit]) {
    return explicit;
  }

  if (!title) return 'checkmark';

  const lower = title.toLowerCase();

  let bestMatch: { id: string; length: number } | null = null;

  for (const icon of ALL_TASK_ICONS) {
    for (const keyword of icon.keywords) {
      const kLower = keyword.toLowerCase();
      if (lower.includes(kLower)) {
        if (!bestMatch || kLower.length > bestMatch.length) {
          bestMatch = { id: icon.id, length: kLower.length };
        }
      }
    }
  }

  return bestMatch ? bestMatch.id : 'checkmark';
}
