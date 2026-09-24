-- One row per day and combination of what was seen. The site keeps counts, never visitors.
CREATE TABLE counts (
    day TEXT NOT NULL,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    detail TEXT NOT NULL,
    referrer TEXT NOT NULL,
    country TEXT NOT NULL,
    device TEXT NOT NULL,
    n INTEGER NOT NULL,
    PRIMARY KEY (day, kind, name, detail, referrer, country, device)
);
