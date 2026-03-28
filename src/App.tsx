import { useEffect, useMemo, useState } from 'react'
import type { SwuCard } from './types'

const DATA_URL =
    import.meta.env.VITE_CARDS_URL || '/cards.json'

function getCardName(card: SwuCard): string {
    return card.title || card.name || 'Unknown card'
}

function getCardImage(card: SwuCard): string | null {
    return card.frontArt?.url || card.image || null
}

function getType(card: SwuCard): string {
    return card.type?.name || 'Unknown'
}

function getTraits(card: SwuCard): string {
    if (!card.traits?.length) return '—'
    return card.traits.map((t) => t.name).filter(Boolean).join(', ')
}

function getAspects(card: SwuCard): string {
    if (!card.aspect?.length) return '—'
    return card.aspect.map((a) => a.name).filter(Boolean).join(', ')
}

export default function App() {
    const [cards, setCards] = useState<SwuCard[]>([])
    const [index, setIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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
            ['Číslo', current.cardNumber ?? '—'],
            ['Typ', getType(current)],
            ['Edice', current.expansion?.name ?? '—'],
            ['Rarita', current.rarity ?? '—'],
            ['Aspekty', getAspects(current)],
            ['Traits', getTraits(current)],
            ['Arena', current.arena?.name ?? '—'],
            ['Cost', current.cost ?? '—'],
            ['Power', current.power ?? '—'],
            ['HP', current.hp ?? '—'],
            ['Artist', current.artist ?? '—'],
        ]
    }, [current])

    function previousCard() {
        setIndex((prev) => Math.max(prev - 1, 0))
    }

    function nextCard() {
        setIndex((prev) => Math.min(prev + 1, cards.length - 1))
    }

    function onSliderChange(value: string) {
        setIndex(Number(value))
    }

    if (loading) {
        return <div className="page"><div className="status">Načítám karty…</div></div>
    }

    if (error) {
        return <div className="page"><div className="status error">Chyba: {error}</div></div>
    }

    if (!current) {
        return <div className="page"><div className="status">Žádná data.</div></div>
    }

    return (
        <div className="page">
            <header className="topbar">
                <div>
                    <h1>SWU galerie</h1>
                    <p>{cards.length} karet</p>
                </div>
            </header>

            <main className="layout">
                <section className="card-panel">
                    <div className="card-image-wrap">
                        {getCardImage(current) ? (
                            <img
                                className="card-image"
                                src={getCardImage(current)!}
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
                        onChange={(e) => onSliderChange(e.target.value)}
                    />

                    <h2>{getCardName(current)}</h2>
                    {current.subtitle ? <p className="subtitle">{current.subtitle}</p> : null}

                    <div className="info-table">
                        {infoRows.map(([label, value]) => (
                            <div className="info-row" key={label}>
                                <div className="info-label">{label}</div>
                                <div className="info-value">{String(value)}</div>
                            </div>
                        ))}
                    </div>

                    {current.text ? (
                        <div className="rules-box">
                            <h3>Text karty</h3>
                            <p>{current.text}</p>
                        </div>
                    ) : null}
                </section>
            </main>
        </div>
    )
}