# shadcn/ui Integration Guide

## ✅ Integration Complete!

The shadcn/ui design system has been successfully integrated into your SEO Automation Dashboard!

---

## What Was Done

### 1. **Extracted shadcn/ui Design System** ✅
- Analyzed the official shadcn/ui repository (`ui/` directory)
- Extracted the complete color system, design tokens, and component styles
- Adapted React/Tailwind components for vanilla HTML/CSS/JS

### 2. **Created shadcn Theme CSS** ✅
- File: `public/unified/css/shadcn-theme.css`
- Includes all shadcn/ui design tokens as CSS custom properties
- Supports both light and dark modes
- Provides utility classes for common patterns

### 3. **Linked to Dashboard** ✅
- Added shadcn-theme.css to `index.html` (loads before other styles)
- Verified accessibility (HTTP 200)
- Ready to use immediately

---

## Design System Overview

### Color System

The shadcn design system uses **HSL color values** stored as CSS custom properties:

```css
/* Light Mode */
--background: 0 0% 100%;      /* White */
--foreground: 240 10% 3.9%;   /* Almost Black */
--primary: 240 5.9% 10%;      /* Dark Blue-Gray */
--secondary: 240 4.8% 95.9%;  /* Light Gray */
--muted: 240 4.8% 95.9%;      /* Muted Gray */
--accent: 240 4.8% 95.9%;     /* Accent Gray */
--destructive: 0 72.22% 50.59%; /* Red */
--border: 240 5.9% 90%;       /* Light Border */

/* Dark Mode */
.dark {
  --background: 240 10% 3.9%;  /* Dark Background */
  --foreground: 0 0% 98%;      /* Light Text */
  --primary: 0 0% 98%;          /* Light Primary */
  /* ... and more */
}
```

To use these colors in your CSS:
```css
.my-element {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}
```

---

## Available Components

### Buttons

```html
<!-- Primary Button -->
<button class="btn btn-primary">Primary Button</button>

<!-- Secondary Button -->
<button class="btn btn-secondary">Secondary Button</button>

<!-- Outline Button -->
<button class="btn btn-outline">Outline Button</button>

<!-- Destructive Button -->
<button class="btn btn-destructive">Delete</button>

<!-- Ghost Button -->
<button class="btn btn-ghost">Ghost Button</button>

<!-- Link Button -->
<button class="btn btn-link">Link Button</button>

<!-- Button Sizes -->
<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary">Default</button>
<button class="btn btn-primary btn-lg">Large</button>

<!-- Icon Button -->
<button class="btn btn-primary btn-icon">
  <svg>...</svg>
</button>
```

### Cards

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
    <p class="card-description">Card description text</p>
  </div>
  <div class="card-content">
    <!-- Card content here -->
  </div>
  <div class="card-footer">
    <button class="btn btn-primary">Action</button>
  </div>
</div>
```

### Form Inputs

```html
<!-- Text Input -->
<input type="text" class="input" placeholder="Enter text...">

<!-- Select -->
<select class="select">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

### Badges

```html
<!-- Default Badge -->
<span class="badge badge-default">Default</span>

<!-- Secondary Badge -->
<span class="badge badge-secondary">Secondary</span>

<!-- Destructive Badge -->
<span class="badge badge-destructive">Error</span>

<!-- Outline Badge -->
<span class="badge badge-outline">Outline</span>
```

### Tables

```html
<div class="table-wrapper">
  <table class="table">
    <thead>
      <tr>
        <th>Column 1</th>
        <th>Column 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Data 1</td>
        <td>Data 2</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Alerts

```html
<!-- Default Alert -->
<div class="alert alert-default">
  <h5 class="alert-title">Note</h5>
  <p class="alert-description">This is an informational message.</p>
</div>

<!-- Destructive Alert -->
<div class="alert alert-destructive">
  <h5 class="alert-title">Error</h5>
  <p class="alert-description">Something went wrong!</p>
</div>
```

### Separators

```html
<!-- Horizontal Separator -->
<div class="separator"></div>

