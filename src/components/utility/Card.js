export default function Card({ className = "", heading, children }) {
  return (
    <div
      className={`${className} bg-white/60 dark:bg-white/5 backdrop-blur-2xl backdrop-saturate-150 pt-6 shadow-xl dark:shadow-gray-900 ring-1 ring-gray-900/5 dark:ring-white/10 rounded-xl`}
    >
      <h2 className="text-slate-700 dark:text-slate-50 text-xl font-semibold mb-4 px-10">
        {heading}
      </h2>
      <hr className="opacity-40 px-6 dark:opacity-10" />
      {children}
    </div>
  );
}
