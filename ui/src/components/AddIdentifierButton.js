export default function AddIdentifierButton({ onClick, disabled }) {
  return (
    <button
      className="flex justify-center items-center rounded-md p-2 bg-white dark:bg-opacity-0 dark:bg-gradient-to-br dark:from-white-20 dark:to-white-10 dark:shadow-custom-light-purple border dark:border-0"
      onClick={onClick}
      disabled={disabled}
    >
      <div className="w-5 h-5 bg-add-icon-light-mode dark:bg-add-icon-dark-mode bg-no-repeat bg-center"></div>
    </button>
  );
}
