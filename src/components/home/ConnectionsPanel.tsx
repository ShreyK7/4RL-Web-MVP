import { themeClasses } from "@/utils/theme";

const connections = [
  { name: "Jess", status: "Planning sushi crawl", lastActive: "Active now" },
  { name: "Ankit", status: "Looking for soccer sub", lastActive: "Active 1h ago" },
  { name: "Mara", status: "Coworking tomorrow?", lastActive: "Active 3h ago" },
];

export default function ConnectionsPanel() {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur p-8 shadow-sm space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className={`${themeClasses.text.headingSmall} ${themeClasses.text.primary}`}>
          Your connections
        </h2>
        <p className={`${themeClasses.text.secondary}`}>
          Drop back in to see who else is out and about. For now, keep tabs on your connections.
        </p>
      </div>

      <div className="space-y-4">
        {connections.map((connection) => (
          <div
            key={connection.name}
            className="flex items-center justify-between rounded-2xl border border-gray-200 p-4 hover:border-gray-300 transition"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-semibold">
                {connection.name[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{connection.name}</p>
                <p className="text-sm text-gray-500">{connection.status}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide">{connection.lastActive}</p>
              <button className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
                Message
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

