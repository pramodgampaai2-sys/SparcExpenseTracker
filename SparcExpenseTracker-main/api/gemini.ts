

import { GoogleGenAI, Type } from "@google/genai";

// Define default categories locally to remove external file dependency, improving serverless function reliability.
const DEFAULT_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Utilities',
  'Entertainment',
  'Health',
  'Other'
];

// This is designed to run as a Vercel Serverless Function
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!process.env.API_KEY) {
        return res.status(500).json({ error: 'API key is not configured on the server.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const { action = 'parse' } = req.body; // Default to 'parse' for backward compatibility

        if (action === 'report') {
            const { expenses, currencySymbol, monthLabel, allCategories } = req.body;
            if (!expenses || !currencySymbol || !monthLabel || !Array.isArray(allCategories)) {
                return res.status(400).json({ error: 'Missing required fields for report generation.' });
            }

            const prompt = `
            You are a friendly financial assistant. Based on the provided expense data for ${monthLabel}, generate a concise analysis and offer practical, actionable tips for managing expenses. The currency is ${currencySymbol}.

            The user has defined the following expense categories: ${JSON.stringify(allCategories)}. Use this context to understand their spending habits and tailor your suggestions. For example, if they have specific categories like 'Dining Out' vs 'Groceries', your advice can be more specific.

            Your response should ONLY contain:
            1. A brief, encouraging summary of the month's spending patterns, considering their custom categories.
            2. One or two actionable suggestions for managing expenses better in the future, based on the provided data and their category structure.

            IMPORTANT:
            - DO NOT include a list, table, or breakdown of spending by category. This information is added separately.
            - DO NOT use any Markdown formatting (like **, #, *, -). Write in plain text paragraphs.
            - Keep the tone positive and helpful.

            Here are the expenses for the month:
            ${JSON.stringify(expenses, ['amount', 'vendor', 'category', 'date'], 2)}
            `;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });
            const reportText = response.text ?? '';
            return res.status(200).json({ reportText });

        } else if (action === 'parse') {
            const { text, allCategories } = req.body;
            if (!text || typeof text !== 'string') {
                return res.status(400).json({ error: 'Invalid or missing "text" in request body.' });
            }

            const categoriesToUse = allCategories && Array.isArray(allCategories) && allCategories.length > 0 ? allCategories : DEFAULT_CATEGORIES;
            
            const expenseSchema = {
                type: Type.OBJECT,
                properties: {
                  isExpense: {
                    type: Type.BOOLEAN,
                    description: 'Set to true if the text describes a financial expense, otherwise set to false.'
                  },
                  amount: {
                    type: Type.NUMBER,
                    description: 'The transaction amount. Omit this field if isExpense is false.'
                  },
                  vendor: {
                    type: Type.STRING,
                    description: 'The merchant name. Omit this field if isExpense is false.'
                  },
                  description: {
                      type: Type.STRING
                  },
                  category: {
                    type: Type.STRING,
                    description: `The expense category. Omit this field if isExpense is false. Must be one of: ${categoriesToUse.join(', ')}.`
                  }
                },
                required: ['isExpense']
            };
    
            const prompt = `
              Analyze the following text, which is likely from an SMS or a notification about a financial transaction.
              Your primary task is to determine if it's a spending transaction.
    
              - If it IS a spending transaction: Set 'isExpense' to true and extract the expense amount, the vendor name, and suggest an appropriate category from this list: ${JSON.stringify(categoriesToUse)}. The vendor should be the merchant name, not the bank or payment method.
              - If it is NOT a spending transaction (e.g., a deposit, OTP, marketing message, balance inquiry): Set 'isExpense' to false and omit all other fields.
    
              Text to analyze: "${text}"
            `;
    
            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: expenseSchema
              }
            });
    
            const jsonString = (response.text ?? '').trim();
            if (!jsonString) {
                return res.status(200).json({ isExpense: false });
            }
            
            const parsedJson = JSON.parse(jsonString);
            return res.status(200).json(parsedJson);

        } else {
            return res.status(400).json({ error: 'Invalid action specified.' });
        }

    } catch (error) {
        console.error("Error in /api/gemini serverless function:", error);
        // Avoid leaking detailed error messages to the client
        return res.status(500).json({ error: 'An internal server error occurred.' });
    }
}