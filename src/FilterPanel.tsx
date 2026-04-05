import { memo } from 'react'
import type { FilterMode, RangeValue } from './types'

type FilterGroupProps = {
    title: string
    items: string[]
    mode: FilterMode
    selectedItems: string[]
    onModeChange: (mode: FilterMode) => void
    onToggleItem: (value: string) => void
    onSelectAll: () => void
    onClearAll: () => void
    extraActions?: React.ReactNode
    getItemClassName?: (item: string) => string | undefined
}

type FilterPanelProps = {
    showDuplicates: boolean
    onShowDuplicatesChange: (value: boolean) => void
    showAttributesPanel: boolean
    onShowAttributesPanelChange: (value: boolean) => void
    onResetFiltersToDefault: () => void
    costRange: RangeValue
    powerRange: RangeValue
    hpRange: RangeValue
    onCostRangeChange: (value: RangeValue) => void
    onPowerRangeChange: (value: RangeValue) => void
    onHpRangeChange: (value: RangeValue) => void
    onClearNumericFilters: () => void

    types: string[]
    typeMode: FilterMode
    selectedTypes: string[]
    onTypeModeChange: (mode: FilterMode) => void
    onToggleType: (value: string) => void
    onSelectAllTypes: () => void
    onClearAllTypes: () => void

    rarities: string[]
    rarityMode: FilterMode
    selectedRarities: string[]
    onRarityModeChange: (mode: FilterMode) => void
    onToggleRarity: (value: string) => void
    onSelectAllRarities: () => void
    onClearAllRarities: () => void

    traits: string[]
    traitMode: FilterMode
    selectedTraits: string[]
    onTraitModeChange: (mode: FilterMode) => void
    onToggleTrait: (value: string) => void
    onSelectAllTraits: () => void
    onClearAllTraits: () => void

    aspects: string[]
    aspectMode: FilterMode
    selectedAspects: string[]
    onAspectModeChange: (mode: FilterMode) => void
    onToggleAspect: (value: string) => void
    onSelectAllAspects: () => void
    onClearAllAspects: () => void

    arenas: string[]
    arenaMode: FilterMode
    selectedArenas: string[]
    onArenaModeChange: (mode: FilterMode) => void
    onToggleArena: (value: string) => void
    onSelectAllArenas: () => void
    onClearAllArenas: () => void

    expansions: string[]
    expansionMode: FilterMode
    selectedExpansions: string[]
    onExpansionModeChange: (mode: FilterMode) => void
    onToggleExpansion: (value: string) => void
    onSelectAllExpansions: () => void
    onClearAllExpansions: () => void
    onSelectPremierExpansions?: () => void
}

function FilterGroup({
    title,
    items,
    mode,
    selectedItems,
    onModeChange,
    onToggleItem,
    onSelectAll,
    onClearAll,
    extraActions,
    getItemClassName,
}: FilterGroupProps) {
    const selectedSet = new Set(selectedItems)

    return (
        <section className="filter-group">
            <div className="filter-group-header">
                <strong>{title}</strong>
                <span>
                    {selectedItems.length} / {items.length}
                </span>
            </div>

            <div className="filter-mode-buttons">
                <button
                    type="button"
                    className={`segmented ${mode === 'include' ? 'active' : ''}`}
                    onClick={() => onModeChange('include')}
                >
                    Include
                </button>
                <button
                    type="button"
                    className={`segmented ${mode === 'exclude' ? 'active' : ''}`}
                    onClick={() => onModeChange('exclude')}
                >
                    Exclude
                </button>
            </div>

            <div className="filter-group-actions">
                {extraActions}
                <button type="button" onClick={onSelectAll}>
                    Vse
                </button>
                <button type="button" onClick={onClearAll}>
                    Nic
                </button>
            </div>

            <div className="filter-items">
                {items.map((item) => (
                    <label
                        key={item}
                        className={`filter-item ${getItemClassName?.(item) ?? ''}`.trim()}
                    >
                        <input
                            type="checkbox"
                            checked={selectedSet.has(item)}
                            onChange={() => onToggleItem(item)}
                        />
                        <span>{item}</span>
                    </label>
                ))}
            </div>
        </section>
    )
}

function getAspectChipClassName(item: string): string | undefined {
    const normalized = item.trim().toLowerCase()
    if (normalized === 'villainy' || normalized === 'vilanly') return 'aspect-chip aspect-villainy'
    if (normalized === 'command') return 'aspect-chip aspect-command'
    if (normalized === 'aggression') return 'aspect-chip aspect-aggression'
    if (normalized === 'cunning') return 'aspect-chip aspect-cunning'
    if (normalized === 'heroism') return 'aspect-chip aspect-heroism'
    if (normalized === 'vigilance' || normalized === 'vigiliance')
        return 'aspect-chip aspect-vigilance'
    return undefined
}

