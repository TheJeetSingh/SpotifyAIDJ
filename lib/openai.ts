import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generatePlaylistRecommendation(
  currentSongs: string[],
  mood: string,
  songCount: number = 5,
  genre?: string,
  favoriteArtists: string[] = []
): Promise<string[]> {
  try {
    // For text-only input, use the gemini-1.5-flash-latest model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    
    // Configure safety settings (optional)
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    // Construct a more detailed prompt
    const prompt = `
      You are an expert music curator and DJ with deep knowledge of music history, genres, artists, and song relationships.
      
      ## User's Music Profile:
      - Selected Songs: ${currentSongs.join(', ')}
      ${favoriteArtists.length > 0 ? `- Favorite Artists: ${favoriteArtists.join(', ')}` : ''}
      - Preferred Mood: ${mood}
      ${genre ? `- Preferred Genre: ${genre}` : ''}
      
      ## Task:
      Create a personalized playlist of ${songCount} songs that:
      1. Match the user's music taste based on their selected songs
      2. Create a cohesive listening experience with the ${mood} mood
      3. Ensure smooth transitions between songs (consider tempo, key, and energy)
      4. Include a mix of familiar artists and new discoveries the user would enjoy
      5. Balance between popular tracks and hidden gems
      6. Do not include any songs that have been attached in this prompt
      ${genre ? `7. Stay primarily within the ${genre} genre while incorporating complementary styles` : ''}
      8. Do not include any random songs or songs from artists that were not attached in this promot
      9. Make sure that the songs in this playlist match the theme of these songs
      10. Notice any patterns in the users music taste and try to cater to those instead of making a random playlsit
      11. Consult sites on the web that show what the user would probably like/listen to
      
      ## Response Format:
      Return ONLY a list of exactly ${songCount} songs in the format "Song Name - Artist Name", one per line.
      Do not include any explanations, numbering, or additional text.
    `;

    // Generate content
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      safetySettings,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800, // Increased for longer responses
      },
    });

    const response = result.response;
    const text = response.text();
    
    if (!text) return [];
    
    // Parse the results
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line !== '' && !line.startsWith('•') && !line.startsWith('-'));
  } catch (error) {
    console.error('Error generating recommendations with Gemini:', error);
    return [];
  }
} 