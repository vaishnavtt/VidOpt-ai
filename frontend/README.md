# VidOpt AI — Frontend Application

Interactive user interface for VidOpt AI built with React 19, TypeScript, Vite, and Tailwind CSS.

## Architecture & Pages

The application is structured into the following pages:
1. **Dashboard**: High-level system overview, real-time backend status, and comparative model metrics.
2. **Analyze Video**: Drag-and-drop file upload with automated FFprobe metadata extraction, configuration selectors, and real-time ML prediction.
3. **Prediction History**: Client-side storage (localStorage) of recent transcoding predictions with search and filtering.
4. **Model Insights**: Interactive performance charts, feature importance rankings, and error breakdown by resolution and duration.
5. **About**: System architecture overview, scientific background, and hardware context.

## Getting Started

### Prerequisites
- Node.js 18+ and npm 9+

### Installation & Run
```bash
# Install dependencies
npm install

# Start local development server (http://localhost:3000)
npm run dev

# Run unit test suite
npm test

# Build production bundle
npm run build
```
