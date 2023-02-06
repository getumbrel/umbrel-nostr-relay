import { motion, LayoutGroup } from "framer-motion";

import moment from "moment";

export default function LatestActions({
  loading,
  events,
  eventsToRenderLimit,
  supportedEventKinds,
}) {
  let eventsToRender = [];
  // Filter, sort and slice the events array to get the eventsToRender array
  // We run this after loading to not cause unnecessary compute while the
  // relay is sending the initial batch of events
  if (!loading) {
    eventsToRender = events
      .filter(({ kind }) => !!supportedEventKinds[kind])
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, eventsToRenderLimit);
  }

  function getFormattedDate(timestamp) {
    return moment.unix(timestamp).format("HH:mm MMM DD, YYYY");
  }

  if (loading) {
    return (
      <ul className="overflow-y-auto overflow-x-hidden max-h-[28.8rem] pt-2 !scrollbar-thin !scrollbar-w-1 !scrollbar-thumb-rounded-full !scrollbar-track-transparent !scrollbar-thumb-black/10 dark:!scrollbar-thumb-white/10 mx-[0.15rem]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item, index) => {
          return (
            <li key={item} className="relative px-10 py-3">
              {/* <img className="w-14 h-14 object-cover rounded-full mr-3" src="avatar.png" /> */}
              <span className="absolute z-[2] left-10 flex items-center justify-center w-7 h-7 text-sm sm:text-lg rounded-md bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-700 dark:ring-0 dark:shadow-none dark:highlight-white/5" />
              <div className="pl-9 mt-1">
                <div className="flex justify-between mb-2">
                  <span className="bg-slate-200 dark:bg-slate-600/70 h-2 mt-1 rounded-full animate-pulse px-8 text-xs ml-1">
                    &nbsp;
                  </span>
                  <span className="bg-slate-200 dark:bg-slate-600/70 h-2 mt-1 rounded-full animate-pulse px-16 text-xs ml-1">
                    &nbsp;
                  </span>
                </div>
              </div>
              <span
                className={`absolute z-[1] ${index === 0 ? "top-4" : "top-0"} ${
                  index === 9 ? "bottom-4" : "bottom-0"
                } left-[3.33rem] w-px bg-slate-200 dark:bg-slate-700`}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  if (eventsToRender.length) {
    return (
      <ul className="overflow-y-auto overflow-x-hidden max-h-[28.8rem] pt-2 !scrollbar-thin !scrollbar-w-1 !scrollbar-thumb-rounded-full !scrollbar-track-transparent !scrollbar-thumb-black/10 dark:!scrollbar-thumb-white/10 mx-[0.15rem]">
        <LayoutGroup>
          {eventsToRender.map(({ id, kind, created_at, content }, index) => {
            const eventKind = supportedEventKinds[kind];

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
                key={id}
                className="relative px-10 py-3"
              >
                <span className="absolute z-[2] left-10 flex items-center justify-center w-7 h-7 text-sm rounded-md bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-700 dark:ring-0 dark:shadow-none dark:highlight-white/5">
                  {eventKind.icon}
                </span>
                <div className="pl-9 mt-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-700 text-sm dark:text-slate-200">
                      {eventKind.name}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 tracking-tighter text-xs">
                      {getFormattedDate(created_at)}
                    </span>
                  </div>
                  {eventKind.showContent ? (
                    <div className="bg-slate-50 dark:bg-white/5 p-2 rounded shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-700">
                      <p className="text-slate-700 dark:text-slate-300 text-sm text-ellipsis overflow-hidden">
                        {eventKind.contentKey
                          ? JSON.parse(content)[eventKind.contentKey]
                          : content}
                      </p>
                    </div>
                  ) : null}
                </div>
                <span
                  className={`absolute z-[1] ${index === 0 ? "top-4" : "top-0"} 
                  ${eventsToRender.length === 1 ? "hidden" : ""}
                  ${
                    index === eventsToRender.length - 1 ? "top-[-2rem]" : ""
                  } bottom-0 left-[3.33rem] w-px h-full bg-slate-200 dark:bg-slate-700`}
                />
              </motion.li>
            );
          })}
        </LayoutGroup>
      </ul>
    );
  }

  return (
    <p className="px-10 py-5 text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
      Your Nostr activity will show up here after you have connected your
      client.
    </p>
  );
}
