import { useEffect, useMemo, useState } from 'react'
import FilterPanel from './FilterPanel'
import type {
    FilterMode,
    RangeValue,
    SortDirection,
    SortField,
    SortRule,
    SwuCard,
} from './types'

const DATA_URL = import.meta.env.VITE_CARDS_URL || '/cards.json'

const PREMIER_LEGAL_EXPANSIONS = [
    'Jump to Lightspeed',
    'Legends of the Force',
    'Secrets of Power',
    'A Lawless Time',
]

function createSortRule(
    field: SortField = 'title',
    direction: SortDirection = 'asc',
): SortRule {
    return {
        id: crypto.randomUUID(),
        field,
        direction,
    }
}

function getCardName(card: SwuCard): string {
    return card.attributes.title || 'Unknown card'
}

function getSubtitle(card: SwuCard): string | null {
    return card.attributes.subtitle || null
}

function getImageUrl(card: SwuCard): string | null {
    const media = card.attributes.artFront?.data?.attributes

    return (
        media?.formats?.card?.url ||
        media?.formats?.medium?.url ||
        media?.formats?.small?.url ||
        media?.url ||
        null
    )
}

function getDeduplicationKey(card: SwuCard): string {
    const title = (card.attributes.title || '').trim().toLowerCase()
    const subtitle = (card.attributes.subtitle || '').trim().toLowerCase()

    return `${title}|||${subtitle}`
}

function getType(card: SwuCard): string {
    return card.attributes.type?.data?.attributes?.name || '—'
}

function getExpansion(card: SwuCard): string {
    return card.attributes.expansion?.data?.attributes?.name || '—'
}

function getRarity(card: SwuCard): string {
    return card.attributes.rarity?.data?.attributes?.name || '—'
}

function getTraits(card: SwuCard): string {
    const items = card.attributes.traits?.data || []

    if (!items.length) return '—'

    return items
        .map((item) => item.attributes?.name || item.attributes?.title)
        .filter(Boolean)
        .join(', ')
}

function getAspects(card: SwuCard): string {
    const items = card.attributes.aspects?.data || []

    if (!items.length) return '—'

    return items
        .map((item) => item.attributes?.name || item.attributes?.title)
        .filter(Boolean)
        .join(', ')
}

function getArenas(card: SwuCard): string {
    const items = card.attributes.arenas?.data || []

    if (!items.length) return '—'

    return items
        .map((item) => item.attributes?.name || item.attributes?.title)
        .filter(Boolean)
        .join(', ')
}

function getRulesText(card: SwuCard): string | null {
    return card.attributes.text || card.attributes.deployBox || card.attributes.epicAction || null
}

function compareCardsForDisplay(a: SwuCard, b: SwuCard): number {
    const keyA = getDeduplicationKey(a)
    const keyB = getDeduplicationKey(b)

    if (keyA !== keyB) {
        return keyA.localeCompare(keyB)
    }

    const expansionA = getExpansion(a)
    const expansionB = getExpansion(b)

    if (expansionA !== expansionB) {
        return expansionA.localeCompare(expansionB)
    }

    return a.id - b.id
}

