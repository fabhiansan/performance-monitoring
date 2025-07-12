
import { GoogleGenAI } from "@google/genai";
import { Employee } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generatePerformanceSummary = async (employee: Employee): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  
  const performanceDetails = employee.performance
    .map(p => `- ${p.name}: ${p.score.toFixed(1)}/100`)
    .join('\n');

  const prompt = `
You are an expert HR analyst tasked with writing a performance review summary. The following data represents a 360-degree review for an employee, with scores averaged from multiple raters.

Employee Name: ${employee.name}
Job/Department: ${employee.job}
Average Competency Scores:
${performanceDetails}

Based ONLY on the data provided, write a concise, professional, and constructive performance summary in a single paragraph (3-4 sentences).

Instructions:
1. Adopt a positive and encouraging tone.
2. If there is clear variation in scores, identify 1-2 key strengths from the highest scores and 1-2 potential areas for growth from the lowest scores.
3. If the scores are very consistent with little variation, comment on the employee's steady and reliable performance across their competencies.
4. Interpret the scores rather than repeating them. For instance, use phrases like "demonstrates strong capabilities in..." for high scores, or "could benefit from further development in..." for lower scores.
5. Do NOT invent information or make assumptions beyond the provided data.
6. The summary MUST be based strictly on the scores.

Please generate the summary now.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.5,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 250,
      }
    });

    const summaryText = response.text;
    if (!summaryText) {
      throw new Error("The AI model returned an empty response. This might be due to content safety filters or an issue with the prompt.");
    }
    
    return summaryText.trim();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate summary: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the summary.");
  }
};
