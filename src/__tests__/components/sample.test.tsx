// import React from 'react' // Not needed with React 19 JSX transform
import { describe, it, expect, vi } from 'vitest'
import { userEvent } from '@testing-library/user-event'
import { render, screen } from '../test-utils'
import { Button } from '@/design-system/components/Button'

describe('Sample Component Test', () => {
  it('should render a button with text', () => {
    render(<Button>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
  })

  it('should handle button click events', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    await userEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledOnce()
  })
})