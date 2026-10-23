// Aucun texte technique reçu du réseau ne devient un message de la conversation.
export function niciaErrorMessage(error,language="fr") {
 if(!error)return "";
 const en=language==="en";
 const code=error.code;
 if(code==="EMAIL_LINK_EXPIRED"||error.status===410)return en?"This preparation link has expired. Contact an adviser for a new link.":"Ce lien de préparation a expiré. Contactez un conseiller pour en recevoir un nouveau.";
 if(error.status===404||error.status===401||error.status===403)return en?"This preparation cannot be opened. Please check your link or contact an adviser.":"Cette préparation ne peut pas être ouverte. Vérifiez votre lien ou contactez un conseiller.";
 if(code==="RATE_LIMITED"||error.status===429)return en?"Let’s pause for a moment. Your messages are kept. Please try again shortly.":"Faisons une courte pause. Vos messages sont conservés. Réessayez dans un instant.";
 if(code==="PREPARATION_BUSY")return en?"An action is already in progress. Please wait before trying again.":"Une action est déjà en cours. Patientez avant de réessayer.";
 if(code==="INVALID_MESSAGE")return en?"Write a message of up to 2,000 characters.":"Écrivez un message de 2 000 caractères maximum.";
 if(code==="INVALID_PREFERENCES")return en?"Please check your dates and preferences, then save again.":"Vérifiez vos dates et vos envies, puis enregistrez à nouveau.";
 return en?"Nicia cannot complete this action just now. Your saved messages and wishes are kept. You can try again.":"Nicia ne peut pas terminer cette action pour le moment. Vos messages et envies enregistrés sont conservés. Vous pouvez réessayer.";
}
