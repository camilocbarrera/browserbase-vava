import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function generateExtractionCode(
  prompt: string,
  responseData: any,
  url: string,
  dom?: string
): Promise<{ code: string; explanation: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required");
  }

  const htmlContent = dom || (typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2));
  const htmlPreview = htmlContent.length > 50000 
    ? htmlContent.substring(0, 50000) + `\n\n[HTML truncated - total length: ${htmlContent.length} characters]`
    : htmlContent;

  const systemPrompt = `You are an expert at analyzing web responses and generating deterministic Puppeteer code for data extraction.

Your task is to analyze the provided HTML/DOM content and generate Puppeteer code that will extract the data requested by the user.

Requirements:
- Code must be deterministic and reusable
- Extract data from the DOM (the page is already loaded)
- Return structured JSON data
- Handle edge cases (missing elements, errors)
- Use proper selectors (prefer data attributes, IDs, or stable class names)
- Use wait strategies when needed (waitForSelector, waitForFunction)
- The code will be executed in a function that receives 'page' as parameter
- Return the extracted data as a JSON object
- Do NOT include function wrapper or async/await wrapper - just the extraction logic
- Use page.evaluate() for DOM queries when possible
- Use page.$() or page.$$() for element selection
- Format the output as clean, structured JSON

Example structure:
const result = await page.evaluate(() => {
  // extraction logic here
  return { /* extracted data */ };
});
return result;

Response URL: ${url}

HTML/DOM Content:
${htmlPreview}

User Request: ${prompt}

Generate ONLY the Puppeteer code that extracts the requested data. Do not include explanations in the code itself.`;

  try {
    const { text } = await generateText({
      model: openai("gpt-5-nano"),
      system: systemPrompt,
      prompt: `Generate Puppeteer code to extract: ${prompt}`,
      temperature: 0.3,
    });

    const codeMatch = text.match(/```(?:javascript|typescript|js|ts)?\n?([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : text.trim();

    const explanation = `Generated code to extract: ${prompt}`;

    return { code, explanation };
  } catch (error) {
    console.error("Error generating extraction code:", error);
    throw new Error(
      `Failed to generate extraction code: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

