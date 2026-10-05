/**
 * Jest manual mock for react-native-android-widget.
 *
 * Imports the real widget JSX primitives (FlexWidget, TextWidget, etc.)
 * directly from commonjs modules so that buildWidgetTree() can build
 * and validate the widget tree in tests without loading native android modules.
 */

const { FlexWidget } = require('react-native-android-widget/lib/commonjs/widgets/FlexWidget');
const { TextWidget } = require('react-native-android-widget/lib/commonjs/widgets/TextWidget');
const { IconWidget } = require('react-native-android-widget/lib/commonjs/widgets/IconWidget');
const { ImageWidget } = require('react-native-android-widget/lib/commonjs/widgets/ImageWidget');
const { SvgWidget } = require('react-native-android-widget/lib/commonjs/widgets/SvgWidget');
const { ListWidget } = require('react-native-android-widget/lib/commonjs/widgets/ListWidget');
const { OverlapWidget } = require('react-native-android-widget/lib/commonjs/widgets/OverlapWidget');

module.exports = {
  FlexWidget,
  TextWidget,
  IconWidget,
  ImageWidget,
  SvgWidget,
  ListWidget,
  OverlapWidget,

  registerWidgetTaskHandler: jest.fn().mockReturnValue(undefined),
  requestWidgetUpdate: jest.fn().mockResolvedValue(undefined),
  requestWidgetUpdateById: jest.fn().mockResolvedValue(undefined),

  WidgetPreview: jest.fn().mockReturnValue(null),

  WIDGET_SIZE_SMALL: 'small',
  WIDGET_SIZE_MEDIUM: 'medium',
  WIDGET_SIZE_LARGE: 'large',
};
