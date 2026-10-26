import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			// PROJ-45: Farb-Schicht des Lehrkräfte-Bereichs (hell/dunkel, siehe globals.css)
  			ws: {
  				'bg': 'rgb(var(--ws-bg) / <alpha-value>)',
  				'surface': 'rgb(var(--ws-surface) / <alpha-value>)',
  				'raised': 'rgb(var(--ws-raised) / <alpha-value>)',
  				'line': 'rgb(var(--ws-line) / <alpha-value>)',
  				'faint': 'rgb(var(--ws-faint) / <alpha-value>)',
  				'muted': 'rgb(var(--ws-muted) / <alpha-value>)',
  				'text': 'rgb(var(--ws-text) / <alpha-value>)',
  				'green': 'rgb(var(--ws-green) / <alpha-value>)',
  				'green-hover': 'rgb(var(--ws-green-hover) / <alpha-value>)',
  				'blue': 'rgb(var(--ws-blue) / <alpha-value>)',
  				'blue-hover': 'rgb(var(--ws-blue-hover) / <alpha-value>)',
  				'red': 'rgb(var(--ws-red) / <alpha-value>)',
  				'red-hover': 'rgb(var(--ws-red-hover) / <alpha-value>)',
  				'orange': 'rgb(var(--ws-orange) / <alpha-value>)',
  				'gold': 'rgb(var(--ws-gold) / <alpha-value>)',
  				'on-accent': 'rgb(var(--ws-on-accent) / <alpha-value>)',
  			},
  			// Sidebar wird nur im Lehrkräfte-Bereich genutzt (PROJ-45) und folgt dessen Palette
  			sidebar: {
  				DEFAULT: 'rgb(var(--ws-surface) / <alpha-value>)',
  				foreground: 'rgb(var(--ws-muted) / <alpha-value>)',
  				primary: 'rgb(var(--ws-green) / <alpha-value>)',
  				'primary-foreground': 'rgb(var(--ws-on-accent) / <alpha-value>)',
  				accent: 'rgb(var(--ws-raised) / <alpha-value>)',
  				'accent-foreground': 'rgb(var(--ws-text) / <alpha-value>)',
  				border: 'rgb(var(--ws-line) / <alpha-value>)',
  				ring: 'rgb(var(--ws-green) / <alpha-value>)'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [],
};
export default config;
