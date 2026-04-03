import { useEffect, useMemo, useState } from 'react'
import FilterPanel from './FilterPanel'
import type { FilterMode, RangeValue, SwuCard } from './types'

const DATA_URL = import.meta.env.VITE_CARDS_URL || '/cards.json'
const MAX_COPIES_PER_CARD = 3
const DECK_STORAGE_KEY = 'swu-builder.deckEntries.v1'
const FILTERS_STORAGE_KEY = 'swu-builder.filters.v1'
const PREMIER_LEGAL_EXPANSIONS = [
    'Jump to Lightspeed',
    'Legends of the Force',
    'Secrets of Power',
    'A Lawless Time',
]
const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_STRAPI_URL ||
    ''

type DeckEntry = {
    key: string
    count: number
    card: SwuCard
    zone: DeckZone
}

type DeckZone = 'deck' | 'sideboard'

type PersistedDeckEntry = {
    key?: unknown
    count?: unknown
    card?: unknown
    zone?: unknown
}

type PersistedFilters = {
    showDuplicates?: unknown
    typeFilterMode?: unknown
    selectedTypes?: unknown
    expansionFilterMode?: unknown
    selectedExpansions?: unknown
    rarityFilterMode?: unknown
    selectedRarities?: unknown
    traitFilterMode?: unknown
    selectedTraits?: unknown
    aspectFilterMode?: unknown
    selectedAspects?: unknown
    costRange?: unknown
    powerRange?: unknown
    hpRange?: unknown
}

