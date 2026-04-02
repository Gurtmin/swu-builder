SWU Builder – zadávací dokumentace projektu
1. Účel projektu
   Projekt SWU Builder je aplikace pro procházení a filtrování karet Star Wars: Unlimited.
   Cílem aplikace je umožnit uživateli:
   procházet jednotlivé karty
   zobrazit detail karty včetně obrázku a atributů
   filtrovat karty podle různých parametrů
   řadit karty podle více úrovní pravidel
   rychle obnovit výchozí nastavení filtrů
   pracovat s přehledným UI, které funguje na desktopu i mobilu
---
2. Hlavní funkce aplikace
   Aplikace má poskytovat tyto hlavní funkce:
   načtení seznamu karet z JSON zdroje
   zobrazení detailu aktuálně vybrané karty
   navigaci mezi kartami
   filtrování karet podle více kritérií
   víceúrovňové řazení výsledků
   podporu zobrazení s duplicitami i bez duplicit
   zachování přehledného layoutu s filtrovacím panelem
---
3. Datový model
   3.1 Základní entita karty
   Každá karta je reprezentována typem `SwuCard`, který obsahuje:
   `id`
   `attributes`
   3.2 Důležité atributy karty
   Pro účely UI a filtrování jsou důležité zejména tyto atributy:
   `title`
   `subtitle`
   `cost`
   `power`
   `hp`
   `text`
   `deployBox`
   `epicAction`
   `type`
   `aspects`
   `traits`
   `arenas`
   `expansion`
   `rarity`
   `artFront`
   3.3 Relační pole
   Některá pole jsou jednovýběrová:
   `type`
   `expansion`
   `rarity`
   Jiná pole mohou obsahovat více hodnot:
   `aspects`
   `traits`
   `arenas`
---
4. Zdroj dat
   Data se načítají z URL:
   `VITE_CARDS_URL`
   nebo fallback z `/cards.json`
   Aplikace musí:
   načíst data asynchronně
   zobrazit loading stav během načítání
   zobrazit chybový stav při selhání načtení
---
5. Hlavní layout aplikace
   5.1 Horní panel
   Nahoře je samostatný panel obsahující:
   tlačítko `Předchozí`
   počitadlo pozice aktuální karty
   tlačítko `Další`
   posuvník pro rychlé přeskakování mezi kartami
   tlačítko `Rozbalit filtry` / `Skrýt filtry`
   5.2 Panel filtrů
   Pod horním panelem je samostatná sekce s filtry.
   Tato sekce se:
   zobrazí po rozbalení
   skryje po sbalení
   5.3 Hlavní obsah
   Pod filtrovacím panelem jsou dvě hlavní sekce:
   vlevo obrázek karty
   vpravo detail karty
   Na mobilu mají být tyto sekce pod sebou.
---
6. Zobrazení karty
   V detailu karty se zobrazují:
   název
   subtitle
   typ
   edice
   rarita
   aspekty
   traits
   arena
   cost
   power
   hp
   text karty
   6.1 Obrázek karty
   Obrázek karty se načítá z `artFront`.
   Aplikace má podporovat:
   stav načítání obrázku
   stav chyby obrázku
   placeholder při chybě nebo absenci obrázku
---
7. Duplicity
   Aplikace má pracovat ve dvou režimech:
   bez duplicit
   se zobrazením duplicit
   7.1 Bez duplicit
   Ve výchozím režimu se mají duplicitní karty odstraňovat na základě:
   `title`
   `subtitle`
   7.2 S duplicitami
   Pokud je zapnuta volba:
   `Zobrazit duplicitní karty`
   tak se místo deduplikovaného seznamu použije plný seznam karet.
---
8. Filtrování
   Aplikace má podporovat kombinaci více filtrů současně.
   Výsledná karta musí splnit všechny aktivní filtry.
   8.1 Typy filtrů
   Jednovýběrové hodnoty
   Tyto filtry pracují nad jednou hodnotou na kartě:
   `Types`
   `Expansions`
   `Rarities`
   Vícehodnotové filtry
   Tyto filtry pracují nad více hodnotami na kartě:
   `Traits`
   `Aspects`
   `Arena`
   Range filtry
   Tyto filtry pracují jako numerický interval:
   `Cost`
   `Power`
   `HP`
   Textový filtr
   Textový filtr:
   `Keyword`
