# lararverktyg
Digitala undervisningsverktyg för klassrummet.

## Designstandard för kategoriundersidor

Godkänd av Thomas den 19 oktober 2026. Gäller översiktssidor med grupper av lärverktyg, som Tal och tals användning, Algebra och Samband och förändring.

- Stort mörkblått sidhuvud med stor logga, vit huvudrubrik, ljus underrubrik och guldgul linje under, enligt de befintliga kategoriundersidorna.
- Tydlig tillbaka-knapp ovanför verktygen med texten ”← Tillbaka till alla lärverktyg”, länkad till startsidan.
- Klickbara kort med samma bredd inom och mellan kategorier, även när en kategori endast innehåller ett eller två kort.
- Fyra kort per rad på stor skärm; tre, två eller ett på mindre skärmar. Behåll fasta kolumner så att enstaka kort inte sträcks över hela raden.
- Samma blå/guld-färgsättning, sökfunktion och stöd för mörkt läge som på befintliga kategoriundersidor.

Använd `algebra/index.html`, `tal-och-tals-anvandning/index.html` och `samband-och-forandring/index.html` som referenser. Denna standard gäller kategoriundersidor; de enskilda lärverktygen har fortsatt sin etablerade verktygsmall.

## Standard för knappen Nästa uppgift

Godkänd den 28 oktober 2026. När ett lärverktyg har en tydlig fortsättningsknapp för nästa träningsuppgift ska den vara visuellt starkare än sekundära knappar.

- Använd texten `Nästa uppgift →` när det passar verktyget.
- Mörkblå bakgrund, vit fet text och 3 px guldgul kant.
- Stor knapp: minst 210 px bred, cirka 15 px vertikal padding och 24 px horisontell padding.
- Rundade hörn, diskret skugga samt tydlig hover-, tryck- och fokusrespons.
- På mobil ska knappen kunna ta hela tillgängliga bredden.
- I nya verktyg används klassen `lv-btn-next` från `assets/lararverktyg.css`.
- Om pilen läggs i ett eget element kan `class="lv-next-arrow"` användas för gul pil.

Referensutseendet är knappen i `uttryckets-varde/index.html`. Den gemensamma CSS-filen innehåller även stöd för vanliga äldre id:n som `next`, `nextBtn` och `nextQuestion`.
