/**
 * Class Name Utility
 * 
 * A utility for conditionally joining class names together.
 * Supports strings, arrays, objects, and conditional logic.
 */

export type ClassValue = 
  | string 
  | number 
  | boolean 
  | undefined 
  | null 
  | ClassArray 
  | ClassDictionary;

export interface ClassDictionary {
  [id: string]: ClassValue | boolean;
}

export interface ClassArray extends Array<ClassValue> {}

/**
 * Conditionally joins class names together
 * 
 * @param inputs - Class values to join
 * @returns Joined class names as a string
 * 
 * @example
 * cn('foo', 'bar') // 'foo bar'
 * cn('foo', { bar: true, baz: false }) // 'foo bar'
 * cn('foo', ['bar', { baz: true }]) // 'foo bar baz'
 * cn('foo', undefined, null, false, 'bar') // 'foo bar'
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    if (!input) continue;
    
    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const innerResult = cn(...input);
      if (innerResult) {
        classes.push(innerResult);
      }
    } else if (typeof input === 'object') {
      for (const key in input) {
        if (input[key]) {
          classes.push(key);
        }
      }
    }
  }
  
  return classes.join(' ');
}

/**
 * Creates a variant-aware class name utility
 * 
 * @param base - Base class names
 * @param variants - Variant class mappings
 * @returns Function that generates class names based on variants
 * 
 * @example
 * const buttonClass = createVariantUtil(
 *   'ds-button',
 *   {
 *     variant: {
 *       primary: 'ds-button-primary',
 *       secondary: 'ds-button-secondary'
 *     },
 *     size: {
 *       sm: 'ds-button-sm',
 *       md: 'ds-button-md',
 *       lg: 'ds-button-lg'
 *     }
 *   }
 * );
 * 
 * buttonClass({ variant: 'primary', size: 'lg' }) // 'ds-button ds-button-primary ds-button-lg'
 */
export function createVariantUtil<T extends Record<string, Record<string, string>>>(
  base: string,
  variants: T
) {
  return function(props: {
    [K in keyof T]?: keyof T[K];
  } & { className?: string }) {
    const { className, ...variantProps } = props;
    
    const variantClasses = Object.entries(variantProps)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        const variantMap = variants[key as keyof T];
        return variantMap?.[value as string];
      })
      .filter(Boolean);
    
    return cn(base, ...variantClasses, className);
  };
}

/**
 * Creates a responsive class name utility
 * 
 * @param breakpoints - Breakpoint prefixes
 * @returns Function that generates responsive class names
 * 
 * @example
 * const responsiveClass = createResponsiveUtil(['sm', 'md', 'lg']);
 * 
 * responsiveClass({
 *   base: 'grid-cols-1',
 *   sm: 'grid-cols-2',
 *   lg: 'grid-cols-4'
 * }) // 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
 */
export function createResponsiveUtil(breakpoints: string[]) {
  return function(classes: Record<string, string>) {
    const { base, ...responsiveClasses } = classes;
    
    const responsiveClassNames = Object.entries(responsiveClasses)
      .filter(([breakpoint]) => breakpoints.includes(breakpoint))
      .map(([breakpoint, className]) => `${breakpoint}:${className}`)
      .filter(Boolean);
    
    return cn(base, ...responsiveClassNames);
  };
}

/**
 * Creates a conditional class name utility
 * 
 * @param conditions - Condition-to-class mappings
 * @returns Function that generates class names based on conditions
 * 
 * @example
 * const conditionalClass = createConditionalUtil({
 *   isActive: 'active',
 *   isDisabled: 'disabled',
 *   hasError: 'error'
 * });
 * 
 * conditionalClass({ isActive: true, hasError: false }) // 'active'
 */
export function createConditionalUtil(conditions: Record<string, string>) {
  return function(state: Record<string, boolean>) {
    return cn(
      Object.entries(state)
        .filter(([, value]) => value)
        .map(([key]) => conditions[key])
        .filter(Boolean)
    );
  };
}

/**
 * Merges multiple class name utilities
 * 
 * @param utilities - Array of class name functions
 * @returns Combined class names
 * 
 * @example
 * const baseClasses = () => 'base-class';
 * const variantClasses = () => 'variant-class';
 * const stateClasses = () => 'state-class';
 * 
 * mergeClassUtils([baseClasses, variantClasses, stateClasses]) // 'base-class variant-class state-class'
 */
export function mergeClassUtils(utilities: Array<() => string>): string {
  return cn(...utilities.map(util => util()));
}

export default cn;