import React, { useState, useEffect } from 'react';
import { SvgFlameBadge, type SvgFlameBadgeProps } from './SvgFlameBadge';

/**
 * SkiaFlameBadge renders the Skia-accelerated flame when the native Skia
 * library is available in the current runtime binary.
 *
 * If Skia native bindings are not present (e.g. before a native rebuild or in Jest),
 * it seamlessly and gracefully falls back to SvgFlameBadge with zero crashes.
 */
export function SkiaFlameBadge(props: SvgFlameBadgeProps) {
  const [Component, setComponent] = useState<React.ComponentType<SvgFlameBadgeProps> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    try {
      // Dynamic require ensures no top-level module load exception if native Skia is unlinked
      const renderer = require('./SkiaFlameRenderer');
      if (renderer && renderer.SkiaFlameRenderer && mounted) {
        setComponent(() => renderer.SkiaFlameRenderer);
      } else if (mounted) {
        setLoadFailed(true);
      }
    } catch {
      if (mounted) {
        setLoadFailed(true);
      }
    }
    return () => {
      mounted = false;
    };
  }, []);

  if (loadFailed || !Component) {
    return <SvgFlameBadge {...props} testID={props.testID ?? 'streak-flame-badge-skia-fallback'} />;
  }

  return <Component {...props} testID={props.testID ?? 'streak-flame-badge-skia'} />;
}
