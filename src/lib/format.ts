const compact = new Intl.NumberFormat("en", { notation: "compact" });

/** "100,000+" as "100K+": the store's own figure, short enough for a tile. */
export function compactFigure(figure: string): string {
    const plus = figure.endsWith("+") ? "+" : "";
    return compact.format(Number(figure.replace(/[^\d.]/g, ""))) + plus;
}
