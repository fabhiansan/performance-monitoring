# Integration Guide

This guide explains how to integrate the design system into your existing application.

## 🚀 Quick Integration

### Step 1: Import Foundation Styles

Add the foundation styles to your main CSS file:

```css
/* In index.css or your main CSS file */
@import './design-system/foundations/index.css';

/* Your existing styles */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 2: Update Tailwind Config

The `tailwind.config.ts` has already been updated to use design tokens. Ensure your build process includes the design system components:

```typescript
// tailwind.config.ts content paths should include:
'./design-system/components/**/*.{ts,tsx,js,jsx}',
```

### Step 3: Start Using Components

```tsx
import { Button, Input, Card } from './design-system';

function MyComponent() {
  return (
    <Card title="Example Card">
      <Input label="Name" placeholder="Enter your name" />
      <Button variant="primary">Submit</Button>
    </Card>
  );
}
```

## 🔄 Migration Strategy

### Gradual Migration

1. **Start with new components**: Use design system components for new features
2. **Replace common components**: Gradually replace existing buttons, inputs, etc.
3. **Update layouts**: Migrate cards, modals, and layout components
4. **Refine theming**: Customize colors and tokens to match your brand

### Component Mapping

| Existing | Design System | Notes |
|----------|---------------|-------|
| `<button>` | `<Button>` | More variants and accessibility |
| `<input>` | `<Input>` | Built-in validation states |
| Custom card | `<Card>` | Standardized sections |
| Custom modal | `<Modal>` | Better accessibility |

## 🎨 Customization

### Brand Colors

Update the design tokens to match your brand:

```typescript
// In design-system/tokens/semantic.ts
export const semanticColors = {
  interactive: {
    primary: '#your-brand-color',
    primaryHover: '#your-brand-color-hover',
    // ... other colors
  }
};
```

### Typography

Customize fonts in the tokens:

```typescript
// In design-system/tokens/primitives.ts
export const typography = {
  fontFamily: {
    sans: ['Your-Font', 'system-ui', 'sans-serif'],
    // ... other fonts
  }
};
```

### Component Variants

Add custom variants to existing components:

```typescript
// Extend button variants
const customButtonVariants = createVariantUtil(buttonBase, {
  variant: {
    ...existingVariants,
    brand: 'bg-brand-500 text-white hover:bg-brand-600',
  }
});
```

## 🧩 Examples

### Form with Validation

```tsx
import { Input, Button, Card } from './design-system';
import { useState } from 'react';

function RegistrationForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    // Submit form
  };

  return (
    <Card title="Register" subtitle="Create your account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          errorMessage={error}
          required
        />
        <Button type="submit" variant="primary" fullWidth>
          Register
        </Button>
      </form>
    </Card>
  );
}
```

### Interactive Dashboard Card

```tsx
import { Card, Button } from './design-system';

function DashboardCard({ title, value, trend }: {
  title: string;
  value: string;
  trend: 'up' | 'down';
}) {
  return (
    <Card
      variant="elevated"
      title={title}
      headerActions={
        <Button variant="tertiary" size="sm">
          Details
        </Button>
      }
      interactive
      onClick={() => console.log('Card clicked')}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
        {trend === 'up' ? '↗' : '↘'} Trend
      </div>
    </Card>
  );
}
```

### Confirmation Modal

```tsx
import { Modal, Button } from './design-system';
import { useState } from 'react';

function DeleteConfirmation({ onConfirm }: { onConfirm: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="danger" onClick={() => setIsOpen(true)}>
        Delete
      </Button>
      
      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Deletion"
        size="md"
        footer={
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={() => {
                onConfirm();
                setIsOpen(false);
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p>Are you sure you want to delete this item? This action cannot be undone.</p>
      </Modal>
    </>
  );
}
```

## 🔧 Development Tips

### TypeScript Support

The design system provides full TypeScript support:

```tsx
import type { ButtonProps, InputProps } from './design-system';

// Extend props for custom components
interface CustomButtonProps extends ButtonProps {
  badge?: string;
}

// Use component refs
const buttonRef = useRef<React.ElementRef<'button'>>(null);
```

### Debugging

Use browser dev tools to inspect design tokens:

```css
/* CSS custom properties are available in dev tools */
:root {
  --ds-color-interactive-primary: #3b82f6;
  --ds-space-4: 1rem;
  /* ... etc */
}
```

### Performance Optimization

```tsx
// Tree shake imports
import { Button } from './design-system/components/Button';

// Instead of
import { Button } from './design-system'; // imports everything
```

## 🎯 Best Practices

1. **Consistent Usage**: Always use design system components over custom ones
2. **Proper Semantics**: Use appropriate ARIA attributes and semantic HTML
3. **Responsive Design**: Leverage responsive utilities for mobile-first design
4. **Accessibility**: Test with keyboard navigation and screen readers
5. **Performance**: Import only needed components and utilities

## 🐛 Troubleshooting

### Common Issues

**Components not styled correctly:**
- Ensure foundation CSS is imported
- Check Tailwind config includes design system paths
- Verify dark mode class is applied correctly

**TypeScript errors:**
- Update to latest TypeScript version
- Ensure proper imports from design system
- Check component prop types match expected interface

**Accessibility warnings:**
- Use provided ARIA utilities
- Ensure proper heading hierarchy
- Test with keyboard navigation

### Getting Help

1. Check component documentation
2. Review examples in this guide
3. Inspect existing usage in the codebase
4. Consult WCAG guidelines for accessibility

---

Happy building! 🚀