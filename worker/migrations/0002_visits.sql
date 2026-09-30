-- One row per page load, and one per click or section reached. No IP address is stored: the place
-- and network come from Cloudflare, and `visitor` is a keyed hash, erased after 13 months.
-- The daily totals of 0001 cannot be split into visits, so they are dropped.
DROP TABLE counts;

CREATE TABLE visits (
    id TEXT PRIMARY KEY,
    at TEXT NOT NULL,
    day TEXT NOT NULL,
    visitor TEXT,
    first_today INTEGER NOT NULL,
    -- Seen on an earlier day. ("returning" is an SQL keyword.)
    returned INTEGER NOT NULL,
    path TEXT NOT NULL,
    referrer TEXT NOT NULL,
    ref TEXT NOT NULL,
    country TEXT NOT NULL,
    region TEXT NOT NULL,
    city TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    asn INTEGER,
    network TEXT NOT NULL,
    device TEXT NOT NULL,
    browser TEXT NOT NULL,
    os TEXT NOT NULL,
    language TEXT NOT NULL,
    screen INTEGER,
    -- Seconds the page was visible; NULL when the page never reported it.
    seconds INTEGER
);
CREATE INDEX visits_day ON visits (day);
CREATE INDEX visits_visitor ON visits (visitor);

-- No foreign key: a click or section can reach the Worker before its visit does. Every query
-- joins events to visits, so an event whose visit was never stored is not counted.
CREATE TABLE events (
    visit TEXT NOT NULL,
    at TEXT NOT NULL,
    name TEXT NOT NULL,
    detail TEXT NOT NULL
);
CREATE INDEX events_visit ON events (visit);
