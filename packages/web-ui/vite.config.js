import react from '@vitejs/plugin-react';

const config = {
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
};

export default config;
