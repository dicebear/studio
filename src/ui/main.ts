import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';

import App from './App.vue';

import './styles/reset.css';
import './styles/figma-bridge.css';

const FigmaPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f5f5f5',
      100: '#e5e5e5',
      200: '#d4d4d4',
      300: '#a3a3a3',
      400: '#525252',
      500: '#000000',
      600: '#000000',
      700: '#000000',
      800: '#000000',
      900: '#000000',
      950: '#000000',
    },
    formField: {
      borderRadius: '4px',
      paddingX: '8px',
      paddingY: '6px',
      sm: {
        fontSize: '11px',
        paddingX: '8px',
        paddingY: '4px',
      },
    },
    content: {
      borderRadius: '4px',
    },
    colorScheme: {
      light: {
        primary: {
          color: '#000000',
          contrastColor: '#ffffff',
          hoverColor: '#262626',
          activeColor: '#404040',
        },
        surface: {
          0: 'var(--figma-color-bg, #ffffff)',
          50: 'var(--figma-color-bg-hover, #f5f5f5)',
          100: 'var(--figma-color-bg-secondary, #f0f0f0)',
        },
        content: {
          background: 'var(--figma-color-bg, #ffffff)',
          hoverBackground: 'var(--figma-color-bg-hover, #f5f5f5)',
          borderColor: 'var(--figma-color-border, #e5e5e5)',
          color: 'var(--figma-color-text, #000000)',
          hoverColor: 'var(--figma-color-text, #000000)',
        },
        text: {
          color: 'var(--figma-color-text, #000000)',
          hoverColor: 'var(--figma-color-text, #000000)',
          mutedColor: 'var(--figma-color-text-secondary, #6d6d6d)',
          hoverMutedColor: 'var(--figma-color-text, #000000)',
        },
        formField: {
          background: 'var(--figma-color-bg, #ffffff)',
          disabledBackground: 'var(--figma-color-bg-disabled, #f5f5f5)',
          filledBackground: 'var(--figma-color-bg-secondary, #f0f0f0)',
          borderColor: 'var(--figma-color-border, #e5e5e5)',
          hoverBorderColor: 'var(--figma-color-border-strong, #b3b3b3)',
          focusBorderColor: 'var(--figma-color-border-brand-strong, #0d99ff)',
          color: 'var(--figma-color-text, #000000)',
          placeholderColor: 'var(--figma-color-text-tertiary, #b3b3b3)',
        },
      },
      dark: {
        primary: {
          color: '#ffffff',
          contrastColor: '#000000',
          hoverColor: '#e5e5e5',
          activeColor: '#d4d4d4',
        },
        surface: {
          0: 'var(--figma-color-bg, #2c2c2c)',
          50: 'var(--figma-color-bg-hover, #383838)',
          100: 'var(--figma-color-bg-secondary, #383838)',
        },
        content: {
          background: 'var(--figma-color-bg, #2c2c2c)',
          hoverBackground: 'var(--figma-color-bg-hover, #383838)',
          borderColor: 'var(--figma-color-border, #444444)',
          color: 'var(--figma-color-text, #ffffff)',
          hoverColor: 'var(--figma-color-text, #ffffff)',
        },
        text: {
          color: 'var(--figma-color-text, #ffffff)',
          hoverColor: 'var(--figma-color-text, #ffffff)',
          mutedColor: 'var(--figma-color-text-secondary, #b3b3b3)',
          hoverMutedColor: 'var(--figma-color-text, #ffffff)',
        },
        formField: {
          background: 'var(--figma-color-bg, #2c2c2c)',
          disabledBackground: 'var(--figma-color-bg-disabled, #3a3a3a)',
          filledBackground: 'var(--figma-color-bg-secondary, #383838)',
          borderColor: 'var(--figma-color-border, #444444)',
          hoverBorderColor: 'var(--figma-color-border-strong, #666666)',
          focusBorderColor: 'var(--figma-color-border-brand-strong, #0d99ff)',
          color: 'var(--figma-color-text, #ffffff)',
          placeholderColor: 'var(--figma-color-text-tertiary, #7a7a7a)',
        },
      },
    },
  },
});

createApp(App)
  .use(createPinia())
  .use(PrimeVue, {
    theme: {
      preset: FigmaPreset,
      options: {
        darkModeSelector: '.figma-dark',
        cssLayer: false,
      },
    },
  })
  .mount('#app');
