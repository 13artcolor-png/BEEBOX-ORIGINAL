import { GoogleGenAI, Type } from "@google/genai";
import { CrgLot } from '../types';

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


export async function analyzeCrgReport(imagesBases64: string[]): Promise<{ date: string; virement: number; lots: CrgLot[] }> {
    if (!process.env.API_KEY) {
        throw new Error("Erreur: La clé API n'est pas configurée.");
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const imageParts = imagesBases64.map(base64 => ({
            inlineData: { mimeType: 'image/jpeg', data: base64 },
        }));

        const textPart = {
            text: `Tu analyses un Compte Rendu de Gérance (CRG) ORPI multi-pages.

TÂCHE: Pour chaque LOT (identifié par "Lot : Box N°X" ou "BOX N°X" ou similaire), extrais les données de CHAQUE locataire listé dans ce lot.

Pour chaque locataire d'un lot:
- nom: nom complet tel qu'il apparaît
- loyer: montant de la ligne "Loyer Garage", "Loyer box" ou ligne de loyer principal (0 si absent ou si c'est une dette reportée)
- quittance: montant total quittancé pour ce locataire
- regle: montant total réglé par ce locataire
- solde: solde restant dû (valeur positive = le locataire a une dette envers le propriétaire)

IMPORTANT: Inclure TOUS les locataires d'un lot, y compris ceux avec loyer=0 (ce sont des dettes d'anciens locataires reportées chaque mois).

Au niveau global du document, extrais aussi:
- date: la date du document au format "DD/MM/YYYY" (cherche "Chauny, le..." ou date d'en-tête)
- virement: le montant final viré au propriétaire (cherche "Virement", "Net à virer", "À virer au bailleur")

Combine les résultats de TOUTES les pages en une seule réponse JSON complète.`,
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, ...imageParts] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        date: { type: Type.STRING, description: "Date du document DD/MM/YYYY" },
                        virement: { type: Type.NUMBER, description: "Montant du virement final au propriétaire" },
                        lots: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    boxId: { type: Type.STRING, description: "Numéro du box (chiffre uniquement, ex: '1', '23')" },
                                    locataires: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                nom: { type: Type.STRING },
                                                loyer: { type: Type.NUMBER },
                                                quittance: { type: Type.NUMBER },
                                                regle: { type: Type.NUMBER },
                                                solde: { type: Type.NUMBER },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Erreur lors de l'analyse du CRG par Gemini:", error);
        throw new Error("Impossible d'analyser le CRG. L'IA a rencontré un problème.");
    }
}