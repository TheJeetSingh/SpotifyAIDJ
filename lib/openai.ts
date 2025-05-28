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

export async function generateMusicTasteRoasts(
  topTracks: string[],
  topArtists: string[],
  topGenres: string[],
  count: number = 5
): Promise<string[]> {
  try {
    // Use the gemini-1.5-flash-latest model for creative content
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    
    // Configure safety settings to allow humor while blocking harmful content
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

    // Construct a detailed prompt for generating personalized roasts
    const prompt = `
      You are a snarky, know-it-all music critic with the comedic timing of a 2000s male  who doesnt the word honey MTV VMA host. Roast the user's music taste like it's a mid-tier Coachella lineup—specific, brutal, and weirdly obsessed with their choices.  

      ## User's Music Profile:  
      - Top Songs: ${topTracks.slice(0, 10).join(', ')}  
      - Top Artists: ${topArtists.join(', ')}  
      - Top Genres: ${topGenres.join(', ')}  

      ## Roast Rules:  
      1. **No mercy**: If they love Ed Sheeran, hit 'em with "Ah, 'Shape of You'—the musical equivalent of a beige rental apartment."  
      2. **Deep cuts only**: Mock their favorite artist's most embarrassing phase (e.g., "Of *course* you like Machine Gun Kelly—someone's gotta keep Pop-Punk Walmart Revival alive").  
      3. **Trend-adjacent shame**: "Wow, 'indie folk'? Did your personality peak at a 2014 Mumford & Sons banjo drop?"  
      4. **Zero positivity**: This isn't a fan letter; it's a Yelp review for their soul.  

      ## Response Format:  
      Return ${count} roasts as raw, standalone lines. No intros, no emojis, just savagery.  

      Example (if top artist is Drake):  
      "Drake? More like 'I-just-discovered-the-concept-of-emotions-in-2015' core. Congrats on crying to 'Marvin's Room' like it's a personality trait."  
    `;

    // Generate content with higher temperature for more creativity
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      safetySettings,
      generationConfig: {
        temperature: 0.9, // Higher temperature for more creative responses
        maxOutputTokens: 1000,
      },
    });

    const response = result.response;
    const text = response.text();
    
    if (!text) return [];
    
    // Parse the results, splitting on new lines while preserving paragraphs
    const roasts = text.split('\n\n')
      .map(paragraph => paragraph.trim())
      .filter(roast => roast !== '')
      .slice(0, count); // Ensure we have exactly the requested number
    
    // If we don't have enough roasts, add some fallback options
    const fallbackRoasts = [
      `Your music taste is what I'd expect from someone who thinks "eclectic" means "I like both Taylor Swift and Taylor Swift's remixes."`,
      `Listening to ${topArtists[0] || 'your favorite artists'} doesn't make you interesting, it makes you a walking algorithm recommendation.`,
      `Your playlist screams "I base my entire personality on what the cool kids listened to five years ago."`,
      `${topGenres[0] || 'That genre'} fans like you are why musicians consider a career change to accounting.`,
      `I've seen more musical range in a car alarm than in your listening history.`
    ];
    
    while (roasts.length < count) {
      roasts.push(fallbackRoasts[roasts.length % fallbackRoasts.length]);
    }
    
    return roasts;
  } catch (error) {
    console.error('Error generating roasts with Gemini:', error);
    
    // Return fallback roasts if AI generation fails
    return [
      `Your music taste is what I'd expect from someone who thinks "eclectic" means "I like both Taylor Swift and Taylor Swift's remixes."`,
      `I see you've carefully curated your music with all the precision of a blindfolded dart player.`,
      `Your playlist is the audio equivalent of a beige wall in a doctor's waiting room.`,
      `Congratulations on having the musical taste of a middle schooler trying to impress their crush.`,
      `I've heard more musical diversity in an elevator than in your entire listening history.`
    ].slice(0, count);
  }
} 