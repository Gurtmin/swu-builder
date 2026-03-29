# SWU Builder – zadání úprav filtrování a layoutu

## Přehled
Cílem je rozšířit aplikaci o filtrování podle numerických statů a zároveň zachovat původní layout i vzhled aplikace.

---

## 1. Nové filtry

Aplikace má nově podporovat filtrování podle:

- `Cost`
- `Power`
- `HP`

Tyto filtry fungují jako **číselný rozsah od–do**.

### Chování range filtrů
Pro každý z těchto statů platí:

- uživatel může vyplnit dolní hranici
- uživatel může vyplnit horní hranici
- může být vyplněna jen jedna z hodnot
- když jsou obě pole prázdná, filtr se neuplatní
- karta projde jen tehdy, pokud její hodnota spadá do zadaného intervalu
- karta bez dané hodnoty při aktivním filtru pro daný stat neprojde

---

## 2. Umístění stat filtrů

`Cost`, `Power` a `HP` nemají být každý v samostatném boxu.

Mají být sloučeny do jednoho společného boxu, například:

- `Stats`

### Vzhled boxu `Stats`
Uvnitř mají být jednotlivé staty zobrazeny po řádcích:

- `Cost [input od] - [input do]`
- `Power [input od] - [input do]`
- `HP [input od] - [input do]`

### Vizuální pravidla
- label statu je vlevo
- první input je dolní hranice
- mezi inputy je separator `-`
- druhý input je horní hranice
- inputy mají být malé a kompaktní, protože se očekávají krátké číselné hodnoty

---

## 3. Ostatní filtry

Zůstávají stávající filtry podle:

- `Types`
- `Expansions`
- `Rarities`
- `Traits`
- `Aspects`

### Include / Exclude
Každý z těchto filtrů má přepínač:

- `Include`
- `Exclude`

### Vše / Nic
Každý z těchto filtrů má akce:

- `Vše`
- `Nic`

### Rozložení horního řádku filtru
Bylo definováno, že:

- `Include / Exclude` a `Vše / Nic` mají být na **stejném řádku**
- ne pod sebou

Tedy typicky:

- vlevo `Include / Exclude`
- vpravo `Vše / Nic`

### Multi-value filtry
U filtrů jako `Traits` a `Aspects`, kde může být na kartě více hodnot, platí:

#### Include
Karta projde, pokud obsahuje **alespoň jednu** z vybraných hodnot.

#### Exclude
Karta projde jen tehdy, pokud neobsahuje **žádnou** z vybraných hodnot.

---

## 4. Duplicity

Volba pro duplicity má být samostatně umístěna:

- v horním samostatném boxu
- nad ostatními filtry

### Obsah
Checkbox:

- `Zobrazit duplicitní karty`

---

## 5. Hlavní layout aplikace

Má být zachován původní layout aplikace.

### 5.1 Horní panel
Nahoře je samostatná sekce obsahující:

- tlačítko `Předchozí`
- počitadlo aktuální karty
- tlačítko `Další`
- posuvník
- tlačítko `Rozbalit filtry` / `Skrýt filtry`

### 5.2 Panel filtrů
Pod horním panelem je samostatná sekce s filtry, která se zobrazí po rozbalení.

### 5.3 Hlavní obsah
Pod filtrovacím panelem jsou dvě hlavní sekce vedle sebe:

- vlevo obrázek karty
- vpravo atributy a detail karty

Na mobilu mají být tyto dvě sekce pod sebou.

---

## 6. Layout filtrů

### Desktop
Požadované rozložení filtrů:

- nahoře samostatný box `Duplicity`
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

## 7. Styl a UX

### Zachovat původní vzhled
Požadavky:

- nerozbít původní vzhled aplikace
- zachovat původní sekce/panely
- nové prvky mají být vizuálně sladěné se současným designem

### Konzistence filtrů
Filtry mají zůstat ve stylu sekcí / tile boxů jako dříve.

Nemají působit jako volně rozhozené prvky bez struktury.

---

## 8. Implementační logika

### State v aplikaci
Je potřeba přidat nové state hodnoty pro:

- `costRange`
- `powerRange`
- `hpRange`

Každý range má mít tvar:

- `min`
- `max`

### Filtrační logika
Při filtrování karet se má:

- vzít číselná hodnota daného statu
- aplikovat rozsah od–do
- karta musí splnit všechny aktivní filtry zároveň

### Reset indexu
Po změně filtrů se má resetovat index zobrazené karty na začátek, a to i při změně:

- `Cost`
- `Power`
- `HP`

---

## 9. Shrnutí výsledného UI

### Filtry
Po rozbalení filtrů má být vidět:

1. nahoře samostatný box `Duplicity`
2. pod tím grid boxů
3. v gridu mimo jiné box `Stats`
4. v boxu `Stats` tyto řádky:

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

## 10. Praktický cíl
Výsledkem má být přehlednější filtrování, které:

- rozšiřuje možnosti o numerické staty
- zachovává původní rozložení aplikace
- drží konzistentní vzhled
- funguje dobře na desktopu i mobilu
