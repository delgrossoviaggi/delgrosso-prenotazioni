PACCHETTO INTEGRAZIONE (Logo + Locandine + Admin Firebase + Seatmap GT53/GT63)

Cosa contiene:
- seatmap-gt53.js / seatmap-gt63.js  -> piantine con 49-50-51-52-53 allineati in fondo
- locandine.js                      -> mostra locandine (basso a destra) + click imposta viaggio/tratta/data/bus e aggiorna URL
- admin.js                          -> modal admin + upload locandine (solo autenticato)
- firebase.js                       -> template config Firebase (incolla il tuo firebaseConfig)
- style-additions.css               -> CSS da copiare nel tuo style.css
- html-snippets.txt                 -> pezzi HTML da incollare in index.html
- firebase-rules.txt                -> regole Firestore/Storage

NOTE IMPORTANTI (ID):
Questo pacchetto usa questi id (se i tuoi sono diversi, cambia in locandine.js/main.js):
- viaggio       : select id="viaggio"
- dataViaggio   : input  id="dataViaggio"
- partenza      : (opzionale) id="partenza"
- arrivo        : (opzionale) id="arrivo"
- busType       : select id="busType"
- seatMap       : contenitore piantina id="seatMap"

Deploy su Firebase Hosting:
Vedi sezione 'FIREBASE HOSTING' nel file firebase-hosting-steps.txt
