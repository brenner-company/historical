interface Point {
    date: {
        timestamp: number,
        readable: string
    },
    files?: PointFile[],
    statistics?: PointStatistics
}

interface PointFile {
    data: {
        root: string,
        dir: string,
        base: string,
        ext: string,
        name: string
    },
    source: {
        dir: string,
        base: string,
        location: string[]
    }
}

interface PointStatistics {
    size: number[],
    selectors: {
        total: number,
        class: number,
        id: number,
        pseudoClass: number,
        pseudoElement: number,
        values: string[],
        specificity: {
            max: number,
            average: number,
            graph: number[]
        }
    }[],
    declarations: {
        important: [{
            property?: string,
            value?: string
        }]
    }[]
}

interface RhythmSettings {
    identifier: string,
    limits: {
        monthly: number,
        hourly: number
    }
}