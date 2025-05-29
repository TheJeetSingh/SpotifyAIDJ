import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp'; // Import sharp

interface CoverArtRequest {
  mood: string;
  genre?: string;
  songTitles?: string[];
  description?: string;
}

/**
 * Generates a cover art prompt based on the playlist information
 */
const generateImagePrompt = (data: CoverArtRequest): string => {
  const { mood, genre, songTitles = [], description = '' } = data;
  
  const qualityParams = 'epic, vibrant, professional album cover art, high resolution, trending on artstation';
  
  const moodMap: Record<string, string> = {
    'energetic': 'explosive energy, dynamic motion, bright contrasting colors, bold abstract shapes',
    'chill': 'serene atmosphere, soft diffused lighting, gentle color palette, minimalist clean vibe',
    'party': 'neon lights, festive celebration, bokeh, dynamic crowd, night cityscape',
    'focus': 'geometric precision, minimalist design, subtle gradients, intellectual mood, clear lines',
    'workout': 'powerful figures, sense of motion, sweat, high contrast, motivational imagery',
    'happy': 'sunshine rays, joyful expressions, vibrant flowers, bright sky, uplifting feeling',
    'sad': 'raindrops on window, melancholic landscape, muted blue and grey tones, solitary figure, emotional depth',
    'romantic': 'soft candlelight, rose petals, intimate setting, warm reds and pinks, gentle embrace',
    'nostalgic': 'vintage film grain, sepia tones, retro objects, faded memories, classic car',
    'upbeat': 'playful patterns, bright primary colors, smiling faces, confetti, pop art style',
    'relaxing': 'calm ocean waves, zen garden, soft pastels, yoga pose, peaceful nature scene',
    'dreamy': 'surreal cloudscape, ethereal glow, floating islands, pastel nebula, whimsical characters',
    'intense': 'dramatic shadows, fiery explosions, sharp angles, glowing eyes, cinematic feel',
    'peaceful': 'misty forest, tranquil lake, soft morning light, dew drops, serene landscape',
    'dark': 'gothic architecture, moonlit night, mysterious shadows, swirling mist, brooding atmosphere'
  };

  const genreMap: Record<string, string> = {
    'pop': 'glossy finish, contemporary fashion, lens flare, vibrant',
    'rock': 'electric guitar, leather texture, stage lights, gritty, bold typography',
    'hip-hop': 'gold chains, graffiti art, urban streetwear, cityscape backdrop, confident pose',
    'r&b': 'velvet texture, soulful eyes, moody lighting, smooth, elegant',
    'electronic': 'glowing neon grid, futuristic cityscape, synthesizer wires, glitch effects, abstract digital art',
    'dance': 'disco ball, laser lights, dancing silhouettes, energetic patterns',
    'indie': 'hand-drawn elements, vintage camera, quirky illustration, natural textures, muted tones',
    'jazz': 'saxophone silhouette, smoky club, art deco patterns, monochrome with gold accents',
    'classical': 'ornate frame, marble statue, violin scroll, grand piano, timeless elegance',
    'folk': 'acoustic guitar, campfire, forest path, woven fabric texture, earthy tones',
    'country': 'denim texture, cowboy hat, barn wood, sunset over plains, rustic charm',
    'metal': 'flaming skulls, distorted guitars, chrome spikes, dark fantasy elements, strong blackletter font',
    'funk': 'lava lamp, psychedelic patterns, vibrant orange and purple, afros, retro cool',
    'soul': 'vinyl record, microphone, expressive portrait, warm earthy tones, deep emotion',
    'reggae': 'lion of Judah, rasta colors (red, gold, green), palm trees, relaxed beach vibe',
    'blues': 'old guitar, harmonica, dimly lit bar, expressive hands, vintage feel',
    'ambient': 'abstract color fields, soft focus, flowing lines, ethereal landscape, generative art style',
    'disco': 'glitter, platform shoes, colorful dance floor, 70s fashion, mirror ball reflections',
    'trap': 'dripping paint effect, luxury car, moody urban night scene, bold graphics, diamond textures'
  };

  const moodDescription = moodMap[mood] || mood;
  const genreArtistInspiration = genre && genreMap[genre] ? genreMap[genre] : '';
  
  const promptSegments = [
    moodDescription
  ];

  if (genreArtistInspiration) {
    promptSegments.push(genreArtistInspiration);
  }

  // Incorporate user-provided description more directly
  if (description && description.trim() !== '') {
    promptSegments.push(description.trim());
  }

  if (songTitles && songTitles.length > 0) {
    const titleCues = songTitles.slice(0, 2).join(', '); // Use first 1-2 titles for cues
    promptSegments.push(`evoking themes from songs like ${titleCues}`);
  }
  
  promptSegments.push(qualityParams);

  return promptSegments.join(', ');
};