function getCardName(card: SwuCard): string {
    return card.attributes.title || 'Unknown card'
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isSwuCardLike(value: unknown): value is SwuCard {
    if (!isObject(value)) return false
    return typeof value.id === 'number' && isObject(value.attributes)
}

function toFilterMode(value: unknown): FilterMode | null {
    return value === 'include' || value === 'exclude' ? value : null
}

function toStringArray(value: unknown): string[] | null {
    if (!Array.isArray(value)) return null
    return value.filter((item): item is string => typeof item === 'string')
}

function toRangeValue(value: unknown): RangeValue | null {
    if (!isObject(value)) return null
    const min = typeof value.min === 'string' ? value.min : ''
    const max = typeof value.max === 'string' ? value.max : ''
    return { min, max }
}

function parseDeckEntriesFromStorage(raw: string | null): DeckEntry[] {
    if (!raw) return []

    try {
        const parsed = JSON.parse(raw) as PersistedDeckEntry[]
        if (!Array.isArray(parsed)) return []

        const normalized = parsed
            .filter((item) => isObject(item))
            .map((item) => {
                const countNumber = typeof item.count === 'number' ? item.count : Number(item.count)
                const count = Number.isFinite(countNumber)
                    ? Math.min(Math.max(Math.trunc(countNumber), 1), MAX_COPIES_PER_CARD)
                    : 1
                const card = item.card
                const zone: DeckZone = item.zone === 'sideboard' ? 'sideboard' : 'deck'
                const key = isSwuCardLike(card) ? buildDeckEntryKey(card, zone) : ''

                if (!key || !isSwuCardLike(card)) return null
                return { key, count, card, zone }
            })
            .filter((item): item is DeckEntry => item !== null)

        const merged = new Map<string, DeckEntry>()
        normalized.forEach((entry) => {
            const existing = merged.get(entry.key)
            if (!existing) {
                merged.set(entry.key, entry)
                return
            }
            merged.set(entry.key, {
                ...existing,
                count: Math.min(existing.count + entry.count, MAX_COPIES_PER_CARD),
            })
        })

        return [...merged.values()]
    } catch {
        return []
    }
}

function buildDeckEntryKey(card: SwuCard, zone: DeckZone): string {
    return `${getDeduplicationKey(card)}|||${zone}`
}

function parseFiltersFromStorage(raw: string | null): PersistedFilters | null {
    if (!raw) return null

    try {
        const parsed = JSON.parse(raw) as PersistedFilters
        return isObject(parsed) ? parsed : null
    } catch {
        return null
    }
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

function matchesAspectFilter(values: string[], mode: FilterMode, selected: Set<string>): boolean {
    if (mode === 'exclude') {
        return matchesMultiValueFilter(values, mode, selected)
    }

    if (selected.size === 0) {
        return false
    }

    const extraAspectCount = values.filter((value) => !selected.has(value)).length

    if (selected.size >= 3) {
        return values.some((value) => selected.has(value)) && extraAspectCount === 0
    }

    if (selected.size === 2) {
        return values.some((value) => selected.has(value)) && extraAspectCount <= 1
    }

    return values.some((value) => selected.has(value))
}

function parseRangeBound(value: string): number | null {
    if (!value.trim()) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

function matchesNumericRange(value: number | null | undefined, range: RangeValue): boolean {
    const min = parseRangeBound(range.min)
    const max = parseRangeBound(range.max)

    if (min === null && max === null) {
        return true
    }

    if (typeof value !== 'number') {
        return false
    }

    if (min !== null && value < min) {
        return false
    }

    if (max !== null && value > max) {
        return false
    }

    return true
}

export default function App() {
    const emptyRange: RangeValue = { min: '', max: '' }

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
    const [costRange, setCostRange] = useState<RangeValue>(emptyRange)
    const [powerRange, setPowerRange] = useState<RangeValue>(emptyRange)
    const [hpRange, setHpRange] = useState<RangeValue>(emptyRange)

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

    useEffect(() => {
        const fromStorage = parseDeckEntriesFromStorage(localStorage.getItem(DECK_STORAGE_KEY))
        if (fromStorage.length > 0) {
            setDeckEntries(fromStorage)
        }
    }, [])

    useEffect(() => {
        const storedFilters = parseFiltersFromStorage(localStorage.getItem(FILTERS_STORAGE_KEY))
        if (!storedFilters) return

        if (typeof storedFilters.showDuplicates === 'boolean') {
            setShowDuplicates(storedFilters.showDuplicates)
        }

        const nextTypeMode = toFilterMode(storedFilters.typeFilterMode)
        if (nextTypeMode) setTypeFilterMode(nextTypeMode)
        const nextSelectedTypes = toStringArray(storedFilters.selectedTypes)
        if (nextSelectedTypes) setSelectedTypes(nextSelectedTypes)

        const nextExpansionMode = toFilterMode(storedFilters.expansionFilterMode)
        if (nextExpansionMode) setExpansionFilterMode(nextExpansionMode)
        const nextSelectedExpansions = toStringArray(storedFilters.selectedExpansions)
        if (nextSelectedExpansions) setSelectedExpansions(nextSelectedExpansions)

        const nextRarityMode = toFilterMode(storedFilters.rarityFilterMode)
        if (nextRarityMode) setRarityFilterMode(nextRarityMode)
        const nextSelectedRarities = toStringArray(storedFilters.selectedRarities)
        if (nextSelectedRarities) setSelectedRarities(nextSelectedRarities)

        const nextTraitMode = toFilterMode(storedFilters.traitFilterMode)
        if (nextTraitMode) setTraitFilterMode(nextTraitMode)
        const nextSelectedTraits = toStringArray(storedFilters.selectedTraits)
        if (nextSelectedTraits) setSelectedTraits(nextSelectedTraits)

        const nextAspectMode = toFilterMode(storedFilters.aspectFilterMode)
        if (nextAspectMode) setAspectFilterMode(nextAspectMode)
        const nextSelectedAspects = toStringArray(storedFilters.selectedAspects)
        if (nextSelectedAspects) setSelectedAspects(nextSelectedAspects)

        const nextCostRange = toRangeValue(storedFilters.costRange)
        if (nextCostRange) setCostRange(nextCostRange)
        const nextPowerRange = toRangeValue(storedFilters.powerRange)
        if (nextPowerRange) setPowerRange(nextPowerRange)
        const nextHpRange = toRangeValue(storedFilters.hpRange)
        if (nextHpRange) setHpRange(nextHpRange)
    }, [])

    useEffect(() => {
        localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(deckEntries))
    }, [deckEntries])

    useEffect(() => {
        localStorage.setItem(
            FILTERS_STORAGE_KEY,
            JSON.stringify({
                showDuplicates,
                typeFilterMode,
                selectedTypes,
                expansionFilterMode,
                selectedExpansions,
                rarityFilterMode,
                selectedRarities,
                traitFilterMode,
                selectedTraits,
                aspectFilterMode,
                selectedAspects,
                costRange,
                powerRange,
                hpRange,
            }),
        )
    }, [
        showDuplicates,
        typeFilterMode,
        selectedTypes,
        expansionFilterMode,
        selectedExpansions,
        rarityFilterMode,
        selectedRarities,
        traitFilterMode,
        selectedTraits,
        aspectFilterMode,
        selectedAspects,
        costRange,
        powerRange,
        hpRange,
    ])

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
                matchesAspectFilter(aspects, aspectFilterMode, selectedAspectSet) &&
                matchesNumericRange(card.attributes.cost, costRange) &&
                matchesNumericRange(card.attributes.power, powerRange) &&
                matchesNumericRange(card.attributes.hp, hpRange)
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
        costRange,
        powerRange,
        hpRange,
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
        costRange,
        powerRange,
        hpRange,
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
        ? deckEntries.find((entry) => entry.key === buildDeckEntryKey(current, 'deck'))?.count ?? 0
        : 0
    const currentSideboardCount = current
        ? deckEntries.find((entry) => entry.key === buildDeckEntryKey(current, 'sideboard'))?.count ?? 0
        : 0

    const totalDeckCards = useMemo(() => {
        return deckEntries
            .filter((entry) => entry.zone === 'deck')
            .reduce((sum, entry) => sum + entry.count, 0)
    }, [deckEntries])

    const totalSideboardCards = useMemo(() => {
        return deckEntries
            .filter((entry) => entry.zone === 'sideboard')
            .reduce((sum, entry) => sum + entry.count, 0)
    }, [deckEntries])

    const sortedDeckEntries = useMemo(() => {
        return [...deckEntries].sort((a, b) => getCardName(a.card).localeCompare(getCardName(b.card)))
    }, [deckEntries])

    const deckZoneEntries = useMemo(() => {
        return sortedDeckEntries.filter((entry) => entry.zone === 'deck')
    }, [sortedDeckEntries])

    const sideboardZoneEntries = useMemo(() => {
        return sortedDeckEntries.filter((entry) => entry.zone === 'sideboard')
    }, [sortedDeckEntries])

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

    function selectPremierExpansions() {
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

    function clearNumericFilters() {
        setCostRange(emptyRange)
        setPowerRange(emptyRange)
        setHpRange(emptyRange)
    }

    function addCardToList(card: SwuCard, zone: DeckZone) {
        const key = buildDeckEntryKey(card, zone)

        setDeckEntries((prev) => {
            const existing = prev.find((entry) => entry.key === key)

            if (!existing) {
                return [...prev, { key, count: 1, card, zone }]
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

    function decrementDeckEntry(key: string, cardName: string) {
        const target = deckEntries.find((entry) => entry.key === key)
        if (!target) return

        if (target.count <= 1) {
            const confirmed = window.confirm(`Oprvdu chcete odebrat ${cardName}`)
            if (!confirmed) return
        }

        setDeckEntries((prev) => {
            const current = prev.find((entry) => entry.key === key)
            if (!current) return prev

            if (current.count <= 1) {
                return prev.filter((entry) => entry.key !== key)
            }

            return prev.map((entry) =>
                entry.key === key ? { ...entry, count: entry.count - 1 } : entry,
            )
        })
    }

    function transferOneCopy(card: SwuCard, fromZone: DeckZone, toZone: DeckZone) {
        if (fromZone === toZone) return

        const fromKey = buildDeckEntryKey(card, fromZone)
        const toKey = buildDeckEntryKey(card, toZone)

        setDeckEntries((prev) => {
            const fromEntry = prev.find((entry) => entry.key === fromKey)
            if (!fromEntry || fromEntry.count <= 0) {
                return prev
            }

            const toEntry = prev.find((entry) => entry.key === toKey)
            if (toEntry && toEntry.count >= MAX_COPIES_PER_CARD) {
                return prev
            }

            let next = prev
            if (fromEntry.count <= 1) {
                next = next.filter((entry) => entry.key !== fromKey)
            } else {
                next = next.map((entry) =>
                    entry.key === fromKey ? { ...entry, count: entry.count - 1 } : entry,
                )
            }

            const updatedToEntry = next.find((entry) => entry.key === toKey)
            if (updatedToEntry) {
                next = next.map((entry) =>
                    entry.key === toKey ? { ...entry, count: entry.count + 1 } : entry,
                )
            } else {
                next = [...next, { key: toKey, count: 1, card, zone: toZone }]
            }

            return next
        })
    }

    function moveDeckEntryToOtherZone(_key: string) {
        // Presun mezi sekcemi bude resen jinak.
    }

    function renderDeckEntry(entry: DeckEntry) {
        const deckImageUrl = getImageUrl(entry.card)
        const otherZone: DeckZone = entry.zone === 'deck' ? 'sideboard' : 'deck'
        const otherKey = buildDeckEntryKey(entry.card, otherZone)
        const otherCount = deckEntries.find((item) => item.key === otherKey)?.count ?? 0
        const canTransferOut = entry.count > 0 && otherCount < MAX_COPIES_PER_CARD
        const canTransferIn = otherCount > 0 && entry.count < MAX_COPIES_PER_CARD

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
                        <div className="deck-entry-image deck-entry-image-placeholder">Bez obrĂˇzku</div>
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
                    <div className="deck-entry-count">{entry.count}</div>

                    <div className="deck-entry-actions">
                        <button
                            type="button"
                            onClick={() => decrementDeckEntry(entry.key, getCardName(entry.card))}
                            title="Odebrat 1"
                        >
                            -
                        </button>
                        <button
                            type="button"
                            onClick={() => transferOneCopy(entry.card, entry.zone, otherZone)}
                            disabled={!canTransferOut}
                            title="Presunout 1 kopii do druhe sekce"
                        >
                            {otherZone === 'sideboard' ? '<SB' : '<D'}
                        </button>
                        <button
                            type="button"
                            onClick={() => incrementDeckEntry(entry.key)}
                            disabled={entry.count >= MAX_COPIES_PER_CARD}
                            title="PĹ™idat 1"
                        >
                            +
                        </button>
                        <button
                            type="button"
                            onClick={() => transferOneCopy(entry.card, otherZone, entry.zone)}
                            disabled={!canTransferIn}
                            title="Vzit 1 kopii z druhe sekce"
                        >
                            {otherZone === 'sideboard' ? '>SB' : '>D'}
                        </button>
                    </div>
                </div>
            </div>
        )
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
                        costRange={costRange}
                        powerRange={powerRange}
                        hpRange={hpRange}
                        onCostRangeChange={setCostRange}
                        onPowerRangeChange={setPowerRange}
                        onHpRangeChange={setHpRange}
                        onClearNumericFilters={clearNumericFilters}
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
                        onSelectPremierExpansions={selectPremierExpansions}
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
                                    className="deck-add-button"
                                    onClick={() => addCardToList(current, 'deck')}
                                    disabled={currentDeckCount >= MAX_COPIES_PER_CARD}
                                    data-label={
                                        currentDeckCount >= MAX_COPIES_PER_CARD
                                            ? 'Deck max 3x'
                                            : `Pridat do decku (${currentDeckCount}${
                                                  currentSideboardCount > 0
                                                      ? ` (sideboard ${currentSideboardCount})`
                                                      : ''
                                              })`
                                    }
                                >
                                    {currentDeckCount >= MAX_COPIES_PER_CARD
                                        ? 'Maximum 3×'
                                        : `Přidat do listu (${currentDeckCount}/3)`}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => addCardToList(current, 'sideboard')}
                                    disabled={currentSideboardCount >= MAX_COPIES_PER_CARD}
                                >
                                    {currentSideboardCount >= MAX_COPIES_PER_CARD
                                        ? 'Sideboard max 3x'
                                        : `Pridat do sideboardu (${currentSideboardCount})`}
                                </button>
                            </div>
                            {currentSideboardCount > 0 ? (
                                <div className="subtitle">(sideboard: {currentSideboardCount})</div>
                            ) : null}
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
                            <div className="deck-count">
                                Deck {totalDeckCards} ks | Sideboard {totalSideboardCards} ks
                            </div>
                        </div>

                        {deckEntries.length === 0 ? (
                            <div className="deck-empty">Zatím nemáš přidané žádné karty.</div>
                        ) : (
                            <div className="deck-entry-list">
                                {([] as DeckEntry[]).map((entry) => {
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
                                                <div className="deck-entry-count">{entry.count}</div>

                                                <div className="deck-entry-actions">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            decrementDeckEntry(
                                                                entry.key,
                                                                getCardName(entry.card),
                                                            )
                                                        }
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
                                                        onClick={() => moveDeckEntryToOtherZone(entry.key)}
                                                        title="Presunout mezi deck/sideboard"
                                                    >
                                                        {entry.zone === 'deck'
                                                            ? 'Do sideboardu'
                                                            : 'Do decku'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        {deckEntries.length > 0 ? (
                            <div className="deck-sections">
                                <section>
                                    <h4 className="deck-section-title">Deck</h4>
                                    {deckZoneEntries.length === 0 ? (
                                        <div className="deck-empty">Deck je prazdny.</div>
                                    ) : (
                                        <div className="deck-entry-list">
                                            {deckZoneEntries.map(renderDeckEntry)}
                                        </div>
                                    )}
                                </section>
                                <section>
                                    <h4 className="deck-section-title">Sideboard</h4>
                                    {sideboardZoneEntries.length === 0 ? (
                                        <div className="deck-empty">Sideboard je prazdny.</div>
                                    ) : (
                                        <div className="deck-entry-list">
                                            {sideboardZoneEntries.map(renderDeckEntry)}
                                        </div>
                                    )}
                                </section>
                            </div>
                        ) : null}
                    </aside>
                </div>
            )}
        </div>
    )
}
