export default function TotalBackups({ loading, events, supportedEventKinds }) {
  let eventsBreakdown = [];
  // Construce the breakdown of event kinds and their total occurences in
  // in the events array and sort from highest total to lowest. Unsupported
  // event kinds are added in the "other" kind
  // We run this after loading to not cause unnecessary compute while the
  // relay is sending the initial batch of events
  if (!loading) {
    const counts = {};
    events.forEach((event) => {
      if (supportedEventKinds[event.kind]) {
        if (!counts[event.kind]) {
          counts[event.kind] = { kind: event.kind, total: 0 };
        }
        counts[event.kind].total += 1;
      } else {
        if (!counts["other"]) {
          counts["other"] = { kind: "other", total: 0 };
        }
        counts["other"].total += 1;
      }
    });
    eventsBreakdown = Object.entries(counts)
      .map(([, value]) => value)
      .sort((a, b) => b.total - a.total);
  }

  if (loading) {
    return (
      <div>
        <p className="px-10">
          <span className="text-8xl md:text-7xl lg:text-9xl font-semibold" />
          <span className="bg-slate-200 dark:bg-slate-600/70 rounded-full px-14 animate-pulse">
            &nbsp;
          </span>
        </p>
        <hr className="opacity-90 mx-10 px-6 mt-4 dark:opacity-10" />
        <ul className="overflow-y-auto max-h-[18.5rem] pt-5 px-10 md:px-6 lg:px-10">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
            return (
              <li key={num} className="flex pb-5">
                <div className="">
                  <span className="flex items-center justify-center w-7 h-7 text-sm rounded-md bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-700 dark:ring-0 dark:shadow-none dark:highlight-white/5"></span>
                </div>
                <div className="ml-2 mt-2 w-full flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="bg-slate-200 dark:bg-slate-600/70 rounded-full h-2 animate-pulse px-8">
                      &nbsp;
                    </span>
                    <span className="bg-slate-200 dark:bg-slate-600/70 rounded-full h-2 animate-pulse px-3">
                      &nbsp;
                    </span>
                  </div>
                  <div
                    style={{
                      width: `${100 - num * 10}%`,
                    }}
                    className="h-1 rounded-full bg-slate-200 dark:bg-slate-700"
                  ></div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const totalEvents = events.length;

  return (
    <div>
      <p className="text-slate-700 px-10 dark:text-slate-300 leading-relaxed">
        <span className="text-8xl md:text-7xl lg:text-9xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
          {totalEvents > 999 ? "999+" : totalEvents}
        </span>{" "}
        {totalEvents === 1 ? "action" : "actions"}
      </p>
      {totalEvents ? (
        <hr className="opacity-90 mx-10 px-6 mt-4 dark:opacity-10" />
      ) : null}
      <div className="">
        <ul className="overflow-y-auto max-h-[18.5rem] pt-5 px-10 md:px-6 lg:px-10">
          {eventsBreakdown.map(({ kind, total }) => {
            return (
              <li key={kind} className="flex pb-5">
                <div className="">
                  <span className="flex items-center justify-center w-7 h-7 text-sm rounded-md bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-700 dark:ring-0 dark:shadow-none dark:highlight-white/5">
                    {kind === "other" ? "🛠" : supportedEventKinds[kind]["icon"]}
                  </span>
                </div>
                <div className="ml-2 w-full flex flex-col justify-between">
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300 text-sm">
                      {kind === "other"
                        ? "Other Actions"
                        : `${supportedEventKinds[kind]["name"]}s`}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 text-sm">
                      {total}
                    </span>
                  </div>
                  <div
                    style={{
                      width: `${(total * 100) / totalEvents}%`,
                    }}
                    className="h-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500"
                  ></div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
