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
  | 'finance'
  | 'travel'
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
  { key: 'finance', label: 'Finance', icon: 'wallet' },
  { key: 'travel', label: 'Travel', icon: 'airplane' },
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
    keywords: ['quran', 'koran', 'mushaf', 'surah', 'ayah', 'read', 'tilawah', 'recitation', 'tadabbur'],
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
    keywords: ['sadaqah', 'charity', 'donation', 'give', 'help', 'poor', 'volunteer'],
    imageAsset: TASK_ICON_ASSETS['charity'],
  },
  {
    id: 'duaa',
    label: 'Duaa',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'hands-pray',
    keywords: ['duaa', 'dua', 'supplication', 'prayer', 'ask', 'munajat', 'istighfar'],
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
    keywords: ['groceries', 'grocery shopping', 'supermarket', 'shopping', 'cart', 'buy food', 'market'],
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

  // ─── 🕌 Deen & Worship Expansion ──────────────────────────────────────────────
  {
    id: 'prayer-mat',
    label: 'Prayer Mat',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'rug',
    keywords: ['prayer mat', 'sajadah', 'rug', 'carpet', 'salah', 'namaz', 'mat', 'pray', 'musalla'],
    imageAsset: TASK_ICON_ASSETS['prayer-mat'],
  },
  {
    id: 'tahajjud',
    label: 'Tahajjud / Lantern',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'lantern',
    keywords: ['tahajjud', 'qiyam', 'night prayer', 'lantern', 'fanous', 'ramadan', 'vigil', 'light'],
    imageAsset: TASK_ICON_ASSETS['tahajjud'],
  },
  {
    id: 'hajj',
    label: 'Hajj / Umrah',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'bag-personal-outline',
    keywords: ['hajj', 'pilgrim', 'ihram', 'arafah', 'jamarat', 'mina', 'makkah', 'pilgrimage', 'umrah'],
    imageAsset: TASK_ICON_ASSETS['hajj'],
  },
  {
    id: 'quran-memorization',
    label: 'Hifz / Rihal',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'book-open-variant',
    keywords: ['hifz', 'memorize', 'memorization', 'quran memorization', 'rihal', 'quran stand', 'murajaah', 'quran revision', 'juz'],
    imageAsset: TASK_ICON_ASSETS['quran-memorization'],
  },
  {
    id: 'zakat',
    label: 'Zakat / Wealth',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'hand-coin-outline',
    keywords: ['zakat', 'wealth', 'gold', 'nisab', 'charity', 'purification', 'dues', 'zakat al fitr', 'savings zakat'],
    imageAsset: TASK_ICON_ASSETS['zakat'],
  },
  {
    id: 'dates-fruit',
    label: 'Dates / Iftar',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'food-apple-outline',
    keywords: ['dates', 'rutab', 'tamr', 'iftar', 'suhoor', 'sunnah food', 'break fast', 'dates fruit'],
    imageAsset: TASK_ICON_ASSETS['dates-fruit'],
  },
  {
    id: 'janazah',
    label: 'Janazah / Cemetery',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'flower-tulip-outline',
    keywords: ['janazah', 'funeral', 'grave', 'cemetery', 'ziyarah', 'condolences', 'dua for deceased', 'remembrance'],
    imageAsset: TASK_ICON_ASSETS['janazah'],
  },
  {
    id: 'miswak',
    label: 'Miswak / Siwak',
    category: 'deen',
    family: 'Ionicons',
    iconName: 'sparkles-outline',
    keywords: ['miswak', 'siwak', 'sunnah', 'teeth cleaning', 'purification', 'hygiene', 'mouth', 'sunnah habit'],
    imageAsset: TASK_ICON_ASSETS['miswak'],
  },

  // ─── ☀️ Routine & Daily Life Expansion ────────────────────────────────────────
  {
    id: 'bed-nap',
    label: 'Nap / Qaylulah',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'bed-outline',
    keywords: ['nap', 'qaylulah', 'afternoon rest', 'siesta', 'recharge', 'power nap', 'short sleep'],
    imageAsset: TASK_ICON_ASSETS['bed-nap'],
  },
  {
    id: 'toothbrush',
    label: 'Brush Teeth',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'toothbrush',
    keywords: ['brush teeth', 'toothbrush', 'toothpaste', 'hygiene', 'morning routine', 'dental care'],
    imageAsset: TASK_ICON_ASSETS['toothbrush'],
  },
  {
    id: 'skincare',
    label: 'Skincare',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'lotion-plus-outline',
    keywords: ['skincare', 'lotion', 'cream', 'serum', 'grooming', 'self care', 'face wash', 'moisturizer'],
    imageAsset: TASK_ICON_ASSETS['skincare'],
  },
  {
    id: 'bath',
    label: 'Bath / Ghusl',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'bathtub-outline',
    keywords: ['bath', 'bathtub', 'ghusl', 'soak', 'wash', 'relax', 'shower bath'],
    imageAsset: TASK_ICON_ASSETS['bath'],
  },
  {
    id: 'water-jug',
    label: 'Water Bottle',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'bottle-tonic-outline',
    keywords: ['water bottle', 'thermos', 'jug', 'flask', 'drink water', 'hydration', 'hydro flask'],
    imageAsset: TASK_ICON_ASSETS['water-jug'],
  },

  // ─── 💼 Work & Study Expansion ────────────────────────────────────────────────
  {
    id: 'desk',
    label: 'Desk / Workspace',
    category: 'work_study',
    family: 'MaterialCommunityIcons',
    iconName: 'desk',
    keywords: ['desk', 'workspace', 'study station', 'office setup', 'workstation', 'clean desk'],
    imageAsset: TASK_ICON_ASSETS['desk'],
  },
  {
    id: 'meeting',
    label: 'Meeting / Call',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'videocam-outline',
    keywords: ['meeting', 'zoom', 'teams', 'video call', 'conference', 'sync', 'huddle', 'client call'],
    imageAsset: TASK_ICON_ASSETS['meeting'],
  },
  {
    id: 'certificate',
    label: 'Certificate',
    category: 'work_study',
    family: 'MaterialCommunityIcons',
    iconName: 'certificate-outline',
    keywords: ['certificate', 'diploma', 'degree', 'license', 'course completion', 'award', 'graduation'],
    imageAsset: TASK_ICON_ASSETS['certificate'],
  },
  {
    id: 'folder',
    label: 'Folder / Files',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'folder-outline',
    keywords: ['folder', 'files', 'archive', 'organize', 'documents', 'records', 'file cabinet'],
    imageAsset: TASK_ICON_ASSETS['folder'],
  },
  {
    id: 'microscope',
    label: 'Research / Lab',
    category: 'work_study',
    family: 'MaterialCommunityIcons',
    iconName: 'microscope',
    keywords: ['research', 'science', 'lab', 'experiment', 'microscope', 'study', 'biology', 'chemistry'],
    imageAsset: TASK_ICON_ASSETS['microscope'],
  },

  // ─── 💰 Finance & Money ───────────────────────────────────────────────────────
  {
    id: 'wallet',
    label: 'Wallet / Cash',
    category: 'finance',
    family: 'Ionicons',
    iconName: 'wallet-outline',
    keywords: ['wallet', 'cash', 'purse', 'pocket', 'spending', 'money clip'],
    imageAsset: TASK_ICON_ASSETS['wallet'],
  },
  {
    id: 'money',
    label: 'Money / Income',
    category: 'finance',
    family: 'Ionicons',
    iconName: 'cash-outline',
    keywords: ['money', 'cash', 'dollars', 'currency', 'bills', 'earnings', 'payday', 'salary', 'income'],
    imageAsset: TASK_ICON_ASSETS['money'],
  },
  {
    id: 'credit-card',
    label: 'Card / Payment',
    category: 'finance',
    family: 'Ionicons',
    iconName: 'card-outline',
    keywords: ['card', 'credit card', 'debit card', 'payment', 'checkout', 'swipe', 'visa', 'mastercard'],
    imageAsset: TASK_ICON_ASSETS['credit-card'],
  },
  {
    id: 'piggy-bank',
    label: 'Savings / Invest',
    category: 'finance',
    family: 'MaterialCommunityIcons',
    iconName: 'piggy-bank-outline',
    keywords: ['savings', 'piggy bank', 'invest', 'halal investment', 'emergency fund', 'saving', 'wealth building'],
    imageAsset: TASK_ICON_ASSETS['piggy-bank'],
  },
  {
    id: 'invoice',
    label: 'Bills & Invoice',
    category: 'finance',
    family: 'Ionicons',
    iconName: 'receipt-outline',
    keywords: ['bill', 'invoice', 'receipt', 'utilities', 'rent', 'subscription', 'pay bill', 'electricity bill', 'electric bill', 'electricity'],
    imageAsset: TASK_ICON_ASSETS['invoice'],
  },

  // ─── ✈️ Travel & Commute ──────────────────────────────────────────────────────
  {
    id: 'luggage',
    label: 'Luggage / Packing',
    category: 'travel',
    family: 'Ionicons',
    iconName: 'briefcase-outline',
    keywords: ['luggage', 'suitcase', 'packing', 'trip', 'travel bag', 'vacation pack', 'pack bags'],
    imageAsset: TASK_ICON_ASSETS['luggage'],
  },
  {
    id: 'bus',
    label: 'Bus / Transit',
    category: 'travel',
    family: 'Ionicons',
    iconName: 'bus-outline',
    keywords: ['bus', 'public transit', 'coach', 'shuttle', 'commute', 'bus stop'],
    imageAsset: TASK_ICON_ASSETS['bus'],
  },
  {
    id: 'train',
    label: 'Train / Metro',
    category: 'travel',
    family: 'Ionicons',
    iconName: 'train-outline',
    keywords: ['train', 'metro', 'subway', 'rail', 'railway', 'commute', 'tube'],
    imageAsset: TASK_ICON_ASSETS['train'],
  },
  {
    id: 'passport',
    label: 'Passport / Visa',
    category: 'travel',
    family: 'Ionicons',
    iconName: 'document-outline',
    keywords: ['passport', 'visa', 'id', 'international travel', 'customs', 'boarding', 'airport pass'],
    imageAsset: TASK_ICON_ASSETS['passport'],
  },
  {
    id: 'gas-station',
    label: 'Gas / Fuel',
    category: 'travel',
    family: 'MaterialCommunityIcons',
    iconName: 'gas-station-outline',
    keywords: ['gas', 'fuel', 'petrol', 'gas station', 'fill up car', 'diesel'],
    imageAsset: TASK_ICON_ASSETS['gas-station'],
  },

  // ─── 🏃 Health & Fitness Expansion ────────────────────────────────────────────
  {
    id: 'swimming',
    label: 'Swimming',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'swim',
    keywords: ['swimming', 'swim', 'pool', 'laps', 'cardio swim', 'aquatic'],
    imageAsset: TASK_ICON_ASSETS['swimming'],
  },
  {
    id: 'hiking',
    label: 'Hiking / Trail',
    category: 'health',
    family: 'Ionicons',
    iconName: 'trail-sign-outline',
    keywords: ['hiking', 'trail', 'mountain', 'hike', 'outdoor walk', 'trekking', 'nature trail'],
    imageAsset: TASK_ICON_ASSETS['hiking'],
  },
  {
    id: 'apple',
    label: 'Healthy Snack',
    category: 'health',
    family: 'Ionicons',
    iconName: 'nutrition-outline',
    keywords: ['apple', 'fruit', 'snack', 'healthy food', 'produce', 'eating healthy'],
    imageAsset: TASK_ICON_ASSETS['apple'],
  },
  {
    id: 'scale',
    label: 'Weight Scale',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'scale-bathroom',
    keywords: ['scale', 'weight', 'weigh-in', 'body composition', 'fitness tracking', 'weigh'],
    imageAsset: TASK_ICON_ASSETS['scale'],
  },
  {
    id: 'sleep-mask',
    label: 'Deep Rest',
    category: 'health',
    family: 'Ionicons',
    iconName: 'moon-outline',
    keywords: ['sleep mask', 'rest', 'deep sleep', 'meditation', 'relaxation', 'unwind'],
    imageAsset: TASK_ICON_ASSETS['sleep-mask'],
  },

  // ─── 🏠 Home & Chores Expansion ───────────────────────────────────────────────
  {
    id: 'bed-making',
    label: 'Make Bed',
    category: 'home',
    family: 'Ionicons',
    iconName: 'bed-outline',
    keywords: ['make bed', 'bedding', 'tidy bedroom', 'room cleanup', 'neat', 'tidy bed'],
    imageAsset: TASK_ICON_ASSETS['bed-making'],
  },
  {
    id: 'dishes',
    label: 'Dishes',
    category: 'home',
    family: 'MaterialCommunityIcons',
    iconName: 'dishwasher',
    keywords: ['dishes', 'wash dishes', 'sink', 'dishwasher', 'clean kitchen', 'plates'],
    imageAsset: TASK_ICON_ASSETS['dishes'],
  },
  {
    id: 'grocery-cart',
    label: 'Shopping Cart',
    category: 'home',
    family: 'Ionicons',
    iconName: 'cart-outline',
    keywords: ['shopping cart', 'supermarket trolley', 'trolley', 'haul', 'cart'],
    imageAsset: TASK_ICON_ASSETS['grocery-cart'],
  },
  {
    id: 'lightbulb-fixture',
    label: 'Maintenance',
    category: 'home',
    family: 'Ionicons',
    iconName: 'bulb-outline',
    keywords: ['lightbulb', 'replace bulb', 'electrician', 'fix light', 'maintenance', 'home repair'],
    imageAsset: TASK_ICON_ASSETS['lightbulb-fixture'],
  },
  {
    id: 'key',
    label: 'Keys / Lock',
    category: 'home',
    family: 'Ionicons',
    iconName: 'key-outline',
    keywords: ['keys', 'key', 'lock', 'locksmith', 'house keys', 'security'],
    imageAsset: TASK_ICON_ASSETS['key'],
  },

  // ─── 👥 Family & Social Expansion ─────────────────────────────────────────────
  {
    id: 'handshake',
    label: 'Handshake / Deal',
    category: 'family',
    family: 'MaterialCommunityIcons',
    iconName: 'handshake-outline',
    keywords: ['handshake', 'salaam', 'greeting', 'deal', 'friendship', 'reconciliation', 'agreement'],
    imageAsset: TASK_ICON_ASSETS['handshake'],
  },
  {
    id: 'dinner-table',
    label: 'Family Dinner',
    category: 'family',
    family: 'MaterialCommunityIcons',
    iconName: 'table-furniture',
    keywords: ['dinner', 'family dinner', 'dining table', 'supper', 'eat together', 'meal time'],
    imageAsset: TASK_ICON_ASSETS['dinner-table'],
  },
  {
    id: 'crying-baby',
    label: 'Baby Care',
    category: 'family',
    family: 'MaterialCommunityIcons',
    iconName: 'baby-bottle-outline',
    keywords: ['baby bottle', 'nursing', 'feeding', 'infant', 'baby care', 'pacifier', 'formula'],
    imageAsset: TASK_ICON_ASSETS['crying-baby'],
  },
  {
    id: 'elderly',
    label: 'Parents / Elders',
    category: 'family',
    family: 'MaterialCommunityIcons',
    iconName: 'human-cane',
    keywords: ['parents', 'elderly', 'grandparents', 'caregiving', 'kindness to parents', 'birr al-walidayn', 'elders'],
    imageAsset: TASK_ICON_ASSETS['elderly'],
  },

  // ─── 🎨 Leisure & Hobbies Expansion ───────────────────────────────────────────
  {
    id: 'gardening-trowel',
    label: 'Gardening',
    category: 'leisure',
    family: 'MaterialCommunityIcons',
    iconName: 'spade',
    keywords: ['gardening', 'trowel', 'soil', 'planting', 'backyard', 'botany', 'garden work'],
    imageAsset: TASK_ICON_ASSETS['gardening-trowel'],
  },
  {
    id: 'book-shelf',
    label: 'Bookshelf',
    category: 'leisure',
    family: 'MaterialCommunityIcons',
    iconName: 'bookshelf',
    keywords: ['bookshelf', 'books', 'library', 'reading list', 'book collection', 'bookcase'],
    imageAsset: TASK_ICON_ASSETS['book-shelf'],
  },
  {
    id: 'guitar',
    label: 'Guitar / Music',
    category: 'leisure',
    family: 'MaterialCommunityIcons',
    iconName: 'guitar-acoustic',
    keywords: ['guitar', 'acoustic', 'instrument', 'strings', 'music', 'play guitar'],
    imageAsset: TASK_ICON_ASSETS['guitar'],
  },
  {
    id: 'board-game',
    label: 'Board Game',
    category: 'leisure',
    family: 'MaterialCommunityIcons',
    iconName: 'chess-knight',
    keywords: ['board game', 'chess', 'puzzle', 'game night', 'scrabble', 'boardgame'],
    imageAsset: TASK_ICON_ASSETS['board-game'],
  },

  // ─── ⭐ Productivity & Goals Expansion ─────────────────────────────────────────
  {
    id: 'rocket',
    label: 'Launch / Startup',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'rocket-outline',
    keywords: ['rocket', 'launch', 'startup', 'boost', 'momentum', 'moonshot', 'release'],
    imageAsset: TASK_ICON_ASSETS['rocket'],
  },
  {
    id: 'timer',
    label: 'Timer / Pomodoro',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'timer-outline',
    keywords: ['timer', 'stopwatch', 'pomodoro', 'countdown', 'interval', 'focus time', 'sprint'],
    imageAsset: TASK_ICON_ASSETS['timer'],
  },
  {
    id: 'shield',
    label: 'Shield / Guard',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'shield-checkmark-outline',
    keywords: ['shield', 'protection', 'security', 'guard', 'defense', 'halal protection', 'safe'],
    imageAsset: TASK_ICON_ASSETS['shield'],
  },
  {
    id: 'calendar',
    label: 'Calendar / Event',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'calendar-outline',
    keywords: ['calendar', 'schedule', 'date', 'event', 'appointment', 'planner', 'due date'],
    imageAsset: TASK_ICON_ASSETS['calendar'],
  },

  // ─── 🌟 Lifestyle, Grooming & Daily Routine Expansion ──────────────────────────
  {
    id: 'haircut',
    label: 'Haircut / Grooming',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'content-cut',
    keywords: ['haircut', 'barber', 'salon', 'hair', 'grooming', 'trim', 'fade', 'beard', 'styling', 'shave'],
    imageAsset: TASK_ICON_ASSETS['haircut'],
  },
  {
    id: 'clothing',
    label: 'Clothes / Wardrobe',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'hanger',
    keywords: ['clothes', 'clothing', 'wardrobe', 'outfit', 'hanger', 'fashion', 'ironing', 'dressing', 'wear'],
    imageAsset: TASK_ICON_ASSETS['clothing'],
  },
  {
    id: 'stroller',
    label: 'Baby Stroller / Walk',
    category: 'family',
    family: 'MaterialCommunityIcons',
    iconName: 'baby-carriage',
    keywords: ['stroller', 'pram', 'baby stroller', 'baby', 'carriage', 'walk with baby', 'infant', 'toddler'],
    imageAsset: TASK_ICON_ASSETS['stroller'],
  },
  {
    id: 'car-wash',
    label: 'Car Wash',
    category: 'home',
    family: 'MaterialCommunityIcons',
    iconName: 'car-wash',
    keywords: ['car wash', 'wash car', 'clean car', 'detailing', 'auto wash', 'clean vehicle', 'car soap'],
    imageAsset: TASK_ICON_ASSETS['car-wash'],
  },
  {
    id: 'restaurant',
    label: 'Restaurant / Dining Out',
    category: 'leisure',
    family: 'MaterialCommunityIcons',
    iconName: 'silverware-fork-knife',
    keywords: ['restaurant', 'dining out', 'dinner', 'lunch', 'eat out', 'fine dining', 'cafe', 'food', 'meal'],
    imageAsset: TASK_ICON_ASSETS['restaurant'],
  },
  {
    id: 'fast-food',
    label: 'Fast Food / Burger',
    category: 'leisure',
    family: 'MaterialCommunityIcons',
    iconName: 'hamburger',
    keywords: ['fast food', 'burger', 'cheeseburger', 'quick bite', 'takeout', 'drive thru', 'snack'],
    imageAsset: TASK_ICON_ASSETS['fast-food'],
  },

  // ─── ⚽ Sports & Recreation ──────────────────────────────────────────────────
  {
    id: 'soccer',
    label: 'Soccer / Football',
    category: 'health',
    family: 'Ionicons',
    iconName: 'football-outline',
    keywords: ['soccer', 'football', 'match', 'ball', 'soccer practice', 'sports', 'game', 'pitch', 'kick'],
    imageAsset: TASK_ICON_ASSETS['soccer'],
  },
  {
    id: 'basketball',
    label: 'Basketball',
    category: 'health',
    family: 'Ionicons',
    iconName: 'basketball-outline',
    keywords: ['basketball', 'hoop', 'court', 'dribble', 'sports', 'game', 'slam dunk', 'shooting hoops'],
    imageAsset: TASK_ICON_ASSETS['basketball'],
  },
  {
    id: 'tennis',
    label: 'Tennis / Racket',
    category: 'health',
    family: 'Ionicons',
    iconName: 'tennisball-outline',
    keywords: ['tennis', 'racket', 'padel', 'badminton', 'court', 'match', 'sports', 'tennis ball'],
    imageAsset: TASK_ICON_ASSETS['tennis'],
  },
  {
    id: 'archery',
    label: 'Archery / Sunnah Sport',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'target',
    keywords: ['archery', 'bow and arrow', 'target', 'sunnah sport', 'recurve bow', 'shooting', 'quiver'],
    imageAsset: TASK_ICON_ASSETS['archery'],
  },

  // ─── 🏖️ Travel, Outdoors & Nature ───────────────────────────────────────────
  {
    id: 'beach',
    label: 'Beach / Summer Vacation',
    category: 'travel',
    family: 'Ionicons',
    iconName: 'sunny-outline',
    keywords: ['beach', 'vacation', 'summer', 'holiday', 'sea', 'ocean', 'sand', 'umbrella', 'sunbathe', 'resort'],
    imageAsset: TASK_ICON_ASSETS['beach'],
  },
  {
    id: 'camping',
    label: 'Camping / Outdoors',
    category: 'travel',
    family: 'MaterialCommunityIcons',
    iconName: 'tent',
    keywords: ['camping', 'tent', 'campfire', 'nature', 'outdoors', 'woods', 'wilderness', 'stargazing', 'camp'],
    imageAsset: TASK_ICON_ASSETS['camping'],
  },
  {
    id: 'hotel',
    label: 'Hotel / Stay',
    category: 'travel',
    family: 'MaterialCommunityIcons',
    iconName: 'office-building',
    keywords: ['hotel', 'resort', 'booking', 'check in', 'stay', 'motel', 'airbnb', 'room', 'travel stay'],
    imageAsset: TASK_ICON_ASSETS['hotel'],
  },
  {
    id: 'shifa-honey',
    label: 'Honey / Prophetic Remedy',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'bee',
    keywords: ['honey', 'shifa', 'prophetic medicine', 'tibb nabawi', 'natural remedy', 'sweet', 'healing', 'sunnah food'],
    imageAsset: TASK_ICON_ASSETS['shifa-honey'],
  },

  // ─── 📚 School, Learning & Exams ────────────────────────────────────────────
  {
    id: 'exam',
    label: 'Exam / Test',
    category: 'work_study',
    family: 'MaterialCommunityIcons',
    iconName: 'file-check-outline',
    keywords: ['exam', 'test', 'quiz', 'midterm', 'finals', 'assessment', 'revision', 'study test', 'grade'],
    imageAsset: TASK_ICON_ASSETS['exam'],
  },
  {
    id: 'backpack',
    label: 'Backpack / School Bag',
    category: 'work_study',
    family: 'MaterialCommunityIcons',
    iconName: 'bag-personal-outline',
    keywords: ['backpack', 'school bag', 'bag', 'pack', 'travel bag', 'books', 'school prep', 'supplies'],
    imageAsset: TASK_ICON_ASSETS['backpack'],
  },
  {
    id: 'language',
    label: 'Language Learning / Arabic',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'language-outline',
    keywords: ['language', 'arabic', 'learn language', 'vocab', 'grammar', 'fluency', 'duolingo', 'translation', 'words'],
    imageAsset: TASK_ICON_ASSETS['language'],
  },

  // ─── 🔔 Universal To-Do Utility Symbols & Flags ──────────────────────────────
  {
    id: 'bell',
    label: 'Reminder Bell',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'notifications-outline',
    keywords: ['bell', 'reminder', 'alert', 'notification', 'alarm', 'ring', 'ping', 'notice', 'important reminder'],
    imageAsset: TASK_ICON_ASSETS['bell'],
  },
  {
    id: 'sparkles',
    label: 'Sparkles / Clean / Streak',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'sparkles-outline',
    keywords: ['sparkles', 'magic', 'clean', 'streak', 'habit', 'shine', 'glow', 'excellence', 'ihsan', 'special'],
    imageAsset: TASK_ICON_ASSETS['sparkles'],
  },
  {
    id: 'lightning',
    label: 'Quick Win / Energy',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'flash-outline',
    keywords: ['lightning', 'bolt', 'quick win', 'urgent', 'speed', 'fast', 'energy', 'power', 'action', 'thunder'],
    imageAsset: TASK_ICON_ASSETS['lightning'],
  },
  {
    id: 'battery',
    label: 'Energy / Recharge',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'battery-charging-outline',
    keywords: ['battery', 'energy', 'recharge', 'full charge', 'power level', 'vitality', 'fuel', 'rest'],
    imageAsset: TASK_ICON_ASSETS['battery'],
  },
  {
    id: 'bookmark',
    label: 'Bookmark / Reading Mark',
    category: 'deen',
    family: 'Ionicons',
    iconName: 'bookmark-outline',
    keywords: ['bookmark', 'ribbon', 'reading mark', 'quran bookmark', 'save place', 'page', 'continue reading'],
    imageAsset: TASK_ICON_ASSETS['bookmark'],
  },
  {
    id: 'hourglass',
    label: 'Hourglass / Countdown',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'hourglass-outline',
    keywords: ['hourglass', 'countdown', 'time passing', 'timer', 'sand timer', 'deadline', 'patience', 'focus block'],
    imageAsset: TASK_ICON_ASSETS['hourglass'],
  },
  {
    id: 'flag-checkered',
    label: 'Finish Line / Milestone',
    category: 'productivity',
    family: 'MaterialCommunityIcons',
    iconName: 'flag-checkered',
    keywords: ['flag', 'checkered flag', 'finish line', 'race', 'milestone', 'done', 'achievement', 'goal reached', 'victory'],
    imageAsset: TASK_ICON_ASSETS['flag-checkered'],
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
