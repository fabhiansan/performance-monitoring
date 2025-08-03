import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook to observe viewport dimensions
 */
export const useViewportObserver = () => {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewport;
};

interface ResizeObserverEntry {
  contentRect: {
    width: number;
    height: number;
  };
}

interface UseResizeObserverResult {
  width: number;
  height: number;
  ref: React.RefObject<HTMLDivElement>;
  aspectRatio: number;
  isSmallScreen: boolean;
  isMediumScreen: boolean;
  isLargeScreen: boolean;
}

interface DynamicHeightOptions {
  baseHeight: number;
  minHeight: number;
  maxHeight: number;
  contentCount: number;
  itemHeight?: number;
}

/**
 * Custom hook that observes the size of a DOM element using ResizeObserver
 * Returns the current width, height, and responsive breakpoint information
 */
export const useResizeObserver = (): UseResizeObserverResult => {
  const ref = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Create ResizeObserver instance
    const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      if (entries.length > 0) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });

    // Start observing the element
    resizeObserver.observe(element);

    // Set initial dimensions
    const rect = element.getBoundingClientRect();
    setDimensions({ width: rect.width, height: rect.height });

    // Cleanup function
    return () => {
      resizeObserver.unobserve(element);
      resizeObserver.disconnect();
    };
  }, []);

  const aspectRatio = dimensions.width > 0 ? dimensions.width / dimensions.height : 0;
  const isSmallScreen = dimensions.width < 640;
  const isMediumScreen = dimensions.width >= 640 && dimensions.width < 1024;
  const isLargeScreen = dimensions.width >= 1024;

  return { 
    width: dimensions.width, 
    height: dimensions.height, 
    ref,
    aspectRatio,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen
  };
};

/**
 * Calculate dynamic height based on content and screen size
 * @param options - Configuration for dynamic height calculation
 * @param containerWidth - The width of the container
 * @param containerHeight - The height of the container
 * @returns Calculated height in pixels
 */
export const calculateDynamicHeight = (
  options: DynamicHeightOptions,
  containerWidth: number,
  containerHeight: number = 0
): number => {
  const { baseHeight, minHeight, maxHeight, contentCount, itemHeight = 40 } = options;
  
  // Calculate content-based height
  const contentBasedHeight = Math.max(contentCount * itemHeight + 100, baseHeight);
  
  // Apply responsive scaling based on screen size
  let scaleFactor = 1;
  if (containerWidth < 640) {
    scaleFactor = 0.8; // Smaller on mobile
  } else if (containerWidth < 1024) {
    scaleFactor = 0.9; // Slightly smaller on tablet
  } else {
    scaleFactor = 1.0; // Full size on desktop
  }
  
  // Consider available viewport height if provided
  let viewportAdjustedHeight = contentBasedHeight;
  if (containerHeight > 0) {
    // Don't exceed 70% of available height
    const maxViewportHeight = containerHeight * 0.7;
    viewportAdjustedHeight = Math.min(contentBasedHeight, maxViewportHeight);
  }
  
  const finalHeight = viewportAdjustedHeight * scaleFactor;
  
  // Ensure within bounds
  return Math.max(minHeight, Math.min(maxHeight, finalHeight));
};

/**
 * Calculate responsive YAxis width based on container width
 * @param containerWidth - The width of the container
 * @returns Appropriate YAxis width
 */
export const calculateYAxisWidth = (containerWidth: number): number => {
  // Enhanced calculation with more granular breakpoints
  if (containerWidth < 280) return 50;  // Extra small screens
  if (containerWidth < 400) return 65;  // Small mobile
  if (containerWidth < 640) return 80;  // Large mobile
  if (containerWidth < 768) return 95;  // Small tablet
  if (containerWidth < 1024) return 110; // Large tablet
  if (containerWidth < 1280) return 125; // Small desktop
  return 140; // Large desktop
};

/**
 * Calculate responsive margins for charts based on container size
 * @param containerWidth - The width of the container
 * @param containerHeight - The height of the container
 * @returns Chart margins object
 */
export const calculateChartMargins = (containerWidth: number, containerHeight: number = 0) => {
  const yAxisWidth = calculateYAxisWidth(containerWidth);
  
  // Dynamic margins based on container size
  const topMargin = containerWidth < 640 ? 10 : 15;
  const rightMargin = containerWidth < 640 ? 15 : 20;
  const bottomMargin = containerWidth < 640 ? 10 : 15;
  
  return {
    top: topMargin,
    right: rightMargin,
    left: yAxisWidth,
    bottom: bottomMargin
  };
};

/**
 * Get responsive chart configuration based on container dimensions
 * @param containerWidth - The width of the container
 * @param containerHeight - The height of the container
 * @returns Chart configuration object
 */
export const getResponsiveChartConfig = (containerWidth: number, containerHeight: number = 0) => {
  const isSmall = containerWidth < 640;
  const isMedium = containerWidth >= 640 && containerWidth < 1024;
  
  return {
    fontSize: {
      tick: isSmall ? 10 : isMedium ? 11 : 12,
      label: isSmall ? 8 : isMedium ? 9 : 10,
      tooltip: isSmall ? 12 : 14
    },
    spacing: {
      barGap: isSmall ? 2 : isMedium ? 4 : 6,
      categoryGap: isSmall ? 8 : isMedium ? 12 : 16
    },
    radius: {
      bar: isSmall ? 2 : isMedium ? 3 : 4,
      tooltip: isSmall ? 6 : 8
    },
    strokeWidth: isSmall ? 1 : 2
  };
};

/**
 * Calculate optimal number of items to display based on container size
 * @param containerWidth - The width of the container
 * @param containerHeight - The height of the container
 * @param itemHeight - Height of each item
 * @returns Optimal number of items to display
 */
export const calculateOptimalItemCount = (
  containerWidth: number,
  containerHeight: number,
  itemHeight: number = 40
): number => {
  // Reserve space for margins, labels, and other UI elements
  const reservedHeight = 120;
  const availableHeight = Math.max(containerHeight - reservedHeight, 200);
  
  // Calculate how many items can fit
  const maxItems = Math.floor(availableHeight / itemHeight);
  
  // Apply responsive limits
  if (containerWidth < 640) {
    return Math.min(maxItems, 8); // Max 8 items on mobile
  } else if (containerWidth < 1024) {
    return Math.min(maxItems, 12); // Max 12 items on tablet
  } else {
    return Math.min(maxItems, 15); // Max 15 items on desktop
  }
};