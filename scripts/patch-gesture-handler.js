#!/usr/bin/env node
/**
 * Postinstall patch: replaces expo-router's GestureHandler.android.js with a
 * no-op dummy. The real file (GestureHandlerNative.js) creates a
 * react-native-gesture-handler PanGestureHandler that passes hitSlop as an
 * array to the native Android module, which expects a map — causing a crash.
 * Since gestureEnabled is false for the settings stack, no functionality is lost.
 */
const fs = require('fs');
const path = require('path');

const target = path.resolve(
  __dirname,
  '../node_modules/expo-router/build/react-navigation/stack/views/GestureHandler.android.js'
);

const patch = `// Patched by islamic-planner postinstall — see scripts/patch-gesture-handler.js
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GestureState = exports.GestureHandlerRootView = exports.PanGestureHandler = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const Dummy = ({ children }) => (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: children });
exports.PanGestureHandler = Dummy;
exports.GestureHandlerRootView = react_native_1.View;
exports.GestureState = {
    UNDETERMINED: 0,
    FAILED: 1,
    BEGAN: 2,
    CANCELLED: 3,
    ACTIVE: 4,
    END: 5,
};
//# sourceMappingURL=GestureHandler.js.map
`;

try {
  fs.writeFileSync(target, patch, 'utf8');
  console.log('✅ patch-gesture-handler: GestureHandler.android.js patched successfully.');
} catch (err) {
  console.error('⚠️  patch-gesture-handler: Could not patch GestureHandler.android.js:', err.message);
}
