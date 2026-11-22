// "Mis on uut": what changed in each version, shown to the parent in the app.
// Newest first. Every app change that reaches a build adds a line here (and in CHANGELOG.md).
// Write for parents, in plain Estonian. Security and privacy fixes are described in general
// terms only ("Turva- ja privaatsusparandused"), never how a weakness worked.
// The first entry's version must match "version" in app.json (a test checks this).

export interface Release {
  version: string;
  /** when the build went out, as shown to parents */
  date: string;
  changes: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: "0.2.1",
    date: "november 2026",
    changes: [
      "E-päevikust lisamise juhis soovitab nüüd esimesena ekraanipilti, nupp „Ekraanipildilt“ on eespool.",
      "Lapsevanema vaate privaatsusinfo ütleb täpsemalt, kuidas ülesanded TASA-sse jõuavad.",
    ],
  },
  {
    version: "0.2.0",
    date: "november 2026",
    changes: [
      "Õpilase nimeks saab kirjutada ees- ja perenime.",
      "Ekraanipildilt loetud tekstis ei katke laused enam rea lõpus pooleks.",
      "Kui sõnumis või tunni kirjelduses on „Kodutöö tähtajaga …“, lisatakse kodutöö selle tähtajaga (mitte automaatselt homseks).",
      "Pärast sõnumist lisamist saab tähtaega ja linke kohe muuta.",
      "Ühele ülesandele saab lisada mitu linki korraga: kleebi tekst, kõik aadressid võetakse sealt välja.",
      "Kleebitud tekstis muutuvad ka lühikesed aadressid (nt opiq.ee/kit/12) vajutatavaks lingiks.",
      "Uus: „Mis on uut“ lapsevanema vaates ja selgitus, mis juhtub andmetega, kui rakenduse kustutad.",
    ],
  },
  {
    version: "0.1.0",
    date: "3.–19. november 2026",
    changes: [
      "Esimene katseversioon: tänane päev, üks samm korraga, umbes 25-minutilised sammud ja tähistamine.",
      "Kodutööde lisamine e-päevikust kopeerides või ekraanipildilt (loetakse telefonis).",
      "Kontrolltöö kordamine, järeltöö, lugemisülesanded lehekülgede kaupa, tunniplaan ekraanipildilt.",
      "Lapsevanema vaade PIN-koodiga, preemia ilma rahata, igapäevane meeldetuletus.",
      "Tumedad värvid öörežiimis, õpilase enesetunde küsimus päeva lõpus, kergem päev pärast rasket.",
      "Ülesannet saab pärast lisamist muuta, ülesannetele saab lisada linke, 13+ õpilane saab ise kodutöid lisada.",
      "Turva- ja privaatsusparandused: rakendus küsib telefonilt vähem õigusi.",
    ],
  },
];

export const APP_VERSION = CHANGELOG[0].version;
