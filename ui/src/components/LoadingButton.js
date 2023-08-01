import LoadSpinner from "./LoadSpinner";

export default function AddIdentifierButton() {
  return (
    <button
      className="flex justify-center items-center rounded-md p-2 bg-white dark:bg-opacity-0 dark:bg-gradient-to-br dark:from-white-20 dark:to-white-10 dark:shadow-custom-light-purple border dark:border-0"
      disabled={true}
    >
      <LoadSpinner />
    </button>
  );
}
