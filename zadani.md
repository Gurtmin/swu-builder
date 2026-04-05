SWU Builder - aktualizovane zadani

## 1) Cil aplikace
Aplikace slouzi pro prohlizeni SWU karet, filtrovani a skladani decku + sideboardu.
Implementace je orientovana na rychlou praci: vyber karty vlevo, filtry nahore, deck panel vpravo.

## 2) Datovy model
- Primarni entita je `SwuCard` s daty v `card.attributes`.
- Jednovyberove relace:
  - `type.data.attributes.name`
  - `expansion.data.attributes.name`
  - `rarity.data.attributes.name`
- Vicehodnotove relace:
  - `traits.data[].attributes.name|title`
  - `aspects.data[].attributes.name|title`
  - `arenas.data[].attributes.name|title`
- Obrazky:
  - predni: `artFront.data.attributes.formats.card.url` (fallback `artFront.data.attributes.url`)
  - zadni: `artBack.data.attributes.formats.card.url` (fallback `artBack.data.attributes.url`)

## 3) Hlavni layout
- Horni toolbar:
  - Predchozi / dalsi
  - pocitadlo pozice
  - slider
  - vyhledavani (keyword)
  - prepinac zobrazeni filtru
- Pod toolbar je rozbalovaci panel filtru.
- Hlavni builder layout:
  - levy panel: obrazek + akce
  - volitelny stredni panel detailu (default vypnuto)
  - pravy panel: deck/sideboard
- Vyska builderu se prizpusobuje viewportu, deck panel se zarovnava na vysku leveho panelu.

## 4) Chovani karty vlevo
- Klik na hlavni obrazek prepina front/back, pokud karta ma `artBack`.
- Pri zmene aktualni karty se obraz vraci na front.
- U leader/base karty je pouze tlacitko `Pouzit`.
  - `Pouzit` nahradi aktualniho leadera nebo base v decku.
- U ostatnich karet jsou tlacitka:
  - `Pridat do decku`
  - `Pridat do sideboardu`

## 5) Filtry
- Filtr panel obsahuje:
  - Obecne:
    - `Zobrazit duplicitni karty`
    - `Zobrazit stredni panel detailu` (default false)
    - `Filtr do puvodniho nastaveni`
  - Ciselne rozsahy: Cost / Power / HP
  - Skupiny: Typ, Edice, Rarita, Traits, Aspekty, Arena
- Vyhledavani podle textu je v horni liste (toolbar), ne v Obecne.
- Include/Exclude funguje pro vsechny skupiny.
- Specialni volby:
  - Traits: `Bez traitu`
  - Aspekty: `Bez aspektu`
  - Arena: `Bez areny`
- Pravidla filtru Aspekty (aktualni implementace):
  - Rezim `Include`, zaskrtnuty 1 aspekt:
    - karta projde, pokud obsahuje tento aspekt
    - dalsi aspekty na karte se v tomto rezimu neresi
  - Rezim `Include`, zaskrtnute 2 aspekty:
    - karta musi obsahovat alespon jeden z vybranych aspektu
    - karta muze mit maximalne 1 dalsi (nevybrany) aspekt
  - Rezim `Include`, zaskrtnute 3 a vice aspektu:
    - karta musi obsahovat alespon jeden vybrany aspekt
    - karta nesmi obsahovat zadny aspekt mimo vyber
  - Rezim `Exclude`:
    - karta neprojde, pokud obsahuje jakykoliv z vyloucenych aspektu
  - Pokud karta nema zadny aspekt, je pro filtr reprezentovana hodnotou `Bez aspektu`.
- Arena filtr musi korektne pracovat i pro karty bez ground/space (reseno volbou `Bez areny`).
- Tlacitko `Premier` v edicich nastavi include + legalni edice:
  - Jump to Lightspeed
  - Legends of the Force
  - Secrets of Power
  - A Lawless Time

## 6) Reset filtru
Akce `Filtr do puvodniho nastaveni` resetuje:
- keyword
- showDuplicates
- showAttributesPanel (na false)
- vsechny vybery a mode skupin filtru (mode = include, vyber = vse dostupne)
- Cost/Power/HP range

## 7) Deck a sideboard
- Deck a sideboard jsou oddelene sekce.
- Kazda sekce ma vlastni hlavicku, pocet a sbaleni/rozbaleni.
- Karty jsou razeny:
  - 1) cost vzestupne
  - 2) title vzestupne
- Na kartach v decku/sideboardu:
  - nahled (klik skace na kartu ve slideru vlevo)
  - title + subtitle
  - tlacitka `-`, `+`, `>D/<D`, `>SB/<SB` dle zony
- Pokud karta neni v aktualne vyfiltrovanych kartach, cely item je cervene podbarven.
- Maximalni pocet kopii je 3 na stejnou kartu napric deck+sideboard.

## 8) Leader/Base pravidla
- V listu musi byt 1 leader a 1 base.
- Pod Export/Import je souhrn:
  - Leader
  - Base
- Pokud neni presne 1 kus, radek je vizualne oznacen jako nevalidni.
- Leader/Base nejsou zobrazeny v deck seznamu.
- Leader/Base se nezapocitavaji do poctu karet v decku.

## 9) Statistiky v panelu decku
- Pod Leader/Base souhrnem je cost distribuce:
  - 1, 2, 3, 4, 5, 6, 7+
- Distribuce se pocita pouze z decku (bez sideboardu a bez leader/base).

## 10) Import/export
- Export vytvari JSON s:
  - `version`
  - `exportedAt`
  - `deck[]`
  - `sideboard[]`
- Polozka deck/sideboard:
  - `id` (number|null)
  - `title` (string)
  - `subtitle` (string|null)
  - `count` (1..3)
- Pri exportu je pouzito `title` (ne `name`).
- Pri importu:
  - akceptuje i legacy `name` jako fallback pro title
  - hledani poradi:
    1) podle `id`
    2) podle `title`
    3) pokud existuje vice shodnych title a importovana polozka ma `subtitle`, pouzije se `title+subtitle`
    4) pokud subtitle neni dodano, pouzije se prvni nalezena karta se stejnym title
- Kdyz nektere polozky nejdou najit, alert vypise nazvy vsech nenalezenych karet.

## 11) Persistovane stavy
- LocalStorage:
  - `swu-builder.deckEntries.v1`
  - `swu-builder.filters.v1`
- Persistuje se deck i filtry.

## 12) Ikona aplikace
- Favicon je `public/jedi.svg` (v `index.html` odkaz `/jedi.svg`).

## 13) Referencni import soubor
- Pripraveny soubor: `public/deck-import-list.json`.
