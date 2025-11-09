import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Sonner Toaster component with production-ready configuration
 * - High z-index (9999) to appear above navbar (z-50)
 * - Positioned at top-right
 * - Rich colors enabled
 * - Close button enabled
 * - Proper styling for light/dark themes
 */
const Toaster = ({ ...props }: ToasterProps) => {
  // Detect theme from document class or system preference
  const getTheme = (): "light" | "dark" | "system" => {
    if (typeof window === "undefined") return "system";
    
    // Check if dark mode class is present
    if (document.documentElement.classList.contains("dark")) {
      return "dark";
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    
    return "light";
  };

  return (
    <Sonner
      theme={getTheme()}
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      offset="64px" // Offset from top to account for navbar (64px = 4rem)
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
        style: {
          zIndex: 9999,
        },
      }}
      style={{
        zIndex: 9999,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
