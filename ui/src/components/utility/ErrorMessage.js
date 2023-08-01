import warningIcon from "../../assets/warning.svg";

export default function ErrorMessage({ error }) {
  return (
    <div className="mt-2 px-7">
      <p className="text-[#E93A6B] text-sm">
        <img src={warningIcon} className="inline pb-1 mr-1" /> {error}
      </p>
    </div>
  );
}
