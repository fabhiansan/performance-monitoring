# Design System

A comprehensive, scalable design system built on atomic design principles with full TypeScript support, accessibility compliance, and theming capabilities.

## 🚀 Quick Start

### Installation

```bash
# The design system is built into this project
# Import the foundation styles in your main CSS file
```

```css
/* In your main CSS file (e.g., index.css) */
@import '../design-system/foundations/index.css';
```

### Basic Usage

```tsx
import { Button, Input, Card, Modal } from '../design-system';

function App() {
  return (
    <Card title="Welcome" subtitle="Get started with our design system">
      <Input 
        label="Email" 
        type="email" 
        placeholder="Enter your email"
        required 
      />
      <Button variant="primary" size="md">
        Submit
      </Button>
    </Card>
  );
}
```

## 📁 Architecture

The design system follows atomic design principles:

```
design-system/
├── tokens/           # Design tokens (colors, typography, spacing)
├── foundations/      # Base styles (reset, typography, layout, animations)
├── utils/           # Utility functions (cn, colors, responsive, a11y)
├── components/      # Reusable UI components
├── themes/          # Theme configurations
└── docs/           # Documentation
```

## 🎨 Design Tokens

### Color System

```tsx
import { colors, semanticColors } from '../design-system/tokens';

// Primitive colors
const primaryBlue = colors.blue[600];

// Semantic colors (themeable)
const buttonColor = semanticColors.interactive.primary;
```

### Typography Scale

```tsx
import { typography } from '../design-system/tokens';

const headingFont = typography.fontSize['2xl'];
const bodyWeight = typography.fontWeight.normal;
```

### Spacing Scale

```tsx
import { spacing } from '../design-system/tokens';

const margin = spacing[4]; // 1rem (16px)
const padding = spacing[8]; // 2rem (32px)
```

## 🧩 Components

### Button

Versatile button component with multiple variants and states.

```tsx
<Button variant="primary" size="lg" loading={isLoading}>
  Submit
</Button>

<Button variant="secondary" leftIcon={<Icon />}>
  Cancel
</Button>

<Button variant="danger" iconOnly ariaLabel="Delete">
  <TrashIcon />
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'warning' | 'outline'
- `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
- `loading`: boolean
- `iconOnly`: boolean
- `fullWidth`: boolean
- `leftIcon`: ReactNode
- `rightIcon`: ReactNode

### Input

Accessible input component with validation states.

```tsx
<Input
  label="Email Address"
  type="email"
  required
  helpText="We'll never share your email"
  errorMessage={error}
  leftIcon={<MailIcon />}
/>
```

**Props:**
- `size`: 'sm' | 'md' | 'lg'
- `state`: 'default' | 'error' | 'success' | 'warning'
- `label`: string
- `helpText`: string
- `errorMessage`: string
- `leftIcon`: ReactNode
- `rightIcon`: ReactNode

### Card

Flexible card component with header, body, and footer sections.

```tsx
<Card
  title="Card Title"
  subtitle="Card subtitle"
  headerActions={<Button size="sm">Action</Button>}
  footer={<Button fullWidth>Learn More</Button>}
  variant="elevated"
>
  Card content goes here
</Card>

{/* Or use compound components */}
<Card>
  <Card.Header>
    <h3>Custom Header</h3>
  </Card.Header>
  <Card.Body>
    Content
  </Card.Body>
  <Card.Footer>
    Footer actions
  </Card.Footer>
</Card>
```

**Props:**
- `variant`: 'default' | 'elevated' | 'outlined' | 'filled'
- `size`: 'sm' | 'md' | 'lg'
- `interactive`: boolean
- `fullHeight`: boolean

### Modal

Accessible modal dialog with focus management.

```tsx
const [isOpen, setIsOpen] = useState(false);

<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md"
  footer={
    <>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleConfirm}>
        Confirm
      </Button>
    </>
  }
>
  Are you sure you want to proceed?
</Modal>
```

**Props:**
- `open`: boolean
- `onClose`: () => void
- `size`: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full'
- `animation`: 'scale' | 'slideUp' | 'slideDown' | 'fade'
- `closeOnBackdropClick`: boolean
- `closeOnEscape`: boolean

## 🛠 Utilities

