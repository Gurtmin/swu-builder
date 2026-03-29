import { memo } from 'react'
import type { FilterMode } from './types'

type RangeValue = {
    min: string
    max: string
}

type FilterGroupProps = {
    title: string
    items: string[]
    mode: FilterMode
    selectedItems: string[]
    onModeChange: (mode: FilterMode) => void
    onToggleItem: (value: string) => void
    onSelectAll: () => void
    onClearAll: () => void
}

type StatsRangeFiltersProps = {
    costRange: RangeValue
    onCostMinChange: (value: string) => void
    onCostMaxChange: (value: string) => void

    powerRange: RangeValue
    onPowerMinChange: (value: string) => void
    onPowerMaxChange: (value: string) => void

    hpRange: RangeValue
    onHpMinChange: (value: string) => void
    onHpMaxChange: (value: string) => void
}

type FilterPanelProps = {
    showDuplicates: boolean
    onShowDuplicatesChange: (value: boolean) => void

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

    expansions: string[]
    expansionMode: FilterMode
    selectedExpansions: string[]
    onExpansionModeChange: (mode: FilterMode) => void
    onToggleExpansion: (value: string) => void
    onSelectAllExpansions: () => void
    onClearAllExpansions: () => void

    costRange: RangeValue
    onCostMinChange: (value: string) => void
    onCostMaxChange: (value: string) => void

    powerRange: RangeValue
    onPowerMinChange: (value: string) => void
    onPowerMaxChange: (value: string) => void

    hpRange: RangeValue
    onHpMinChange: (value: string) => void
    onHpMaxChange: (value: string) => void
    onResetToDefaults: () => void

    keyword: string
    onKeywordChange: (value: string) => void
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
                     }: FilterGroupProps) {
    const selectedSet = new Set(selectedItems)

    return (
        <section className="filter-section">
            <div className="filter-tile-header">
                <h3>{title}</h3>
                <div className="filter-count">
                    {mode === 'include' ? 'I' : 'E'} · {selectedItems.length} / {items.length}
                </div>
            </div>

            <div className="filter-top-row">
                <div className="filter-segmented">
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

                <div className="filter-actions">
                    <button type="button" onClick={onSelectAll}>
                        Vše
                    </button>
                    <button type="button" onClick={onClearAll}>
                        Nic
                    </button>
                </div>
            </div>

            <div className="filter-options-box">
                <div className="checkbox-grid">
                    {items.map((item) => (
                        <label key={item} className="checkbox-chip checkbox-chip-large">
                            <input
                                type="checkbox"
                                checked={selectedSet.has(item)}
                                onChange={() => onToggleItem(item)}
                            />
                            <span>{item}</span>
                        </label>
                    ))}
                </div>
            </div>
        </section>
    )
}

function StatsRangeFilters({
                               costRange,
                               onCostMinChange,
                               onCostMaxChange,
                               powerRange,
                               onPowerMinChange,
                               onPowerMaxChange,
                               hpRange,
                               onHpMinChange,
                               onHpMaxChange,
                           }: StatsRangeFiltersProps) {
    return (
        <section className="filter-section">
            <div className="filter-tile-header">
                <h3>Stats</h3>
            </div>

            <div className="stats-range-grid">
                <div className="stats-range-row">
                    <div className="stats-range-label">Cost</div>
                    <input
                        className="stats-range-input"
                        type="number"
                        inputMode="numeric"
                        value={costRange.min}
                        onChange={(e) => onCostMinChange(e.target.value)}
                        placeholder="od"
                    />
                    <div className="stats-range-separator">-</div>
                    <input
                        className="stats-range-input"
                        type="number"
                        inputMode="numeric"
                        value={costRange.max}
                        onChange={(e) => onCostMaxChange(e.target.value)}
                        placeholder="do"
                    />
                </div>

                <div className="stats-range-row">
                    <div className="stats-range-label">Power</div>
                    <input
                        className="stats-range-input"
                        type="number"
                        inputMode="numeric"
                        value={powerRange.min}
                        onChange={(e) => onPowerMinChange(e.target.value)}
                        placeholder="od"
                    />
                    <div className="stats-range-separator">-</div>
                    <input
                        className="stats-range-input"
                        type="number"
                        inputMode="numeric"
                        value={powerRange.max}
                        onChange={(e) => onPowerMaxChange(e.target.value)}
                        placeholder="do"
                    />
                </div>

                <div className="stats-range-row">
                    <div className="stats-range-label">HP</div>
                    <input
                        className="stats-range-input"
                        type="number"
                        inputMode="numeric"
                        value={hpRange.min}
                        onChange={(e) => onHpMinChange(e.target.value)}
                        placeholder="od"
                    />
                    <div className="stats-range-separator">-</div>
                    <input
                        className="stats-range-input"
                        type="number"
                        inputMode="numeric"
                        value={hpRange.max}
                        onChange={(e) => onHpMaxChange(e.target.value)}
                        placeholder="do"
                    />
                </div>
            </div>
        </section>
    )
}

