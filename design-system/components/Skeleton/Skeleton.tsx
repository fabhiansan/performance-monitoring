import React from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The width of the skeleton. Can be a number (px), string with units, or responsive classes
   */
  width?: number | string;
  
  /**
   * The height of the skeleton. Can be a number (px), string with units, or responsive classes
   */
  height?: number | string;
  
  /**
   * Whether to use a circular shape (for avatars, buttons, etc.)
   */
  circular?: boolean;
  
  /**
   * Predefined variant shapes for common use cases
   */
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  
  /**
   * Animation type
   */
  animation?: 'pulse' | 'wave' | 'none';
  
  /**
   * Number of lines for text skeleton
   */
  lines?: number;
}

const getVariantClasses = (variant: SkeletonProps['variant']) => {
  switch (variant) {
    case 'text':
      return 'h-4 rounded';
    case 'circular':
      return 'rounded-full aspect-square';
    case 'rectangular':
      return 'rounded-none';
    case 'rounded':
    default:
      return 'rounded-md';
  }
};

const getAnimationClasses = (animation: SkeletonProps['animation']) => {
  switch (animation) {
    case 'wave':
      return 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700';
    case 'none':
      return 'bg-gray-200 dark:bg-gray-700';
    case 'pulse':
    default:
      return 'animate-pulse bg-gray-200 dark:bg-gray-700';
  }
};

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      width,
      height,
      circular = false,
      variant = 'rounded',
      animation = 'pulse',
      lines = 1,
      className,
      style = {},
      ...props
    },
    ref
  ) => {
    // Handle circular prop override
    const finalVariant = circular ? 'circular' : variant;
    
    // Build inline styles
    const inlineStyle: React.CSSProperties = { ...style };
    if (width !== undefined) {
      inlineStyle.width = typeof width === 'number' ? `${width}px` : width;
    }
    if (height !== undefined) {
      inlineStyle.height = typeof height === 'number' ? `${height}px` : height;
    }

    // For multiple lines, render multiple skeleton elements
    if (lines > 1) {
      return (
        <div className={cn('space-y-2', className)} ref={ref} {...props}>
          {Array.from({ length: lines }, (_, index) => (
            <div
              key={index}
              className={cn(
                getVariantClasses('text'),
                getAnimationClasses(animation),
                // Make last line shorter for more realistic text simulation
                index === lines - 1 && 'w-3/4'
              )}
              style={inlineStyle}
            />
          ))}
        </div>
      );
    }

    // Single skeleton element
    return (
      <div
        ref={ref}
        className={cn(
          getVariantClasses(finalVariant),
          getAnimationClasses(animation),
          className
        )}
        style={inlineStyle}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Preset skeleton components for common use cases
export const SkeletonText = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'>>(
  (props, ref) => (
    <Skeleton ref={ref} variant="text" {...props} />
  )
);
SkeletonText.displayName = 'SkeletonText';

export const SkeletonAvatar = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant' | 'circular'>>(
  ({ width = 40, height = 40, ...props }, ref) => (
    <Skeleton ref={ref} variant="circular" width={width} height={height} {...props} />
  )
);
SkeletonAvatar.displayName = 'SkeletonAvatar';

export const SkeletonCard = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'>>(
  ({ height = 200, ...props }, ref) => (
    <Skeleton ref={ref} variant="rounded" height={height} {...props} />
  )
);
SkeletonCard.displayName = 'SkeletonCard';