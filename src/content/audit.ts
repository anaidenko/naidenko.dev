/**
 * The code-audit page. Each sentence is checked against Auditdesk's README, design note and code at
 * main 773ac76 (sources per sentence: paste-sheet 13). "{email}" is rendered as
 * a link to the contact address.
 */
export const audit = {
    path: "/audit",
    title: "Code audits",
    description:
        "An independent audit of your codebase: scanners, AI agents and a human review of every finding, in a report your founders and engineers can act on.",
    og: "Scanners, an AI agent per aspect, and my review of every finding.",
    lead: "I audit your codebase with Auditdesk, a workbench I built for it: scanners first, then an AI agent per aspect, and my own review of every finding before you see it.",
    sections: [
        {
            title: "What you get",
            paragraphs: [
                "One report for two readers. For founders and leadership: what to fix before sign-off and what can wait. For your engineers: each finding with its evidence by file and line, the fix, and links to the OWASP Top 10, ASVS and CWE.",
                "An HTML file with filters and search, and a PDF. After your fixes, a re-audit of the new commit re-checks every finding the last report listed."
            ]
        },
        {
            title: "How it works",
            paragraphs: [
                "gitleaks searches every branch's history for secrets, osv-scanner checks your dependencies for known vulnerabilities, and Semgrep runs its rules.",
                "Then a Claude agent reads the code for each aspect you choose, from security and dependencies to the data model, production readiness, LLM integrations and multi-tenancy, against a checklist. I accept, edit, merge or reject every finding; only what I accept reaches the report."
            ]
        },
        {
            title: "Your code",
            paragraphs: [
                "The audit runs on my machine. Auditdesk never installs, builds or runs your code, and every secret gitleaks finds is masked before the model sees it.",
                // Retention and training: code.claude.com/docs/en/data-usage, read 2026-10-07; re-check before release.
                "Two things leave my machine. What the agents read goes to Anthropic, which keeps it for 30 days and does not train on it: a map of your repository, the brief you give me, the scanners' findings, and the code the agents open or search. Your dependencies' names and versions go to Google's open-source vulnerability services: OSV, and deps.dev for Maven and pip manifests.",
                "If your policy calls for it, the audit runs on your own Anthropic API key, under your own commercial terms with Anthropic and with every call on your account.",
                "I delete my copy of your code when the engagement ends."
            ]
        }
    ],
    screenshots: [
        {
            src: "/audit/run-form.png",
            alt: "Starting an audit: the repository, its detected stack, and the aspects to examine",
            width: 1440,
            height: 900
        },
        {
            src: "/audit/review.png",
            alt: "Reviewing findings: each with its evidence and the auditor's decision",
            width: 1440,
            height: 900
        },
        {
            src: "/audit/report-finding.png",
            alt: "A finding in the report: severity, evidence with line numbers, the fix and its references",
            width: 1440,
            height: 900
        }
    ],
    order: {
        label: "Order an audit",
        toptal: "If we met through Toptal, the audit goes through Toptal.",
        note: "Otherwise: online payment is coming soon. Until then, write to me at {email} with a link to your repository or a few lines about your product, and I will reply with a scope and a quote.",
        form: "Or use the contact form"
    }
};