---
9. Sekce filtrů
   9.1 Obecné
   Sekce `Obecné` obsahuje:
   pole `Keyword`
   checkbox `Zobrazit duplicitní karty`
   tlačítko `Původní nastavení`
   9.2 Stats
   Sekce `Stats` obsahuje řádkové zadání rozsahu pro:
   `Cost`
   `Power`
   `HP`
   Každý řádek má mít tvar:
   `Cost [od] - [do]`
   `Power [od] - [do]`
   `HP [od] - [do]`
   9.3 Řazení
   Sekce `Řazení` umožňuje definovat více úrovní řazení.
   Každá úroveň obsahuje:
   prioritu (1., 2., 3. ...)
   atribut řazení
   směr řazení
   tlačítko nahoru
   tlačítko dolů
   tlačítko smazat
   Je zde také tlačítko:
   `Přidat úroveň řazení`
   9.4 Ostatní sekce filtrů
   Samostatné tiles existují pro:
   `Arena`
   `Types`
   `Expansions`
   `Rarities`
   `Traits`
   `Aspects`
---
10. Chování jednotlivých filtrů
    10.1 Include / Exclude
    U výběrových filtrů má každý tile přepínač:
    `Include`
    `Exclude`
    10.2 Vše / Nic
    U výběrových filtrů má každý tile akce:
    `Vše`
    `Nic`
    10.3 Rozložení ovládání
    V každém filter tile mají být na stejném řádku:
    vlevo `Include / Exclude`
    vpravo `Vše / Nic`
    10.4 Jednovýběrové filtry
    Pro `Types`, `Expansions`, `Rarities` platí:
    Include
    Karta projde, pokud její hodnota je mezi vybranými hodnotami.
    Exclude
    Karta projde, pokud její hodnota není mezi vybranými hodnotami.
    10.5 Vícehodnotové filtry
    Pro `Traits`, `Aspects`, `Arena` platí:
    Include
    Karta projde, pokud obsahuje alespoň jednu z vybraných hodnot.
    Exclude
    Karta projde, pokud neobsahuje žádnou z vybraných hodnot.
---
11. Keyword filtr
    Sekce `Obecné` má obsahovat textové pole `Keyword`.
    11.1 Chování
    když je pole prázdné, filtr se neuplatní
    když je zadán text, vyfiltrují se pouze karty, které obsahují tento text
    11.2 Oblast vyhledávání
    Vyhledávání probíhá case-insensitive v těchto polích:
    název karty (`title`)
    text karty (`text`)
    `deployBox`
    `epicAction`
---
12. Range filtry
    12.1 Pole
    Range filtry existují pro:
    `Cost`
    `Power`
    `HP`
    12.2 Chování
    Pro každý stat platí:
    uživatel může zadat jen dolní mez
    uživatel může zadat jen horní mez
    může zadat obě meze
    když jsou obě pole prázdná, filtr se neuplatní
    karta bez dané numerické hodnoty při aktivním filtru neprojde
---
13. Filtr Expansions a tlačítko Premier
    Tile `Expansions` má kromě standardních tlačítek obsahovat i tlačítko:
    `Premier`
    13.1 Funkce tlačítka Premier
    Po kliknutí na tlačítko `Premier` se má:
    nastavit mód `Include`
    předvyplnit pouze sady, které jsou v aplikaci považovány za Premier legal
    13.2 Aktuálně používané Premier legal sady
    V aktuální implementaci jsou za Premier legal považovány tyto sady:
    `Jump to Lightspeed`
    `Legends of the Force`
    `Secrets of Power`
    `A Lawless Time`
    Tento seznam je v aplikaci uložen jako sdílená konstanta.
---
14. Řazení
    Aplikace podporuje víceúrovňové řazení.
    14.1 Podporované atributy pro řazení
    Každá úroveň řazení může použít jeden z těchto atributů:
    `Název`
    `Cost`
    `Power`
    `HP`
    `Typ`
    `Edice`
    `Rarita`
    `Arena`
    14.2 Směr řazení
    Každá úroveň může být nastavena jako:
    `vzestupně`
    `sestupně`
    14.3 Priorita řazení
    Pořadí řadicích pravidel určuje jejich prioritu:
    první pravidlo je hlavní
    druhé pravidlo je tie-breaker
    další pravidla se použijí při dalších shodách
    14.4 Fallback řazení
    Pokud všechna zadaná pravidla skončí shodou, použije se fallback stabilní řazení podle interního porovnání:
    název / subtitle
    edice
    id
