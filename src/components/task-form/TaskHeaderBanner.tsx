import React, { useContext } from 'react';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { AppHeroHeader } from '@/components/common/AppHeroHeader';

interface TaskHeaderBannerProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  backTestID?: string;
}

/**
 * Universal Task Form Header delegating to the unified AppHeroHeader card.
 */
export function TaskHeaderBanner({
  title,
  subtitle,
  onBack,
  backTestID = 'task-form-back-button',
}: TaskHeaderBannerProps) {
  const insetsContext = useContext(SafeAreaInsetsContext);
  const topInset = insetsContext?.top ?? 0;
  const topPadding = topInset > 0 ? topInset + 4 : 8;

  return (
    <View style={{ paddingTop: topPadding }}>
      <AppHeroHeader
        title={title}
        subtitle={subtitle}
        showBack={true}
        onBack={onBack}
        backTestID={backTestID}
        testID="task-form-header-banner"
      />
    </View>
  );
}
