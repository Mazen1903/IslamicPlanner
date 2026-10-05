import {
  ALL_TASK_ICONS,
  TASK_ICON_MAP,
  TASK_ICON_CATEGORIES,
  searchTaskIcons,
  detectTaskIcon,
  getIconIdFromTags,
  setIconInTags,
} from '../taskIcons';
import { TASK_ICON_ASSETS } from '../taskIconAssets';

describe('taskIcons full catalog & expansion', () => {
  it('contains exactly 125 icons in total catalog', () => {
    expect(ALL_TASK_ICONS.length).toBe(125);
  });

  it('every icon has unique id, valid label, category, family, and keywords', () => {
    const ids = new Set<string>();
    const validCategories = new Set(TASK_ICON_CATEGORIES.map(c => c.key));

    for (const icon of ALL_TASK_ICONS) {
      expect(ids.has(icon.id)).toBe(false);
      ids.add(icon.id);

      expect(icon.label.trim().length).toBeGreaterThan(0);
      expect(validCategories.has(icon.category)).toBe(true);
      expect(['Ionicons', 'MaterialCommunityIcons']).toContain(icon.family);
      expect(icon.iconName.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(icon.keywords)).toBe(true);
      expect(icon.keywords.length).toBeGreaterThan(0);
    }
  });

  it('every icon in ALL_TASK_ICONS has a registered 3D imageAsset in TASK_ICON_ASSETS', () => {
    for (const icon of ALL_TASK_ICONS) {
      expect(TASK_ICON_ASSETS[icon.id]).toBeDefined();
      expect(icon.imageAsset).toBeDefined();
      expect(TASK_ICON_MAP[icon.id]).toBeDefined();
    }
  });

  it('includes new categories in TASK_ICON_CATEGORIES', () => {
    const categoryKeys = TASK_ICON_CATEGORIES.map(c => c.key);
    expect(categoryKeys).toContain('finance');
    expect(categoryKeys).toContain('travel');
  });

  describe('category filtering with new categories', () => {
    it('filters finance icons correctly', () => {
      const financeIcons = searchTaskIcons('', 'finance');
      expect(financeIcons.length).toBe(5);
      const ids = financeIcons.map(i => i.id);
      expect(ids).toContain('wallet');
      expect(ids).toContain('money');
      expect(ids).toContain('credit-card');
      expect(ids).toContain('piggy-bank');
      expect(ids).toContain('invoice');
    });

    it('filters travel icons correctly', () => {
      const travelIcons = searchTaskIcons('', 'travel');
      expect(travelIcons.length).toBe(5);
      const ids = travelIcons.map(i => i.id);
      expect(ids).toContain('luggage');
      expect(ids).toContain('bus');
      expect(ids).toContain('train');
      expect(ids).toContain('passport');
      expect(ids).toContain('gas-station');
    });

    it('filters deen expansion icons correctly', () => {
      const deenIcons = searchTaskIcons('', 'deen');
      expect(deenIcons.length).toBe(23); // 15 original + 8 new
      const ids = deenIcons.map(i => i.id);
      expect(ids).toContain('prayer-mat');
      expect(ids).toContain('tahajjud');
      expect(ids).toContain('hajj');
      expect(ids).toContain('quran-memorization');
      expect(ids).toContain('zakat');
      expect(ids).toContain('dates-fruit');
      expect(ids).toContain('janazah');
      expect(ids).toContain('miswak');
    });
  });

  describe('searchTaskIcons with expanded keywords', () => {
    it('finds prayer-mat with sajadah query', () => {
      const results = searchTaskIcons('sajadah');
      expect(results.some(i => i.id === 'prayer-mat')).toBe(true);
    });

    it('finds tahajjud with lantern query', () => {
      const results = searchTaskIcons('fanous');
      expect(results.some(i => i.id === 'tahajjud')).toBe(true);
    });

    it('finds timer with pomodoro query', () => {
      const results = searchTaskIcons('pomodoro');
      expect(results.some(i => i.id === 'timer')).toBe(true);
    });

    it('finds rocket with startup launch query', () => {
      const results = searchTaskIcons('launch');
      expect(results.some(i => i.id === 'rocket')).toBe(true);
    });

    it('finds bed-nap with qaylulah query', () => {
      const results = searchTaskIcons('qaylulah');
      expect(results.some(i => i.id === 'bed-nap')).toBe(true);
    });
  });

  describe('detectTaskIcon auto-detection with new icons', () => {
    it('auto-detects new Islamic tasks', () => {
      expect(detectTaskIcon('Wash prayer mat')).toBe('prayer-mat');
      expect(detectTaskIcon('Wake up for Tahajjud')).toBe('tahajjud');
      expect(detectTaskIcon('Hifz memorization of Surah Al-Mulk')).toBe('quran-memorization');
      expect(detectTaskIcon('Calculate annual Zakat')).toBe('zakat');
      expect(detectTaskIcon('Buy fresh dates fruit')).toBe('dates-fruit');
      expect(detectTaskIcon('Use miswak after meal')).toBe('miswak');
    });

    it('auto-detects finance tasks', () => {
      expect(detectTaskIcon('Pay electricity bill')).toBe('invoice');
      expect(detectTaskIcon('Transfer savings to investment')).toBe('piggy-bank');
      expect(detectTaskIcon('Lost my wallet')).toBe('wallet');
      expect(detectTaskIcon('Activate new credit card')).toBe('credit-card');
    });

    it('auto-detects travel & transport tasks', () => {
      expect(detectTaskIcon('Pack luggage for trip')).toBe('luggage');
      expect(detectTaskIcon('Take the transit bus')).toBe('bus');
      expect(detectTaskIcon('Book train ticket to city')).toBe('train');
      expect(detectTaskIcon('Renew passport and visa')).toBe('passport');
      expect(detectTaskIcon('Fill up gas station')).toBe('gas-station');
    });

    it('auto-detects daily routine & productivity tasks', () => {
      expect(detectTaskIcon('Take an afternoon power nap')).toBe('bed-nap');
      expect(detectTaskIcon('25 min pomodoro sprint')).toBe('timer');
      expect(detectTaskIcon('App product launch')).toBe('rocket');
      expect(detectTaskIcon('Wash dishes in the sink')).toBe('dishes');
      expect(detectTaskIcon('Team Zoom video call meeting')).toBe('meeting');
    });
  });
});
