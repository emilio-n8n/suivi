
import { GoogleGenAI, Type } from "@google/genai";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Audio,
              mimeType: mimeType,
            },
          },
          {
            text: "Transcris exactement ce qui est dit dans cet enregistrement audio court concernant un élève. Ne rajoute aucun commentaire personnel, juste la transcription.",
          },
        ],
      },
    });

    return response.text || "Transcription impossible.";
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Erreur lors de la transcription avec Gemini.");
  }
};

export const generateSummary = async (studentName: string, comments: string[]): Promise<string> => {
  const ai = getAIClient();
  const prompt = `Voici une liste de commentaires pédagogiques accumulés durant le trimestre pour l'élève nommé ${studentName}. 
  Rédige une synthèse constructive et structurée pour la réunion de fin de trimestre. 
  La synthèse doit souligner les points forts, les difficultés persistantes et proposer des pistes d'amélioration. 
  Reste professionnel et bienveillant.
  
  Commentaires :
  ${comments.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Résumé indisponible.";
  } catch (error) {
    console.error("Summary error:", error);
    throw new Error("Erreur lors de la génération du résumé.");
  }
};