function FilterPanelComponent(props: FilterPanelProps) {
    return (
        <div className="better-filter-panel">
            <div className="filter-tile filter-tile-compact">
                <section className="filter-section">
                    <div className="filter-tile-header">
                        <h3>Obecné</h3>
                    </div>

                    <div className="general-controls">
                        <label className="general-keyword-field">
                            <span>Keyword</span>
                            <input
                                type="text"
                                value={props.keyword}
                                onChange={(e) => props.onKeywordChange(e.target.value)}
                                placeholder="název nebo text karty"
                            />
                        </label>

                        <div className="general-filter-actions">
                            <label className="checkbox-chip">
                                <input
                                    type="checkbox"
                                    checked={props.showDuplicates}
                                    onChange={(e) => props.onShowDuplicatesChange(e.target.checked)}
                                />
                                <span>Zobrazit duplicitní karty</span>
                            </label>

                            <button
                                type="button"
                                className="general-reset-button"
                                onClick={props.onResetToDefaults}
                            >
                                Původní nastavení
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            <div className="filter-grid filter-grid-wide">
                <div className="filter-tile">
                    <StatsRangeFilters
                        costRange={props.costRange}
                        onCostMinChange={props.onCostMinChange}
                        onCostMaxChange={props.onCostMaxChange}
                        powerRange={props.powerRange}
                        onPowerMinChange={props.onPowerMinChange}
                        onPowerMaxChange={props.onPowerMaxChange}
                        hpRange={props.hpRange}
                        onHpMinChange={props.onHpMinChange}
                        onHpMaxChange={props.onHpMaxChange}
                    />
                </div>

                <div className="filter-tile">
                    <FilterGroup
                        title="Types"
                        items={props.types}
                        mode={props.typeMode}
                        selectedItems={props.selectedTypes}
                        onModeChange={props.onTypeModeChange}
                        onToggleItem={props.onToggleType}
                        onSelectAll={props.onSelectAllTypes}
                        onClearAll={props.onClearAllTypes}
                    />
                </div>

                <div className="filter-tile">
                    <FilterGroup
                        title="Expansions"
                        items={props.expansions}
                        mode={props.expansionMode}
                        selectedItems={props.selectedExpansions}
                        onModeChange={props.onExpansionModeChange}
                        onToggleItem={props.onToggleExpansion}
                        onSelectAll={props.onSelectAllExpansions}
                        onClearAll={props.onClearAllExpansions}
                    />
                </div>

                <div className="filter-tile">
                    <FilterGroup
                        title="Rarities"
                        items={props.rarities}
                        mode={props.rarityMode}
                        selectedItems={props.selectedRarities}
                        onModeChange={props.onRarityModeChange}
                        onToggleItem={props.onToggleRarity}
                        onSelectAll={props.onSelectAllRarities}
                        onClearAll={props.onClearAllRarities}
                    />
                </div>

                <div className="filter-tile">
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
                </div>

                <div className="filter-tile">
                    <FilterGroup
                        title="Aspects"
                        items={props.aspects}
                        mode={props.aspectMode}
                        selectedItems={props.selectedAspects}
                        onModeChange={props.onAspectModeChange}
                        onToggleItem={props.onToggleAspect}
                        onSelectAll={props.onSelectAllAspects}
                        onClearAll={props.onClearAllAspects}
                    />
                </div>
            </div>
        </div>
    )
}

const FilterPanel = memo(FilterPanelComponent)
export default FilterPanel