type NumericRangeRowProps = {
    label: string
    value: RangeValue
    onChange: (next: RangeValue) => void
}

function NumericRangeRow({ label, value, onChange }: NumericRangeRowProps) {
    return (
        <div className="numeric-filter-row">
            <span className="numeric-filter-label">{label}</span>
            <input
                type="number"
                inputMode="numeric"
                placeholder="min"
                value={value.min}
                onChange={(e) => onChange({ ...value, min: e.target.value })}
            />
            <input
                type="number"
                inputMode="numeric"
                placeholder="max"
                value={value.max}
                onChange={(e) => onChange({ ...value, max: e.target.value })}
            />
        </div>
    )
}

function FilterPanelComponent(props: FilterPanelProps) {
    return (
        <>
            <div className="filter-group">
                <div className="filter-group-header">
                    <strong>Obecne</strong>
                </div>

                <label className="filter-item">
                    <input
                        type="checkbox"
                        checked={props.showDuplicates}
                        onChange={(e) => props.onShowDuplicatesChange(e.target.checked)}
                    />
                    <span>Zobrazit duplicitni karty</span>
                </label>

                <label className="filter-item">
                    <input
                        type="checkbox"
                        checked={props.showAttributesPanel}
                        onChange={(e) => props.onShowAttributesPanelChange(e.target.checked)}
                    />
                    <span>Zobrazit stredni panel detailu</span>
                </label>

                <div className="filter-group-actions">
                    <button type="button" onClick={props.onResetFiltersToDefault}>
                        Filtr do puvodniho nastaveni
                    </button>
                </div>
            </div>

            <div className="filters-panel">
                <section className="filter-group">
                    <div className="filter-group-header">
                        <strong>Ciselne</strong>
                    </div>

                    <div className="filter-group-actions">
                        <button type="button" onClick={props.onClearNumericFilters}>
                            Vycistit
                        </button>
                    </div>

                    <div className="numeric-filter-grid">
                        <NumericRangeRow
                            label="Cost"
                            value={props.costRange}
                            onChange={props.onCostRangeChange}
                        />
                        <NumericRangeRow
                            label="Power"
                            value={props.powerRange}
                            onChange={props.onPowerRangeChange}
                        />
                        <NumericRangeRow
                            label="HP"
                            value={props.hpRange}
                            onChange={props.onHpRangeChange}
                        />
                    </div>
                </section>

                <FilterGroup
                    title="Typ"
                    items={props.types}
                    mode={props.typeMode}
                    selectedItems={props.selectedTypes}
                    onModeChange={props.onTypeModeChange}
                    onToggleItem={props.onToggleType}
                    onSelectAll={props.onSelectAllTypes}
                    onClearAll={props.onClearAllTypes}
                />

                <FilterGroup
                    title="Edice"
                    items={props.expansions}
                    mode={props.expansionMode}
                    selectedItems={props.selectedExpansions}
                    onModeChange={props.onExpansionModeChange}
                    onToggleItem={props.onToggleExpansion}
                    onSelectAll={props.onSelectAllExpansions}
                    onClearAll={props.onClearAllExpansions}
                    extraActions={
                        props.onSelectPremierExpansions ? (
                            <button type="button" onClick={props.onSelectPremierExpansions}>
                                Premier
                            </button>
                        ) : undefined
                    }
                />

                <FilterGroup
                    title="Rarita"
                    items={props.rarities}
                    mode={props.rarityMode}
                    selectedItems={props.selectedRarities}
                    onModeChange={props.onRarityModeChange}
                    onToggleItem={props.onToggleRarity}
                    onSelectAll={props.onSelectAllRarities}
                    onClearAll={props.onClearAllRarities}
                />

                <FilterGroup
                    title="Traits"
                    items={props.traits}
                    mode={props.traitMode}
                    selectedItems={props.selectedTraits}
                    onModeChange={props.onTraitModeChange}
                    onToggleItem={props.onToggleTrait}
                    onSelectAll={props.onSelectAllTraits}
                    onClearAll={props.onClearAllTraits}
                />

                <FilterGroup
                    title="Aspekty"
                    items={props.aspects}
                    mode={props.aspectMode}
                    selectedItems={props.selectedAspects}
                    onModeChange={props.onAspectModeChange}
                    onToggleItem={props.onToggleAspect}
                    onSelectAll={props.onSelectAllAspects}
                    onClearAll={props.onClearAllAspects}
                    getItemClassName={getAspectChipClassName}
                />

                <FilterGroup
                    title="Arena"
                    items={props.arenas}
                    mode={props.arenaMode}
                    selectedItems={props.selectedArenas}
                    onModeChange={props.onArenaModeChange}
                    onToggleItem={props.onToggleArena}
                    onSelectAll={props.onSelectAllArenas}
                    onClearAll={props.onClearAllArenas}
                />
            </div>
        </>
    )
}

const FilterPanel = memo(FilterPanelComponent)

export default FilterPanel
