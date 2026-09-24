export function Chips({ items, label }: { items: readonly string[]; label: string }) {
    return (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={label}>
            {items.map(item => (
                <li key={item} className="rounded-full bg-accent/10 px-3 py-1 text-xs leading-5 font-medium text-accent">
                    {item}
                </li>
            ))}
        </ul>
    );
}
