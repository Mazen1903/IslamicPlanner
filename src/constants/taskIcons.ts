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
  {
    id: 'tahajjud',
    label: 'Tahajjud / Night',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'weather-night',
    keywords: ['tahajjud', 'night prayer', 'qiyam', 'layl', 'witr', 'salah', 'midnight'],
  },
  {
    id: 'sujood',
    label: 'Sujood',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'human-handsdown',
    keywords: ['sujood', 'prostration', 'sajdah', 'humble', 'dua', 'prayer', 'salah'],
  },
  {
    id: 'dua-praise',
    label: 'Hamd / Praise',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'human-handsup',
    keywords: ['hamd', 'praise', 'shukr', 'dua', 'supplication', 'gratitude', 'tahmid'],
  },
  {
    id: 'quran-bookmark',
    label: 'Quran Hifz',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'bookmark-check-outline',
    keywords: ['hifz', 'memorize', 'bookmark', 'juz', 'surah', 'quran', 'revision'],
  },
  {
    id: 'compass-qibla',
    label: 'Qibla / Compass',
    category: 'deen',
    family: 'Ionicons',
    iconName: 'compass-outline',
    keywords: ['qibla', 'compass', 'direction', 'travel prayer', 'mecca', 'kaaba'],
  },
  {
    id: 'sadaqah-box',
    label: 'Sadaqah / Giving',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'cash-plus',
    keywords: ['sadaqah', 'donation', 'giving', 'charity', 'money', 'zakat', 'poor'],
  },
  {
    id: 'eid-sparkles',
    label: 'Eid / Blessings',
    category: 'deen',
    family: 'Ionicons',
    iconName: 'sparkles-outline',
    keywords: ['eid', 'blessed', 'jummah', 'mubarak', 'celebrate', 'barakah', 'sunnah'],
  },
  {
    id: 'seerah-study',
    label: 'Seerah / Hadith',
    category: 'deen',
    family: 'MaterialCommunityIcons',
    iconName: 'book-open-outline',
    keywords: ['seerah', 'hadith', 'prophet', 'sunnah', 'study', 'ilm', 'islamic book'],
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
  {
    id: 'meditate',
    label: 'Reflection / Pause',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'meditation',
    keywords: ['meditation', 'tafakkur', 'peace', 'calm', 'reflect', 'mindfulness', 'breath'],
  },
  {
    id: 'nap',
    label: 'Qaylulah / Nap',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'sleep',
    keywords: ['nap', 'qaylulah', 'rest', 'siesta', 'afternoon', 'recharge', 'sunnah'],
  },
  {
    id: 'laundry-fold',
    label: 'Clothing / Outfit',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'tshirt-crew-outline',
    keywords: ['clothes', 'outfit', 'iron', 'thobe', 'wardrobe', 'laundry', 'wear'],
  },
  {
    id: 'todo-routine',
    label: 'Checklist / Daily',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'format-list-checks',
    keywords: ['checklist', 'routine', 'daily list', 'tasks', 'chores', 'habits'],
  },
  {
    id: 'haircut',
    label: 'Grooming / Haircut',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'content-cut',
    keywords: ['haircut', 'barber', 'salon', 'trim', 'beard', 'grooming', 'sunnah'],
  },
  {
    id: 'face-grooming',
    label: 'Self-Care / Hygiene',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'face-man-outline',
    keywords: ['hygiene', 'clean', 'skincare', 'face', 'shave', 'miswak', 'brush'],
  },
  {
    id: 'dog-walk',
    label: 'Outdoor Stroll',
    category: 'routine',
    family: 'Ionicons',
    iconName: 'paw-outline',
    keywords: ['pet', 'dog', 'walk', 'park', 'outdoor', 'stroll'],
  },
  {
    id: 'coffee-time',
    label: 'Warm Drink',
    category: 'routine',
    family: 'MaterialCommunityIcons',
    iconName: 'coffee-outline',
    keywords: ['coffee', 'mug', 'warm drink', 'morning', 'break', 'cafe'],
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
  {
    id: 'videocall',
    label: 'Video Meeting',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'videocam-outline',
    keywords: ['zoom', 'teams', 'meet', 'video call', 'conference', 'remote', 'online'],
  },
  {
    id: 'mic-podcast',
    label: 'Interview / Voice',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'mic-outline',
    keywords: ['podcast', 'interview', 'recording', 'mic', 'audio', 'speaking', 'presentation'],
  },
  {
    id: 'certificate',
    label: 'Certificate / Course',
    category: 'work_study',
    family: 'MaterialCommunityIcons',
    iconName: 'certificate-outline',
    keywords: ['certificate', 'diploma', 'course', 'ijazah', 'qualification', 'pass', 'exam'],
  },
  {
    id: 'portfolio',
    label: 'Portfolio / Projects',
    category: 'work_study',
    family: 'MaterialCommunityIcons',
    iconName: 'briefcase-variant-outline',
    keywords: ['portfolio', 'projects', 'case study', 'work', 'freelance', 'client'],
  },
  {
    id: 'resume',
    label: 'Resume / CV',
    category: 'work_study',
    family: 'MaterialCommunityIcons',
    iconName: 'file-account-outline',
    keywords: ['resume', 'cv', 'job application', 'apply', 'career', 'interview', 'hire'],
  },
  {
    id: 'reading-lamp',
    label: 'Study Desk',
    category: 'work_study',
    family: 'MaterialCommunityIcons',
    iconName: 'desk-lamp',
    keywords: ['desk', 'lamp', 'study', 'night study', 'focus', 'homework', 'library'],
  },
  {
    id: 'analytics',
    label: 'Analytics / Data',
    category: 'work_study',
    family: 'Ionicons',
    iconName: 'analytics-outline',
    keywords: ['analytics', 'data', 'metrics', 'chart', 'kpi', 'reports', 'finance'],
  },
  {
    id: 'notebook-study',
    label: 'Notepad',
    category: 'work_study',
    family: 'MaterialCommunityIcons',
    iconName: 'notebook-outline',
    keywords: ['notebook', 'notes', 'lecture notes', 'memo', 'binder', 'study'],
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
  {
    id: 'swimming',
    label: 'Swimming',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'swim',
    keywords: ['swim', 'swimming', 'pool', 'water sport', 'sunnah sport', 'cardio'],
  },
  {
    id: 'mental-health',
    label: 'Mental Health',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'head-heart-outline',
    keywords: ['mental health', 'therapy', 'mind', 'wellness', 'wellbeing', 'counseling'],
  },
  {
    id: 'eye-exam',
    label: 'Eye Clinic / Glasses',
    category: 'health',
    family: 'Ionicons',
    iconName: 'eye-outline',
    keywords: ['eye', 'optometrist', 'eyeglasses', 'spectacles', 'vision', 'checkup', 'exam'],
  },
  {
    id: 'scale-weight',
    label: 'Weight / Scale',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'scale-bathroom',
    keywords: ['weight', 'scale', 'weigh in', 'body', 'fitness', 'tracking'],
  },
  {
    id: 'lungs-breath',
    label: 'Breathing / Lungs',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'lungs',
    keywords: ['breath', 'lungs', 'pranayama', 'asthma', 'respiratory', 'oxygen'],
  },
  {
    id: 'spa-relax',
    label: 'Massage / Spa',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'spa-outline',
    keywords: ['spa', 'massage', 'recovery', 'sauna', 'relax', 'cupping', 'hijama'],
  },
  {
    id: 'first-aid',
    label: 'First Aid / Medical',
    category: 'health',
    family: 'Ionicons',
    iconName: 'medkit-outline',
    keywords: ['first aid', 'medkit', 'emergency', 'bandage', 'injury', 'clinic'],
  },
  {
    id: 'blood-test',
    label: 'Lab / Blood Test',
    category: 'health',
    family: 'MaterialCommunityIcons',
    iconName: 'needle',
    keywords: ['blood test', 'lab', 'needle', 'vaccine', 'injection', 'hijama', 'draw'],
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
  {
    id: 'dishwasher',
    label: 'Dishes',
    category: 'home',
    family: 'MaterialCommunityIcons',
    iconName: 'dishwasher',
    keywords: ['dishwasher', 'dishes', 'wash dishes', 'kitchen', 'plates', 'sink'],
  },
  {
    id: 'vacuum',
    label: 'Vacuum',
    category: 'home',
    family: 'MaterialCommunityIcons',
    iconName: 'robot-vacuum',
    keywords: ['vacuum', 'rug', 'carpet', 'dust', 'clean', 'roomba', 'chores'],
  },
  {
    id: 'receipt-bill',
    label: 'Bills & Utilities',
    category: 'home',
    family: 'Ionicons',
    iconName: 'receipt-outline',
    keywords: ['bill', 'receipt', 'utilities', 'electric', 'water bill', 'rent', 'expenses'],
  },
  {
    id: 'mailbox-home',
    label: 'Mailbox',
    category: 'home',
    family: 'MaterialCommunityIcons',
    iconName: 'mailbox-outline',
    keywords: ['mail', 'letters', 'mailbox', 'post', 'envelopes'],
  },
  {
    id: 'ac-heating',
    label: 'AC / Climate',
    category: 'home',
    family: 'MaterialCommunityIcons',
    iconName: 'air-conditioner',
    keywords: ['ac', 'air conditioner', 'heating', 'thermostat', 'temperature', 'climate'],
  },
  {
    id: 'painting-decor',
    label: 'Painting / Decor',
    category: 'home',
    family: 'Ionicons',
    iconName: 'brush-outline',
    keywords: ['painting', 'decor', 'brush', 'renovation', 'interior', 'walls'],
  },
  {
    id: 'furniture-sofa',
    label: 'Furniture / Living',
    category: 'home',
    family: 'MaterialCommunityIcons',
    iconName: 'sofa-outline',
    keywords: ['couch', 'sofa', 'furniture', 'living room', 'ikea', 'lounge'],
  },
  {
    id: 'garage-home',
    label: 'Garage / Storage',
    category: 'home',
    family: 'MaterialCommunityIcons',
    iconName: 'garage',
    keywords: ['garage', 'storage', 'shed', 'parking', 'basement', 'organize'],
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
  {
    id: 'ring-nikah',
    label: 'Nikah / Wedding',
    category: 'family',
    family: 'MaterialCommunityIcons',
    iconName: 'ring',
    keywords: ['nikah', 'marriage', 'wedding', 'spouse', 'husband', 'wife', 'katb kitab'],
  },
  {
    id: 'date-night',
    label: 'Spouse Time',
    category: 'family',
    family: 'MaterialCommunityIcons',
    iconName: 'heart-multiple-outline',
    keywords: ['date night', 'spouse', 'couple', 'love', 'dinner date', 'marriage'],
  },
  {
    id: 'siblings-family',
    label: 'Siblings',
    category: 'family',
    family: 'Ionicons',
    iconName: 'people-circle-outline',
    keywords: ['brother', 'sister', 'siblings', 'family', 'relatives', 'cousins'],
  },
  {
    id: 'grandparents',
    label: 'Elders / Grandparents',
    category: 'family',
    family: 'MaterialCommunityIcons',
    iconName: 'account-group-outline',
    keywords: ['grandparents', 'elders', 'parents', 'grandfather', 'grandmother', 'silat'],
  },
  {
    id: 'family-dine',
    label: 'Family Dinner',
    category: 'family',
    family: 'MaterialCommunityIcons',
    iconName: 'table-chair',
    keywords: ['family dinner', 'table', 'gathering', 'meal together', 'walimah', 'guests'],
  },
  {
    id: 'visit-relatives',
    label: 'Silat Ar-Rahim',
    category: 'family',
    family: 'Ionicons',
    iconName: 'heart-circle-outline',
    keywords: ['silat ar-rahim', 'kinship', 'visit relatives', 'family ties', 'aunt', 'uncle'],
  },
  {
    id: 'baby-bottle',
    label: 'Infant Feeding',
    category: 'family',
    family: 'MaterialCommunityIcons',
    iconName: 'baby-bottle-outline',
    keywords: ['baby bottle', 'nursing', 'feeding', 'infant', 'milk', 'newborn'],
  },
  {
    id: 'baby-care',
    label: 'Toddler Care',
    category: 'family',
    family: 'MaterialCommunityIcons',
    iconName: 'baby-face-outline',
    keywords: ['toddler', 'daycare', 'childcare', 'kids', 'bedtime story', 'play'],
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
  {
    id: 'cinema-movie',
    label: 'Movie / Documentary',
    category: 'leisure',
    family: 'Ionicons',
    iconName: 'film-outline',
    keywords: ['movie', 'documentary', 'cinema', 'watch', 'video', 'series'],
  },
  {
    id: 'board-game',
    label: 'Board Game / Chess',
    category: 'leisure',
    family: 'MaterialCommunityIcons',
    iconName: 'chess-knight',
    keywords: ['chess', 'board game', 'puzzle', 'strategy', 'games night', 'cards'],
  },
  {
    id: 'hiking',
    label: 'Hiking / Nature',
    category: 'leisure',
    family: 'MaterialCommunityIcons',
    iconName: 'hiking',
    keywords: ['hiking', 'mountains', 'nature', 'trail', 'outdoor', 'adventure', 'scenic'],
  },
  {
    id: 'music-hobby',
    label: 'Audio / Nasheed',
    category: 'leisure',
    family: 'Ionicons',
    iconName: 'musical-notes-outline',
    keywords: ['audio', 'nasheed', 'sound', 'melody', 'listen', 'relax'],
  },
  {
    id: 'flower-garden',
    label: 'Flowers / Flora',
    category: 'leisure',
    family: 'MaterialCommunityIcons',
    iconName: 'flower-outline',
    keywords: ['flower', 'garden', 'nature', 'botany', 'bloom', 'roses'],
  },
  {
    id: 'reading-novel',
    label: 'Reading Fiction',
    category: 'leisure',
    family: 'MaterialCommunityIcons',
    iconName: 'book-open-page-variant-outline',
    keywords: ['reading', 'novel', 'fiction', 'literature', 'story', 'kindle'],
  },
  {
    id: 'football',
    label: 'Football / Soccer',
    category: 'leisure',
    family: 'Ionicons',
    iconName: 'football-outline',
    keywords: ['football', 'soccer', 'sports', 'match', 'play', 'game'],
  },
  {
    id: 'gamepad-retro',
    label: 'Video Games',
    category: 'leisure',
    family: 'MaterialCommunityIcons',
    iconName: 'controller-classic-outline',
    keywords: ['games', 'playstation', 'xbox', 'nintendo', 'gaming', 'retro'],
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
  {
    id: 'habit-track',
    label: 'Habit Tracker',
    category: 'productivity',
    family: 'MaterialCommunityIcons',
    iconName: 'chart-line',
    keywords: ['habit', 'streak', 'progress', 'tracking', 'consistency', 'discipline'],
  },
  {
    id: 'pomodoro',
    label: 'Pomodoro Timer',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'timer-outline',
    keywords: ['pomodoro', 'timer', 'focus sprint', 'intervals', 'deep work', 'session'],
  },
  {
    id: 'brainstorm',
    label: 'Brain Dump / Mind',
    category: 'productivity',
    family: 'MaterialCommunityIcons',
    iconName: 'brain',
    keywords: ['brain', 'mind dump', 'thinking', 'cognition', 'strategy', 'iq'],
  },
  {
    id: 'weekly-review',
    label: 'Weekly Review',
    category: 'productivity',
    family: 'MaterialCommunityIcons',
    iconName: 'calendar-check-outline',
    keywords: ['weekly review', 'audit', 'plan ahead', 'sunday planning', 'retrospective'],
  },
  {
    id: 'vision-board',
    label: 'Vision Board',
    category: 'productivity',
    family: 'MaterialCommunityIcons',
    iconName: 'view-dashboard-outline',
    keywords: ['vision board', 'goals', 'dashboard', 'overview', 'aspirations', 'future'],
  },
  {
    id: 'journaling-prod',
    label: 'Daily Log / Notes',
    category: 'productivity',
    family: 'MaterialCommunityIcons',
    iconName: 'notebook-edit-outline',
    keywords: ['log', 'daily note', 'bullet journal', 'standup', 'summary'],
  },
  {
    id: 'roadmap',
    label: 'Roadmap / Plan',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'map-outline',
    keywords: ['roadmap', 'milestones', 'direction', 'quarterly', 'strategy', 'navigation'],
  },
  {
    id: 'focus-shield',
    label: 'Deep Focus',
    category: 'productivity',
    family: 'Ionicons',
    iconName: 'shield-checkmark-outline',
    keywords: ['focus', 'do not disturb', 'shield', 'uninterrupted', 'deep work', 'block'],
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