<!-- Vertical Separator -->
<div class="separator separator-vertical"></div>
```

---

## Utility Classes

### Text Colors

```html
<p class="text-foreground">Default text color</p>
<p class="text-muted">Muted text color</p>
<p class="text-primary">Primary text color</p>
<p class="text-secondary">Secondary text color</p>
<p class="text-destructive">Destructive text color</p>
```

### Background Colors

```html
<div class="bg-background">Background</div>
<div class="bg-card">Card background</div>
<div class="bg-primary">Primary background</div>
<div class="bg-secondary">Secondary background</div>
<div class="bg-muted">Muted background</div>
<div class="bg-accent">Accent background</div>
<div class="bg-destructive">Destructive background</div>
```

### Borders

```html
<div class="border-border">Border with theme color</div>
<div class="border-input">Input border color</div>
```

### Focus States

```html
<button class="focus-visible">Accessible focus outline</button>
```

---

## Design Tokens

### Spacing

```css
--spacing-xs:  0.25rem;  /* 4px */
--spacing-sm:  0.5rem;   /* 8px */
--spacing-md:  1rem;     /* 16px */
--spacing-lg:  1.5rem;   /* 24px */
--spacing-xl:  2rem;     /* 32px */
```

### Border Radius

```css
--radius:     0.5rem;    /* 8px */
--radius-sm:  0.25rem;   /* 4px */
--radius-md:  0.375rem;  /* 6px */
--radius-lg:  0.5rem;    /* 8px */
--radius-xl:  0.75rem;   /* 12px */
```

### Typography

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, Consolas, monospace;
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

### Transitions

```css
--transition-fast:   150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-medium: 300ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow:   500ms cubic-bezier(0.4, 0, 0.2, 1);
```

---

## Dark Mode

### Enabling Dark Mode

Add the `dark` class to the root element or any parent:

```html
<html class="dark">
  <!-- or -->
<div class="dark">
  <!-- Dark mode content -->
</div>
```

### Dark Mode Colors

All color variables automatically adapt when `.dark` class is applied:

```css
.dark {
  --background: 240 10% 3.9%;   /* Dark background */
  --foreground: 0 0% 98%;        /* Light text */
  --primary: 0 0% 98%;            /* Light primary */
  /* ... */
}
```

### Dark Mode Toggle (JavaScript)

```javascript
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
  // Save preference
  localStorage.setItem('theme',
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
}

// Load saved preference
if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark');
}
```

---

## Animations

### Available Animations

```html
<!-- Fade In -->
<div class="animate-fade-in">Fades in</div>

<!-- Slide Down -->
<div class="animate-slide-down">Slides down</div>

<!-- Slide Up -->
<div class="animate-slide-up">Slides up</div>
```

### Custom Animations

Use the predefined keyframes:

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## Migration Guide

### Updating Existing Components

**Before (Custom CSS):**
```html
<button class="btn-custom" style="background: #3b82f6; color: white;">
  Click Me
</button>
```

**After (shadcn):**
```html
<button class="btn btn-primary">
  Click Me
</button>
```

**Before (Custom Card):**
```html
<div class="custom-card" style="border: 1px solid #ccc; padding: 20px;">
  <h3>Title</h3>
  <p>Content</p>
</div>
```

**After (shadcn):**
```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Title</h3>
  </div>
  <div class="card-content">
    <p>Content</p>
  </div>
</div>
```

### Using Custom Colors

To use custom colors with the shadcn system:

```css
/* Define custom color */
:root {
  --my-custom-color: 200 100% 50%; /* HSL format */
}

/* Use it */
.my-element {
  background-color: hsl(var(--my-custom-color));
}
```

---

## Examples

### Complete Form Example

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">User Settings</h3>
    <p class="card-description">Update your profile information</p>
  </div>
  <div class="card-content">
    <form>
      <div style="margin-bottom: var(--spacing-md);">
        <label for="name" style="display: block; margin-bottom: var(--spacing-sm);">
          Name
        </label>
        <input type="text" id="name" class="input" placeholder="Enter your name">
      </div>

      <div style="margin-bottom: var(--spacing-md);">
        <label for="email" style="display: block; margin-bottom: var(--spacing-sm);">
          Email
        </label>
        <input type="email" id="email" class="input" placeholder="Enter your email">
      </div>

      <div style="margin-bottom: var(--spacing-md);">
        <label for="role" style="display: block; margin-bottom: var(--spacing-sm);">
          Role
        </label>
        <select id="role" class="select">
          <option>Admin</option>
          <option>User</option>
          <option>Guest</option>
        </select>
      </div>
    </form>
  </div>
  <div class="card-footer" style="gap: var(--spacing-md);">
    <button class="btn btn-outline">Cancel</button>
    <button class="btn btn-primary">Save Changes</button>
  </div>
</div>
```

