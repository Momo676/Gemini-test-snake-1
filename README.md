# Slither Arena - Multiplayer Skill Game

A real-time multiplayer Node.js & Socket.io browser game featuring room tiers (25, 50, 100 EGP), double-tap boost mechanics, and hold-to-cash-out controls. Ready for Fly.io deployment!

## Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open `http://localhost:8080` in your browser.

## Deployment to Fly.io
1. Install Fly CLI and login:
   ```bash
   fly auth login
   ```
2. Launch and deploy:
   ```bash
   fly launch --no-deploy
   fly deploy
   ```
