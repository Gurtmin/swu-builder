import { useEffect, useMemo, useState } from 'react'
import FilterPanel from './FilterPanel'
import type { FilterMode, SwuCard } from './types'

const DATA_URL = import.meta.env.VITE_CARDS_URL || '/cards.json'
const MAX_COPIES_PER_CARD = 3
const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_STRAPI_URL ||
    ''

type DeckEntry = {
    key: string
    count: number
    card: SwuCard
}

function getCardName(card: SwuCard): string {
    return card.attributes.title || 'Unknown card'
}

function getSubtitle(card: SwuCard): string | null {
    return card.attributes.subtitle || null
}

function toAbsoluteMediaUrl(url?: string | null): string | null {
    if (!url) return null
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url
    }
    if (!API_BASE_URL) {
        return url
    }
    return new URL(url, API_BASE_URL).toString()
}

function getImageUrl(card: SwuCard): string | null {
    const media = card.attributes.artFront?.data?.attributes

    return (
        toAbsoluteMediaUrl(media?.formats?.card?.url) ||
        toAbsoluteMediaUrl(media?.formats?.medium?.url) ||
        toAbsoluteMediaUrl(media?.formats?.small?.url) ||
        toAbsoluteMediaUrl(media?.url) ||
        null
    )
}

function getDeduplicationKey(card: SwuCard): string {
    const title = (card.attributes.title || '').trim().toLowerCase()
    const subtitle = (card.attributes.subtitle || '').trim().toLowerCase()

    return `${title}|||${subtitle}`
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

function matchesFilter(value: string, mode: FilterMode, selected: Set<string>): boolean {
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

export default function App() {
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

    const [showDuplicates, setShowDuplicates] = useState(false)
    const [deckEntries, setDeckEntries] = useState<DeckEntry[]>([])

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
        return [...new Set(baseCards.map(getExpansion).filter((value) => value && value !== '—'))].sort()
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

    useEffect(() => {
        if (availableTypes.length === 0) return

        setSelectedTypes((prev) => {
            if (prev.length > 0) return prev
            return availableTypes
        })
    }, [availableTypes])

    useEffect(() => {
        if (availableExpansions.length === 0) return

        setSelectedExpansions((prev) => {
            if (prev.length > 0) return prev
            return availableExpansions
        })
    }, [availableExpansions])

    useEffect(() => {
        if (availableRarities.length === 0) return

        setSelectedRarities((prev) => {
            if (prev.length > 0) return prev
            return availableRarities
        })
    }, [availableRarities])

    useEffect(() => {
        if (availableTraits.length === 0) return

        setSelectedTraits((prev) => {
            if (prev.length > 0) return prev
            return availableTraits
        })
    }, [availableTraits])

    useEffect(() => {
        if (availableAspects.length === 0) return

        setSelectedAspects((prev) => {
            if (prev.length > 0) return prev
            return availableAspects
        })
    }, [availableAspects])

    const filteredCards = useMemo(() => {
        if (baseCards.length === 0) return []

        const selectedTypeSet = new Set(selectedTypes)
        const selectedExpansionSet = new Set(selectedExpansions)
        const selectedRaritySet = new Set(selectedRarities)
        const selectedTraitSet = new Set(selectedTraits)
        const selectedAspectSet = new Set(selectedAspects)

        return baseCards.filter((card) => {
            const type = getType(card)
            const expansion = getExpansion(card)
            const rarity = getRarity(card)
            const traits = getRelationNames(card.attributes.traits?.data)
            const aspects = getRelationNames(card.attributes.aspects?.data)

            return (
                matchesFilter(type, typeFilterMode, selectedTypeSet) &&
                matchesFilter(expansion, expansionFilterMode, selectedExpansionSet) &&
                matchesFilter(rarity, rarityFilterMode, selectedRaritySet) &&
                matchesMultiValueFilter(traits, traitFilterMode, selectedTraitSet) &&
                matchesMultiValueFilter(aspects, aspectFilterMode, selectedAspectSet)
            )
        })
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

    const currentDeckCount = current
        ? deckEntries.find((entry) => entry.key === getDeduplicationKey(current))?.count ?? 0
        : 0

    const totalDeckCards = useMemo(() => {
        return deckEntries.reduce((sum, entry) => sum + entry.count, 0)
    }, [deckEntries])

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

    function addCardToDeck(card: SwuCard) {
        const key = getDeduplicationKey(card)

        setDeckEntries((prev) => {
            const existing = prev.find((entry) => entry.key === key)

            if (!existing) {
                return [...prev, { key, count: 1, card }]
            }

            if (existing.count >= MAX_COPIES_PER_CARD) {
                return prev
            }

            return prev.map((entry) =>
                entry.key === key ? { ...entry, count: entry.count + 1 } : entry,
            )
        })
    }

    function incrementDeckEntry(key: string) {
        setDeckEntries((prev) =>
            prev.map((entry) =>
                entry.key === key
                    ? { ...entry, count: Math.min(entry.count + 1, MAX_COPIES_PER_CARD) }
                    : entry,
            ),
        )
    }

    function decrementDeckEntry(key: string) {
        setDeckEntries((prev) =>
            prev
                .map((entry) => (entry.key === key ? { ...entry, count: entry.count - 1 } : entry))
                .filter((entry) => entry.count > 0),
        )
    }

    function removeDeckEntry(key: string) {
        setDeckEntries((prev) => prev.filter((entry) => entry.key !== key))
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
                        expansions={availableExpansions}
                        expansionMode={expansionFilterMode}
                        selectedExpansions={selectedExpansions}
                        onExpansionModeChange={setExpansionFilterMode}
                        onToggleExpansion={toggleExpansion}
                        onSelectAllExpansions={selectAllExpansions}
                        onClearAllExpansions={clearAllExpansions}
                    />
                </section>
            ) : null}

            {!current ? (
                <div className="status">Po aplikaci filtrů nezůstala žádná karta.</div>
            ) : (
                <div className="builder-layout">
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
                        <div className="details-header-row">
                            <div>
                                <h2>{getCardName(current)}</h2>
                                {getSubtitle(current) ? <div className="subtitle">{getSubtitle(current)}</div> : null}
                            </div>

                            <div className="builder-actions">
                                <button
                                    type="button"
                                    onClick={() => addCardToDeck(current)}
                                    disabled={currentDeckCount >= MAX_COPIES_PER_CARD}
                                >
                                    {currentDeckCount >= MAX_COPIES_PER_CARD
                                        ? 'Maximum 3×'
                                        : `Přidat do listu (${currentDeckCount}/3)`}
                                </button>
                            </div>
                        </div>

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

                    <aside className="deck-panel">
                        <div className="deck-panel-header">
                            <h3>Seznam</h3>
                            <div className="deck-count">{totalDeckCards} ks</div>
                        </div>

                        {deckEntries.length === 0 ? (
                            <div className="deck-empty">Zatím nemáš přidané žádné karty.</div>
                        ) : (
                            <div className="deck-entry-list">
                                {deckEntries.map((entry) => {
                                    const deckImageUrl = getImageUrl(entry.card)

                                    return (
                                        <div key={entry.key} className="deck-entry-card">
                                            <div className="deck-entry-top">
                                                {deckImageUrl ? (
                                                    <img
                                                        className="deck-entry-image"
                                                        src={deckImageUrl}
                                                        alt={getCardName(entry.card)}
                                                    />
                                                ) : (
                                                    <div className="deck-entry-image deck-entry-image-placeholder">Bez obrázku</div>
                                                )}

                                                <div className="deck-entry-meta">
                                                    <div className="deck-entry-name">{getCardName(entry.card)}</div>
                                                    {getSubtitle(entry.card) ? (
                                                        <div className="deck-entry-subtitle">{getSubtitle(entry.card)}</div>
                                                    ) : null}
                                                    <div className="deck-entry-expansion">{getExpansion(entry.card)}</div>
                                                </div>
                                            </div>

                                            <div className="deck-entry-bottom">
                                                <div className="deck-entry-count">{entry.count} / 3</div>

                                                <div className="deck-entry-actions">
                                                    <button
                                                        type="button"
                                                        onClick={() => decrementDeckEntry(entry.key)}
                                                        title="Odebrat 1"
                                                    >
                                                        -
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => incrementDeckEntry(entry.key)}
                                                        disabled={entry.count >= MAX_COPIES_PER_CARD}
                                                        title="Přidat 1"
                                                    >
                                                        +
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeDeckEntry(entry.key)}
                                                        title="Odebrat kartu"
                                                    >
                                                        Odebrat
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </aside>
                </div>
            )}
        </div>
    )
}