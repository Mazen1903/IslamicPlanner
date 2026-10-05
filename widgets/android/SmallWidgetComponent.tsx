/**
 * Android Small Widget Component - Islamic Planner (M18)
 *
 * Displays:
 *   - App header "Islamic Planner"
 *   - Current prayer name + start time
 *   - Next prayer: "Next: <name>" + start time
 *   - SETUP_REQUIRED: calm setup prompt
 *
 * Architecture constraints:
 *   - ONLY uses react-native-android-widget primitives (FlexWidget, TextWidget)
 *   - NO React Native View / Text / StyleSheet (unsupported by RemoteViews generator)
 *   - Click action opens islamic-planner://planner via native RemoteViews intent
 *   - Renders with dynamic WidgetPalette (Comic Sans MS typography)
 */

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetSnapshot, WidgetPalette } from '../../src/services/widget/types';
import { DEFAULT_LIGHT_PALETTE } from '../../src/services/widget/types';

const FONT_REGULAR = 'ComicSansMS';
const FONT_BOLD = 'ComicSansMS-Bold';
const DEEP_LINK_PLANNER = 'islamic-planner://planner';

export interface SmallWidgetProps {
  snapshot: WidgetSnapshot;
  palette?: WidgetPalette;
}

export function SmallWidgetComponent(props: SmallWidgetProps | WidgetSnapshot) {
  const snapshot: WidgetSnapshot =
    'snapshot' in props && props.snapshot ? props.snapshot : (props as WidgetSnapshot);
  const palette: WidgetPalette =
    ('palette' in props && props.palette)
      ? props.palette
      : (snapshot.theme?.light ?? DEFAULT_LIGHT_PALETTE);

  if (snapshot.isSetupRequired) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: palette.background,
          padding: 12,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 16,
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: DEEP_LINK_PLANNER }}
      >
        <TextWidget
          text="Islamic Planner"
          style={{
            color: palette.brandGreen,
            fontSize: 13,
            fontFamily: FONT_BOLD,
            fontWeight: 'bold',
            marginBottom: 6,
          }}
        />
        <TextWidget
          text="Open app to finish setup."
          style={{
            color: palette.textMuted,
            fontSize: 12,
            fontFamily: FONT_REGULAR,
            textAlign: 'center',
          }}
        />
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: palette.background,
        padding: 12,
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: 16,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: DEEP_LINK_PLANNER }}
    >
      {/* Header & Current Prayer */}
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget
          text="Islamic Planner"
          style={{
            color: palette.brandGreen,
            fontSize: 11,
            fontFamily: FONT_BOLD,
            fontWeight: 'bold',
            marginBottom: 6,
          }}
        />

        <TextWidget
          text={snapshot.currentPrayer.name}
          style={{
            color: palette.text,
            fontSize: 16,
            fontFamily: FONT_BOLD,
            fontWeight: 'bold',
          }}
        />
        <TextWidget
          text={snapshot.currentPrayer.startsAtLocal}
          style={{
            color: palette.text,
            fontSize: 14,
            fontFamily: FONT_BOLD,
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>

      {/* Next Prayer or Last Prayer indicator */}
      {snapshot.nextPrayer ? (
        <FlexWidget
          style={{
            borderTopWidth: 1,
            borderTopColor: palette.separator,
            paddingTop: 6,
            flexDirection: 'column',
          }}
        >
          <TextWidget
            text={`Next: ${snapshot.nextPrayer.name}`}
            style={{
              color: palette.textMuted,
              fontSize: 11,
              fontFamily: FONT_REGULAR,
            }}
          />
          <TextWidget
            text={snapshot.nextPrayer.startsAtLocal}
            style={{
              color: palette.brandGreen,
              fontSize: 12,
              fontFamily: FONT_BOLD,
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            borderTopWidth: 1,
            borderTopColor: palette.separator,
            paddingTop: 6,
          }}
        >
          <TextWidget
            text="Last prayer of day"
            style={{
              color: palette.textMuted,
              fontSize: 11,
              fontFamily: FONT_REGULAR,
            }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
