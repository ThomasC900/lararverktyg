const trees = [
  { id: 1, name: "Tall", conifer: true,
    clue: "Tallen har långa barr som sitter två och två. Högt upp på stammen är barken ofta orangebrun.",
    images: ["Ett träd med bred, oregelbunden krona och grenar som breder ut sig åt sidorna.", "Orangebrun bark i tunna flagor.", "Långa, smala barr i par på en kvist."] },
  { id: 2, name: "Gran", conifer: true,
    clue: "Granens korta barr sitter ett och ett runt kvisten. Trädet har ofta en spetsig topp.",
    images: ["Ett träd med spetsig topp och grenar långt ner på stammen.", "Gråbrun, fjällig bark.", "Korta, spetsiga barr runt en kvist."] },
  { id: 3, name: "Vårtbjörk (björk)",
    clue: "Vårtbjörken har ofta vit bark med mörka märken. Bladen är trekantiga med tandad kant.",
    images: ["Ett ljust träd med smala grenar och luftig krona.", "Vit bark med mörka streck och fläckar.", "Ett spetsigt, ungefär trekantigt blad med tandad kant."] },
  { id: 4, name: "Ek",
    clue: "Ekens blad känns igen på sina rundade flikar. Äldre ekar har ofta grov bark med djupa fåror.",
    images: ["Ett träd med bred krona och grova grenar.", "Grov bark med djupa fåror.", "Ett blad med djupt inskurna, rundade flikar."] },
  { id: 5, name: "Bok",
    clue: "Boken har ofta slät, grå bark. Bladen är ovala med svagt vågig kant.",
    images: ["Ett lövträd med tät krona och grå stam.", "Slät, grå bark.", "Kopparbruna, ovala blad med spets och svagt vågig kant."] },
  { id: 6, name: "Lönn",
    clue: "Lönnens blad har flera spetsiga flikar som strålar ut från bladets skaft.",
    images: ["Ett lövträd med en bred, rundad krona.", "Gråbrun bark med fåror.", "Gröna blad med stora spetsiga flikar som strålar från bladbasen."] },
  { id: 7, name: "Rönn",
    clue: "Ett rönnblad består av flera tandade småblad som sitter parvis, med ett ensamt småblad längst ut.",
    images: ["Ett lövträd med upprätta grenar och relativt luftig krona.", "Gråbrun bark.", "Flera smala, tandade småblad längs ett gemensamt skaft."] },
  { id: 8, name: "Asp",
    clue: "Asplövet är ofta runt med vågig, grovt tandad kant. Det långa, platta bladskaftet gör att lövet lätt darrar i vinden.",
    images: ["Ett högt lövträd med smal stam och luftig krona.", "Grågrön bark med mörka märken.", "Flera nästan runda blad med grovt tandad kant. Ett yngre blad till höger är mer spetsigt."] }
];

const quiz = {
  items: trees,
  question: "Vilket träd är det?",
  captions: (tree) => ["Hela trädet", "Stam och bark", tree.conifer ? "Barr" : "Blad"],
  similar: (tree) => tree.conifer ? trees.find((choice) => choice !== tree && choice.conifer) : null
};
