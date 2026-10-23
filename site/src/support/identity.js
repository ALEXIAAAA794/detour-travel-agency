export const assistantName = "Nicia";
export const assistantTitle = language => language === "en" ? "Nicia, your AI assistant" : "Nicia, votre assistant IA";
export const authorLabel = (role, language) => role === "user" ? language === "en" ? "You" : "Vous" : assistantName;
export function welcomeMessage(language) {
  return { role: "assistant", content: language === "en"
    ? "Hello, I’m Nicia, your AI assistant. What would you like me to call you?"
    : "Bonjour, je suis Nicia, votre assistant IA. Comment souhaitez-vous que je vous appelle ?" };
}
