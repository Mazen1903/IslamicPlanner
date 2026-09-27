export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  setParams: jest.fn(),
}));

export const useLocalSearchParams = jest.fn(() => ({}));
export const useGlobalSearchParams = jest.fn(() => ({}));
export const useFocusEffect = jest.fn((callback) => {
  if (typeof callback === 'function') {
    callback();
  }
});

export const Link = 'Link';
export const Slot = 'Slot';
export const Stack = {
  Screen: 'Screen',
};
export const Tabs = {
  Screen: 'Screen',
};
