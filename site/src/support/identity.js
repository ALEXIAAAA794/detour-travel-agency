export const assistantName = "Nicia";
export const assistantTitle = language => language === "en" ? "Nicia, your AI assistant" : "Nicia, votre assistant IA";
export const authorLabel = (role, language) => role === "user" ? language === "en" ? "You" : "Vous" : assistantName;
export function welcomeMessage(language) {
  return { role: "assistant", content: language === "en"
    ? "Hello! I’m Nicia, your AI assistant at DÉTOUR. I can help you plan your next trip. What are you looking for?"
    : "Bonjour ! Je suis Nicia, votre assistant IA de DÉTOUR. Je peux vous aider à imaginer votre prochain voyage. Que recherchez-vous ?" };
}
