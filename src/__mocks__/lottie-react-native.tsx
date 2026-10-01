import React from 'react';
import { View } from 'react-native';

// Minimal mock for lottie-react-native in Jest/test environments.
// Renders a plain View so components that wrap LottieView don't crash.
const LottieView = React.forwardRef((_props: any, _ref: any) => {
  return React.createElement(View, { testID: 'lottie-view' });
});

LottieView.displayName = 'LottieView';

export default LottieView;
