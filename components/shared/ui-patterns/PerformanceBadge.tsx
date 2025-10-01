/**
 * PerformanceBadge Component
 * 
 * Reusable badge component for displaying performance levels with consistent styling.
 */

import React from 'react';
import { Badge } from '../../../design-system';
import { getLegacyPerformanceLevel, getPerformanceLevel } from '../../../constants/ui';

interface PerformanceBadgeProps {
  /** Performance score */
  score: number;
  /** Whether to use legacy performance levels */
  useLegacyLevels?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show score value */
  showScore?: boolean;
  /** Custom className */
  className?: string;
}

const PerformanceBadge: React.FC<PerformanceBadgeProps> = ({
  score,
  useLegacyLevels = false,
  size = 'md',
  showScore = false,
  className = ''
}) => {
  const level = useLegacyLevels ? getLegacyPerformanceLevel(score) : getPerformanceLevel(score);
  
  // Map performance colors to badge variants
  const getVariant = (color: string) => {
    if (color.includes('green')) return 'success';
    if (color.includes('blue')) return 'primary';
    if (color.includes('orange') || color.includes('yellow')) return 'warning';
    if (color.includes('red')) return 'danger';
    return 'secondary';
  };

  const variant = getVariant(level.color);
  const levelWithLabel = level as { label: string; labelId?: string };
  const labelText = levelWithLabel.labelId ?? levelWithLabel.label;
  const displayText = showScore ? `${labelText} (${score})` : labelText;

  return (
    <Badge
      variant={variant}
      size={size}
      className={className}
    >
      {displayText}
    </Badge>
  );
};

export default PerformanceBadge;
