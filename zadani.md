# SWU Builder – zadání úprav filtrování a layoutu

## Přehled
Cílem je rozšířit aplikaci o filtrování podle numerických statů a klíčového slova a zároveň zachovat původní layout i vzhled aplikace.

---

## 1. Nové filtry

Aplikace má nově podporovat filtrování podle:

- `Cost`
- `Power`
- `HP`
- `Keyword`

### 1.1 Range filtry
Filtry `Cost`, `Power` a `HP` fungují jako **číselný rozsah od–do**.

Pro každý z těchto statů platí:

- uživatel může vyplnit dolní hranici
- uživatel může vyplnit horní hranici
- může být vyplněna jen jedna z hodnot
- když jsou obě pole prázdná, filtr se neuplatní
- karta projde jen tehdy, pokud její hodnota spadá do zadaného intervalu
- karta bez dané hodnoty při aktivním filtru pro daný stat neprojde

### 1.2 Keyword filtr
Aplikace má obsahovat textové pole `Keyword`.

Chování:

- když je pole prázdné, filtr se neuplatní
- když je v poli něco zadáno, vyfiltrují se pouze karty, které obsahují zadaný text
- hledání je case-insensitive
- hledá se v:
    - názvu karty
    - textu karty

Za text karty se považují relevantní textová pole karty, například:

- `text`
- `deployBox`
- `epicAction`

---

## 2. Sekce Obecné

Původní sekce `Zobrazení` má být přejmenována na:

- `Obecné`

Tato sekce má obsahovat:

- textové pole `Keyword`
- checkbox `Zobrazit duplicitní karty`
- tlačítko `Původní nastavení`

### 2.1 Původní nastavení
Po kliknutí na tlačítko `Původní nastavení` se má provést reset filtrů do výchozího stavu:

- `Types` → `Include` + vše vybráno
- `Expansions` → `Include` + vše vybráno
- `Rarities` → `Include` + vše vybráno
- `Traits` → `Include` + vše vybráno
- `Aspects` → `Include` + vše vybráno
- `Cost` → obě pole prázdná
- `Power` → obě pole prázdná
- `HP` → obě pole prázdná
- `Keyword` → prázdné
- `Duplicity` → vypnuto
- index aktuálně zobrazené karty → reset na začátek

---

## 3. Umístění stat filtrů

`Cost`, `Power` a `HP` nemají být každý v samostatném boxu.

Mají být sloučeny do jednoho společného boxu:

- `Stats`

### 3.1 Vzhled boxu `Stats`
Uvnitř mají být jednotlivé staty zobrazeny po řádcích:

- `Cost [input od] - [input do]`
- `Power [input od] - [input do]`
- `HP [input od] - [input do]`

### 3.2 Vizuální pravidla
- label statu je vlevo
- první input je dolní hranice
- mezi inputy je separator `-`
- druhý input je horní hranice
- inputy mají být malé a kompaktní, protože se očekávají krátké číselné hodnoty

---

## 4. Ostatní filtry

Zůstávají stávající filtry podle:

- `Types`
- `Expansions`
- `Rarities`
- `Traits`
- `Aspects`

### 4.1 Include / Exclude
Každý z těchto filtrů má přepínač:

- `Include`
- `Exclude`

### 4.2 Vše / Nic
Každý z těchto filtrů má akce:

- `Vše`
- `Nic`

### 4.3 Rozložení horního řádku filtru
Bylo definováno, že:

- `Include / Exclude` a `Vše / Nic` mají být na **stejném řádku**
- ne pod sebou

Tedy typicky:

- vlevo `Include / Exclude`
- vpravo `Vše / Nic`

### 4.4 Multi-value filtry
U filtrů jako `Traits` a `Aspects`, kde může být na kartě více hodnot, platí:

#### Include
Karta projde, pokud obsahuje **alespoň jednu** z vybraných hodnot.

#### Exclude
Karta projde jen tehdy, pokud neobsahuje **žádnou** z vybraných hodnot.

---

## 5. Duplicity

Volba pro duplicity má být samostatně umístěna v sekci `Obecné`.

### Obsah
Checkbox:

- `Zobrazit duplicitní karty`

---

## 6. Hlavní layout aplikace

Má být zachován původní layout aplikace.

### 6.1 Horní panel
Nahoře je samostatná sekce obsahující:

- tlačítko `Předchozí`
- počitadlo aktuální karty
- tlačítko `Další`
- posuvník
- tlačítko `Rozbalit filtry` / `Skrýt filtry`

### 6.2 Panel filtrů
Pod horním panelem je samostatná sekce s filtry, která se zobrazí po rozbalení.

### 6.3 Hlavní obsah
Pod filtrovacím panelem jsou dvě hlavní sekce vedle sebe:

- vlevo obrázek karty
- vpravo atributy a detail karty

Na mobilu mají být tyto dvě sekce pod sebou.

---

## 7. Layout filtrů

### Desktop
Požadované rozložení filtrů:

- nahoře samostatný box `Obecné`
- pod tím grid ostatních filtrů
- boxy se mají zobrazovat vedle sebe, pokud se vejdou
- pokud se nevejdou, mají se zalomit do dalšího řádku

### Mobil
Na menších obrazovkách mají být boxy:

- pod sebou
- jeden box na řádek

### Box `Stats`
Box `Stats` je jeden z boxů v tomto gridu.

---

## 8. Styl a UX

### Zachovat původní vzhled
Požadavky:

- nerozbít původní vzhled aplikace
- zachovat původní sekce/panely
- nové prvky mají být vizuálně sladěné se současným designem

### Konzistence filtrů
Filtry mají zůstat ve stylu sekcí / tile boxů jako dříve.

Nemají působit jako volně rozhozené prvky bez struktury.

---

## 9. Implementační logika

### 9.1 State v aplikaci
Je potřeba přidat nové state hodnoty pro:

- `costRange`
- `powerRange`
- `hpRange`
- `keyword`

Každý range má mít tvar:

- `min`
- `max`

### 9.2 Filtrační logika
Při filtrování karet se má:

- vzít číselná hodnota daného statu
- aplikovat rozsah od–do
- aplikovat keyword filtr
- karta musí splnit všechny aktivní filtry zároveň

### 9.3 Reset indexu
Po změně filtrů se má resetovat index zobrazené karty na začátek, a to i při změně:

- `Cost`
- `Power`
- `HP`
- `Keyword`

---

## 10. Shrnutí výsledného UI

### Filtry
Po rozbalení filtrů má být vidět:

1. nahoře samostatný box `Obecné`
2. v něm:
    - `Keyword`
    - `Zobrazit duplicitní karty`
    - `Původní nastavení`
3. pod tím grid boxů
4. v gridu mimo jiné box `Stats`
5. v boxu `Stats` tyto řádky:

- `Cost [od] - [do]`
- `Power [od] - [do]`
- `HP [od] - [do]`

### Ostatní boxy
Ostatní filtry (`Types`, `Expansions`, `Rarities`, `Traits`, `Aspects`) mají obsahovat:

- název filtru
- počitadlo vybraných hodnot
- `Include / Exclude`
- `Vše / Nic` na stejném řádku
- seznam checkboxů

### Hlavní stránka
Mimo filtry zůstává:

- nahoře toolbar
- dole vlevo obrázek
- dole vpravo detail karty

---

## 11. Praktický cíl
Výsledkem má být přehlednější filtrování, které:

- rozšiřuje možnosti o numerické staty a keyword
- zachovává původní rozložení aplikace
- drží konzistentní vzhled
- funguje dobře na desktopu i mobilu
