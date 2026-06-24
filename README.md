# PrivacyLens

PrivacyLens is a Chrome Extension that reads Terms & Conditions / Privacy Policy pages and shows users a plain-English summary, red flags, and a risk score.

## Features
- Detects Terms & Conditions / Privacy Policy pages automatically.
- Extracts up to 15,000 characters of text to summarize.
- Provides a clean popup interface with a summary, third parties trust levels, red flags, and a risk score.
- Daily usage limiting implemented.

## Setup Instructions

### 1. Extension Setup
1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked**.
5. Select the `privacylens` directory (this folder containing `manifest.json`).

### 2. Backend Setup
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Initialize the project and install dependencies:
   ```bash
   npm init -y
   npm install express cors dotenv
   ```
3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   **IMPORTANT: Never commit the `.env` file to version control.**
4. Add your API keys to the `.env` file.
5. Start the backend server:
   ```bash
   node server.js
   ```

## Note
- This is a scaffolding project. The backend summarization API currently returns mock data.
