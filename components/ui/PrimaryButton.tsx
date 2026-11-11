type PrimaryButtonProps = {
  href: string;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  disabled?: boolean;
};

export default function PrimaryButton({
  href,
  children,
  onClick,
  disabled = false,
}: PrimaryButtonProps) {
  return (
    <a
      href={disabled ? "#" : href}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        if (onClick) {
          onClick(event);
        }
      }}
      className={`block w-full min-h-12 py-3 px-4 rounded-xl font-semibold text-center transition-all touch-manipulation active:scale-[0.98] shadow-sm ${
        disabled
          ? "bg-gray-300 text-gray-600 cursor-not-allowed"
          : "bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white cursor-pointer"
      }`}
    >
      {children}
    </a>
  );
}
