import { useEffect, useMemo, useState } from 'react'
import FilterPanel from './FilterPanel'
import type { FilterMode, SwuCard } from './types'

const DATA_URL = import.meta.env.VITE_CARDS_URL || '/cards.json'

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
    return (
        card.attributes.text ||
        card.attributes.deployBox ||
        card.attributes.epicAction ||
        null
    )
}

function matchesFilter(value: string, mode: FilterMode, selected: Set<string>): boolean {
    if (mode === 'include') {
        return selected.has(value)
    }

    return !selected.has(value)
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
        return [...new Set(baseCards.map(getExpansion).filter((value) => value && value !== '—'))].sort()
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

    const filteredCards = useMemo(() => {
        if (baseCards.length === 0) return []

        const selectedTypeSet = new Set(selectedTypes)
        const selectedExpansionSet = new Set(selectedExpansions)

        return baseCards.filter((card) => {
            const type = getType(card)
            const expansion = getExpansion(card)

            return (
                matchesFilter(type, typeFilterMode, selectedTypeSet) &&
                matchesFilter(expansion, expansionFilterMode, selectedExpansionSet)
            )
        })
    }, [baseCards, selectedTypes, typeFilterMode, selectedExpansions, expansionFilterMode])

    useEffect(() => {
        setIndex(0)
    }, [showDuplicates, selectedTypes, typeFilterMode, selectedExpansions, expansionFilterMode])

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
            prev.includes(type)
                ? prev.filter((item) => item !== type)
                : [...prev, type],
        )
    }

    function toggleExpansion(expansion: string) {
        setSelectedExpansions((prev) =>
            prev.includes(expansion)
                ? prev.filter((item) => item !== expansion)
                : [...prev, expansion],
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
                    <button onClick={previousCard} disabled={index === 0 || filteredCards.length === 0}>
                        Předchozí
                    </button>

                    <div className="counter">
                        {filteredCards.length === 0 ? '0 / 0' : `${index + 1} / ${filteredCards.length}`}
                    </div>

                    <button
                        onClick={nextCard}
                        disabled={filteredCards.length === 0 || index === filteredCards.length - 1}
                    >
                        Další
                    </button>
                </div>

                <div className="toolbar-center">
                    <input
                        className="slider toolbar-slider"
                        type="range"
                        min={0}
                        max={Math.max(filteredCards.length - 1, 0)}
                        value={Math.min(index, Math.max(filteredCards.length - 1, 0))}
                        onChange={(e) => onSliderChange(e.target.value)}
                    />
                </div>

                <div className="toolbar-right">
                    <button
                        className="filter-toggle"
                        type="button"
                        onClick={() => setFiltersOpen((prev) => !prev)}
                    >
                        {filtersOpen ? 'Skrýt filtry' : 'Rozbalit filtry'}
                    </button>
                </div>
            </section>

            {filtersOpen ? (
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
                    expansions={availableExpansions}
                    expansionMode={expansionFilterMode}
                    selectedExpansions={selectedExpansions}
                    onExpansionModeChange={setExpansionFilterMode}
                    onToggleExpansion={toggleExpansion}
                    onSelectAllExpansions={selectAllExpansions}
                    onClearAllExpansions={clearAllExpansions}
                />
            ) : null}

            {!current ? (
                <div className="status">Po aplikaci filtrů nezůstala žádná karta.</div>
            ) : (
                <main className="layout">
                    <section className="card-panel">
                        <div className="card-image-wrap">
                            {imageUrl ? (
                                <div className="card-image-frame">
                                    <img
                                        key={imageUrl}
                                        className={`card-image ${imageLoading ? 'card-image-loading' : ''}`}
                                        src={imageUrl}
                                        alt={getCardName(current)}
                                        onLoad={() => setImageLoading(false)}
                                        onError={() => {
                                            setImageLoading(false)
                                            setImageError(true)
                                        }}
                                    />

                                    {imageLoading ? (
                                        <div className="card-image-overlay">
                                            Načítám obrázek…
                                        </div>
                                    ) : null}

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

                        {getSubtitle(current) ? (
                            <p className="subtitle">{getSubtitle(current)}</p>
                        ) : null}

                        <div className="info-table">
                            {infoRows.map(([label, value]) => (
                                <div className="info-row" key={label}>
                                    <div className="info-label">{label}</div>
                                    <div className="info-value">{String(value)}</div>
                                </div>
                            ))}
                        </div>

                        {getRulesText(current) ? (
                            <div className="rules-box">
                                <h3>Text karty</h3>
                                <p style={{ whiteSpace: 'pre-line' }}>{getRulesText(current)}</p>
                            </div>
                        ) : null}
                    </section>
                </main>
            )}
        </div>
    )
}