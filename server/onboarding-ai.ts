import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    const prompt = `Analyze this business for appointment management setup:

Business Name: ${responses.businessName || 'Not specified'}
Description: ${responses.businessDescription || 'Not specified'}
Current Challenges: ${responses.currentChallenges?.join(', ') || 'Not specified'}
Target Clients: ${responses.targetClients || 'Not specified'}
Existing Tools: ${responses.existingTools?.join(', ') || 'None'}
Team Size: ${responses.teamSize || 'Not specified'}

Provide recommendations in JSON format:
{
  "suggestedBusinessType": "medical|beauty|consulting|fitness|legal|other",
  "recommendedServices": ["service1", "service2", "service3"],
  "workingHoursRecommendation": "suggested schedule description",
  "clientManagementNeeds": ["need1", "need2", "need3"],
  "communicationPreferences": ["sms", "email", "whatsapp"],
  "integrationGoals": ["goal1", "goal2", "goal3"],
  "personalizedTips": ["tip1", "tip2", "tip3"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert business consultant specializing in appointment management systems. Provide practical, actionable recommendations based on business analysis. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");
    const analysis = JSON.parse(content);
    return analysis;
  } catch (error) {
    console.error("Error analyzing business needs:", error);
    // Fallback recommendations
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
    const prompt = `Generate 3 specific, actionable recommendations for a ${businessType} business at onboarding step ${currentStep}.

User responses so far: ${JSON.stringify(userResponses)}

Provide recommendations as a JSON array of strings, each recommendation should be practical and specific to their business type and current progress.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant providing personalized business setup recommendations. Focus on practical, implementable advice."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.recommendations || [];
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a friendly AI assistant helping business owners set up their appointment management system. Generate a warm, personalized welcome message."
        },
        {
          role: "user",
          content: `Generate a welcome message for ${businessName}, a ${businessType} business. Keep it professional but friendly, and mention the benefits of a well-organized appointment system.`
        }
      ],
      max_tokens: 300,
    });

    return response.choices[0].message.content || `Welcome to ${businessName}! Let's set up your appointment management system to help you serve your clients better.`;
  } catch (error) {
    console.error("Error generating welcome message:", error);
    return `Welcome to ${businessName}! Let's set up your appointment management system to help you serve your clients better.`;
  }
}