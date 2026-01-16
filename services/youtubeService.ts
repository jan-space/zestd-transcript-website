
import { YOUTUBE_ID_REGEX } from '../constants';
import { TranscriptItem } from '../types';

/**
 * Extract video ID from various YouTube URL formats including new si parameter.
 * Based on the comprehensive regex provided by the user.
 */
export function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    // Check if it's already a video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
        return url;
    }

    return null;
}

/**
 * Robustly fetches the transcript by:
 * 1. Fetching the YouTube video page.
 * 2. Extracting the caption track list from the page metadata using multiple regex strategies.
 * 3. Fetching the specific caption track URL provided by YouTube.
 */
export const fetchYouTubeTranscript = async (videoId: string): Promise<TranscriptItem[]> => {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(watchUrl)}&timestamp=${Date.now()}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error("Failed to reach YouTube via proxy.");

    const html = await response.text();
    
    // Strategy 1: Find ytInitialPlayerResponse
    const playerResponseRegex = /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+meta|<\/script)/;
    const playerMatch = html.match(playerResponseRegex);
    
    let captionTracks = null;

    if (playerMatch) {
      try {
        const playerResponse = JSON.parse(playerMatch[1]);
        captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      } catch (e) {
        console.warn("Failed to parse ytInitialPlayerResponse JSON");
      }
    }

    // Strategy 2: Directly find captionTracks array in HTML if Strategy 1 failed
    if (!captionTracks) {
      const captionRegex = /"captionTracks":\s*(\[.*?\])/;
      const captionMatch = html.match(captionRegex);
      if (captionMatch) {
        try {
          captionTracks = JSON.parse(captionMatch[1]);
        } catch (e) {
          console.warn("Failed to parse captionTracks JSON");
        }
      }
    }

    if (!captionTracks || captionTracks.length === 0) {
      // Strategy 3: Try guessing common timedtext URLs if metadata extraction fails
      console.warn("No caption tracks found in metadata. Attempting direct API fallback...");
      return fetchYouTubeTranscriptDirect(videoId);
    }

    // Select the best track: prefer manual ('en') then manual (any) then ASR
    const track = captionTracks.find((t: any) => t.languageCode === 'en' && t.kind !== 'asr') || 
                  captionTracks.find((t: any) => t.kind !== 'asr') || 
                  captionTracks[0];

    const baseUrl = track.baseUrl;
    if (!baseUrl) throw new Error("Caption track found but baseUrl is missing.");

    // Fetch the actual transcript content
    const transcriptUrl = baseUrl.includes('fmt=json3') ? baseUrl : `${baseUrl}&fmt=json3`;
    const transcriptProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(transcriptUrl)}`;
    
    const transRes = await fetch(transcriptProxyUrl);
    if (!transRes.ok) throw new Error("Failed to fetch caption data from YouTube.");
    
    const transData = await transRes.json();
    return parseJson3Transcript(transData);
  } catch (error: any) {
    console.error("Extraction Error:", error);
    // Final desperate fallback if everything else fails
    if (!error.message.includes("Transcripts are completely unavailable")) {
        try {
            return await fetchYouTubeTranscriptDirect(videoId);
        } catch (e) {
            throw error; // Throw the original error if fallback also fails
        }
    }
    throw error;
  }
};

/**
 * Direct API fallback for cases where page scraping is blocked or fails.
 */
async function fetchYouTubeTranscriptDirect(videoId: string): Promise<TranscriptItem[]> {
  const languages = ['en', 'en-US', 'en-GB', 'de', 'es', 'fr'];
  
  for (const lang of languages) {
    const urls = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&kind=asr&fmt=json3`
    ];

    for (const target of urls) {
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}&timestamp=${Date.now()}`;
        const res = await fetch(proxyUrl);
        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const data = JSON.parse(text);
          const parsed = parseJson3Transcript(data);
          if (parsed.length > 0) return parsed;
        }
      } catch (e) {
        continue;
      }
    }
  }

  throw new Error("Transcripts are completely unavailable for this video. It might be private, age-restricted, or captions are disabled.");
}

/**
 * Parses the YouTube internal 'json3' format into a clean TranscriptItem array.
 */
function parseJson3Transcript(jsonData: any): TranscriptItem[] {
  if (!jsonData || !jsonData.events) {
    return [];
  }
  
  return jsonData.events
    .filter((event: any) => event.segs)
    .map((event: any) => ({
      startTime: event.tStartMs / 1000,
      text: event.segs
        .map((seg: any) => seg.utf8)
        .join('')
        .replace(/\n/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
    }))
    .filter((item: TranscriptItem) => item.text.length > 0);
}
