export type SwuCard = {
    id?: number | string
    title?: string
    subtitle?: string
    name?: string
    cardNumber?: string | number
    artist?: string
    rarity?: string
    variantOf?: string | number | null

    type?: {
        name?: string
        sortValue?: number
    } | null

    aspect?: Array<{
        name?: string
        color?: string
    }> | null

    traits?: Array<{
        name?: string
    }> | null

    arena?: {
        name?: string
    } | null

    expansion?: {
        name?: string
        code?: string
    } | null

    frontArt?: {
        url?: string
    } | null

    image?: string | null
    cost?: number | null
    hp?: number | null
    power?: number | null
    text?: string | null
}