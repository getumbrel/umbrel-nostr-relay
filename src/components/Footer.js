export default function Footer({ leftContent, rightContent }) {
  return (
    <footer className="container mx-auto">
      <div className="flex justify-between">
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {leftContent}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {rightContent}
        </span>
      </div>
    </footer>
  );
}
