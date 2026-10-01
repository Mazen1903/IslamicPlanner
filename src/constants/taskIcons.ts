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
    imageAsset: TASK_ICON_ASSETS['mosque'],
  },
  {
    id: 'quran',
    label: 'Quran',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'book-open-page-variant',
    keywords: ['quran', 'koran', 'mushaf', 'surah', 'ayah', 'read', 'tilawah', 'hifz', 'recitation', 'tadabbur'],
    imageAsset: TASK_ICON_ASSETS['quran'],
  },
  {
    id: 'kaaba',
    label: 'Kaaba',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'cube-outline',
    keywords: ['kaaba', 'makkah', 'hajj', 'umrah', 'pilgrimage', 'mecca', 'qibla'],
    imageAsset: TASK_ICON_ASSETS['kaaba'],
  },
  {
    id: 'crescent',
    label: 'Crescent Moon',
    category: 'deen',
    family: 'Ionicons',
    iconName: 'moon',
    keywords: ['moon', 'crescent', 'ramadan', 'hilal', 'fasting', 'sawm', 'shawwal', 'night'],
    imageAsset: TASK_ICON_ASSETS['crescent'],
  },
  {
    id: 'beads',
    label: 'Tasbeeh',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'dots-horizontal-circle-outline',
    keywords: ['tasbeeh', 'dhikr', 'subhanallah', 'alhamdulillah', 'allahu akbar', 'beads', 'azkar', 'adhkar'],
    imageAsset: TASK_ICON_ASSETS['beads'],
  },
  {
    id: 'charity',
    label: 'Charity',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'hand-heart',
    keywords: ['sadaqah', 'zakat', 'charity', 'donation', 'give', 'help', 'poor', 'volunteer'],
    imageAsset: TASK_ICON_ASSETS['charity'],
  },
  {
    id: 'duaa',
    label: 'Duaa',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'hands-pray',
    keywords: ['duaa', 'dua', 'supplication', 'prayer', 'ask', 'tahajjud', 'istighfar'],
    imageAsset: TASK_ICON_ASSETS['duaa'],
  },
  {
    id: 'fasting',
    label: 'Fasting / Iftar',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'silverware-fork-knife',
    keywords: ['fasting', 'sawm', 'iftar', 'suhoor', 'food', 'sunnah', 'ashura', 'arafah'],
    imageAsset: TASK_ICON_ASSETS['fasting'],
  },
  {
    id: 'lectures',
    label: 'Halaqah',
    category: 'deen',
    family: 'Ionicons',
    iconName: 'volume-high',
    keywords: ['halaqah', 'lecture', 'talk', 'dars', 'class', 'knowledge', 'ilm', 'scholar'],
    imageAsset: TASK_ICON_ASSETS['lectures'],
  },
  {
    id: 'water-wudu',
    label: 'Wudu',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'water-outline',
    keywords: ['wudu', 'ablution', 'taharah', 'purification', 'wash for prayer'],
    imageAsset: TASK_ICON_ASSETS['water-wudu'],
  },
  {
    id: 'heart-deen',
    label: 'Good Deed',
    category: 'deen',
    family: 'Ionicons',
    iconName: 'heart',
    keywords: ['good deed', 'hasanat', 'akhlaq', 'manners', 'kindness', 'charity', 'sunnah'],
    imageAsset: TASK_ICON_ASSETS['heart-deen'],
  },
  {
    id: 'star-islamic',
    label: 'Islamic Star',
    category: 'deen',
    family: 'Ionicons',
    iconName: 'star',
    keywords: ['star', 'blessed', 'barakah', 'sunnah', 'islamic'],
    imageAsset: TASK_ICON_ASSETS['star-islamic'],
  },
  {
    id: 'sujood',
    label: 'Sujood',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'human-handsdown',
    keywords: ['sujood', 'prostration', 'sajdah', 'humble', 'dua', 'prayer', 'salah'],
    imageAsset: TASK_ICON_ASSETS['sujood'],
  },
  {
    id: 'dua-praise',
    label: 'Hamd / Praise',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'human-handsup',
    keywords: ['hamd', 'praise', 'shukr', 'dua', 'supplication', 'gratitude', 'tahmid'],
    imageAsset: TASK_ICON_ASSETS['dua-praise'],
  },
  {
    id: 'compass-qibla',
    label: 'Qibla / Compass',
    category: 'deen',
    family: 'Ionicons',
    iconName: 'compass-outline',
    keywords: ['qibla', 'compass', 'direction', 'travel prayer', 'mecca', 'kaaba'],
    imageAsset: TASK_ICON_ASSETS['compass-qibla'],
  },

  // ─── ☀️ Routine & Daily Life ──────────────────────────────────────────────────
  {
    id: 'sun',
    label: 'Morning',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'sunny',
    keywords: ['morning', 'sunrise', 'wake', 'day', 'early', 'routine', 'sun'],
    imageAsset: TASK_ICON_ASSETS['sun'],
  },
  {
    id: 'moon-sleep',
    label: 'Sleep',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'bed-outline',
    keywords: ['sleep', 'bed', 'rest', 'night', 'nap', 'bedtime', 'adhkar'],
    imageAsset: TASK_ICON_ASSETS['moon-sleep'],
  },
  {
    id: 'coffee',
    label: 'Coffee',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'cafe-outline',
    keywords: ['coffee', 'caffeine', 'espresso', 'latte', 'cafe'],
    imageAsset: TASK_ICON_ASSETS['coffee'],
  },
  {
    id: 'tea',
    label: 'Tea',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'tea',
    keywords: ['tea', 'chai', 'relax', 'evening', 'hot drink', 'infusion'],
    imageAsset: TASK_ICON_ASSETS['tea'],
  },
  {
    id: 'breakfast',
    label: 'Breakfast',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'egg-fried',
    keywords: ['breakfast', 'morning meal', 'eat', 'food', 'suhoor'],
    imageAsset: TASK_ICON_ASSETS['breakfast'],
  },
  {
    id: 'shower',
    label: 'Shower',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'shower',
    keywords: ['shower', 'bath', 'ghusl', 'hygiene', 'clean', 'wash'],
    imageAsset: TASK_ICON_ASSETS['shower'],
  },
  {
    id: 'water-hydration',
    label: 'Hydration',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'water-outline',
    keywords: ['water', 'drink', 'hydrate', 'bottle', 'health', 'daily'],
    imageAsset: TASK_ICON_ASSETS['water-hydration'],
  },
  {
    id: 'walk',
    label: 'Walk',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'walk-outline',
    keywords: ['walk', 'steps', 'stroll', 'outside', 'fresh air', 'evening walk'],
    imageAsset: TASK_ICON_ASSETS['walk'],
  },
  {
    id: 'journal',
    label: 'Journal',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'journal-outline',
    keywords: ['journal', 'diary', 'write', 'reflection', 'gratitude', 'thoughts'],
    imageAsset: TASK_ICON_ASSETS['journal'],
  },
  {
    id: 'alarm',
    label: 'Wake Up / Alarm',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'alarm-outline',
    keywords: ['alarm', 'clock', 'wake', 'fajr alarm', 'reminder', 'early'],
    imageAsset: TASK_ICON_ASSETS['alarm'],
  },

  // ─── 💼 Work & Study ──────────────────────────────────────────────────────────
  {
    id: 'laptop',
    label: 'Work / Laptop',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'laptop-outline',
    keywords: ['work', 'laptop', 'computer', 'desk', 'office', 'job', 'coding'],
    imageAsset: TASK_ICON_ASSETS['laptop'],
  },
  {
    id: 'book',
    label: 'Study / Book',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'book-outline',
    keywords: ['study', 'book', 'reading', 'library', 'revision', 'course', 'exam'],
    imageAsset: TASK_ICON_ASSETS['book'],
  },
  {
    id: 'graduation',
    label: 'Graduation / College',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'school-outline',
    keywords: ['college', 'university', 'school', 'degree', 'lecture', 'student'],
    imageAsset: TASK_ICON_ASSETS['graduation'],
  },
  {
    id: 'briefcase',
    label: 'Office / Business',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'briefcase-outline',
    keywords: ['office', 'business', 'briefcase', 'client', 'meeting', 'career', 'job'],
    imageAsset: TASK_ICON_ASSETS['briefcase'],
  },
  {
    id: 'pencil',
    label: 'Writing',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'pencil-outline',
    keywords: ['pencil', 'pen', 'write', 'draft', 'essay', 'notes', 'homework'],
    imageAsset: TASK_ICON_ASSETS['pencil'],
  },
  {
    id: 'document',
    label: 'Document',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'document-text-outline',
    keywords: ['document', 'report', 'contract', 'paper', 'pdf', 'file'],
    imageAsset: TASK_ICON_ASSETS['document'],
  },
  {
    id: 'presentation',
    label: 'Presentation',
    category: 'work_study',
    family: 'MaterialCommunityIcons',
    iconName: 'presentation',
    keywords: ['presentation', 'slides', 'meeting', 'pitch', 'conference', 'demo'],
    imageAsset: TASK_ICON_ASSETS['presentation'],
  },
  {
    id: 'code',
    label: 'Programming',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'code-slash-outline',
    keywords: ['code', 'developer', 'programming', 'software', 'git', 'bug', 'app'],
    imageAsset: TASK_ICON_ASSETS['code'],
  },
  {
    id: 'calculator',
    label: 'Finance / Math',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'calculator-outline',
    keywords: ['calculator', 'budget', 'finance', 'taxes', 'money', 'math', 'accounting'],
    imageAsset: TASK_ICON_ASSETS['calculator'],
  },
  {
    id: 'email',
    label: 'Email',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'mail-outline',
    keywords: ['email', 'inbox', 'message', 'mail', 'correspondence', 'reply'],
    imageAsset: TASK_ICON_ASSETS['email'],
  },

  // ─── 🏃 Health & Fitness ──────────────────────────────────────────────────────
  {
    id: 'dumbbell',
    label: 'Gym / Workout',
    category: 'health',
    family: 'Ionicons',
    iconName: 'barbell-outline',
    keywords: ['gym', 'workout', 'weights', 'lifting', 'strength', 'training', 'fitness', 'dumbbell', 'barbell'],
    imageAsset: TASK_ICON_ASSETS['dumbbell'],
  },
  {
    id: 'running',
    label: 'Running',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'run',
    keywords: ['running', 'jogging', 'cardio', 'sprint', 'treadmill', 'marathon'],
    imageAsset: TASK_ICON_ASSETS['running'],
  },
  {
    id: 'cycling',
    label: 'Cycling',
    category: 'health',
    family: 'Ionicons',
    iconName: 'bicycle-outline',
    keywords: ['cycling', 'bike', 'bicycle', 'ride', 'spin', 'cardio'],
    imageAsset: TASK_ICON_ASSETS['cycling'],
  },
  {
    id: 'yoga',
    label: 'Stretching',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'yoga',
    keywords: ['stretching', 'yoga', 'mobility', 'posture', 'flexibility'],
    imageAsset: TASK_ICON_ASSETS['yoga'],
  },
  {
    id: 'pill',
    label: 'Medication',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'pill',
    keywords: ['pill', 'medication', 'vitamins', 'medicine', 'prescription', 'supplements', 'pharmacy'],
    imageAsset: TASK_ICON_ASSETS['pill'],
  },
  {
    id: 'doctor',
    label: 'Doctor Checkup',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'stethoscope',
    keywords: ['doctor', 'clinic', 'hospital', 'checkup', 'appointment', 'health'],
    imageAsset: TASK_ICON_ASSETS['doctor'],
  },
  {
    id: 'dentist',
    label: 'Dentist',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'tooth-outline',
    keywords: ['dentist', 'teeth', 'tooth', 'cleaning', 'dental', 'brush'],
    imageAsset: TASK_ICON_ASSETS['dentist'],
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    category: 'health',
    family: 'Ionicons',
    iconName: 'nutrition-outline',
    keywords: ['nutrition', 'apple', 'diet', 'healthy', 'salad', 'vitamins', 'food'],
    imageAsset: TASK_ICON_ASSETS['nutrition'],
  },
  {
    id: 'pulse',
    label: 'Heart / Cardio',
    category: 'health',
    family: 'Ionicons',
    iconName: 'pulse-outline',
    keywords: ['heart', 'pulse', 'cardio', 'blood pressure', 'health', 'fitness'],
    imageAsset: TASK_ICON_ASSETS['pulse'],
  },

  // ─── 🏠 Home & Chores ─────────────────────────────────────────────────────────
  {
    id: 'home',
    label: 'Home',
    category: 'home',
    family: 'Ionicons',
    iconName: 'home-outline',
    keywords: ['home', 'house', 'apartment', 'indoor', 'household'],
    imageAsset: TASK_ICON_ASSETS['home'],
  },
  {
    id: 'groceries',
    label: 'Groceries',
    category: 'home',
    family: 'Ionicons',
    iconName: 'cart-outline',
    keywords: ['groceries', 'supermarket', 'shopping', 'cart', 'buy food', 'market'],
    imageAsset: TASK_ICON_ASSETS['groceries'],
  },
  {
    id: 'cooking',
    label: 'Cooking / Dinner',
    category: 'home',
    family: 'Ionicons',
    iconName: 'restaurant-outline',
    keywords: ['cooking', 'cook', 'bake', 'dinner', 'lunch', 'meal', 'chef', 'kitchen'],
    imageAsset: TASK_ICON_ASSETS['cooking'],
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    category: 'home',
    family: 'MaterialCommunityIcons',
    iconName: 'broom',
    keywords: ['cleaning', 'clean', 'sweep', 'vacuum', 'tidy', 'mop', 'dishes', 'chores'],
    imageAsset: TASK_ICON_ASSETS['cleaning'],
  },
  {
    id: 'laundry',
    label: 'Laundry',
    category: 'home',
    family: 'MaterialCommunityIcons',
    iconName: 'washing-machine',
    keywords: ['laundry', 'clothes', 'wash', 'dry', 'iron', 'fold'],
    imageAsset: TASK_ICON_ASSETS['laundry'],
  },
  {
    id: 'car',
    label: 'Car / Driving',
    category: 'home',
    family: 'Ionicons',
    iconName: 'car-outline',
    keywords: ['car', 'drive', 'auto', 'gas', 'mechanic', 'oil change', 'commute'],
    imageAsset: TASK_ICON_ASSETS['car'],
  },
  {
    id: 'trash',
    label: 'Trash',
    category: 'home',
    family: 'Ionicons',
    iconName: 'trash-outline',
    keywords: ['trash', 'garbage', 'bin', 'recycle', 'waste', 'disposal'],
    imageAsset: TASK_ICON_ASSETS['trash'],
  },
  {
    id: 'repair',
    label: 'Fix / DIY',
    category: 'home',
    family: 'Ionicons',
    iconName: 'hammer-outline',
    keywords: ['hammer', 'repair', 'tools', 'fix', 'diy', 'maintenance'],
    imageAsset: TASK_ICON_ASSETS['repair'],
  },
  {
    id: 'plant',
    label: 'Gardening / Plants',
    category: 'home',
    family: 'Ionicons',
    iconName: 'leaf-outline',
    keywords: ['plants', 'water plants', 'garden', 'nature', 'flowers', 'green'],
    imageAsset: TASK_ICON_ASSETS['plant'],
  },
  {
    id: 'package',
    label: 'Delivery / Mail',
    category: 'home',
    family: 'Ionicons',
    iconName: 'cube-outline',
    keywords: ['package', 'delivery', 'mail', 'post', 'amazon', 'parcel', 'box'],
    imageAsset: TASK_ICON_ASSETS['package'],
  },

  // ─── 👥 Family & Social ───────────────────────────────────────────────────────
  {
    id: 'family',
    label: 'Family Time',
    category: 'family',
    family: 'Ionicons',
    iconName: 'people-outline',
    keywords: ['family', 'parents', 'siblings', 'relatives', 'together', 'home'],
    imageAsset: TASK_ICON_ASSETS['family'],
  },
  {
    id: 'baby',
    label: 'Kids / Child',
    category: 'family',
    family: 'MaterialCommunityIcons',
    iconName: 'baby-carriage',
    keywords: ['kids', 'baby', 'child', 'children', 'toddler', 'school pickup', 'parenting'],
    imageAsset: TASK_ICON_ASSETS['baby'],
  },
  {
    id: 'call',
    label: 'Phone Call',
    category: 'family',
    family: 'Ionicons',
    iconName: 'call-outline',
    keywords: ['call', 'phone', 'ring', 'parents', 'contact', 'telecom', 'silat ar-rahim'],
    imageAsset: TASK_ICON_ASSETS['call'],
  },
  {
    id: 'chat',
    label: 'Message',
    category: 'family',
    family: 'Ionicons',
    iconName: 'chatbubble-ellipses-outline',
    keywords: ['message', 'chat', 'whatsapp', 'text', 'talk', 'reply'],
    imageAsset: TASK_ICON_ASSETS['chat'],
  },
  {
    id: 'gift',
    label: 'Gift',
    category: 'family',
    family: 'Ionicons',
    iconName: 'gift-outline',
    keywords: ['gift', 'present', 'eid', 'birthday', 'surprise', 'celebrate'],
    imageAsset: TASK_ICON_ASSETS['gift'],
  },
  {
    id: 'party',
    label: 'Gathering / Eid',
    category: 'family',
    family: 'MaterialCommunityIcons',
    iconName: 'party-popper',
    keywords: ['party', 'eid', 'gathering', 'guests', 'visit', 'celebration', 'walimah'],
    imageAsset: TASK_ICON_ASSETS['party'],
  },
  {
    id: 'pet',
    label: 'Pet Care',
    category: 'family',
    family: 'Ionicons',
    iconName: 'paw-outline',
    keywords: ['pet', 'cat', 'dog', 'feed', 'vet', 'animal'],
    imageAsset: TASK_ICON_ASSETS['pet'],
  },

  // ─── 🎨 Leisure & Hobbies ─────────────────────────────────────────────────────
  {
    id: 'palette',
    label: 'Art & Design',
    category: 'leisure',
    family: 'Ionicons',
    iconName: 'color-palette-outline',
    keywords: ['art', 'draw', 'paint', 'design', 'craft', 'hobby', 'creative'],
    imageAsset: TASK_ICON_ASSETS['palette'],
  },
  {
    id: 'camera',
    label: 'Photography',
    category: 'leisure',
    family: 'Ionicons',
    iconName: 'camera-outline',
    keywords: ['photo', 'camera', 'pictures', 'shoot', 'video'],
    imageAsset: TASK_ICON_ASSETS['camera'],
  },
  {
    id: 'headphones',
    label: 'Audio / Podcast',
    category: 'leisure',
    family: 'Ionicons',
    iconName: 'headset-outline',
    keywords: ['audio', 'podcast', 'listen', 'headphones', 'sound', 'lecture'],
    imageAsset: TASK_ICON_ASSETS['headphones'],
  },
  {
    id: 'airplane',
    label: 'Travel',
    category: 'leisure',
    family: 'Ionicons',
    iconName: 'airplane-outline',
    keywords: ['travel', 'flight', 'trip', 'airport', 'holiday', 'vacation', 'journey'],
    imageAsset: TASK_ICON_ASSETS['airplane'],
  },
  {
    id: 'gaming',
    label: 'Gaming',
    category: 'leisure',
    family: 'Ionicons',
    iconName: 'game-controller-outline',
    keywords: ['game', 'gaming', 'play', 'video game', 'console'],
    imageAsset: TASK_ICON_ASSETS['gaming'],
  },
  {
    id: 'shopping-bag',
    label: 'Shopping',
    category: 'leisure',
    family: 'Ionicons',
    iconName: 'bag-handle-outline',
    keywords: ['shopping', 'mall', 'buy', 'clothes', 'store', 'retail'],
    imageAsset: TASK_ICON_ASSETS['shopping-bag'],
  },

  // ─── ⭐ Productivity & Goals ──────────────────────────────────────────────────
  {
    id: 'target',
    label: 'Goal / Target',
    category: 'productivity',
    family: 'MaterialCommunityIcons',
    iconName: 'target',
    keywords: ['goal', 'target', 'objective', 'aim', 'focus', 'mission', 'milestone'],
    imageAsset: TASK_ICON_ASSETS['target'],
  },
  {
    id: 'bulb',
    label: 'Idea',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'bulb-outline',
    keywords: ['idea', 'brainstorm', 'think', 'innovation', 'inspiration', 'solution'],
    imageAsset: TASK_ICON_ASSETS['bulb'],
  },
  {
    id: 'fire',
    label: 'Urgent / Focus',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'flame-outline',
    keywords: ['fire', 'urgent', 'priority', 'focus', 'streak', 'hot'],
    imageAsset: TASK_ICON_ASSETS['fire'],
  },
  {
    id: 'trophy',
    label: 'Milestone / Win',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'trophy-outline',
    keywords: ['trophy', 'win', 'achievement', 'success', 'reward', 'victory'],
    imageAsset: TASK_ICON_ASSETS['trophy'],
  },
  {
    id: 'flag',
    label: 'Priority',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'flag-outline',
    keywords: ['flag', 'priority', 'important', 'action', 'mark'],
    imageAsset: TASK_ICON_ASSETS['flag'],
  },
  {
    id: 'pin',
    label: 'Pin',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'pin-outline',
    keywords: ['pin', 'note', 'reminder', 'remember', 'sticky'],
    imageAsset: TASK_ICON_ASSETS['pin'],
  },
  {
    id: 'clock',
    label: 'Time Limit',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'time-outline',
    keywords: ['time', 'clock', 'duration', 'timer', 'deadline', 'schedule'],
    imageAsset: TASK_ICON_ASSETS['clock'],
  },
  {
    id: 'checkmark',
    label: 'Task',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'checkmark-circle-outline',
    keywords: ['task', 'check', 'done', 'todo', 'complete', 'action'],
    imageAsset: TASK_ICON_ASSETS['checkmark'],
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

export const DEFAULT_TASK_ICON_ID = 'pencil';

/**
 * Smart automatic fallback icon detection based on task title
 */
export function detectTaskIcon(title?: string | null, tags?: string[] | null): string {
  // 1. Check explicit tag first
  const explicit = getIconIdFromTags(tags);
  if (explicit && TASK_ICON_MAP[explicit]) {
    return explicit;
  }

  if (!title) return DEFAULT_TASK_ICON_ID;

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

  return bestMatch ? bestMatch.id : DEFAULT_TASK_ICON_ID;
}
