export type ImageFormat = {
    url?: string
    width?: number
    height?: number
}

export type MediaAttributes = {
    url?: string
    formats?: {
        card?: ImageFormat
        small?: ImageFormat
        medium?: ImageFormat
        xsmall?: ImageFormat
        xxsmall?: ImageFormat
        xxxsmall?: ImageFormat
        thumbnail?: ImageFormat
    }
}

export type MediaData = {
    id?: number
    attributes?: MediaAttributes
} | null

export type RelationItemAttributes = {
    name?: string
    title?: string
    code?: string
}

export type RelationItem = {
    id?: number
    attributes?: RelationItemAttributes
}

export type RelationMany = {
    data?: RelationItem[]
} | null

export type RelationOne = {
    data?: RelationItem | null
} | null

export type SwuCardAttributes = {
    cardNumber?: number
    title?: string
    subtitle?: string
    artist?: string
    cost?: number | null
    hp?: number | null
    power?: number | null
    text?: string | null
    textStyled?: string | null
    deployBox?: string | null
    epicAction?: string | null
    unique?: boolean
    hyperspace?: boolean
    showcase?: boolean
    serialCode?: string

    type?: RelationOne
    aspects?: RelationMany
    traits?: RelationMany
    arenas?: RelationMany
    expansion?: RelationOne
    rarity?: RelationOne

    artFront?: {
        data?: MediaData
    } | null

    artBack?: {
        data?: MediaData
    } | null

    artThumbnail?: {
        data?: MediaData
    } | null
}

export type SwuCard = {
    id: number
    attributes: SwuCardAttributes
}