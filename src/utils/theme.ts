/**
 * Shared theme configuration for 4RL app
 * Centralized design tokens for consistent UI across the application
 * 
 * Theme philosophy: "New age map centered around using technology to get off technology"
 * - Minimalist design
 * - Real connections, real people
 * - Clean, modern aesthetic
 */

// Reusable class strings for direct use in components
export const themeClasses = {
  // Buttons
  button: {
    primary: "px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 active:scale-95",
    primarySmall: "w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 active:scale-95",
  },
  
  // Inputs
  input: {
    base: "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none placeholder:text-gray-400",
  },
  
  // Text
  text: {
    headingLarge: "text-5xl lg:text-6xl font-bold leading-tight tracking-tight",
    headingMedium: "text-3xl font-bold tracking-tight",
    headingSmall: "text-xl",
    bodyLarge: "text-xl lg:text-2xl leading-relaxed",
    bodyMedium: "text-sm",
    primary: "text-gray-900",
    secondary: "text-gray-600",
    light: "text-gray-200",
    white: "text-white",
    accent: "text-blue-600",
    accentLight: "text-blue-400",
  },
  
  // Backgrounds
  background: {
    primary: "bg-white",
    secondary: "bg-zinc-50",
    dark: "bg-black",
  },
  
  // Gradients
  gradient: {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600",
    imageOverlay: "bg-gradient-to-t from-black/80 via-black/40 to-transparent",
  },
  
  // Error states
  error: {
    container: "p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm text-center",
  },
  
  // Image effects
  image: {
    overlay: "opacity-80",
    hoverOverlay: "opacity-70 group-hover:opacity-100 transition-opacity duration-300",
  },
  
  // Spacing
  spacing: {
    section: "p-8 lg:p-16",
    container: "max-w-md",
  },
} as const;

/**
 * Theme configuration object for reference and documentation
 */
export const theme = {
  colors: {
    primary: {
      from: "from-blue-600",
      to: "to-indigo-600",
      base: "blue-600",
      light: "blue-400",
      dark: "indigo-600",
    },
    background: {
      primary: "bg-white",
      secondary: "bg-zinc-50",
      dark: "bg-black",
    },
    text: {
      primary: "text-gray-900",
      secondary: "text-gray-600",
      light: "text-gray-200",
      white: "text-white",
    },
    error: {
      background: "bg-red-50",
      border: "border-red-100",
      text: "text-red-600",
    },
  },
  gradients: {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600",
    overlay: "bg-gradient-to-t from-black/80 via-black/40 to-transparent",
    imageOverlay: "bg-gradient-to-t from-black/80 via-black/40 to-transparent",
  },
  spacing: {
    section: "p-8 lg:p-16",
    container: "max-w-md",
  },
  typography: {
    heading: {
      large: "text-5xl font-bold leading-tight",
      medium: "text-3xl font-bold tracking-tight",
      small: "text-xl",
    },
    body: {
      large: "text-xl leading-relaxed",
      medium: "text-sm",
    },
  },
  effects: {
    imageOpacity: "opacity-80",
    shadow: "shadow-lg hover:shadow-xl",
    transition: "transition-all duration-200",
    scale: "hover:scale-[1.02] active:scale-95",
  },
  borderRadius: {
    button: "rounded-xl",
    input: "rounded-xl",
    card: "rounded-lg",
  },
} as const;