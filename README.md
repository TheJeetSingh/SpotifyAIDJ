# Spotify Gemini DJ

An AI-powered DJ application that creates personalized playlists based on your Spotify listening history and preferences, powered by Google's Gemini AI.

## Features

- Spotify API integration for user authentication and music data
- AI-powered playlist generation using Google's Gemini
- Custom playlist creation with mood and genre selection
- Responsive user interface built with Next.js and Tailwind CSS
- AI-generated album cover art using Hugging Face Stable Diffusion

## Setup

### Prerequisites

- Node.js (v18+ recommended)
- Spotify Developer Account
- Google AI Studio API Key (for Gemini)
- Hugging Face API Token (for album cover generation)

### Spotify Developer Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Create a new application
3. Set the redirect URI to `http://localhost:3000/api/auth/callback`
4. Note your Client ID and Client Secret

### Google Gemini Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Copy your API key for the next step

### Hugging Face Setup

1. Create an account on [Hugging Face](https://huggingface.co/)
2. Go to your profile settings and navigate to Access Tokens
3. Create a new token and select "Read" access
4. Copy your API token for the next step

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/spotify-dj-ai.git
   cd spotify-dj-ai
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following:
   ```
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback
   GEMINI_API_KEY=your_gemini_api_key
   HUGGINGFACE_API_TOKEN=your_huggingface_token
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Use

1. Click "Login with Spotify" on the home page
2. After authentication, you'll be redirected to the dashboard
3. Select tracks from your top tracks that will influence the Gemini DJ
4. Choose a mood and optional genre
5. Click "Generate DJ Mix"
6. Once generated, the app will automatically create an AI-generated album cover for your playlist
7. You can regenerate the album cover by hovering over it and clicking the regenerate button
8. Open the playlist in Spotify to listen to your Gemini-generated mix

## Technologies Used

- Next.js
- React
- TypeScript
- Tailwind CSS
- Spotify Web API
- Google Gemini API
- Hugging Face Stable Diffusion API

## License

MIT
