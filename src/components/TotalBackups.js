import {
  motion,
  animate,
  useMotionValue,
  useTransform,
  LayoutGroup,
} from "framer-motion";
import { useEffect } from "react";

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
      const kind = event.kind in supportedEventKinds ? event.kind : "other";
      if (!counts[kind]) {
        counts[kind] = { kind: kind, total: 0 };
      }
      counts[kind].total += 1;
    });
    eventsBreakdown = Object.entries(counts)
      .map(([, value]) => value)
      .sort((a, b) => b.total - a.total);
  }

  const totalEvents = events.length;

  const totalEventsAnimatedCount = useMotionValue(totalEvents);
  const totalEventsAnimatedCountRounded = useTransform(
    totalEventsAnimatedCount,
    (latestValue) => Math.round(latestValue),
  );

  // animate total count after loading
  // and on every new event
  useEffect(() => {
    if (!loading) {
      const controls = animate(totalEventsAnimatedCount, totalEvents);
      return controls.stop;
    }
  }, [totalEvents, loading]);

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
        <ul className="overflow-y-auto max-h-[18.5rem] pt-5 px-10 md:px-6 lg:px-10 !scrollbar-thin !scrollbar-w-1 !scrollbar-thumb-rounded-full !scrollbar-track-transparent !scrollbar-thumb-black/10 dark:!scrollbar-thumb-white/10 mx-[0.15rem]">
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

  return (
    <div>
      <p className="text-slate-700 px-10 dark:text-slate-300 leading-relaxed mt-2">
        <motion.span className="text-8xl md:text-7xl lg:text-9xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
          {totalEvents > 999 ? "999+" : totalEventsAnimatedCountRounded}
        </motion.span>{" "}
      </p>
      {totalEvents ? (
        <hr className="opacity-90 mx-10 px-6 mt-3 mb-1 dark:opacity-10" />
      ) : null}
      <div className="">
        <ul className="overflow-y-auto max-h-[19.2rem] pt-5 px-10 md:px-6 lg:px-10 !scrollbar-thin !scrollbar-w-1 !scrollbar-thumb-rounded-full !scrollbar-track-transparent !scrollbar-thumb-black/10 dark:!scrollbar-thumb-white/10 mx-[0.15rem]">
          <LayoutGroup>
            {eventsBreakdown.map(({ kind, total }) => {
              return (
                <motion.li
                  initial={{
                    scale: 0.2,
                    opacity: 0,
                  }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                  }}
                  exit={{
                    scale: 0,
                    opacity: 0,
                  }}
                  layout
                  key={kind}
                  className="flex pb-5"
                >
                  <div className="">
                    <span className="flex items-center justify-center w-7 h-7 text-sm rounded-md bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-700 dark:ring-0 dark:shadow-none dark:highlight-white/5">
                      {supportedEventKinds[kind]["icon"]}
                    </span>
                  </div>
                  <div className="ml-2 w-full flex flex-col justify-between">
                    <div className="flex justify-between">
                      <span className="text-slate-700 dark:text-slate-300 text-sm">
                        {`${supportedEventKinds[kind]["name"]}${
                          total > 1 ? "s" : ""
                        }`}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 text-sm">
                        {total}
                      </span>
                    </div>
                    <motion.div
                      animate={{
                        width: `${(total * 100) / totalEvents}%`,
                      }}
                      className="h-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500"
                    ></motion.div>
                  </div>
                </motion.li>
              );
            })}
          </LayoutGroup>
        </ul>
      </div>
    </div>
  );
}
