const formulaire = document.querySelector("#formulaire");
const champMessage = document.querySelector("#message");
const bouton = document.querySelector("#envoyer");
const messages = document.querySelector("#messages");
const statut = document.querySelector("#statut");

function afficherMessage(auteur, texte) {
  const element = document.createElement("p");
  element.className = "message";

  if (auteur === "Vous") {
    element.classList.add("utilisateur");
  }

  element.textContent = auteur + " : " + texte;
  messages.appendChild(element);
  messages.scrollTop = messages.scrollHeight;
}

afficherMessage(
  "Assistant",
  "Bonjour ! Je peux vous aider à préparer votre demande de voyage. Quelle est votre envie ?"
);

formulaire.addEventListener("submit", async (evenement) => {
  evenement.preventDefault();

  const message = champMessage.value.trim();
  if (!message || bouton.disabled) return;

  afficherMessage("Vous", message);
  champMessage.value = "";
  bouton.disabled = true;
  statut.textContent = "Réponse en cours…";

  try {
    const reponse = await fetch("/api/support/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(70000)
    });

    const donnees = await reponse.json();

    if (!reponse.ok) {
      throw new Error(
        donnees.error?.message || "Le service est indisponible."
      );
    }

    if (typeof donnees.reply?.content !== "string") {
      throw new Error("La réponse reçue est inexploitable.");
    }

    afficherMessage("Assistant", donnees.reply.content);
    statut.textContent = "";
  } catch (erreur) {
    statut.textContent =
      "Réponse non obtenue. Votre message reste visible ; vous pouvez réessayer ou contacter un conseiller.";
  } finally {
    bouton.disabled = false;
    champMessage.focus();
  }
});