### Stats Dashboard Example

```html
<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-lg);">
  <div class="card">
    <div class="card-header">
      <p class="text-muted" style="font-size: 0.875rem;">Total Users</p>
    </div>
    <div class="card-content">
      <p style="font-size: 2rem; font-weight: 700;">12,345</p>
      <p class="text-muted" style="font-size: 0.75rem;">+20% from last month</p>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <p class="text-muted" style="font-size: 0.875rem;">Revenue</p>
    </div>
    <div class="card-content">
      <p style="font-size: 2rem; font-weight: 700;">$54,321</p>
      <p class="text-muted" style="font-size: 0.75rem;">+15% from last month</p>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <p class="text-muted" style="font-size: 0.875rem;">Active Projects</p>
    </div>
    <div class="card-content">
      <p style="font-size: 2rem; font-weight: 700;">24</p>
      <p class="text-muted" style="font-size: 0.75rem;">+3 new this week</p>
    </div>
  </div>
</div>
```

---

## Best Practices

### 1. **Use CSS Custom Properties**
Always use the design tokens for consistency:
```css
/* Good ✅ */
.my-component {
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  background-color: hsl(var(--background));
}

/* Avoid ❌ */
.my-component {
  padding: 16px;
  border-radius: 8px;
  background-color: #ffffff;
}
```

### 2. **Maintain Color Contrast**
Use appropriate foreground colors with backgrounds:
```css
/* Good ✅ */
.primary-button {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground)); /* Contrasts with primary */
}
```

### 3. **Support Dark Mode**
Test components in both light and dark modes:
```html
<!-- Toggle for testing -->
<button onclick="document.documentElement.classList.toggle('dark')">
  Toggle Dark Mode
</button>
```

### 4. **Use Semantic Classes**
Prefer semantic class names over utility classes:
```css
/* Good ✅ */
.user-card {
  @apply card;
}

/* Or with custom CSS */
.user-card {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-lg);
}
```

---

## Troubleshooting

### Colors Not Showing

**Problem**: Colors appear as raw HSL values
**Solution**: Wrap variables in `hsl()` function
```css
/* Wrong ❌ */
background-color: var(--primary);

/* Correct ✅ */
background-color: hsl(var(--primary));
```

### Dark Mode Not Working

**Problem**: Dark mode colors not applying
**Solution**: Ensure `.dark` class is on a parent element
```javascript
// Apply to root
document.documentElement.classList.add('dark');

// Or to a container
document.getElementById('app').classList.add('dark');
```

### Styles Being Overridden

**Problem**: shadcn styles not applying
**Solution**: Ensure shadcn-theme.css loads first
```html
<!-- Correct order ✅ -->
<link rel="stylesheet" href="css/shadcn-theme.css">
<link rel="stylesheet" href="css/unified.css">
<link rel="stylesheet" href="css/components.css">
```

---

## Next Steps

1. **Explore the components** - Try out different button variants, cards, and form elements
2. **Implement dark mode** - Add a dark mode toggle to your dashboard
3. **Customize colors** - Adjust the CSS custom properties to match your brand
4. **Build new features** - Use the shadcn components for new dashboard sections

---

## Resources

- **shadcn/ui Official**: https://ui.shadcn.com
- **Design System**: `public/unified/css/shadcn-theme.css`
- **Original Repository**: `ui/` directory in project root
- **Dashboard**: http://localhost:9000/unified/

---

## Summary

**Integration Status**: ✅ COMPLETE

The shadcn/ui design system is now fully integrated and ready to use. All components follow the official shadcn/ui patterns adapted for vanilla HTML/CSS/JavaScript. Start using the provided classes and design tokens to build beautiful, consistent UI components!