/**
 * Fallback method to get an image when Hugging Face API fails
 * Uses Lorem Picsum to get a random abstract image
 */
const getFallbackImage = async (): Promise<ArrayBuffer> => {
  // Get a random seed based on current time
  const seed = Math.floor(Math.random() * 1000);
  
  // Use Lorem Picsum for a random artistic image
  const response = await fetch(`https://picsum.photos/seed/${seed}/512/512`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch fallback image');
  }
  
  return await response.arrayBuffer();
};

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('spotify_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  try {
    // Get Hugging Face API token from environment variables
    const huggingfaceApiToken = process.env.HUGGINGFACE_API_TOKEN;
    if (!huggingfaceApiToken) {
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Hugging Face API token is not configured' },
        { status: 500 }
      );
    }
    
    const body = await request.json() as CoverArtRequest;
    const { mood, genre, songTitles } = body;
    
    if (!mood) {
      return NextResponse.json(
        { error: 'Invalid request', details: 'Mood is required' },
        { status: 400 }
      );
    }
    
    // Log generation attempt with mood and genre for monitoring
    console.log(`Generating album cover art with mood: ${mood}${genre ? ` and genre: ${genre}` : ''}`);
    if (songTitles && songTitles.length > 0) {
      console.log(`Song titles influencing the cover art: ${songTitles.slice(0, 3).join(', ')}${songTitles.length > 3 ? '...' : ''}`);
    }
    
    // Generate prompt for the image
    const prompt = generateImagePrompt(body);
    
    let imageBuffer: Buffer;
    let source: 'huggingface' | 'fallback' = 'huggingface';
    
    try {
      // Try Hugging Face API first
      const hfResponse = await fetch(
        "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3.5-large",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${huggingfaceApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: prompt
          }),
          // Hugging Face API may take some time to generate the image
          signal: AbortSignal.timeout(60000) // 60 second timeout for potentially larger model
        }
      );
      
      if (!hfResponse.ok) {
        const errorText = await hfResponse.text();
        console.error("Hugging Face API error:", errorText);
        throw new Error(`Hugging Face API error: ${errorText}`);
      }
      
      // The response is binary image data
      imageBuffer = Buffer.from(await hfResponse.arrayBuffer());
      
    } catch (error) {
      console.warn("Falling back to alternative image generator:", error);
      // Use fallback image generator
      imageBuffer = Buffer.from(await getFallbackImage());
      source = 'fallback';
    }
    
    // Process image for Spotify: convert to JPEG, resize, and ensure under 256KB
    let spotifyReadyBase64 = '';
    try {
        let processedImageBuffer = await sharp(imageBuffer)
            .jpeg({ quality: 80 }) // Convert to JPEG with quality 80
            .resize({ width: 512, height: 512, fit: 'cover' }) // Resize if needed
            .toBuffer();

        // Check size and reduce quality if necessary
        let quality = 80;
        while (processedImageBuffer.length > 256 * 1024 && quality > 10) {
            quality -= 10;
            console.log(`Image too large (${(processedImageBuffer.length / 1024).toFixed(1)}KB), reducing JPEG quality to ${quality}...`);
            processedImageBuffer = await sharp(imageBuffer)
                .jpeg({ quality: quality })
                .resize({ width: 512, height: 512, fit: 'cover' })
                .toBuffer();
        }

        if (processedImageBuffer.length > 256 * 1024) {
            console.warn("Could not reduce image size enough for Spotify cover.");
            // We might choose not to send a spotifyReadyBase64 in this case, or send it anyway and let Spotify reject it.
            // For now, we'll send it and log a warning.
        }
        spotifyReadyBase64 = processedImageBuffer.toString('base64');
    } catch (processingError) {
        console.error("Error processing image for Spotify:", processingError);
        // If processing fails, we won't have a Spotify-ready image.
    }

    // For client display, send original (or fallback) as PNG base64, as it might have better quality
    const displayBase64 = `data:image/${source === 'fallback' ? 'jpeg' : 'png'};base64,${imageBuffer.toString("base64")}`;
    
    return NextResponse.json({
      success: true,
      imageBase64: displayBase64, // For display on dashboard
      spotifyReadyBase64: spotifyReadyBase64, // For uploading to Spotify
      prompt: prompt,
      source: source
    });
  } catch (error) {
    console.error("Error generating album cover:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate album cover", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
} 