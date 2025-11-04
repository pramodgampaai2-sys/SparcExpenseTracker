import { GoogleGenAI, Type } from "@google/genai";
import type { ParsedExpense, Expense } from '../types';
import { CATEGORIES } from '../constants';
import { sanitizeSmsText } from "../utils/textUtils";

interface AiExpenseResponse extends ParsedExpense {
  isExpense: boolean;
}

// This function is for direct API call (AI Studio)
const parseWithSdk = async (text: string, allCategories?: string[]): Promise<AiExpenseResponse | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const categoriesToUse = allCategories && allCategories.length > 0 ? allCategories : CATEGORIES;

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
      return null;
  }
  
  const parsedJson = JSON.parse(jsonString) as AiExpenseResponse;
  return parsedJson;
}


// This function is for proxy API call (Vercel)
const parseWithProxy = async (text: string, allCategories?: string[]): Promise<AiExpenseResponse | null> => {
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'parse', text, allCategories }),
    });
    if (!response.ok) {
        console.error("Proxy API call failed:", response.statusText);
        const errorBody = await response.text();
        console.error("Error body:", errorBody);
        return null;
    }
    return response.json() as Promise<AiExpenseResponse | null>;
}

export const parseExpenseFromText = async (text: string, allCategories?: string[]): Promise<ParsedExpense | null> => {
  try {
    // Sanitize the input text to remove extra whitespace and special characters from copy-pasting.
    const sanitizedText = sanitizeSmsText(text);
    let aiResponse: AiExpenseResponse | null;

    // A simple check: if API_KEY is present on the client, we're likely in AI Studio.
    // Otherwise, we're in a production environment like Vercel and should use the proxy.
    if (process.env.API_KEY) {
      aiResponse = await parseWithSdk(sanitizedText, allCategories);
    } else {
      aiResponse = await parseWithProxy(sanitizedText, allCategories);
    }

    if (aiResponse && aiResponse.isExpense && typeof aiResponse.amount === 'number' && typeof aiResponse.vendor === 'string') {
        const parsedExpense: ParsedExpense = {
            amount: aiResponse.amount,
            vendor: aiResponse.vendor,
            // Fix: Cannot find name 'ai'. Use 'aiResponse.description' to access the description from the AI's response.
            description: aiResponse.description,
            category: aiResponse.category,
        };
        const categoriesToUse = allCategories && allCategories.length > 0 ? allCategories : CATEGORIES;

        // Validate the category from the AI response case-insensitively.
        // If a match is found, use the correctly cased category name from our list.
        if (parsedExpense.category) {
            const modelCategoryLower = parsedExpense.category.toLowerCase().trim();
            const matchingCategory = categoriesToUse.find(c => c.toLowerCase() === modelCategoryLower);

            if (matchingCategory) {
                parsedExpense.category = matchingCategory;
            } else {
                // If no valid category is found, unset it.
                delete parsedExpense.category;
            }
        }
        return parsedExpense;
    }

    return null;
  } catch (error) {
    console.error("Error parsing expense with Gemini:", error);
    return null;
  }
};


const generateReportWithSdk = async (expenses: Expense[], currencySymbol: string, monthLabel: string, allCategories: string[]): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text ?? null;
    } catch (error) {
        console.error("Error generating report with Gemini SDK:", error);
        return null;
    }
};

const generateReportWithProxy = async (expenses: Expense[], currencySymbol: string, monthLabel: string, allCategories: string[]): Promise<string | null> => {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'report',
                expenses,
                currencySymbol,
                monthLabel,
                allCategories
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Proxy API call for report failed:", response.status, response.statusText, errorBody);
            
            let errorMessage = `Server returned status ${response.status}`;
            if (response.statusText) {
                errorMessage += ` (${response.statusText})`;
            }

            try {
                const parsedError = JSON.parse(errorBody);
                if (parsedError.error) {
                    errorMessage = parsedError.error;
                }
            } catch (e) {
                // Not a JSON error body, use text if available and it's not HTML
                if (errorBody && !errorBody.trim().startsWith('<!DOCTYPE')) {
                    errorMessage = errorBody;
                }
            }
            
            return `Report generation failed: ${errorMessage}.`;
        }

        const result = await response.json();
        return result.reportText ?? null;
    } catch (error) {
        console.error("Error calling report generation proxy:", error);
        return "Report generation failed due to a network error. Please check your connection and try again.";
    }
};

export const generateMonthlyReport = async (expenses: Expense[], currencySymbol: string, monthLabel: string, allCategories: string[]): Promise<string | null> => {
    // A simple check: if API_KEY is present on the client, we're likely in AI Studio.
    if (process.env.API_KEY) {
        return generateReportWithSdk(expenses, currencySymbol, monthLabel, allCategories);
    } else {
        return generateReportWithProxy(expenses, currencySymbol, monthLabel, allCategories);
    }
};