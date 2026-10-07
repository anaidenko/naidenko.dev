"use client";

import { useEffect } from "react";

/**
 * Runs the exported report's own script (filters, search, Expand all) once its markup is on the
 * page. A <script> that React renders is not run after a move within the site; one added here is.
 */
export function ReportScript({ code }: { code: string }) {
    useEffect(() => {
        const script = document.createElement("script");
        script.textContent = code;
        document.body.appendChild(script);
        return () => script.remove();
    }, [code]);
    return null;
}
