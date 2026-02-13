
import { GoogleGenAI } from "@google/genai";


let ai: GoogleGenAI | null = null;
const apiKey = process.env.API_KEY;

if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey: apiKey });
  } catch (error) {
    console.warn("Failed to initialize GoogleGenAI", error);
  }
} else {
  console.warn("Gemini API Key is missing. AI features will be disabled.");
}



export async function getToolDescription(toolName: string) {
  if (!ai) return null;
  try {

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Buat deskripsi pemasaran yang sangat menarik, persuasif, dan profesional dalam Bahasa Indonesia untuk tool AI bernama "${toolName}". Fokus pada manfaat untuk kreator digital Indonesia, gunakan gaya bahasa yang modern tapi mudah dimengerti pemula.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}


export async function askSupport(question: string) {
  if (!ai) return "Sistem bantuan AI sedang tidak aktif. Silakan hubungi admin.";
  try {

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: question,
      config: {
        systemInstruction: "Anda adalah asisten bantuan TEXA-Ai, marketplace AI nomor 1 di Indonesia. Tugas Anda adalah membantu pengguna (kreator digital) dengan masalah teknis injeksi sesi, pertanyaan langganan, dan rekomendasi tool dalam Bahasa Indonesia yang ramah, santun, dan sangat solutif. Gunakan istilah gaul digital yang sopan."
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Maaf, sistem bantuan kami sedang sibuk. Silakan coba lagi nanti atau hubungi WhatsApp admin.";
  }
}
