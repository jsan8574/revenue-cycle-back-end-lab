"use client";

export type PdfReport = {
  label: string;
  description: string;
  title: string;
  sections: {
    heading: string;
    lines: string[];
  }[];
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export function PdfExportCenter({
  learnerName,
  moduleName,
  scenarioName,
  reports,
}: {
  learnerName: string;
  moduleName: string;
  scenarioName: string;
  reports: PdfReport[];
}) {
  const printReport = (report: PdfReport) => {
    const reportWindow = window.open("", "_blank", "width=960,height=760");
    if (!reportWindow) return;

    const sectionMarkup = report.sections
      .map(
        (section) => `
          <section>
            <h2>${escapeHtml(section.heading)}</h2>
            ${
              section.lines.length
                ? `<ul>${section.lines
                    .map((line) => `<li>${escapeHtml(line || "Not entered")}</li>`)
                    .join("")}</ul>`
                : "<p>Not entered</p>"
            }
          </section>
        `,
      )
      .join("");

    reportWindow.document.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(`${learnerName} - ${report.title}`)}</title>
          <style>
            @page { size: letter; margin: 0.55in; }
            * { box-sizing: border-box; }
            body {
              color: #183b43;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11pt;
              line-height: 1.45;
              margin: 0;
            }
            header {
              border-bottom: 3px solid #1b6168;
              display: flex;
              justify-content: space-between;
              margin-bottom: 22px;
              padding-bottom: 14px;
            }
            header span {
              color: #667a7c;
              display: block;
              font-size: 8pt;
              letter-spacing: 0.08em;
              margin-bottom: 4px;
              text-transform: uppercase;
            }
            h1 { font-size: 22pt; margin: 0; }
            header div:last-child { text-align: right; }
            header strong { display: block; font-size: 11pt; margin-top: 2px; }
            .case-strip {
              background: #edf3f1;
              border-left: 4px solid #d99333;
              display: grid;
              gap: 8px;
              grid-template-columns: 1fr 1fr;
              margin-bottom: 18px;
              padding: 12px 14px;
            }
            .case-strip span { color: #657879; font-size: 8pt; text-transform: uppercase; }
            .case-strip strong { display: block; margin-top: 3px; }
            section {
              break-inside: avoid;
              border: 1px solid #d4dfdc;
              margin-bottom: 12px;
              padding: 13px 15px;
            }
            h2 {
              color: #1b6168;
              font-size: 11pt;
              letter-spacing: 0.04em;
              margin: 0 0 8px;
              text-transform: uppercase;
            }
            ul { margin: 0; padding-left: 18px; }
            li { margin: 4px 0; }
            footer {
              border-top: 1px solid #cad6d3;
              color: #718183;
              font-size: 8pt;
              margin-top: 22px;
              padding-top: 9px;
            }
            @media print {
              .print-help { display: none; }
            }
          </style>
        </head>
        <body>
          <header>
            <div>
              <span>Revenue Cycle Training Lab</span>
              <h1>${escapeHtml(report.title)}</h1>
            </div>
            <div>
              <span>Learner</span>
              <strong>${escapeHtml(learnerName)}</strong>
              <span style="margin-top: 7px">Generated</span>
              <strong>${escapeHtml(new Date().toLocaleString())}</strong>
            </div>
          </header>
          <div class="case-strip">
            <div><span>Module</span><strong>${escapeHtml(moduleName)}</strong></div>
            <div><span>Scenario</span><strong>${escapeHtml(scenarioName)}</strong></div>
          </div>
          ${sectionMarkup}
          <footer>
            Fictional training data only. This learner-generated record is for
            coaching and practice, not production account documentation.
          </footer>
          <script>
            window.addEventListener("load", () => {
              window.print();
            });
          </script>
        </body>
      </html>
    `);
    reportWindow.document.close();
  };

  return (
    <section className="pdf-export-center" aria-label="Save learner work as PDF">
      <div>
        <span className="section-kicker">Learner evidence</span>
        <h2>Save your work as PDF</h2>
        <p>
          Each report includes learner name, module, scenario, and the work
          entered so far. Choose “Save as PDF” in the print window.
        </p>
      </div>
      <div className="pdf-export-options">
        {reports.slice(0, 3).map((report, index) => (
          <button
            type="button"
            key={report.label}
            onClick={() => printReport(report)}
          >
            <span>PDF {index + 1}</span>
            <strong>{report.label}</strong>
            <small>{report.description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
