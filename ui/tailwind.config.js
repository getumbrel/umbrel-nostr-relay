/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      boxShadow: {
        'custom-light-purple': '0px 8px 8px 0px rgba(101, 18, 160, 0.15)',
      },
      gradientColorStops: {
        'white-10': 'rgba(255, 255, 255, 0.10)',
        'white-20': 'rgba(255, 255, 255, 0.20)',
      },
      backgroundImage: {
        'delete-icon-light-mode': "url('./assets/delete-light-mode.svg')",
        'delete-icon-dark-mode': "url('./assets/delete-dark-mode.svg')",
        'add-icon-light-mode': "url('./assets/add-light-mode.svg')",
        'add-icon-dark-mode': "url('./assets/add-dark-mode.svg')",
        'relays-modal-icon-dark-mode': "url('./assets/modal-icon-dark-mode.svg')",
        'relays-modal-icon-light-mode': "url('./assets/modal-icon-light-mode.svg')",
      },
    }
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true })
  ]
};
