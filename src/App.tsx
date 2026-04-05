import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import FilterPanel from './FilterPanel'
import type { FilterMode, RangeValue, SwuCard } from './types'

const DATA_URL = import.meta.env.VITE_CARDS_URL || '/cards.json'
const MAX_COPIES_PER_CARD = 3
const DECK_STORAGE_KEY = 'swu-builder.deckEntries.v1'
const FILTERS_STORAGE_KEY = 'swu-builder.filters.v1'
const NO_TRAIT_FILTER_VALUE = 'Bez traitu'
const NO_ASPECT_FILTER_VALUE = 'Bez aspektu'
const NO_ARENA_FILTER_VALUE = 'Bez areny'
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
    showAttributesPanel?: unknown
    keyword?: unknown
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
    arenaFilterMode?: unknown
    selectedArenas?: unknown
    costRange?: unknown
    powerRange?: unknown
    hpRange?: unknown
}

type DeckTransferItem = {
    id: number | null
    title: string
    subtitle: string | null
    count: number
}

type DeckTransferData = {
    version: 1
    exportedAt: string
    deck: DeckTransferItem[]
    sideboard: DeckTransferItem[]
}

function getCardName(card: SwuCard): string {
    return card.attributes.title || 'Unknown card'
}

function normalizeCardName(name: string): string {
    return name.trim().toLowerCase()
}

function normalizeSubtitle(value: string | null | undefined): string {
    return (value || '').trim().toLowerCase()
}

function buildTitleSubtitleKey(title: string, subtitle: string | null | undefined): string {
    return `${normalizeCardName(title)}|||${normalizeSubtitle(subtitle)}`
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

        return normalizeDeckEntries([...merged.values()])
    } catch {
        return []
    }
}

function buildDeckEntryKey(card: SwuCard, zone: DeckZone): string {
    return `${getDeduplicationKey(card)}|||${zone}`
}

function getTotalCopiesForCard(entries: DeckEntry[], card: SwuCard): number {
    const dedupKey = getDeduplicationKey(card)
    return entries
        .filter((entry) => getDeduplicationKey(entry.card) === dedupKey)
        .reduce((sum, entry) => sum + entry.count, 0)
}