### Class Name Utility

```tsx
import { cn } from '../design-system/utils';

const className = cn(
  'base-class',
  {
    'active-class': isActive,
    'disabled-class': isDisabled
  },
  conditionalClass
);
```

### Color Utilities

```tsx
import { lighten, darken, getContrastRatio } from '../design-system/utils';

const lightBlue = lighten('#3b82f6', 20);
const darkBlue = darken('#3b82f6', 20);
const contrast = getContrastRatio('#ffffff', '#3b82f6'); // 4.5
```

### Responsive Utilities

```tsx
import { matchesBreakpoint, getCurrentBreakpoint } from '../design-system/utils';

const isMobile = matchesBreakpoint('md', 'max');
const currentBp = getCurrentBreakpoint(); // 'sm' | 'md' | 'lg' | etc.
```

### Accessibility Utilities

```tsx
import { generateId, createFormFieldAria, focus } from '../design-system/utils';

const inputId = generateId('input');
const ariaAttributes = createFormFieldAria({
  label: 'Email',
  required: true,
  invalid: hasError
});
```

## 🎭 Theming

### Dark Mode

The design system supports automatic dark mode detection and manual toggling:

```tsx
// Automatic detection (respects system preference)
// No additional code needed

// Manual toggle
<html className="dark">
  <!-- Your app -->
</html>
```

### Custom Themes

```tsx
import { defaultTheme, darkTheme } from '../design-system/tokens';

// Create custom theme
const customTheme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    interactive: {
      ...defaultTheme.colors.interactive,
      primary: '#your-brand-color'
    }
  }
};
```

## ♿ Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: Full keyboard support with proper focus management
- **Screen Readers**: Comprehensive ARIA attributes and semantic markup
- **Color Contrast**: Meets or exceeds contrast requirements
- **Focus Management**: Visible focus indicators and logical tab order
- **Reduced Motion**: Respects user's motion preferences

### Example: Accessible Form

```tsx
<form>
  <Input
    label="Email Address"
    type="email"
    required
    helpText="We'll never share your email"
    errorMessage={emailError}
    ariaAttributes={{
      'aria-describedby': 'email-help email-error'
    }}
  />
  
  <Button
    type="submit"
    variant="primary"
    loading={isSubmitting}
    ariaLabel="Submit registration form"
  >
    {isSubmitting ? 'Submitting...' : 'Register'}
  </Button>
</form>
```

## 📱 Responsive Design

The design system includes responsive utilities and breakpoints:

```tsx
// Responsive classes
<div className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
  Responsive grid
</div>

// Responsive props (where supported)
<Button 
  size={{ base: 'sm', md: 'md', lg: 'lg' }}
  fullWidth={{ base: true, md: false }}
>
  Responsive button
</Button>
```

## 🏗 Advanced Usage

### Extending Components

```tsx
import { Button, type ButtonProps } from '../design-system';

interface CustomButtonProps extends ButtonProps {
  loading?: boolean;
  badge?: string;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  loading,
  badge,
  children,
  ...props
}) => {
  return (
    <Button {...props} loading={loading}>
      {children}
      {badge && <span className="badge">{badge}</span>}
    </Button>
  );
};
```

### Custom Variants

```tsx
import { createVariantUtil } from '../design-system/utils';

const customButton = createVariantUtil(
  'base-button-class',
  {
    variant: {
      custom: 'custom-variant-classes',
      special: 'special-variant-classes'
    },
    size: {
      tiny: 'tiny-size-classes'
    }
  }
);
```

## 🧪 Testing

Components are built with testing in mind:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../design-system';

test('button handles click events', async () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  await userEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

## 📊 Performance

- **Tree Shaking**: Import only what you need
- **CSS-in-JS**: Zero runtime cost with compile-time optimization
- **Bundle Size**: Minimal impact with shared dependencies
- **Accessibility**: Optimized for screen readers and assistive technologies

## 🤝 Contributing

1. Follow atomic design principles
2. Ensure accessibility compliance
3. Include comprehensive TypeScript types
4. Write tests for all components
5. Document all props and usage examples
6. Follow the naming conventions

## 📚 Resources

- [Atomic Design Methodology](http://atomicdesign.bradfrost.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

Built with ❤️ for modern web applications.