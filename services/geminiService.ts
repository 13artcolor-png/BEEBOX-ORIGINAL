import { GoogleGenAI, Type } from "@google/genai";

export async function askGemini(history: { role: string; parts: { text: string }[] }[], question: string, isThinkingMode: boolean): Promise<string> {
  // IMPORTANT: The API key is injected automatically by the platform. Do not hardcode it.
  if (!process.env.API_KEY) {
    throw new Error("Erreur: La clé API n'est pas configurée. Veuillez vous assurer que la variable d'environnement API_KEY est définie.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const modelName = isThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const config = isThinkingMode ? { thinkingConfig: { thinkingBudget: 32768 } } : {};
    
    const response = await ai.models.generateContent({
        model: modelName,
        contents: [...history, { role: 'user', parts: [{ text: question }] }],
        config: config
    });

    return response.text;
  } catch (error) {
    console.error("Erreur lors de l'appel à l'API Gemini:", error);
    throw new Error("Désolé, une erreur s'est produite lors de la communication avec l'assistant. Veuillez réessayer.");
  }
}


export async function analyzeReportImage(imageBases64: string[]): Promise<any> {
    if (!process.env.API_KEY) {
        throw new Error("Erreur: La clé API n'est pas configurée.");
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const imageParts = imageBases64.map(base64 => ({
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64,
            },
        }));

        const textPart = {
            text: "Extrais les informations de chaque 'Lot' de ce compte rendu de gérance à travers toutes les pages fournies. Pour chaque lot, je veux le numéro du box (Lot : Box N°X), le nom complet du locataire (Locataire :) et le montant total du loyer (Total Général du lot). Ignore les lots qui ne sont pas des boxes ou qui n'ont pas de locataire listé. Combine les résultats de toutes les pages en une seule liste."
        };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, ...imageParts] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        locations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    boxNumber: {
                                        type: Type.STRING,
                                        description: "Le numéro du box, ex: '1', '2', 'N°4', etc."
                                    },
                                    tenantName: {
                                        type: Type.STRING,
                                        description: "Le nom complet du locataire."
                                    },
                                    rentAmount: {
                                        type: Type.NUMBER,
                                        description: "Le montant du 'Total Général du lot'."
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        return parsedJson.locations;

    } catch (error) {
        console.error("Erreur lors de l'analyse de l'image par Gemini:", error);
        throw new Error("Impossible d'analyser le document. L'IA a rencontré un problème.");
    }
}