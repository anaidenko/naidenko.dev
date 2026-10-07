"use client";

import { useEffect } from "react";

// The script binds listeners it never removes, so it runs once per report on the page, even when
// an effect runs twice (Strict Mode in development).
const ran = new WeakSet<Element>();

/**
 * Runs the exported report's own script (filters, search, Expand all) once its markup is on the
 * page. A <script> that React renders is not run after a move within the site; one added here is.
 */
export function ReportScript({ code }: { code: string }) {
    useEffect(() => {
        const report = document.getElementById("content");
        if (!report || ran.has(report)) return;
        ran.add(report);
        const script = document.createElement("script");
        script.textContent = code;
        document.body.appendChild(script);
    }, [code]);
    return null;
}
