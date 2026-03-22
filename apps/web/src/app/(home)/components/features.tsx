import { FeatureItem } from "./feature-item";

const features = [
  {
    title: "Local-First Security",
    description:
      "Your data never leaves your machine. Connect to local databases securely without authentication hurdles or cloud dependencies. Total privacy, zero compromise.",
    imageSrc: "/features/local.png",
  },
  {
    title: "Multi-Tab",
    description:
      "Multitask effortlessly with a robust tab system designed for power users. Keep dozens of tables, queries, and views open simultaneously without losing context.",
    imageSrc: "/features/tabs.png",
  },
  {
    title: "Spreadsheet-Like Editing",
    description:
      "Interact with your data as easily as a spreadsheet. Inline editing, dedicated JSON sidebars, and modal views make managing complex data structures intuitive and fast.",
    imageSrc: "/features/inline-editing.png",
  },
  {
    title: "Quick Panel",
    description:
      "Navigate your entire database ecosystem without lifting your hands. Use the Quick Panel (Ctrl + P) to jump instantly to any table, view, function, or schema.",
    imageSrc: "/features/quick-panel.png",
  },
  {
    title: "Intelligent SQL Editor",
    description:
      "Write queries faster with a powerful editor featuring syntax highlighting, auto-completion, and intelligent suggestions tailored to your specific schema.",
    imageSrc: "/features/sql-editor.png",
  },
  {
    title: "Flexible Data Export",
    description:
      "Export your data in seconds. Support for JSON and CSV formats with advanced filtering options to extract exactly what you need from your tables.",
    imageSrc: "/features/export.png",
  },
  {
    title: "AI Chat on Your Database",
    description:
      "Understand your database better with conversational AI. Chat naturally to explore your data, generate SQL queries, and get instant insights without writing code.",
    comingSoon: true,
  },
  {
    title: "Database Dashboards",
    description:
      "Visualize your data directly from the database with custom dashboards featuring charts, text widgets, and more. Create and save personalized views to gain insights at a glance.",
    comingSoon: true,
  },
];

export default function Features() {
  const activeFeatures = features.filter((f) => !f.comingSoon);
  const comingSoonFeatures = features.filter((f) => f.comingSoon);

  return (
    <section
      id="features"
      className="py-24 px-6 border-t border-dashed border-fd-border"
    >
      <div className="max-w-6xl mx-auto flex flex-col gap-24 md:gap-32 mb-24">
        {activeFeatures.map((feature, index) => (
          <FeatureItem
            key={index}
            {...feature}
            alignment={index % 2 === 0 ? "left" : "right"}
          />
        ))}
      </div>

      {comingSoonFeatures.length > 0 && (
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comingSoonFeatures.map((feature, index) => (
              <FeatureItem
                key={`coming-soon-${index}`}
                {...feature}
                alignment="left" // Not used for coming soon
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
