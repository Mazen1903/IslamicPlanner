/**
 * Android Medium Widget Component - Islamic Planner (M18)
 *
 * Displays:
 *   - App header "Islamic Planner"
 *   - Current prayer + start time
 *   - Next prayer: "Next: <name>" + start time
 *   - Up to 3 pending tasks (title + schedule label)
 *   - SETUP_REQUIRED: calm setup prompt
 *
 * Architecture constraints:
 *   - ONLY uses react-native-android-widget primitives (FlexWidget, TextWidget)
 *   - NO React Native View / Text / StyleSheet (unsupported by RemoteViews generator)
 *   - Root click action opens islamic-planner://planner
 *   - Task row click actions open islamic-planner://task/<occurrenceId>
 *   - Renders with dynamic WidgetPalette (Comic Sans MS typography)
 */

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type {
  WidgetSnapshot,
  WidgetPalette,
  WidgetTaskEntry,
} from '../../src/services/widget/types';
import { DEFAULT_LIGHT_PALETTE } from '../../src/services/widget/types';

const FONT_REGULAR = 'ComicSansMS';
const FONT_BOLD = 'ComicSansMS-Bold';
const DEEP_LINK_PLANNER = 'islamic-planner://planner';

export interface MediumWidgetProps {
  snapshot: WidgetSnapshot;
  palette?: WidgetPalette;
}

function TaskRow({ task, palette }: { task: WidgetTaskEntry; palette: WidgetPalette }) {
  const dotColor =
    task.priority === 'IMPORTANT' ? palette.importantAccent : palette.brandGreen;

  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 3,
        width: 'match_parent',
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: `islamic-planner://task/${task.occurrenceId}` }}
    >
      {/* Priority dot */}
      <FlexWidget
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: dotColor,
          marginRight: 6,
        }}
      />
      {/* Task text info */}
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget
          text={task.title}
          maxLines={1}
          truncate="END"
          style={{
            color: palette.text,
            fontSize: 11,
            fontFamily: FONT_REGULAR,
          }}
        />
        <TextWidget
          text={task.scheduleLabel}
          maxLines={1}
          truncate="END"
          style={{
            color: palette.textMuted,
            fontSize: 9,
            fontFamily: FONT_REGULAR,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function MediumWidgetComponent(props: MediumWidgetProps | WidgetSnapshot) {
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
            fontSize: 14,
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

  const tasksToShow = snapshot.tasks.slice(0, 3);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: palette.background,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: DEEP_LINK_PLANNER }}
    >
      {/* Left column: Prayer info */}
      <FlexWidget
        style={{
          flex: 1,
          height: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text="Islamic Planner"
            style={{
              color: palette.brandGreen,
              fontSize: 11,
              fontFamily: FONT_BOLD,
              fontWeight: 'bold',
              marginBottom: 4,
            }}
          />

          <TextWidget
            text={snapshot.currentPrayer.name}
            style={{
              color: palette.text,
              fontSize: 15,
              fontFamily: FONT_BOLD,
              fontWeight: 'bold',
            }}
          />
          <TextWidget
            text={snapshot.currentPrayer.startsAtLocal}
            style={{
              color: palette.text,
              fontSize: 13,
              fontFamily: FONT_BOLD,
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>

        {snapshot.nextPrayer ? (
          <FlexWidget
            style={{
              borderTopWidth: 1,
              borderTopColor: palette.separator,
              paddingTop: 4,
              flexDirection: 'column',
            }}
          >
            <TextWidget
              text={`Next: ${snapshot.nextPrayer.name}`}
              style={{
                color: palette.textMuted,
                fontSize: 10,
                fontFamily: FONT_REGULAR,
              }}
            />
            <TextWidget
              text={snapshot.nextPrayer.startsAtLocal}
              style={{
                color: palette.brandGreen,
                fontSize: 11,
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
              paddingTop: 4,
            }}
          >
            <TextWidget
              text="Last prayer of day"
              style={{
                color: palette.textMuted,
                fontSize: 10,
                fontFamily: FONT_REGULAR,
              }}
            />
          </FlexWidget>
        )}
      </FlexWidget>

      {/* Vertical separator */}
      <FlexWidget
        style={{
          width: 1,
          height: 'match_parent',
          backgroundColor: palette.separator,
          marginHorizontal: 8,
        }}
      />

      {/* Right column: Tasks */}
      <FlexWidget
        style={{
          flex: 1,
          height: 'match_parent',
          flexDirection: 'column',
        }}
      >
        <TextWidget
          text={`Tasks (${snapshot.tasks.length})`}
          style={{
            color: palette.textMuted,
            fontSize: 11,
            fontFamily: FONT_BOLD,
            fontWeight: 'bold',
            marginBottom: 4,
          }}
        />

        {tasksToShow.length === 0 ? (
          <TextWidget
            text="No pending tasks"
            style={{
              color: palette.textMuted,
              fontSize: 11,
              fontFamily: FONT_REGULAR,
            }}
          />
        ) : (
          tasksToShow.map(task => (
            <TaskRow key={task.occurrenceId} task={task} palette={palette} />
          ))
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
