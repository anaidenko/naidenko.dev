/**
 * The code-audit page and the sample report's page. Each sentence is checked against Auditdesk's
 * README, design note and code at main 11eedfe (sources per sentence: paste-sheet 13). "{email}"
 * is rendered as a link to the contact address.
 */
export const audit = {
    path: "/audit",
    title: "Code audits",
    description:
        "An independent audit of your codebase: scanners, AI agents and my review of every finding, in a report your founders and engineers can act on.",
    og: "Scanners, an AI agent per aspect, and my review of every finding.",
    hero: {
        lead: "Know what to fix in your codebase, and what can wait.",
        text: "An independent audit before a launch, a fundraise or a handover. I run it on Auditdesk, a workbench I built for it: scanners first, then an AI agent per aspect, and my own review of every finding before you see it.",
        sample: "See a sample report",
        order: "Order an audit",
        shot: {
            src: "/audit/report-finding.png",
            alt: "F-031 in the sample report, a critical finding: its recommendation in view, then its details and the evidence with line numbers",
            width: 822,
            height: 900
        }
    },
    sample: {
        title: "A sample report",
        text: "The full report from an audit of OWASP Juice Shop, an online shop built to be insecure on purpose, so its count of findings is not a typical client's.",
        link: "Open the sample report",
        href: "/audit/sample",
        pdf: "Download it as a PDF",
        pdfHref: "/audit/sample-report.pdf"
    },
    steps: {
        title: "How it works",
        items: [
            {
                title: "Scanners first",
                text: "gitleaks searches every branch's history for secrets, osv-scanner checks your dependencies for known vulnerabilities, and Semgrep runs its rules.",
                shot: null
            },
            {
                title: "An AI agent per aspect",
                text: "Then a Claude agent reads the code for each aspect you choose, through read-only tools and against a checklist, and files each finding with its evidence.",
                shot: {
                    src: "/audit/run-form.png",
                    alt: "Starting an audit: the repository, its detected stack, and the aspects to examine",
                    width: 1136,
                    height: 738
                }
            },
            {
                title: "My review of every finding",
                text: "I accept, edit, merge or reject every finding. Only what I accept reaches the report.",
                shot: {
                    src: "/audit/review.png",
                    alt: "Reviewing findings: each with its evidence and the auditor's decision",
                    width: 1136,
                    height: 900
                }
            }
        ]
    },
    coverage: {
        title: "What it covers",
        paragraphs: [
            "Security always, plus the aspects you choose: dependencies and supply chain, architecture, data model and database, code quality and tests, production readiness, API design, performance, accessibility, LLM integrations and multi-tenancy.",
            "With a front end and its API in separate repositories, one more pass reads them together: the front end's calls against the back end's routes, authentication across both, and secrets in the bundle.",
            "For an app written largely with AI tools, extra checks for what is typical of such code: uneven checks, packages to verify, copies that drifted apart."
        ]
    },
    deliverables: {
        title: "What you get",
        items: [
            "For founders and leadership: what to fix before sign-off and what can wait, with an estimate of the effort for each.",
            "For your engineers: each finding with its evidence by file and line, the fix, and links to the OWASP Top 10, ASVS and CWE.",
            "One HTML file with filters and search, and a PDF.",
            "The accepted findings as issue drafts for Linear or GitHub, and as SARIF for code scanning.",
            "After your fixes, a re-audit of the new commit re-checks every finding the last report listed."
        ]
    },
    yourCode: {
        title: "Your code",
        paragraphs: [
            "The audit runs on my machine. Auditdesk never installs, builds or runs your code, and every secret gitleaks finds is masked before the model sees it.",
            // Retention and training: code.claude.com/docs/en/data-usage, read 2026-10-07; re-check before release.
            "Two things leave my machine. What the agents read goes to Anthropic, which keeps it for 30 days and does not train on it: a map of your repository, the brief you give me, the scanners' findings, and the code the agents open or search. Your dependencies' names and versions go to OSV's vulnerability database.",
            "If your policy calls for it, the audit runs on your own Anthropic API key, under your own commercial terms with Anthropic and with every call on your account.",
            "I delete my copy of your code when the engagement ends."
        ]
    },
    order: {
        label: "Order an audit",
        toptal: "If we met through Toptal, the audit goes through Toptal.",
        note: "Otherwise: online payment is coming soon. Until then, write to me at {email} with a link to your repository or a few lines about your product, and I will reply with a scope and a quote.",
        form: "Or use the contact form"
    }
};

/** /audit/sample: the exported report itself, under a bar that says what it is (D8). */
export const samplePage = {
    path: "/audit/sample",
    title: "Sample code audit report",
    description:
        "The full report from a code audit of OWASP Juice Shop with Auditdesk: findings ranked by severity, each with its evidence, its fix and its references.",
    note: "A sample: the full report from an audit of OWASP Juice Shop v20.2.0, an online shop built to be insecure on purpose, so its count of findings is not a typical client's.",
    about: "How the audit works",
    pdf: "Download PDF",
    /** The report's sections, in its order, for /stats: the ids Auditdesk's renderReport gives them. */
    sections: [
        { id: "summary", label: "Summary" },
        { id: "since", label: "Since the last audit" },
        { id: "scope", label: "Scope and method" },
        { id: "findings", label: "Findings" },
        { id: "ai-built", label: "Signs of AI-generated code" },
        { id: "questions", label: "Open questions" },
        { id: "technical", label: "Technical details" },
        { id: "disclaimer", label: "Disclaimer" }
    ]
};
