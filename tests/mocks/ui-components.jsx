/**
 * Mock implementations of shadcn/ui components for testing
 * These provide minimal functional implementations for tests
 */

import React from 'react'

// Button Component
export const Button = React.forwardRef(({
  children,
  onClick,
  variant = 'default',
  size = 'default',
  disabled = false,
  type = 'button',
  className = '',
  ...props
}, ref) => (
  <button
    ref={ref}
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={className}
    data-variant={variant}
    data-size={size}
    {...props}
  >
    {children}
  </button>
))
Button.displayName = 'Button'

// Card Components
export const Card = ({ children, className = '', ...props }) => (
  <div className={className} data-component="card" {...props}>
    {children}
  </div>
)

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={className} data-component="card-header" {...props}>
    {children}
  </div>
)

export const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={className} data-component="card-title" {...props}>
    {children}
  </h3>
)

export const CardDescription = ({ children, className = '', ...props }) => (
  <p className={className} data-component="card-description" {...props}>
    {children}
  </p>
)

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={className} data-component="card-content" {...props}>
    {children}
  </div>
)

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={className} data-component="card-footer" {...props}>
    {children}
  </div>
)

// Input Component
export const Input = React.forwardRef(({
  type = 'text',
  className = '',
  ...props
}, ref) => (
  <input
    ref={ref}
    type={type}
    className={className}
    {...props}
  />
))
Input.displayName = 'Input'

// Label Component
export const Label = React.forwardRef(({
  children,
  htmlFor,
  className = '',
  ...props
}, ref) => (
  <label
    ref={ref}
    htmlFor={htmlFor}
    className={className}
    {...props}
  >
    {children}
  </label>
))
Label.displayName = 'Label'

// Switch Component
export const Switch = React.forwardRef(({
  checked = false,
  onCheckedChange,
  disabled = false,
  ...props
}, ref) => (
  <button
    ref={ref}
    role="switch"
    type="button"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onCheckedChange?.(!checked)}
    {...props}
  />
))
Switch.displayName = 'Switch'

// Tabs Components
export const Tabs = ({ children, defaultValue, value, onValueChange, ...props }) => {
  const [selectedTab, setSelectedTab] = React.useState(value || defaultValue)

  const handleChange = (newValue) => {
    setSelectedTab(newValue)
    onValueChange?.(newValue)
  }

  return (
    <div data-component="tabs" {...props}>
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child, { selectedTab, onTabChange: handleChange })
          : child
      )}
    </div>
  )
}

export const TabsList = ({ children, selectedTab, onTabChange, ...props }) => (
  <div role="tablist" data-component="tabs-list" {...props}>
    {React.Children.map(children, child =>
      React.isValidElement(child)
        ? React.cloneElement(child, { selectedTab, onTabChange })
        : child
    )}
  </div>
)

export const TabsTrigger = ({ children, value, selectedTab, onTabChange, ...props }) => (
  <button
    role="tab"
    type="button"
    aria-selected={selectedTab === value}
    onClick={() => onTabChange?.(value)}
    data-component="tabs-trigger"
    {...props}
  >
    {children}
  </button>
)

export const TabsContent = ({ children, value, selectedTab, ...props }) => {
  if (selectedTab !== value) return null
  return (
    <div role="tabpanel" data-component="tabs-content" {...props}>
      {children}
    </div>
  )
}

// Select Components
export const Select = ({ children, value, onValueChange, ...props }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState(value)

  const handleSelect = (newValue) => {
    setSelectedValue(newValue)
    setIsOpen(false)
    onValueChange?.(newValue)
  }

  return (
    <div data-component="select" {...props}>
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child, {
              selectedValue,
              isOpen,
              setIsOpen,
              onSelect: handleSelect
            })
          : child
      )}
    </div>
  )
}

export const SelectTrigger = ({ children, isOpen, setIsOpen, ...props }) => (
  <button
    type="button"
    onClick={() => setIsOpen?.(!isOpen)}
    data-component="select-trigger"
    {...props}
  >
    {children}
  </button>
)

export const SelectValue = ({ placeholder, selectedValue, ...props }) => (
  <span data-component="select-value" {...props}>
    {selectedValue || placeholder}
  </span>
)

export const SelectContent = ({ children, isOpen, ...props }) => {
  if (!isOpen) return null
  return (
    <div data-component="select-content" {...props}>
      {children}
    </div>
  )
}

export const SelectItem = ({ children, value, onSelect, ...props }) => (
  <div
    role="option"
    onClick={() => onSelect?.(value)}
    data-component="select-item"
    data-value={value}
    {...props}
  >
    {children}
  </div>
)

// Toast Hook Mock
export const useToast = () => {
  return {
    toast: jest.fn(),
    dismiss: jest.fn(),
    toasts: []
  }
}

// Alert Components
export const Alert = ({ children, variant = 'default', ...props }) => (
  <div role="alert" data-variant={variant} {...props}>
    {children}
  </div>
)

export const AlertTitle = ({ children, ...props }) => (
  <h5 {...props}>{children}</h5>
)

export const AlertDescription = ({ children, ...props }) => (
  <div {...props}>{children}</div>
)

// Textarea Component
export const Textarea = React.forwardRef(({
  className = '',
  ...props
}, ref) => (
  <textarea
    ref={ref}
    className={className}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

// Badge Component
export const Badge = ({ children, variant = 'default', ...props }) => (
  <span data-component="badge" data-variant={variant} {...props}>
    {children}
  </span>
)
