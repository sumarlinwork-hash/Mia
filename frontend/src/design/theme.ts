export const theme = {
  colors: {
    teal: {
      primary: '#00ffcc',
      primaryHover: '#33ffdd',
      glow: 'rgba(0, 255, 204, 0.4)',
    },
    violet: {
      primary: '#bc13fe',
      primaryHover: '#d455ff',
      glow: 'rgba(188, 19, 254, 0.4)',
    },
    amber: {
      primary: '#ffaa00',
      primaryHover: '#ffcc33',
      glow: 'rgba(255, 170, 0, 0.4)',
    },
    emerald: {
      primary: '#00ff66',
      primaryHover: '#33ff88',
      glow: 'rgba(0, 255, 102, 0.4)',
    },
    rose: {
      primary: '#ff007f',
      primaryHover: '#ff3399',
      glow: 'rgba(255, 0, 127, 0.4)',
    }
  },
  glass: {
    background: 'rgba(10, 10, 10, 0.4)',
    border: 'rgba(255, 255, 255, 0.1)',
    blur: '20px',
  },
  transitions: {
    default: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
  }
};

export type ThemeHue = 'teal' | 'violet' | 'amber' | 'emerald' | 'rose';
