"use client";

export type CareRecordDateFilter =
  | "today"
  | "last7Days"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "custom";

type Props = {
  searchInput: string;
  appliedSearch: string;
  dateFilter: CareRecordDateFilter;
  customFrom: string;
  customTo: string;
  onSearchInputChange: (value: string) => void;
  onApplySearch: () => void;
  onClearSearch: () => void;
  onDateFilterChange: (value: CareRecordDateFilter) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  onReset: () => void;
};

const presets: Array<{
  value: CareRecordDateFilter;
  label: string;
}> = [
  { value: "today", label: "Today" },
  { value: "last7Days", label: "Last 7 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisYear", label: "This Year" },
];

export default function CareRecordsFilter({
  searchInput,
  appliedSearch,
  dateFilter,
  customFrom,
  customTo,
  onSearchInputChange,
  onApplySearch,
  onClearSearch,
  onDateFilterChange,
  onCustomFromChange,
  onCustomToChange,
  onReset,
}: Props) {
  const hasFilters = Boolean(
    searchInput ||
      appliedSearch ||
      customFrom ||
      customTo ||
      dateFilter !== "thisMonth"
  );

  function handleFromChange(value: string) {
    onCustomFromChange(value);
    onDateFilterChange("custom");
  }

  function handleToChange(value: string) {
    onCustomToChange(value);
    onDateFilterChange("custom");
  }

  return (
    <section className="rounded-3xl border border-purple-300 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_150px_150px_auto] xl:items-end">
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold">
            Search care records
          </span>

          <input
            type="search"
            value={searchInput}
            onChange={(event) =>
              onSearchInputChange(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onApplySearch();
              }
            }}
            placeholder="Record ID, caregiver, recipient, date or notes"
            className="w-full rounded-xl border border-purple-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-200"
          />
        </label>

        <DateField
          label="From"
          value={customFrom}
          max={customTo || undefined}
          onChange={handleFromChange}
        />

        <DateField
          label="To"
          value={customTo}
          min={customFrom || undefined}
          onChange={handleToChange}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onApplySearch}
            className="flex-1 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
          >
            Search
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-purple-100 pt-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onDateFilterChange(preset.value)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                dateFilter === preset.value
                  ? "border-purple-600 bg-purple-600 text-white"
                  : "border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
              }`}
            >
              {preset.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => onDateFilterChange("custom")}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
              dateFilter === "custom"
                ? "border-purple-600 bg-purple-600 text-white"
                : "border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
            }`}
          >
            Custom
          </button>
        </div>

        {(searchInput || appliedSearch) && (
          <button
            type="button"
            onClick={onClearSearch}
            className="self-start text-sm font-semibold text-purple-700 hover:underline lg:self-auto"
          >
            Clear search
          </button>
        )}
      </div>
    </section>
  );
}

function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">
        {label}
      </span>

      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-200"
      />
    </label>
  );
}


