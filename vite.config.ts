// This is a Node.js backend project, not a Vite frontend project
// This file exists only to prevent Lovable build errors
// Deploy this backend to AWS separately using npm start

export default {
  server: {
    port: 8080
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false
  }
}
