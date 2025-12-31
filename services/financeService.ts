
import { GoogleGenAI, Type } from "@google/genai";
import { Asset, AssetType, MarketData, ExchangeRate } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const fetchFinanceData = async (assets: Asset[]): Promise<{ prices: MarketData[], rates: { USD: number, JPY: number } }> => {
  const symbols = assets
    .filter(a => a.symbol && (a.type === AssetType.US_STOCK || a.type === AssetType.TW_STOCK))
    .map(a => `${a.type === AssetType.US_STOCK ? 'US:' : 'TW:'}${a.symbol}`)
    .join(", ");

  const prompt = `Please find the current real-time stock prices and their 24h percentage change for these symbols: ${symbols || 'none'}. 
  Also, provide the current exchange rates for USD to TWD and JPY to TWD.
  Return the results strictly in JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  symbol: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  dailyChangePct: { type: Type.NUMBER, description: "The percentage change in the last 24 hours" },
                  name: { type: Type.STRING }
                },
                required: ["symbol", "price", "name", "dailyChangePct"]
              }
            },
            rates: {
              type: Type.OBJECT,
              properties: {
                usd_to_twd: { type: Type.NUMBER },
                jpy_to_twd: { type: Type.NUMBER }
              },
              required: ["usd_to_twd", "jpy_to_twd"]
            }
          },
          required: ["prices", "rates"]
        }
      }
    });

    const data = JSON.parse(response.text);
    return {
      prices: data.prices || [],
      rates: {
        USD: data.rates?.usd_to_twd || 32.5,
        JPY: data.rates?.jpy_to_twd || 0.21
      }
    };
  } catch (error) {
    console.error("Failed to fetch finance data:", error);
    return { 
      prices: [], 
      rates: { USD: 32.5, JPY: 0.21 } 
    };
  }
};
