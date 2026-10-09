const compact = new Intl.NumberFormat("en", { notation: "compact" });

/** "100,000+" as "100K+": the store's own figure, short enough for a tile. */
export function compactFigure(figure: string): string {
    const plus = figure.endsWith("+") ? "+" : "";
    return compact.format(Number(figure.replace(/[^\d.]/g, ""))) + plus;
}

/** A quote's paragraphs (split on a blank line), with the opening mark on the first and the closing one on the last. */
export function quoteParagraphs(quote: string): string[] {
    const paragraphs = quote.split("\n\n");
    paragraphs[0] = `“${paragraphs[0]}`;
    paragraphs[paragraphs.length - 1] += "”";
    return paragraphs;
}
