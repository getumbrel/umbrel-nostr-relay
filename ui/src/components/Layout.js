import backgroundImg from "../assets/bg.png";

export default function Layout({ children }) {
  return (
    <div className="relative z-0 w-full min-h-screen bg-slate-50/70 dark:bg-slate-900">
      <div className="absolute z-[-1] opacity-10 inset-0 bg-[url(./assets/grid.svg)] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <div className="absolute z-[-1] top-0 inset-x-0 flex justify-center overflow-hidden pointer-events-none">
        <div className="w-[108rem] flex-none flex justify-end">
          <img
            src={backgroundImg}
            alt=""
            className="w-[90rem] flex flex-none max-w-none"
            decoding="async"
          />
        </div>
      </div>

      {children}
    </div>
  );
}
