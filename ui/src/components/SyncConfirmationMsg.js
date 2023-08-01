const SyncConfirmationMsg = ({ message, type }) => {
  const toastClass =
    type === "success"
      ? "from-green-400 to-green-500 dark:from-green-500/70 dark:to-green-500/20"
      : "from-blue-400 to-blue-500 dark:from-blue-500/70 dark:to-blue-500/20";

  return (
    <div
      className={`w-full h-full flex items-center justify-center px-4 py-4 rounded-lg shadow-lg ring-gray-900/5 dark:ring-white/10 backdrop-blur-xl bg-gradient-to-br ${toastClass}`}
    >
      <p className="text-center text-white font-medium text-sm">{message}</p>
    </div>
  );
};

export default SyncConfirmationMsg;
