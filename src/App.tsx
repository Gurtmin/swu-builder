import { useEffect, useMemo, useState } from 'react'
import type { SwuCard } from './types'

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

export default function App() {
    const [cards, setCards] = useState<SwuCard[]>([])
    const [index, setIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filtersOpen, setFiltersOpen] = useState(false)

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

    const current = cards[index]

    const infoRows = useMemo(() => {
        if (!current) return []

        return [
            ['Název', getCardName(current)],
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

    function previousCard() {
        setIndex((prev) => Math.max(prev - 1, 0))
    }

    function nextCard() {
        setIndex((prev) => Math.min(prev + 1, cards.length - 1))
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

    if (!current) {
        return (
            <div className="page">
                <div className="status">Žádná data.</div>
            </div>
        )
    }

    return (
        <div className="page">
            <header className="topbar topbar-right">
                <button
                    className="filter-toggle"
                    type="button"
                    onClick={() => setFiltersOpen((prev) => !prev)}
                >
                    {filtersOpen ? 'Skrýt filtry' : 'Rozbalit filtry'}
                </button>
            </header>

            {filtersOpen ? (
                <section className="filter-panel">
                    <div className="filter-placeholder">
                        Sem později doplníme filtraci.
                    </div>
                </section>
            ) : null}

            <main className="layout">
                <section className="card-panel">
                    <div className="card-image-wrap">
                        {getImageUrl(current) ? (
                            <img
                                className="card-image"
                                src={getImageUrl(current)!}
                                alt={getCardName(current)}
                            />
                        ) : (
                            <div className="image-placeholder">Bez obrázku</div>
                        )}
                    </div>
                </section>

                <section className="details-panel">
                    <div className="nav-row">
                        <button onClick={previousCard} disabled={index === 0}>
                            Předchozí
                        </button>
                        <div className="counter">
                            {index + 1} / {cards.length}
                        </div>
                        <button onClick={nextCard} disabled={index === cards.length - 1}>
                            Další
                        </button>
                    </div>

                    <input
                        className="slider"
                        type="range"
                        min={0}
                        max={Math.max(cards.length - 1, 0)}
                        value={index}
                        onChange={(e) => setIndex(Number(e.target.value))}
                    />

                    <h2>{getCardName(current)}</h2>
                    {getSubtitle(current) ? <p className="subtitle">{getSubtitle(current)}</p> : null}

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
        </div>
    )
}