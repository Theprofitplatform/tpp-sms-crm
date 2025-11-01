// Mock for @/components/ui/* components
import React from 'react';

// Button component mock
export const Button = React.forwardRef(({ children, onClick, ...props }, ref) => (
  <button ref={ref} onClick={onClick} {...props}>
    {children}
  </button>
));
Button.displayName = 'Button';

// Card components mock
export const Card = ({ children, ...props }) => <div {...props}>{children}</div>;
export const CardContent = ({ children, ...props }) => <div {...props}>{children}</div>;
export const CardHeader = ({ children, ...props }) => <div {...props}>{children}</div>;
export const CardTitle = ({ children, ...props }) => <h3 {...props}>{children}</h3>;
export const CardDescription = ({ children, ...props }) => <p {...props}>{children}</p>;
export const CardFooter = ({ children, ...props }) => <div {...props}>{children}</div>;

// Input component mock
export const Input = React.forwardRef((props, ref) => <input ref={ref} {...props} />);
Input.displayName = 'Input';

// Label component mock
export const Label = ({ children, ...props }) => <label {...props}>{children}</label>;

// Select components mock
export const Select = ({ children, ...props }) => <div {...props}>{children}</div>;
export const SelectTrigger = ({ children, ...props }) => <div {...props}>{children}</div>;
export const SelectValue = ({ ...props }) => <span {...props} />;
export const SelectContent = ({ children, ...props }) => <div {...props}>{children}</div>;
export const SelectItem = ({ children, ...props }) => <div {...props}>{children}</div>;

// Dialog components mock
export const Dialog = ({ children, ...props }) => <div {...props}>{children}</div>;
export const DialogTrigger = ({ children, ...props }) => <div {...props}>{children}</div>;
export const DialogContent = ({ children, ...props }) => <div {...props}>{children}</div>;
export const DialogHeader = ({ children, ...props }) => <div {...props}>{children}</div>;
export const DialogTitle = ({ children, ...props }) => <h2 {...props}>{children}</h2>;
export const DialogDescription = ({ children, ...props }) => <p {...props}>{children}</p>;
export const DialogFooter = ({ children, ...props }) => <div {...props}>{children}</div>;

// Progress component mock
export const Progress = (props) => <div {...props} />;

// Switch component mock
export const Switch = React.forwardRef((props, ref) => <input type="checkbox" ref={ref} {...props} />);
Switch.displayName = 'Switch';

// Tabs components mock
export const Tabs = ({ children, ...props }) => <div {...props}>{children}</div>;
export const TabsList = ({ children, ...props }) => <div {...props}>{children}</div>;
export const TabsTrigger = ({ children, ...props }) => <button {...props}>{children}</button>;
export const TabsContent = ({ children, ...props }) => <div {...props}>{children}</div>;

// Toast components mock
export const Toast = ({ children, ...props }) => <div {...props}>{children}</div>;
export const ToastAction = ({ children, ...props }) => <button {...props}>{children}</button>;
export const ToastClose = ({ ...props }) => <button {...props}>×</button>;
export const ToastDescription = ({ children, ...props }) => <p {...props}>{children}</p>;
export const ToastProvider = ({ children }) => <>{children}</>;
export const ToastTitle = ({ children, ...props }) => <h3 {...props}>{children}</h3>;
export const ToastViewport = (props) => <div {...props} />;

// Tooltip components mock
export const Tooltip = ({ children, ...props }) => <div {...props}>{children}</div>;
export const TooltipTrigger = ({ children, ...props }) => <div {...props}>{children}</div>;
export const TooltipContent = ({ children, ...props }) => <div {...props}>{children}</div>;
export const TooltipProvider = ({ children }) => <>{children}</>;

// Separator component mock
export const Separator = (props) => <hr {...props} />;

// Checkbox component mock
export const Checkbox = React.forwardRef((props, ref) => <input type="checkbox" ref={ref} {...props} />);
Checkbox.displayName = 'Checkbox';

// Dropdown Menu components mock
export const DropdownMenu = ({ children, ...props }) => <div {...props}>{children}</div>;
export const DropdownMenuTrigger = ({ children, ...props }) => <div {...props}>{children}</div>;
export const DropdownMenuContent = ({ children, ...props }) => <div {...props}>{children}</div>;
export const DropdownMenuItem = ({ children, ...props }) => <div {...props}>{children}</div>;
export const DropdownMenuSeparator = (props) => <hr {...props} />;
export const DropdownMenuLabel = ({ children, ...props }) => <div {...props}>{children}</div>;

// Popover components mock
export const Popover = ({ children, ...props }) => <div {...props}>{children}</div>;
export const PopoverTrigger = ({ children, ...props }) => <div {...props}>{children}</div>;
export const PopoverContent = ({ children, ...props }) => <div {...props}>{children}</div>;

// Default export for catch-all
export default {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Progress,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Separator,
  Checkbox,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Popover,
  PopoverTrigger,
  PopoverContent,
};
