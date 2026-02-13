
import { GoogleGenAI, Chat, Type, GenerateContentResponse } from "@google/genai";
import { SolutionFile, SolutionMetadata, JsBug } from "../types";

export class QuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaError';
  }
}

export interface DiffAnalysis {
  summary: string;
  impactScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  keyChanges: { title: string; description: string; impact: string }[];
}

export class GeminiService {
  private chat: Chat | null = null;

  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private initChatIfNeeded() {
    if (!this.chat) {
      const ai = this.getAI();
      this.chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `You are an expert Microsoft Power Platform developer and solution architect. 
          You help users analyze Power Platform solutions. 
          You are now tasked with performing a "Visual Diff" analysis. 
          Given an old and new version of a file (XML, JSON, JS, etc.), explain the change in human terms.
          Focus on business logic, schema changes, and functional impact.`,
        }
      });
    }
    return this.chat;
  }

  private async executeWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.executeWithRetry(fn, retries - 1, delay * 2);
        }
        throw new QuotaError('API rate limit exceeded.');
      }
      throw error;
    }
  }

  async analyzeDiff(fileName: string, oldContent: string, newContent: string): Promise<DiffAnalysis> {
    const ai = this.getAI();
    const prompt = `Perform a high-level impact analysis on the changes made to the file "${fileName}".
    
    OLD CONTENT:
    \`\`\`
    ${oldContent.slice(0, 10000)}
    \`\`\`
    
    NEW CONTENT:
    \`\`\`
    ${newContent.slice(0, 10000)}
    \`\`\`
    
    Identify what actually changed in functional terms. Did a flow step get a new condition? Was a security privilege upgraded? Was a field type changed?`;

    const response: GenerateContentResponse = await this.executeWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "A 1-sentence executive summary of the change." },
            impactScore: { type: Type.NUMBER, description: "A score from 1-10 on how much this affects the system." },
            riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
            keyChanges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  impact: { type: Type.STRING, description: "Technical or business impact." }
                },
                required: ["title", "description", "impact"]
              }
            }
          },
          required: ["summary", "impactScore", "riskLevel", "keyChanges"]
        }
      }
    }));

    return JSON.parse(response.text || '{}') as DiffAnalysis;
  }

  async analyzeFlowStep(stepName: string, stepType: string, stepDefinition: string, flowContext: string): Promise<string> {
    const ai = this.getAI();
    // Truncate context significantly to ensure we focus on the step but have some surrounding info
    const truncatedContext = flowContext.length > 20000 ? flowContext.slice(0, 20000) + "...[truncated]" : flowContext;

    const prompt = `You are analyzing a specific step in a Power Automate flow or Classic Workflow.
    
    STEP NAME: ${stepName}
    TYPE: ${stepType}
    RAW DEFINITION: 
    \`\`\`
    ${stepDefinition}
    \`\`\`
    
    FULL FLOW CONTEXT (for reference):
    \`\`\`
    ${truncatedContext}
    \`\`\`
    
    Explain specifically what this step does in the context of the flow. 
    - If it's a condition, explain the logic being tested.
    - If it's an action, explain what data is being manipulated or what service is called.
    - If it contains expressions (e.g. @equals(...)), decode them into human readable logic.
    - Keep it concise (1-2 paragraphs) and business-focused.`;

    const response: GenerateContentResponse = await this.executeWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    }));

    return response.text || 'Analysis unavailable.';
  }

  async sendMessage(message: string): Promise<GenerateContentResponse> {
    const chat = this.initChatIfNeeded();
    return await this.executeWithRetry<GenerateContentResponse>(() => chat.sendMessage({ message }));
  }
}
