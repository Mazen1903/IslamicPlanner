import React from 'react';
import { AppHeroHeader } from '@/components/common/AppHeroHeader';

export interface SettingsPastelHeaderProps {
  title: string;
  subtitle: string;
  showBack?: boolean;
  showMosqueArt?: boolean;
  onBack?: () => void;
  testID?: string;
  backTestID?: string;
}

/**
 * Universal Settings Header delegating to the unified AppHeroHeader card.
 */
export function SettingsPastelHeader({
  title,
  subtitle,
  showBack = false,
  showMosqueArt = true,
  onBack,
  testID,
  backTestID,
}: SettingsPastelHeaderProps) {
  return (
    <AppHeroHeader
      title={title}
      subtitle={subtitle}
      showBack={showBack}
      showMosqueArt={showMosqueArt}
      onBack={onBack}
      testID={testID}
      backTestID={backTestID ?? 'settings-header-back-button'}
    />
  );
}
