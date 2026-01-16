
import { GoogleGenAI } from "@google/genai";
import { TranscriptItem } from "../types";

export const getGeminiSummary = async (transcript: TranscriptItem[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const transcriptText = transcript.map(t => t.text).join(" ").slice(0, 30000); // Limit context window
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a technical analyst. Summarize the following YouTube video transcript into exactly 3 professional, information-dense bullet points. Use a clear, technical tone. Focus on the core value proposition and key technical takeaways. Avoid fluff. 

      Transcript Data:
      ${transcriptText}`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Summary analysis concluded with no results.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Technical failure in AI processing unit. Unable to generate synopsis.";
  }
};
