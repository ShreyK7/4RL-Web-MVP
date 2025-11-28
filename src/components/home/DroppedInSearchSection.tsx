import { themeClasses } from "@/utils/theme";

const sampleFilters = ["Within 2 miles", "Music", "Outdoors", "Game night"];
const sampleUsers = [
  { name: "Riya", activity: "Hiking @ Twin Peaks", time: "5 min ago" },
  { name: "Omar", activity: "Open mic vibes", time: "10 min ago" },
  { name: "Kai", activity: "Cowork + coffee", time: "20 min ago" },
];

export default function DroppedInSearchSection() {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur p-8 shadow-sm space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className={`${themeClasses.text.headingSmall} ${themeClasses.text.primary}`}>
          Explore who's active
        </h2>
        <p className={`${themeClasses.text.secondary}`}>
          Search and filter people who are currently dropped in.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex-1 flex gap-3">
          <input
            type="text"
            placeholder="Search by vibe, neighborhood, plan..."
            className={`${themeClasses.input.base} w-full`}
          />
          <select className={`${themeClasses.input.base} w-36`}>
            <option>Any time</option>
            <option>Now</option>
            <option>Later today</option>
            <option>This weekend</option>
          </select>
        </div>
        <button className="px-5 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition">
          Filters
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {sampleFilters.map((filter) => (
          <span
            key={filter}
            className="px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-medium"
          >
            {filter}
          </span>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sampleUsers.map((user) => (
          <div
            key={user.name}
            className="rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:border-blue-200 transition"
          >
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center font-semibold">
              {user.name[0]}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">{user.activity}</p>
            </div>
            <span className="text-xs text-gray-400">{user.time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