function normalizeDeckEntries(entries: DeckEntry[]): DeckEntry[] {
    const byCardKey = new Map<string, DeckEntry[]>()

    entries.forEach((entry) => {
        const key = getDeduplicationKey(entry.card)
        const bucket = byCardKey.get(key) || []
        bucket.push(entry)
        byCardKey.set(key, bucket)
    })

    const normalized: DeckEntry[] = []

    byCardKey.forEach((group) => {
        const ordered = [...group].sort((a, b) => {
            if (a.zone !== b.zone) {
                return a.zone === 'deck' ? -1 : 1
            }
            return a.key.localeCompare(b.key)
        })

        let remaining = MAX_COPIES_PER_CARD
        ordered.forEach((entry) => {
            if (remaining <= 0) return
            const nextCount = Math.min(entry.count, remaining)
            if (nextCount > 0) {
                normalized.push({ ...entry, count: nextCount })
                remaining -= nextCount
            }
        })
    })

    return normalized
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

function toKeyword(value: unknown): string | null {
    return typeof value === 'string' ? value : null
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

function getFrontImageUrl(card: SwuCard): string | null {
    const media = card.attributes.artFront?.data?.attributes

    return (
        toAbsoluteMediaUrl(media?.formats?.card?.url) ||
        toAbsoluteMediaUrl(media?.formats?.medium?.url) ||
        toAbsoluteMediaUrl(media?.formats?.small?.url) ||
        toAbsoluteMediaUrl(media?.url) ||
        null
    )
}

function getBackCardImageUrl(card: SwuCard): string | null {
    const media = card.attributes.artBack?.data?.attributes
    return toAbsoluteMediaUrl(media?.formats?.card?.url) || null
}

function getMainCardImageUrl(card: SwuCard, showBackImage: boolean): string | null {
    if (showBackImage) {
        const backImageUrl = getBackCardImageUrl(card)
        if (backImageUrl) return backImageUrl
    }
    return getFrontImageUrl(card)
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

function isLeaderOrBaseCard(card: SwuCard): boolean {
    const normalizedType = getType(card).trim().toLowerCase()
    return normalizedType === 'leader' || normalizedType === 'base'
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
    const [keyword, setKeyword] = useState('')
    const [showBackImage, setShowBackImage] = useState(false)

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

    const [showDuplicates, setShowDuplicates] = useState(false)
    const [showAttributesPanel, setShowAttributesPanel] = useState(false)
    const [deckEntries, setDeckEntries] = useState<DeckEntry[]>([])
    const [deckSectionOpen, setDeckSectionOpen] = useState(true)
    const [sideboardSectionOpen, setSideboardSectionOpen] = useState(true)
    const [cardPanelHeight, setCardPanelHeight] = useState<number | null>(null)
    const [builderMinHeight, setBuilderMinHeight] = useState<number | null>(null)
    const deckImportInputRef = useRef<HTMLInputElement | null>(null)
    const cardPanelRef = useRef<HTMLElement | null>(null)
    const builderLayoutRef = useRef<HTMLDivElement | null>(null)
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
        if (typeof storedFilters.showAttributesPanel === 'boolean') {
            setShowAttributesPanel(storedFilters.showAttributesPanel)
        }
        const nextKeyword = toKeyword(storedFilters.keyword)
        if (nextKeyword !== null) setKeyword(nextKeyword)

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

        const nextArenaMode = toFilterMode(storedFilters.arenaFilterMode)
        if (nextArenaMode) setArenaFilterMode(nextArenaMode)
        const nextSelectedArenas = toStringArray(storedFilters.selectedArenas)
        if (nextSelectedArenas) setSelectedArenas(nextSelectedArenas)

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
                showAttributesPanel,
                keyword,
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
                arenaFilterMode,
                selectedArenas,
                costRange,
                powerRange,
                hpRange,
            }),
        )
    }, [
        showDuplicates,
        showAttributesPanel,
        keyword,
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
        arenaFilterMode,
        selectedArenas,
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
        const traits = [
            ...new Set(
                baseCards.flatMap((card) =>
                    (card.attributes.traits?.data || [])
                        .map((item) => item.attributes?.name || item.attributes?.title)
                        .filter(isNonEmptyString),
                ),
            ),
        ].sort()
        const hasCardsWithoutTrait = baseCards.some(
            (card) => getRelationNames(card.attributes.traits?.data).length === 0,
        )
        return hasCardsWithoutTrait ? [...traits, NO_TRAIT_FILTER_VALUE] : traits
    }, [baseCards])

    const availableAspects = useMemo(() => {
        const aspects = [
            ...new Set(
                baseCards.flatMap((card) =>
                    (card.attributes.aspects?.data || [])
                        .map((item) => item.attributes?.name || item.attributes?.title)
                        .filter(isNonEmptyString),
                ),
            ),
        ].sort()
        const hasCardsWithoutAspect = baseCards.some(
            (card) => getRelationNames(card.attributes.aspects?.data).length === 0,
        )
        return hasCardsWithoutAspect ? [...aspects, NO_ASPECT_FILTER_VALUE] : aspects
    }, [baseCards])

    const availableArenas = useMemo(() => {
        const arenas = [
            ...new Set(
                baseCards.flatMap((card) =>
                    (card.attributes.arenas?.data || [])
                        .map((item) => item.attributes?.name || item.attributes?.title)
                        .filter(isNonEmptyString),
                ),
            ),
        ].sort()

        const hasCardsWithoutArena = baseCards.some(
            (card) => getRelationNames(card.attributes.arenas?.data).length === 0,
        )
        return hasCardsWithoutArena ? [...arenas, NO_ARENA_FILTER_VALUE] : arenas
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
            if (prev.length === 0) return availableTraits

            const next = prev.filter((value) => availableTraits.includes(value))
            if (next.length === 0) return availableTraits

            const traitOptionsWithoutNoTrait = availableTraits.filter(
                (value) => value !== NO_TRAIT_FILTER_VALUE,
            )
            const hadAllTraitOptionsSelected = traitOptionsWithoutNoTrait.every((value) =>
                next.includes(value),
            )
            if (
                hadAllTraitOptionsSelected &&
                availableTraits.includes(NO_TRAIT_FILTER_VALUE) &&
                !next.includes(NO_TRAIT_FILTER_VALUE)
            ) {
                return [...next, NO_TRAIT_FILTER_VALUE]
            }

            return next.length === prev.length ? prev : next
        })
    }, [availableTraits])

    useEffect(() => {
        if (availableAspects.length === 0) return

        setSelectedAspects((prev) => {
            if (prev.length === 0) return availableAspects

            const next = prev.filter((value) => availableAspects.includes(value))
            if (next.length === 0) return availableAspects

            const aspectOptionsWithoutNoAspect = availableAspects.filter(
                (value) => value !== NO_ASPECT_FILTER_VALUE,
            )
            const hadAllAspectOptionsSelected = aspectOptionsWithoutNoAspect.every((value) =>
                next.includes(value),
            )
            if (
                hadAllAspectOptionsSelected &&
                availableAspects.includes(NO_ASPECT_FILTER_VALUE) &&
                !next.includes(NO_ASPECT_FILTER_VALUE)
            ) {
                return [...next, NO_ASPECT_FILTER_VALUE]
            }

            return next.length === prev.length ? prev : next
        })
    }, [availableAspects])

    useEffect(() => {
        if (availableArenas.length === 0) return

        setSelectedArenas((prev) => {
            if (prev.length === 0) return availableArenas

            const next = prev.filter((value) => availableArenas.includes(value))
            if (next.length === 0) return availableArenas

            const arenaOptionsWithoutNoArena = availableArenas.filter(
                (value) => value !== NO_ARENA_FILTER_VALUE,
            )
            const hadAllArenaOptionsSelected = arenaOptionsWithoutNoArena.every((value) =>
                next.includes(value),
            )
            if (
                hadAllArenaOptionsSelected &&
                availableArenas.includes(NO_ARENA_FILTER_VALUE) &&
                !next.includes(NO_ARENA_FILTER_VALUE)
            ) {
                return [...next, NO_ARENA_FILTER_VALUE]
            }

            return next.length === prev.length ? prev : next
        })
    }, [availableArenas])

    const filteredCards = useMemo(() => {
        if (baseCards.length === 0) return []
        const normalizedKeyword = keyword.trim().toLowerCase()

        const selectedTypeSet = new Set(selectedTypes)
        const selectedExpansionSet = new Set(selectedExpansions)
        const selectedRaritySet = new Set(selectedRarities)
        const selectedTraitSet = new Set(selectedTraits)
        const selectedAspectSet = new Set(selectedAspects)
        const selectedArenaSet = new Set(selectedArenas)

        return baseCards.filter((card) => {
            const type = getType(card)
            const expansion = getExpansion(card)
            const rarity = getRarity(card)
            const traits = getRelationNames(card.attributes.traits?.data)
            const traitFilterValues = traits.length > 0 ? traits : [NO_TRAIT_FILTER_VALUE]
            const aspects = getRelationNames(card.attributes.aspects?.data)
            const aspectFilterValues = aspects.length > 0 ? aspects : [NO_ASPECT_FILTER_VALUE]
            const arenas = getRelationNames(card.attributes.arenas?.data)
            const arenaFilterValues =
                arenas.length > 0 ? arenas : [NO_ARENA_FILTER_VALUE]
            const subtitle = getSubtitle(card)
            const rulesText = getRulesText(card)
            const keywordMatch =
                normalizedKeyword.length === 0 ||
                getCardName(card).toLowerCase().includes(normalizedKeyword) ||
                (subtitle ? subtitle.toLowerCase().includes(normalizedKeyword) : false) ||
                (rulesText ? rulesText.toLowerCase().includes(normalizedKeyword) : false)

            return (
                keywordMatch &&
                matchesFilter(type, typeFilterMode, selectedTypeSet) &&
                matchesFilter(expansion, expansionFilterMode, selectedExpansionSet) &&
                matchesFilter(rarity, rarityFilterMode, selectedRaritySet) &&
                matchesMultiValueFilter(traitFilterValues, traitFilterMode, selectedTraitSet) &&
                matchesAspectFilter(aspectFilterValues, aspectFilterMode, selectedAspectSet) &&
                matchesMultiValueFilter(arenaFilterValues, arenaFilterMode, selectedArenaSet) &&
                matchesNumericRange(card.attributes.cost, costRange) &&
                matchesNumericRange(card.attributes.power, powerRange) &&
                matchesNumericRange(card.attributes.hp, hpRange)
            )
        })
    }, [
        baseCards,
        keyword,
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
    ])

    useEffect(() => {
        setIndex(0)
    }, [
        showDuplicates,
        keyword,
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

    const hasBackImage = current ? Boolean(getBackCardImageUrl(current)) : false
    const imageUrl = current ? getMainCardImageUrl(current, showBackImage) : null

    useEffect(() => {
        setShowBackImage(false)
    }, [current?.id])

    useEffect(() => {
        const cardPanelElement = cardPanelRef.current
        if (!cardPanelElement) {
            setCardPanelHeight(null)
            return
        }

        const updateHeight = () => {
            setCardPanelHeight(cardPanelElement.offsetHeight)
        }

        updateHeight()
        const resizeObserver = new ResizeObserver(() => updateHeight())
        resizeObserver.observe(cardPanelElement)
        window.addEventListener('resize', updateHeight)

        return () => {
            resizeObserver.disconnect()
            window.removeEventListener('resize', updateHeight)
        }
    }, [current?.id, showAttributesPanel])

    useEffect(() => {
        const builderLayoutElement = builderLayoutRef.current
        if (!builderLayoutElement) {
            setBuilderMinHeight(null)
            return
        }

        const updateMinHeight = () => {
            const top = builderLayoutElement.getBoundingClientRect().top
            const next = Math.max(360, Math.floor(window.innerHeight - top - 24))
            setBuilderMinHeight(next)
        }

        updateMinHeight()
        window.addEventListener('resize', updateMinHeight)

        return () => {
            window.removeEventListener('resize', updateMinHeight)
        }
    }, [filtersOpen, showAttributesPanel, current?.id])

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
    const currentTotalCount = current ? getTotalCopiesForCard(deckEntries, current) : 0
    const currentTypeNormalized = current ? getType(current).trim().toLowerCase() : ''
    const currentIsLeaderOrBase =
        currentTypeNormalized === 'leader' || currentTypeNormalized === 'base'

    const sortedDeckEntries = useMemo(() => {
        return [...deckEntries].sort((a, b) => {
            const costA =
                typeof a.card.attributes.cost === 'number' && Number.isFinite(a.card.attributes.cost)
                    ? a.card.attributes.cost
                    : Number.POSITIVE_INFINITY
            const costB =
                typeof b.card.attributes.cost === 'number' && Number.isFinite(b.card.attributes.cost)
                    ? b.card.attributes.cost
                    : Number.POSITIVE_INFINITY

            if (costA !== costB) {
                return costA - costB
            }

            return getCardName(a.card).localeCompare(getCardName(b.card))
        })
    }, [deckEntries])

    const deckZoneEntries = useMemo(() => {
        return sortedDeckEntries.filter((entry) => entry.zone === 'deck')
    }, [sortedDeckEntries])

    const deckPlayableEntries = useMemo(() => {
        return deckZoneEntries.filter((entry) => !isLeaderOrBaseCard(entry.card))
    }, [deckZoneEntries])

    const sideboardZoneEntries = useMemo(() => {
        return sortedDeckEntries.filter((entry) => entry.zone === 'sideboard')
    }, [sortedDeckEntries])

    const totalDeckCards = useMemo(() => {
        return deckPlayableEntries.reduce((sum, entry) => sum + entry.count, 0)
    }, [deckPlayableEntries])

    const totalSideboardCards = useMemo(() => {
        return sideboardZoneEntries.reduce((sum, entry) => sum + entry.count, 0)
    }, [sideboardZoneEntries])

    const leaderCardsInDeck = useMemo(() => {
        const seen = new Set<string>()
        return deckZoneEntries
            .map((entry) => entry.card)
            .filter((card) => getType(card).trim().toLowerCase() === 'leader')
            .filter((card) => {
                const key = getDeduplicationKey(card)
                if (seen.has(key)) return false
                seen.add(key)
                return true
            })
    }, [deckZoneEntries])

    const baseCardsInDeck = useMemo(() => {
        const seen = new Set<string>()
        return deckZoneEntries
            .map((entry) => entry.card)
            .filter((card) => getType(card).trim().toLowerCase() === 'base')
            .filter((card) => {
                const key = getDeduplicationKey(card)
                if (seen.has(key)) return false
                seen.add(key)
                return true
            })
    }, [deckZoneEntries])

    const costDistribution = useMemo(() => {
        const buckets = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
            6: 0,
            '7+': 0,
        }

        deckPlayableEntries.forEach((entry) => {
            const rawCost = entry.card.attributes.cost
            if (typeof rawCost !== 'number' || !Number.isFinite(rawCost)) return
            const cost = Math.trunc(rawCost)
            if (cost >= 1 && cost <= 6) {
                buckets[cost as 1 | 2 | 3 | 4 | 5 | 6] += entry.count
                return
            }
            if (cost >= 7) {
                buckets['7+'] += entry.count
            }
        })

        return buckets
    }, [deckPlayableEntries])

    const filteredCardIdSet = useMemo(() => {
        return new Set(filteredCards.map((card) => card.id))
    }, [filteredCards])

    const filteredCardDedupKeySet = useMemo(() => {
        return new Set(filteredCards.map((card) => getDeduplicationKey(card)))
    }, [filteredCards])

    const cardsById = useMemo(() => {
        return new Map(cards.map((card) => [card.id, card] as const))
    }, [cards])

    const cardsByName = useMemo(() => {
        const map = new Map<string, SwuCard[]>()
        cards.forEach((card) => {
            const normalized = normalizeCardName(getCardName(card))
            if (!normalized) return
            const bucket = map.get(normalized) || []
            bucket.push(card)
            map.set(normalized, bucket)
        })
        return map
    }, [cards])

    const cardsByTitleSubtitle = useMemo(() => {
        const map = new Map<string, SwuCard>()
        cards.forEach((card) => {
            const key = buildTitleSubtitleKey(getCardName(card), getSubtitle(card))
            if (!map.has(key)) {
                map.set(key, card)
            }
        })
        return map
    }, [cards])

    function toDeckTransferItem(entry: DeckEntry): DeckTransferItem {
        return {
            id: entry.card.id,
            title: getCardName(entry.card),
            subtitle: getSubtitle(entry.card),
            count: entry.count,
        }
    }

    function exportDeckToJson() {
        const payload: DeckTransferData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            deck: deckZoneEntries.map(toDeckTransferItem),
            sideboard: sideboardZoneEntries.map(toDeckTransferItem),
        }

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `swu-deck-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
        anchor.click()
        URL.revokeObjectURL(url)
    }

    function triggerDeckImport() {
        deckImportInputRef.current?.click()
    }

    function parseImportedItems(value: unknown): DeckTransferItem[] {
        if (!Array.isArray(value)) return []

        return value
            .filter((item) => isObject(item))
            .map((item) => {
                const idRaw = typeof item.id === 'number' ? item.id : Number(item.id)
                const id = Number.isFinite(idRaw) ? Math.trunc(idRaw) : null
                const countRaw = typeof item.count === 'number' ? item.count : Number(item.count)
                const title =
                    typeof item.title === 'string'
                        ? item.title
                        : typeof item.name === 'string'
                          ? item.name
                          : ''
                const subtitle =
                    typeof item.subtitle === 'string' || item.subtitle === null
                        ? item.subtitle
                        : null

                if (!Number.isFinite(countRaw)) return null
                if (id === null && !title.trim()) return null
                const count = Math.min(Math.max(Math.trunc(countRaw), 1), MAX_COPIES_PER_CARD)
                return { id, title, subtitle, count }
            })
            .filter((item): item is DeckTransferItem => item !== null)
    }

    function buildImportedDeckEntries(
        items: DeckTransferItem[],
        zone: DeckZone,
        missingNames: Set<string>,
    ): DeckEntry[] {
        const mergedByKey = new Map<string, DeckEntry>()

        items.forEach((item) => {
            let card: SwuCard | undefined
            if (item.id !== null) {
                card = cardsById.get(item.id)
            }
            if (!card && item.title.trim()) {
                const candidates = cardsByName.get(normalizeCardName(item.title)) || []
                if (candidates.length === 1) {
                    card = candidates[0]
                } else if (candidates.length > 1) {
                    if (item.subtitle && item.subtitle.trim()) {
                        card = cardsByTitleSubtitle.get(buildTitleSubtitleKey(item.title, item.subtitle))
                    } else {
                        card = candidates[0]
                    }
                }
            }
            if (!card) {
                const fallback = item.id !== null ? `[id ${item.id}]` : '[neznamy nazev]'
                const label = item.subtitle?.trim()
                    ? `${item.title} | ${item.subtitle}`
                    : item.title.trim()
                missingNames.add(label || fallback)
                return
            }

            const key = buildDeckEntryKey(card, zone)
            const existing = mergedByKey.get(key)
            if (!existing) {
                mergedByKey.set(key, { key, count: item.count, card, zone })
                return
            }

            mergedByKey.set(key, {
                ...existing,
                count: Math.min(existing.count + item.count, MAX_COPIES_PER_CARD),
            })
        })

        return [...mergedByKey.values()]
    }

    async function importDeckFromFile(file: File) {
        try {
            const text = await file.text()
            const parsed = JSON.parse(text) as Partial<DeckTransferData>
            const deckItems = parseImportedItems(parsed.deck)
            const sideboardItems = parseImportedItems(parsed.sideboard)

            if (deckItems.length === 0 && sideboardItems.length === 0) {
                alert('Import selhal: soubor neobsahuje deck ani sideboard polozky.')
                return
            }

            const missingNames = new Set<string>()
            const importedDeck = buildImportedDeckEntries(deckItems, 'deck', missingNames)
            const importedSideboard = buildImportedDeckEntries(sideboardItems, 'sideboard', missingNames)
            const normalized = normalizeDeckEntries([...importedDeck, ...importedSideboard])

            if (normalized.length === 0) {
                alert('Import selhal: zadna karta ze souboru nebyla nalezena v aktualnim seznamu karet.')
                return
            }

            setDeckEntries(normalized)

            if (missingNames.size > 0) {
                alert(
                    `Import hotov, ale ${missingNames.size} karet nebylo nalezeno:\n${[
                        ...missingNames,
                    ].join('\n')}`,
                )
            }
        } catch {
            alert('Import selhal: neplatny JSON soubor.')
        }
    }

    function onDeckImportChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return

        void importDeckFromFile(file)
        event.target.value = ''
    }

    function previousCard() {
        setIndex((prev) => Math.max(prev - 1, 0))
    }

    function nextCard() {
        setIndex((prev) => Math.min(prev + 1, filteredCards.length - 1))
    }

    function onSliderChange(value: string) {
        setIndex(Number(value))
    }

    function jumpToCard(card: SwuCard) {
        const exactIndex = filteredCards.findIndex((item) => item.id === card.id)
        if (exactIndex >= 0) {
            setIndex(exactIndex)
            return
        }

        const dedupKey = getDeduplicationKey(card)
        const fallbackIndex = filteredCards.findIndex(
            (item) => getDeduplicationKey(item) === dedupKey,
        )
        if (fallbackIndex >= 0) {
            setIndex(fallbackIndex)
        }
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

    function selectAllArenas() {
        setSelectedArenas(availableArenas)
    }

    function clearAllArenas() {
        setSelectedArenas([])
    }

    function clearNumericFilters() {
        setCostRange(emptyRange)
        setPowerRange(emptyRange)
        setHpRange(emptyRange)
    }

    function resetFiltersToDefault() {
        setShowDuplicates(false)
        setShowAttributesPanel(false)
        setKeyword('')

        setTypeFilterMode('include')
        setSelectedTypes(availableTypes)

        setExpansionFilterMode('include')
        setSelectedExpansions(availableExpansions)

        setRarityFilterMode('include')
        setSelectedRarities(availableRarities)

        setTraitFilterMode('include')
        setSelectedTraits(availableTraits)

        setAspectFilterMode('include')
        setSelectedAspects(availableAspects)

        setArenaFilterMode('include')
        setSelectedArenas(availableArenas)

        clearNumericFilters()
    }

    function addCardToList(card: SwuCard, zone: DeckZone) {
        const key = buildDeckEntryKey(card, zone)

        setDeckEntries((prev) => {
            if (getTotalCopiesForCard(prev, card) >= MAX_COPIES_PER_CARD) {
                return prev
            }

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

    function useLeaderOrBase(card: SwuCard) {
        const normalizedType = getType(card).trim().toLowerCase()
        if (normalizedType !== 'leader' && normalizedType !== 'base') {
            return
        }

        setDeckEntries((prev) => {
            const withoutSameRole = prev.filter((entry) => {
                const entryType = getType(entry.card).trim().toLowerCase()
                return entryType !== normalizedType
            })

            const key = buildDeckEntryKey(card, 'deck')
            return normalizeDeckEntries([
                ...withoutSameRole,
                {
                    key,
                    count: 1,
                    card,
                    zone: 'deck',
                },
            ])
        })
    }

    function incrementDeckEntry(key: string) {
        setDeckEntries((prev) => {
            const target = prev.find((entry) => entry.key === key)
            if (!target) return prev
            if (getTotalCopiesForCard(prev, target.card) >= MAX_COPIES_PER_CARD) {
                return prev
            }

            return prev.map((entry) =>
                entry.key === key
                    ? { ...entry, count: Math.min(entry.count + 1, MAX_COPIES_PER_CARD) }
                    : entry,
            )
        })
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
        const deckImageUrl = getFrontImageUrl(entry.card)
        const otherZone: DeckZone = entry.zone === 'deck' ? 'sideboard' : 'deck'
        const otherKey = buildDeckEntryKey(entry.card, otherZone)
        const otherCount = deckEntries.find((item) => item.key === otherKey)?.count ?? 0
        const canTransferOut = entry.count > 0
        const canTransferIn = otherCount > 0
        const totalCopies = getTotalCopiesForCard(deckEntries, entry.card)
        const isVisibleInFilters =
            filteredCardIdSet.has(entry.card.id) ||
            filteredCardDedupKeySet.has(getDeduplicationKey(entry.card))

        return (
            <div
                key={entry.key}
                className={`deck-entry-card ${isVisibleInFilters ? '' : 'deck-entry-card-out-of-filter'}`.trim()}
            >
                <div className="deck-entry-top">
                    {deckImageUrl ? (
                        <img
                            className="deck-entry-image"
                            src={deckImageUrl}
                            alt={getCardName(entry.card)}
                            onClick={() => jumpToCard(entry.card)}
                        />
                    ) : (
                        <div className="deck-entry-image deck-entry-image-placeholder">Bez obrĂˇzku</div>
                    )}

                    <div className="deck-entry-meta">
                        <div className="deck-entry-title-row">
                            <div className="deck-entry-name">{getCardName(entry.card)}</div>
                            <div className="deck-entry-count">{entry.count}</div>
                        </div>
                        {getSubtitle(entry.card) ? (
                            <div className="deck-entry-subtitle">{getSubtitle(entry.card)}</div>
                        ) : null}
                        <div className="deck-entry-actions deck-entry-actions-inline">
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
                            {otherZone === 'sideboard' ? '>SB' : '>D'}
                        </button>
                        <button
                            type="button"
                            onClick={() => incrementDeckEntry(entry.key)}
                            disabled={totalCopies >= MAX_COPIES_PER_CARD}
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
                            {otherZone === 'sideboard' ? '<SB' : '<D'}
                        </button>
                    </div>
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
                    <input
                        className="toolbar-search"
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Hledat nazev nebo text"
                    />
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
                        showAttributesPanel={showAttributesPanel}
                        onShowAttributesPanelChange={setShowAttributesPanel}
                        onResetFiltersToDefault={resetFiltersToDefault}
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
                        onSelectPremierExpansions={selectPremierExpansions}
                    />
                </section>
            ) : null}

            {!current ? (
                <div className="status">Po aplikaci filtrů nezůstala žádná karta.</div>
            ) : (
                <div
                    ref={builderLayoutRef}
                    className={`builder-layout ${showAttributesPanel ? '' : 'builder-layout-no-details'}`.trim()}
                    style={builderMinHeight ? { minHeight: `${builderMinHeight}px` } : undefined}
                >
                    <section ref={cardPanelRef} className="card-panel">
                        <div className="card-image-wrap">
                            {imageUrl ? (
                                <div className="card-image-frame">
                                    <img
                                        className={`card-image ${imageLoading ? 'card-image-loading' : ''} ${hasBackImage ? 'card-image-clickable' : ''}`.trim()}
                                        src={imageUrl}
                                        alt={getCardName(current)}
                                        title={hasBackImage ? 'Klikni pro prepnuti predni/zadni strany' : undefined}
                                        onClick={() => {
                                            if (hasBackImage) {
                                                setShowBackImage((prev) => !prev)
                                            }
                                        }}
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
                        <div className="builder-actions card-panel-actions">
                            {currentIsLeaderOrBase ? (
                                <button type="button" onClick={() => useLeaderOrBase(current)}>
                                    Pouzit
                                </button>
                            ) : (
                                <>
                            <button
                                type="button"
                                className="deck-add-button"
                                onClick={() => addCardToList(current, 'deck')}
                                disabled={currentTotalCount >= MAX_COPIES_PER_CARD}
                                data-label={
                                    currentTotalCount >= MAX_COPIES_PER_CARD
                                        ? 'Deck max 3x'
                                        : `Pridat do decku (${currentDeckCount}${
                                              currentSideboardCount > 0
                                                  ? ` (sideboard ${currentSideboardCount})`
                                                  : ''
                                          })`
                                }
                            >
                                {currentTotalCount >= MAX_COPIES_PER_CARD
                                    ? 'Maximum 3Ă—'
                                    : `PĹ™idat do listu (${currentDeckCount}/3)`}
                            </button>
                            <button
                                type="button"
                                onClick={() => addCardToList(current, 'sideboard')}
                                disabled={currentTotalCount >= MAX_COPIES_PER_CARD}
                            >
                                {currentTotalCount >= MAX_COPIES_PER_CARD
                                    ? 'Sideboard max 3x'
                                    : `Pridat do sideboardu (${currentSideboardCount})`}
                            </button>
                                </>
                            )}
                        </div>
                    </section>

                    {showAttributesPanel ? <section className="details-panel">
                        <div className="details-header-row">
                            <div>
                                <h2>{getCardName(current)}</h2>
                                {getSubtitle(current) ? <div className="subtitle">{getSubtitle(current)}</div> : null}
                            </div>

                            {false ? <div className="builder-actions">
                                <button
                                    type="button"
                                    className="deck-add-button"
                                    onClick={() => addCardToList(current, 'deck')}
                                    disabled={currentTotalCount >= MAX_COPIES_PER_CARD}
                                    data-label={
                                        currentTotalCount >= MAX_COPIES_PER_CARD
                                            ? 'Deck max 3x'
                                            : `Pridat do decku (${currentDeckCount}${
                                                  currentSideboardCount > 0
                                                      ? ` (sideboard ${currentSideboardCount})`
                                                      : ''
                                              })`
                                    }
                                >
                                    {currentTotalCount >= MAX_COPIES_PER_CARD
                                        ? 'Maximum 3×'
                                        : `Přidat do listu (${currentDeckCount}/3)`}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => addCardToList(current, 'sideboard')}
                                    disabled={currentTotalCount >= MAX_COPIES_PER_CARD}
                                >
                                    {currentTotalCount >= MAX_COPIES_PER_CARD
                                        ? 'Sideboard max 3x'
                                        : `Pridat do sideboardu (${currentSideboardCount})`}
                                </button>
                            </div> : null}
                            {currentSideboardCount > 0 ? (
                                <div className="subtitle">(sideboard: {currentSideboardCount})</div>
                            ) : null}
                        </div>

                        {showAttributesPanel ? (
                            <div className="info-table">
                                {infoRows.map(([label, value]) => (
                                    <div key={label} className="info-row">
                                        <div className="info-label">{label}</div>
                                        <div className="info-value">{String(value)}</div>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {getRulesText(current) ? (
                            <div className="rules-box">
                                <h3>Text karty</h3>
                                <div>{getRulesText(current)}</div>
                            </div>
                        ) : null}
                    </section> : null}

                    <aside
                        className="deck-panel"
                        style={cardPanelHeight ? { height: `${cardPanelHeight}px` } : undefined}
                    >
                        <div className="deck-transfer-actions">
                            <button
                                type="button"
                                onClick={exportDeckToJson}
                                disabled={deckEntries.length === 0}
                            >
                                Export
                            </button>
                            <button type="button" onClick={triggerDeckImport} disabled={cards.length === 0}>
                                Import
                            </button>
                            <input
                                ref={deckImportInputRef}
                                className="deck-import-input"
                                type="file"
                                accept="application/json,.json"
                                onChange={onDeckImportChange}
                            />
                        </div>

                        <div className="deck-role-summary">
                            <div className={`deck-role-row ${leaderCardsInDeck.length === 1 ? '' : 'invalid'}`.trim()}>
                                <span className="deck-role-label">Leader</span>
                                <span className="deck-role-value">
                                    {leaderCardsInDeck.length === 0
                                        ? 'chybi'
                                        : leaderCardsInDeck.length === 1
                                          ? getCardName(leaderCardsInDeck[0])
                                          : leaderCardsInDeck.map((card) => getCardName(card)).join(', ')}
                                </span>
                            </div>
                            <div className={`deck-role-row ${baseCardsInDeck.length === 1 ? '' : 'invalid'}`.trim()}>
                                <span className="deck-role-label">Base</span>
                                <span className="deck-role-value">
                                    {baseCardsInDeck.length === 0
                                        ? 'chybi'
                                        : baseCardsInDeck.length === 1
                                          ? getCardName(baseCardsInDeck[0])
                                          : baseCardsInDeck.map((card) => getCardName(card)).join(', ')}
                                </span>
                            </div>
                        </div>

                        <div className="cost-distribution">
                            <div className="cost-distribution-title">Cost</div>
                            <div className="cost-distribution-grid">
                                <div className="cost-chip">1: {costDistribution[1]}</div>
                                <div className="cost-chip">2: {costDistribution[2]}</div>
                                <div className="cost-chip">3: {costDistribution[3]}</div>
                                <div className="cost-chip">4: {costDistribution[4]}</div>
                                <div className="cost-chip">5: {costDistribution[5]}</div>
                                <div className="cost-chip">6: {costDistribution[6]}</div>
                                <div className="cost-chip">7+: {costDistribution['7+']}</div>
                            </div>
                        </div>

                        <div className="deck-scroll">
                        {deckEntries.length === 0 ? (
                            <div className="deck-empty">Zatím nemáš přidané žádné karty.</div>
                        ) : (
                            <div className="deck-entry-list">
                                {([] as DeckEntry[]).map((entry) => {
                                    const deckImageUrl = getFrontImageUrl(entry.card)

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
                                <section className="deck-zone-container">
                                    <div
                                        className="deck-section-header"
                                        onClick={() => setDeckSectionOpen((prev) => !prev)}
                                    >
                                        <h4 className="deck-section-title">Deck</h4>
                                        <div className="deck-section-header-right">
                                            <span className="deck-count-chip">{totalDeckCards}</span>
                                            <span className="deck-collapse-indicator">
                                                {deckSectionOpen ? '▾' : '▸'}
                                            </span>
                                        </div>
                                    </div>
                                    {deckSectionOpen ? (
                                        <div className="deck-section-list-scroll">
                                            {deckPlayableEntries.length === 0 ? (
                                                <div className="deck-empty">Deck je prazdny.</div>
                                            ) : (
                                                <div className="deck-entry-list">
                                                    {deckPlayableEntries.map(renderDeckEntry)}
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </section>
                                <section className="deck-zone-container">
                                    <div
                                        className="deck-section-header"
                                        onClick={() => setSideboardSectionOpen((prev) => !prev)}
                                    >
                                        <h4 className="deck-section-title">Sideboard</h4>
                                        <div className="deck-section-header-right">
                                            <span className="deck-count-chip">{totalSideboardCards}</span>
                                            <span className="deck-collapse-indicator">
                                                {sideboardSectionOpen ? '▾' : '▸'}
                                            </span>
                                        </div>
                                    </div>
                                    {sideboardSectionOpen ? (
                                        <div className="deck-section-list-scroll">
                                            {sideboardZoneEntries.length === 0 ? (
                                                <div className="deck-empty">Sideboard je prazdny.</div>
                                            ) : (
                                                <div className="deck-entry-list">
                                                    {sideboardZoneEntries.map(renderDeckEntry)}
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </section>
                            </div>
                        ) : null}
                        </div>
                    </aside>
                </div>
            )}
        </div>
    )
}