---
15. Původní nastavení
    Tlačítko `Původní nastavení` v sekci `Obecné` vrací aplikaci do výchozího filtračního stavu.
    15.1 Co resetuje
    Po kliknutí se provede:
    `Types` → `Include` + vše vybráno
    `Expansions` → `Include` + vše vybráno
    `Rarities` → `Include` + vše vybráno
    `Traits` → `Include` + vše vybráno
    `Aspects` → `Include` + vše vybráno
    `Arena` → `Include` + vše vybráno
    `Cost` → prázdné
    `Power` → prázdné
    `HP` → prázdné
    `Keyword` → prázdné
    `Duplicity` → vypnuto
    `Řazení` → jedna úroveň `Název vzestupně`
    index aktuální karty → reset na začátek
---
16. Chování indexu a navigace
    16.1 Reset indexu
    Po změně filtrů nebo řazení se má resetovat index aktuální karty na začátek.
    Týká se to změn v:
    výběrových filtrech
    range filtrech
    keyword filtru
    řazení
    zobrazení duplicit
    16.2 Ochrana proti přetečení
    Pokud po aplikaci filtru index ukazuje mimo rozsah výsledků, nastaví se znovu na 0.
---
17. Dostupné seznamy hodnot
    Aplikace si má dynamicky odvodit dostupné hodnoty podle aktuálního základního datasetu.
    To znamená, že se z `baseCards` dynamicky vytvářejí seznamy:
    `availableTypes`
    `availableExpansions`
    `availableRarities`
    `availableTraits`
    `availableAspects`
    `availableArenas`
---
18. Responsive chování
    18.1 Desktop
    Na desktopu:
    nahoře toolbar
    pod ním filter panel
    pod ním dvě hlavní sekce vedle sebe
    tiles ve filtrech se skládají do gridu vedle sebe
    18.2 Mobil
    Na menších obrazovkách:
    toolbar se skládá do jednoho sloupce
    hlavní obsah jde pod sebe
    filter tiles jdou pod sebe
    detailní rozvržení v některých boxech se zjednodušuje
---
19. Styl a UX
    19.1 Vizuální principy
    Požadavky na styl:
    zachovat původní tmavý design
    nerozbít původní panely
    nové prvky sladit se stávajícím vzhledem
    držet jednotný tile / section styl
    19.2 Přehlednost
    Cílem UI je:
    rychlé filtrování
    přehledné zobrazování detailu karty
    snadná orientace v řazení
    minimální počet zbytečných kliků
---
20. Architektura logiky
    20.1 Základní tok zpracování dat
    načíst seznam karet
    vytvořit základní seřazený seznam
    případně provést deduplikaci
    aplikovat filtry
    aplikovat víceúrovňové řazení
    zobrazit výsledek
    20.2 Hlavní pomocné logiky
    Aplikace má obsahovat helpery pro:
    převod a čtení relačních názvů
    porovnávání stringů
    porovnávání čísel
    porovnávání podle jednotlivých sort fieldů
    porovnávání podle seznamu sort rules
    vyhodnocení include / exclude logiky
    vyhodnocení multi-value filtrů
    vyhodnocení keyword filtru
    vyhodnocení range filtru
---
21. Typová vrstva
    Projekt má mít centrální `types.ts`, který obsahuje:
    datové typy pro kartu
    typy relačních entit
    `FilterMode`
    `RangeValue`
    `SortField`
    `SortDirection`
    `SortRule`
    Tyto typy mají být sdílené mezi `App.tsx` a `FilterPanel.tsx`.
---
22. Přehled finálního UI
    Po rozbalení filtrů má být výsledné UI složeno takto:
    22.1 Obecné
    Obsahuje:
    `Keyword`
    `Zobrazit duplicitní karty`
    `Původní nastavení`
    22.2 Ostatní tiles
    Obsahuje tyto tiles:
    `Stats`
    `Řazení`
    `Arena`
    `Types`
    `Expansions`
    `Rarities`
    `Traits`
    `Aspects`
    22.3 Expansions
    Tile `Expansions` navíc obsahuje tlačítko:
    `Premier`
---
23. Praktický cíl projektu
    Výsledkem má být aplikace, která:
    umožňuje efektivně procházet karty SWU
    poskytuje flexibilní filtrování
    podporuje víceúrovňové řazení
    umožňuje rychlý návrat do výchozího nastavení
    zachovává přehledný a moderní layout
    funguje dobře na desktopu i mobilu