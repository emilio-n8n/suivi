
import { GoogleGenAI, Type } from "@google/genai";

const getAIClient = () => {
  // L'initialisation utilise directement la variable d'environnement pour une sécurité maximale.
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
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
            text: "Tu es un assistant pédagogique expert. Transcris fidèlement les paroles de l'enseignant contenues dans cet audio. Ne fournis QUE le texte transcrit, sans aucune fioriture, introduction ou ponctuation inutile.",
          },
        ],
      },
    });

    const transcription = response.text?.trim();
    return transcription || "Transcription impossible.";
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Erreur lors de la transcription avec Gemini.");
  }
};

export const generateSummary = async (studentName: string, comments: string[]): Promise<string> => {
  const ai = getAIClient();
  const prompt = `Voici l'historique des observations pédagogiques pour l'élève : ${studentName}.
  
  Objectif : Rédiger une synthèse professionnelle et structurée pour un conseil de classe ou une réunion de fin de trimestre.
  
  Instructions :
  1. Identifie les points forts et les progrès.
  2. Relève les difficultés persistantes (comportement, apprentissage, attention).
  3. Propose 2 ou 3 pistes d'amélioration concrètes pour le trimestre suivant.
  4. Utilise un ton bienveillant mais factuel.
  
  Commentaires bruts de l'enseignant :
  ${comments.map((c, i) => `- ${c}`).join('\n')}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "La synthèse n'a pas pu être générée.";
  } catch (error) {
    console.error("Summary error:", error);
    throw new Error("Erreur lors de la génération du résumé.");
  }
};
