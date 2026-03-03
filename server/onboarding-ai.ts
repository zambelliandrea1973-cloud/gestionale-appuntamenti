import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not configured");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

export interface BusinessAnalysis {
  suggestedBusinessType: string;
  recommendedServices: string[];
  workingHoursRecommendation: string;
  clientManagementNeeds: string[];
  communicationPreferences: string[];
  integrationGoals: string[];
  personalizedTips: string[];
}

export async function analyzeBusinessNeeds(responses: {
  businessName?: string;
  businessDescription?: string;
  currentChallenges?: string[];
  targetClients?: string;
  existingTools?: string[];
  teamSize?: number;
}): Promise<BusinessAnalysis> {
  try {
    const model = getGeminiClient().getGenerativeModel({ model: 'gemini-2.0-flash-001' });

    const prompt = `You are an expert business consultant specializing in appointment management systems. Provide practical, actionable recommendations based on business analysis. Always respond with valid JSON only, no extra text.

Analyze this business for appointment management setup:

Business Name: ${responses.businessName || 'Not specified'}
Description: ${responses.businessDescription || 'Not specified'}
Current Challenges: ${responses.currentChallenges?.join(', ') || 'Not specified'}
Target Clients: ${responses.targetClients || 'Not specified'}
Existing Tools: ${responses.existingTools?.join(', ') || 'None'}
Team Size: ${responses.teamSize || 'Not specified'}

Provide recommendations in this exact JSON format:
{
  "suggestedBusinessType": "medical|beauty|consulting|fitness|legal|other",
  "recommendedServices": ["service1", "service2", "service3"],
  "workingHoursRecommendation": "suggested schedule description",
  "clientManagementNeeds": ["need1", "need2", "need3"],
  "communicationPreferences": ["sms", "email", "whatsapp"],
  "integrationGoals": ["goal1", "goal2", "goal3"],
  "personalizedTips": ["tip1", "tip2", "tip3"]
}`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    if (!content) throw new Error("No response from Gemini");
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    
    const analysis = JSON.parse(jsonMatch[0]);
    return analysis;
  } catch (error) {
    console.error("Error analyzing business needs:", error);
    return {
      suggestedBusinessType: "consulting",
      recommendedServices: ["Consultation", "Meeting", "Session"],
      workingHoursRecommendation: "Monday to Friday, 9:00 AM to 6:00 PM",
      clientManagementNeeds: ["appointment-scheduling", "client-communication", "payment-tracking"],
      communicationPreferences: ["email", "sms"],
      integrationGoals: ["calendar-sync", "automated-reminders", "client-portal"],
      personalizedTips: [
        "Start with basic appointment scheduling",
        "Set up automated reminders to reduce no-shows",
        "Create a simple client portal for easy booking"
      ]
    };
  }
}

export async function generateCustomizedRecommendations(
  businessType: string,
  currentStep: number,
  userResponses: any
): Promise<string[]> {
  try {
    const model = getGeminiClient().getGenerativeModel({ model: 'gemini-2.0-flash-001' });

    const prompt = `You are a helpful assistant providing personalized business setup recommendations. Focus on practical, implementable advice. Respond with valid JSON only.

Generate 3 specific, actionable recommendations for a ${businessType} business at onboarding step ${currentStep}.

User responses so far: ${JSON.stringify(userResponses)}

Respond with this exact JSON format:
{"recommendations": ["recommendation1", "recommendation2", "recommendation3"]}`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    if (!content) throw new Error("No response from Gemini");
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.recommendations || [];
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return [
      "Configure your core services and pricing",
      "Set up automated client communication",
      "Integrate with your existing calendar system"
    ];
  }
}

export async function generateWelcomeMessage(businessName: string, businessType: string): Promise<string> {
  try {
    const model = getGeminiClient().getGenerativeModel({ model: 'gemini-2.0-flash-001' });

    const result = await model.generateContent(
      `You are a friendly AI assistant helping business owners set up their appointment management system. Generate a warm, personalized welcome message for ${businessName}, a ${businessType} business. Keep it professional but friendly, and mention the benefits of a well-organized appointment system. Keep it under 200 words.`
    );

    return result.response.text() || `Welcome to ${businessName}! Let's set up your appointment management system to help you serve your clients better.`;
  } catch (error) {
    console.error("Error generating welcome message:", error);
    return `Welcome to ${businessName}! Let's set up your appointment management system to help you serve your clients better.`;
  }
}