function compareStrings(a: string, b: string): number {
    return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

function getNumericValue(value: number | null | undefined): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function compareNullableNumbers(a: number | null, b: number | null): number {
    if (a === null && b === null) return 0
    if (a === null) return 1
    if (b === null) return -1
    return a - b
}

function compareCardsBySortField(a: SwuCard, b: SwuCard, field: SortField): number {
    switch (field) {
        case 'title':
            return compareStrings(getCardName(a), getCardName(b))
        case 'cost':
            return compareNullableNumbers(
                getNumericValue(a.attributes.cost),
                getNumericValue(b.attributes.cost),
            )
        case 'power':
            return compareNullableNumbers(
                getNumericValue(a.attributes.power),
                getNumericValue(b.attributes.power),
            )
        case 'hp':
            return compareNullableNumbers(
                getNumericValue(a.attributes.hp),
                getNumericValue(b.attributes.hp),
            )
        case 'type':
            return compareStrings(getType(a), getType(b))
        case 'expansion':
            return compareStrings(getExpansion(a), getExpansion(b))
        case 'rarity':
            return compareStrings(getRarity(a), getRarity(b))
        case 'arena':
            return compareStrings(getArenas(a), getArenas(b))
        default:
            return 0
    }
}

function compareByRules(a: SwuCard, b: SwuCard, rules: SortRule[]): number {
    for (const rule of rules) {
        const result = compareCardsBySortField(a, b, rule.field)

        if (result !== 0) {
            return rule.direction === 'asc' ? result : -result
        }
    }

    return compareCardsForDisplay(a, b)
}

function matchesFilter(value: string, mode: FilterMode, selected: Set<string>): boolean {
    if (selected.size === 0) {
        return mode === 'include' ? false : true
    }

    if (mode === 'include') {
        return selected.has(value)
    }

    return !selected.has(value)
}

function isNonEmptyString(value: string | undefined | null): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

function getRelationNames(
    items: { attributes?: { name?: string; title?: string } }[] | undefined,
): string[] {
    return (items || [])
        .map((item) => item.attributes?.name || item.attributes?.title)
        .filter(isNonEmptyString)
}

function matchesMultiValueFilter(
    values: string[],
    mode: FilterMode,
    selected: Set<string>,
): boolean {
    if (selected.size === 0) {
        return mode === 'include' ? false : true
    }

    if (mode === 'include') {
        return values.some((value) => selected.has(value))
    }

    return values.every((value) => !selected.has(value))
}

function matchesRange(value: number | null, range: RangeValue): boolean {
    const min = range.min.trim()
    const max = range.max.trim()

    if (min === '' && max === '') {
        return true
    }

    if (value === null) {
        return false
    }

    if (min !== '' && value < Number(min)) {
        return false
    }

    if (max !== '' && value > Number(max)) {
        return false
    }

    return true
}

function matchesKeyword(card: SwuCard, keyword: string): boolean {
    const normalizedKeyword = keyword.trim().toLowerCase()

    if (!normalizedKeyword) {
        return true
    }

    const title = (card.attributes.title || '').toLowerCase()
    const text = (
        card.attributes.text ||
        card.attributes.deployBox ||
        card.attributes.epicAction ||
        ''
    ).toLowerCase()

    return title.includes(normalizedKeyword) || text.includes(normalizedKeyword)
}

export default function App() {
    const [keyword, setKeyword] = useState('')
    const [imageLoading, setImageLoading] = useState(true)
    const [imageError, setImageError] = useState(false)
    const [cards, setCards] = useState<SwuCard[]>([])
    const [index, setIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filtersOpen, setFiltersOpen] = useState(false)

    const [typeFilterMode, setTypeFilterMode] = useState<FilterMode>('include')
    const [selectedTypes, setSelectedTypes] = useState<string[]>([])

    const [expansionFilterMode, setExpansionFilterMode] = useState<FilterMode>('include')
    const [selectedExpansions, setSelectedExpansions] = useState<string[]>([])

    const [rarityFilterMode, setRarityFilterMode] = useState<FilterMode>('include')
    const [selectedRarities, setSelectedRarities] = useState<string[]>([])

    const [traitFilterMode, setTraitFilterMode] = useState<FilterMode>('include')
    const [selectedTraits, setSelectedTraits] = useState<string[]>([])

    const [aspectFilterMode, setAspectFilterMode] = useState<FilterMode>('include')
    const [selectedAspects, setSelectedAspects] = useState<string[]>([])

    const [arenaFilterMode, setArenaFilterMode] = useState<FilterMode>('include')
    const [selectedArenas, setSelectedArenas] = useState<string[]>([])

    const [costRange, setCostRange] = useState<RangeValue>({ min: '', max: '' })
    const [powerRange, setPowerRange] = useState<RangeValue>({ min: '', max: '' })
    const [hpRange, setHpRange] = useState<RangeValue>({ min: '', max: '' })

    const [sortRules, setSortRules] = useState<SortRule[]>([createSortRule('title', 'asc')])

    const [showDuplicates, setShowDuplicates] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function loadCards() {
            try {
                setLoading(true)
                setError(null)

                const response = await fetch(DATA_URL)

                if (!response.ok) {
                    throw new Error(`Failed to load cards: ${response.status}`)
                }

                const data = (await response.json()) as SwuCard[]

                if (!cancelled) {
                    setCards(data)
                    setIndex(0)
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Unknown error')
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        loadCards()

        return () => {
            cancelled = true
        }
    }, [])

    const sortedCards = useMemo(() => {
        return [...cards].sort(compareCardsForDisplay)
    }, [cards])

    const deduplicatedCards = useMemo(() => {
        const seen = new Set<string>()

        return sortedCards.filter((card) => {
            const key = getDeduplicationKey(card)

            if (seen.has(key)) {
                return false
            }

            seen.add(key)
            return true
        })
    }, [sortedCards])

    const baseCards = showDuplicates ? sortedCards : deduplicatedCards

    const availableTypes = useMemo(() => {
        return [...new Set(baseCards.map(getType).filter((value) => value && value !== '—'))].sort()
    }, [baseCards])

    const availableExpansions = useMemo(() => {
        return [
            ...new Set(baseCards.map(getExpansion).filter((value) => value && value !== '—')),
        ].sort()
    }, [baseCards])

    const availableRarities = useMemo(() => {
        return [...new Set(baseCards.map(getRarity).filter((value) => value && value !== '—'))].sort()
    }, [baseCards])

    const availableTraits = useMemo(() => {
        return [
            ...new Set(
                baseCards.flatMap((card) =>
                    (card.attributes.traits?.data || [])
                        .map((item) => item.attributes?.name || item.attributes?.title)
                        .filter(isNonEmptyString),
                ),
            ),
        ].sort()
    }, [baseCards])

    const availableAspects = useMemo(() => {
        return [
            ...new Set(
                baseCards.flatMap((card) =>
                    (card.attributes.aspects?.data || [])
                        .map((item) => item.attributes?.name || item.attributes?.title)
                        .filter(isNonEmptyString),
                ),
            ),
        ].sort()
    }, [baseCards])

    const availableArenas = useMemo(() => {
        return [
            ...new Set(
                baseCards.flatMap((card) =>
                    (card.attributes.arenas?.data || [])
                        .map((item) => item.attributes?.name || item.attributes?.title)
                        .filter(isNonEmptyString),
                ),
            ),
        ].sort()
    }, [baseCards])

    useEffect(() => {
        setSelectedTypes((prev) => (prev.length > 0 ? prev : availableTypes))
    }, [availableTypes])

    useEffect(() => {
        setSelectedExpansions((prev) => (prev.length > 0 ? prev : availableExpansions))
    }, [availableExpansions])

    useEffect(() => {
        setSelectedRarities((prev) => (prev.length > 0 ? prev : availableRarities))
    }, [availableRarities])

    useEffect(() => {
        setSelectedTraits((prev) => (prev.length > 0 ? prev : availableTraits))
    }, [availableTraits])

    useEffect(() => {
        setSelectedAspects((prev) => (prev.length > 0 ? prev : availableAspects))
    }, [availableAspects])

    useEffect(() => {
        setSelectedArenas((prev) => (prev.length > 0 ? prev : availableArenas))
    }, [availableArenas])

    const filteredCards = useMemo(() => {
        if (baseCards.length === 0) return []

        const selectedTypeSet = new Set(selectedTypes)
        const selectedExpansionSet = new Set(selectedExpansions)
        const selectedRaritySet = new Set(selectedRarities)
        const selectedTraitSet = new Set(selectedTraits)
        const selectedAspectSet = new Set(selectedAspects)
        const selectedArenaSet = new Set(selectedArenas)

        const filtered = baseCards.filter((card) => {
            const type = getType(card)
            const expansion = getExpansion(card)
            const rarity = getRarity(card)
            const traits = getRelationNames(card.attributes.traits?.data)
            const aspects = getRelationNames(card.attributes.aspects?.data)
            const arenas = getRelationNames(card.attributes.arenas?.data)

            const cost = getNumericValue(card.attributes.cost)
            const power = getNumericValue(card.attributes.power)
            const hp = getNumericValue(card.attributes.hp)

            return (
                matchesFilter(type, typeFilterMode, selectedTypeSet) &&
                matchesFilter(expansion, expansionFilterMode, selectedExpansionSet) &&
                matchesFilter(rarity, rarityFilterMode, selectedRaritySet) &&
                matchesMultiValueFilter(traits, traitFilterMode, selectedTraitSet) &&
                matchesMultiValueFilter(aspects, aspectFilterMode, selectedAspectSet) &&
                matchesMultiValueFilter(arenas, arenaFilterMode, selectedArenaSet) &&
                matchesRange(cost, costRange) &&
                matchesRange(power, powerRange) &&
                matchesRange(hp, hpRange) &&
                matchesKeyword(card, keyword)
            )
        })

        return [...filtered].sort((a, b) => compareByRules(a, b, sortRules))
    }, [
        baseCards,
        selectedTypes,
        typeFilterMode,
        selectedExpansions,
        expansionFilterMode,
        selectedRarities,
        rarityFilterMode,
        selectedTraits,
        traitFilterMode,
        selectedAspects,
        aspectFilterMode,
        selectedArenas,
        arenaFilterMode,
        costRange,
        powerRange,
        hpRange,
        keyword,
        sortRules,
    ])

    useEffect(() => {
        setIndex(0)
    }, [
        showDuplicates,
        selectedTypes,
        typeFilterMode,
        selectedExpansions,
        expansionFilterMode,
        selectedRarities,
        rarityFilterMode,
        selectedTraits,
        traitFilterMode,
        selectedAspects,
        aspectFilterMode,
        selectedArenas,
        arenaFilterMode,
        costRange,
        powerRange,
        hpRange,
        keyword,
        sortRules,
    ])

    useEffect(() => {
        if (index >= filteredCards.length) {
            setIndex(0)
        }
    }, [index, filteredCards.length])

    const current = filteredCards[index]

    const infoRows = useMemo(() => {
        if (!current) return []

        return [
            ['Typ', getType(current)],
            ['Edice', getExpansion(current)],
            ['Rarita', getRarity(current)],
            ['Aspekty', getAspects(current)],
            ['Traits', getTraits(current)],
            ['Arena', getArenas(current)],
            ['Cost', current.attributes.cost ?? '—'],
            ['Power', current.attributes.power ?? '—'],
            ['HP', current.attributes.hp ?? '—'],
        ]
    }, [current])

    const imageUrl = current ? getImageUrl(current) : null

    useEffect(() => {
        setImageLoading(true)
        setImageError(false)
    }, [imageUrl])

    function previousCard() {
        setIndex((prev) => Math.max(prev - 1, 0))
    }

    function nextCard() {
        setIndex((prev) => Math.min(prev + 1, filteredCards.length - 1))
    }

    function onSliderChange(value: string) {
        setIndex(Number(value))
    }

    function toggleType(type: string) {
        setSelectedTypes((prev) =>
            prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type],
        )
    }

    function toggleExpansion(expansion: string) {
        setSelectedExpansions((prev) =>
            prev.includes(expansion) ? prev.filter((item) => item !== expansion) : [...prev, expansion],
        )
    }

    function toggleRarity(value: string) {
        setSelectedRarities((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
        )
    }

    function toggleTrait(value: string) {
        setSelectedTraits((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
        )
    }

    function toggleAspect(value: string) {
        setSelectedAspects((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
        )
    }

    function toggleArena(value: string) {
        setSelectedArenas((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
        )
    }

    function updateCostRange(part: 'min' | 'max', value: string) {
        setCostRange((prev) => ({ ...prev, [part]: value }))
    }

    function updatePowerRange(part: 'min' | 'max', value: string) {
        setPowerRange((prev) => ({ ...prev, [part]: value }))
    }

    function updateHpRange(part: 'min' | 'max', value: string) {
        setHpRange((prev) => ({ ...prev, [part]: value }))
    }

    function selectAllTypes() {
        setSelectedTypes(availableTypes)
    }

    function clearAllTypes() {
        setSelectedTypes([])
    }

    function selectAllExpansions() {
        setSelectedExpansions(availableExpansions)
    }

    function clearAllExpansions() {
        setSelectedExpansions([])
    }

    function selectPremierLegalExpansions() {
        setExpansionFilterMode('include')
        setSelectedExpansions(
            availableExpansions.filter((expansion) => PREMIER_LEGAL_EXPANSIONS.includes(expansion)),
        )
    }

    function selectAllRarities() {
        setSelectedRarities(availableRarities)
    }

    function clearAllRarities() {
        setSelectedRarities([])
    }

    function selectAllTraits() {
        setSelectedTraits(availableTraits)
    }

    function clearAllTraits() {
        setSelectedTraits([])
    }

    function selectAllAspects() {
        setSelectedAspects(availableAspects)
    }

    function clearAllAspects() {
        setSelectedAspects([])
    }

    function selectAllArenas() {
        setSelectedArenas(availableArenas)
    }

    function clearAllArenas() {
        setSelectedArenas([])
    }

    function addSortRule() {
        setSortRules((prev) => [...prev, createSortRule('title', 'asc')])
    }

    function updateSortRuleField(id: string, field: SortField) {
        setSortRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, field } : rule)))
    }

    function updateSortRuleDirection(id: string, direction: SortDirection) {
        setSortRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, direction } : rule)))
    }

    function moveSortRuleUp(id: string) {
        setSortRules((prev) => {
            const index = prev.findIndex((rule) => rule.id === id)
            if (index <= 0) return prev

            const next = [...prev]
            ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
            return next
        })
    }

    function moveSortRuleDown(id: string) {
        setSortRules((prev) => {
            const index = prev.findIndex((rule) => rule.id === id)
            if (index < 0 || index >= prev.length - 1) return prev

            const next = [...prev]
            ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
            return next
        })
    }

    function removeSortRule(id: string) {
        setSortRules((prev) => {
            if (prev.length <= 1) {
                return [createSortRule('title', 'asc')]
            }

            return prev.filter((rule) => rule.id !== id)
        })
    }

    function resetToDefaultFilters() {
        setShowDuplicates(false)

        setTypeFilterMode('include')
        setExpansionFilterMode('include')
        setRarityFilterMode('include')
        setTraitFilterMode('include')
        setAspectFilterMode('include')
        setArenaFilterMode('include')

        setSelectedTypes(availableTypes)
        setSelectedExpansions(availableExpansions)
        setSelectedRarities(availableRarities)
        setSelectedTraits(availableTraits)
        setSelectedAspects(availableAspects)
        setSelectedArenas(availableArenas)

        setCostRange({ min: '', max: '' })
        setPowerRange({ min: '', max: '' })
        setHpRange({ min: '', max: '' })

        setKeyword('')
        setSortRules([createSortRule('title', 'asc')])
        setIndex(0)
    }

    if (loading) {
        return (
            <div className="page">
                <div className="status">Načítám karty…</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="page">
                <div className="status error">Chyba: {error}</div>
            </div>
        )
    }

    return (
        <div className="page">
            <section className="toolbar-panel">
                <div className="toolbar-left">
                    <button onClick={previousCard} disabled={index <= 0 || filteredCards.length === 0}>
                        Předchozí
                    </button>

                    <div className="counter">
                        {filteredCards.length === 0 ? '0 / 0' : `${index + 1} / ${filteredCards.length}`}
                    </div>

                    <button
                        onClick={nextCard}
                        disabled={filteredCards.length === 0 || index >= filteredCards.length - 1}
                    >
                        Další
                    </button>
                </div>

                <div className="toolbar-center">
                    <input
                        className="toolbar-slider"
                        type="range"
                        min={0}
                        max={Math.max(filteredCards.length - 1, 0)}
                        value={Math.min(index, Math.max(filteredCards.length - 1, 0))}
                        onChange={(e) => onSliderChange(e.target.value)}
                        disabled={filteredCards.length === 0}
                    />
                </div>

                <div className="toolbar-right">
                    <button className="filter-toggle" onClick={() => setFiltersOpen((prev) => !prev)}>
                        {filtersOpen ? 'Skrýt filtry' : 'Rozbalit filtry'}
                    </button>
                </div>
            </section>

            {filtersOpen ? (
                <section className="filter-panel">
                    <FilterPanel
                        showDuplicates={showDuplicates}
                        onShowDuplicatesChange={setShowDuplicates}
                        onResetToDefaults={resetToDefaultFilters}
                        keyword={keyword}
                        onKeywordChange={setKeyword}
                        types={availableTypes}
                        typeMode={typeFilterMode}
                        selectedTypes={selectedTypes}
                        onTypeModeChange={setTypeFilterMode}
                        onToggleType={toggleType}
                        onSelectAllTypes={selectAllTypes}
                        onClearAllTypes={clearAllTypes}
                        rarities={availableRarities}
                        rarityMode={rarityFilterMode}
                        selectedRarities={selectedRarities}
                        onRarityModeChange={setRarityFilterMode}
                        onToggleRarity={toggleRarity}
                        onSelectAllRarities={selectAllRarities}
                        onClearAllRarities={clearAllRarities}
                        traits={availableTraits}
                        traitMode={traitFilterMode}
                        selectedTraits={selectedTraits}
                        onTraitModeChange={setTraitFilterMode}
                        onToggleTrait={toggleTrait}
                        onSelectAllTraits={selectAllTraits}
                        onClearAllTraits={clearAllTraits}
                        aspects={availableAspects}
                        aspectMode={aspectFilterMode}
                        selectedAspects={selectedAspects}
                        onAspectModeChange={setAspectFilterMode}
                        onToggleAspect={toggleAspect}
                        onSelectAllAspects={selectAllAspects}
                        onClearAllAspects={clearAllAspects}
                        arenas={availableArenas}
                        arenaMode={arenaFilterMode}
                        selectedArenas={selectedArenas}
                        onArenaModeChange={setArenaFilterMode}
                        onToggleArena={toggleArena}
                        onSelectAllArenas={selectAllArenas}
                        onClearAllArenas={clearAllArenas}
                        expansions={availableExpansions}
                        expansionMode={expansionFilterMode}
                        selectedExpansions={selectedExpansions}
                        onExpansionModeChange={setExpansionFilterMode}
                        onToggleExpansion={toggleExpansion}
                        onSelectAllExpansions={selectAllExpansions}
                        onClearAllExpansions={clearAllExpansions}
                        onSelectPremierExpansions={selectPremierLegalExpansions}
                        costRange={costRange}
                        onCostMinChange={(value) => updateCostRange('min', value)}
                        onCostMaxChange={(value) => updateCostRange('max', value)}
                        powerRange={powerRange}
                        onPowerMinChange={(value) => updatePowerRange('min', value)}
                        onPowerMaxChange={(value) => updatePowerRange('max', value)}
                        hpRange={hpRange}
                        onHpMinChange={(value) => updateHpRange('min', value)}
                        onHpMaxChange={(value) => updateHpRange('max', value)}
                        sortRules={sortRules}
                        onAddSortRule={addSortRule}
                        onUpdateSortRuleField={updateSortRuleField}
                        onUpdateSortRuleDirection={updateSortRuleDirection}
                        onMoveSortRuleUp={moveSortRuleUp}
                        onMoveSortRuleDown={moveSortRuleDown}
                        onRemoveSortRule={removeSortRule}
                    />
                </section>
            ) : null}

            {!current ? (
                <div className="status">Po aplikaci filtrů nezůstala žádná karta.</div>
            ) : (
                <div className="layout">
                    <section className="card-panel">
                        <div className="card-image-wrap">
                            {imageUrl ? (
                                <div className="card-image-frame">
                                    <img
                                        className={`card-image ${imageLoading ? 'card-image-loading' : ''}`}
                                        src={imageUrl}
                                        alt={getCardName(current)}
                                        onLoad={() => setImageLoading(false)}
                                        onError={() => {
                                            setImageLoading(false)
                                            setImageError(true)
                                        }}
                                    />

                                    {imageLoading ? <div className="card-image-overlay">Načítám obrázek…</div> : null}

                                    {imageError ? (
                                        <div className="card-image-overlay card-image-overlay-error">
                                            Obrázek se nepodařilo načíst
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="image-placeholder">Bez obrázku</div>
                            )}
                        </div>
                    </section>

                    <section className="details-panel">
                        <h2>{getCardName(current)}</h2>

                        {getSubtitle(current) ? <div className="subtitle">{getSubtitle(current)}</div> : null}

                        <div className="info-table">
                            {infoRows.map(([label, value]) => (
                                <div key={label} className="info-row">
                                    <div className="info-label">{label}</div>
                                    <div className="info-value">{String(value)}</div>
                                </div>
                            ))}
                        </div>

                        {getRulesText(current) ? (
                            <div className="rules-box">
                                <h3>Text karty</h3>
                                <div>{getRulesText(current)}</div>
                            </div>
                        ) : null}
                    </section>
                </div>
            )}
        </div>
    )
}