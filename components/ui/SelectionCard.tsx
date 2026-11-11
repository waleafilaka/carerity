type SelectionCardProps = {
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
};

export default function SelectionCard({
  title,
  description,
  selected,
  onClick,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full min-h-[92px] cursor-pointer touch-manipulation text-left rounded-2xl border p-4 transition-all active:scale-[0.98] ${
        selected
          ? "bg-purple-50 border-2 border-purple-600"
          : "bg-white border-purple-200 hover:bg-purple-50 hover:border-purple-500"
      }`}
    >
      <div className="flex items-start gap-3 pointer-events-none">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 shrink-0 ${
            selected
              ? "bg-purple-600 text-white"
              : "border border-purple-300 text-transparent"
          }`}
        >
          ✓
        </div>

        <div className="min-w-0">
          <h2
            className={`font-bold text-base leading-snug ${
              selected ? "text-purple-700" : "text-gray-900"
            }`}
          >
            {title}
          </h2>

          {description && (
            <p className="text-sm text-gray-600 mt-1 leading-snug">
              {description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
