import { memo } from 'react'
import type { FilterMode } from './types'

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

    expansions: string[]
    expansionMode: FilterMode
    selectedExpansions: string[]
    onExpansionModeChange: (mode: FilterMode) => void
    onToggleExpansion: (value: string) => void
    onSelectAllExpansions: () => void
    onClearAllExpansions: () => void
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
    const modeLabel = mode === 'include' ? 'I' : 'E'

    return (
        <section className="filter-tile">
            <div className="filter-tile-header">
                <h3>{title}</h3>
                <span className="filter-count">
                    {modeLabel} · {selectedItems.length} / {items.length}
                </span>
            </div>

            <div className="filter-top-row">
                <div className="filter-segmented">
                    <button
                        type="button"
                        className={mode === 'include' ? 'segmented active' : 'segmented'}
                        onClick={() => onModeChange('include')}
                    >
                        Include
                    </button>
                    <button
                        type="button"
                        className={mode === 'exclude' ? 'segmented active' : 'segmented'}
                        onClick={() => onModeChange('exclude')}
                    >
                        Exclude
                    </button>
                </div>

                <div className="filter-actions">
                    <button type="button" onClick={onSelectAll}>Vše</button>
                    <button type="button" onClick={onClearAll}>Nic</button>
                </div>
            </div>

            <div className="filter-options-box">
                <div className="checkbox-grid">
                    {items.map((item) => (
                        <label key={item} className="checkbox-chip">
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

function FilterPanelComponent(props: FilterPanelProps) {
    return (
        <section className="filter-panel better-filter-panel">
            <section className="filter-tile filter-tile-compact">
                <div className="filter-tile-header">
                    <h3>Duplicity</h3>
                </div>

                <label className="checkbox-chip checkbox-chip-large">
                    <input
                        type="checkbox"
                        checked={props.showDuplicates}
                        onChange={(e) => props.onShowDuplicatesChange(e.target.checked)}
                    />
                    <span>Zobrazit duplicitní karty</span>
                </label>
            </section>

            <div className="filter-grid">
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
                />
            </div>
        </section>
    )
}

export default memo(FilterPanelComponent)