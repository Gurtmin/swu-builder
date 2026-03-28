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

    return (
        <div className="filter-section">
            <h3>{title}</h3>

            <div className="filter-mode-row">
                <label className="radio-option">
                    <input
                        type="radio"
                        name={`${title}-mode`}
                        checked={mode === 'include'}
                        onChange={() => onModeChange('include')}
                    />
                    <span>Include</span>
                </label>

                <label className="radio-option">
                    <input
                        type="radio"
                        name={`${title}-mode`}
                        checked={mode === 'exclude'}
                        onChange={() => onModeChange('exclude')}
                    />
                    <span>Exclude</span>
                </label>
            </div>

            <div className="filter-actions">
                <button type="button" onClick={onSelectAll}>
                    Zaškrtnout vše
                </button>
                <button type="button" onClick={onClearAll}>
                    Zrušit vše
                </button>
            </div>

            <div className="checkbox-grid">
                {items.map((item) => (
                    <label key={item} className="checkbox-option">
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
    )
}

function FilterPanelComponent(props: FilterPanelProps) {
    return (
        <section className="filter-panel">
            <div className="filter-section">
                <h3>Duplicity</h3>
                <label className="checkbox-option">
                    <input
                        type="checkbox"
                        checked={props.showDuplicates}
                        onChange={(e) => props.onShowDuplicatesChange(e.target.checked)}
                    />
                    <span>Zobrazit duplicitní karty</span>
                </label>
            </div>

            <div className="filter-groups">
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