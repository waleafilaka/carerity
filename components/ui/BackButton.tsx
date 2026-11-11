type BackButtonProps = {
  href: string;
};

export default function BackButton({ href }: BackButtonProps) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 text-sm md:text-base font-semibold text-gray-700 hover:text-purple-600 active:text-purple-700 transition-all duration-200 touch-manipulation active:scale-[0.98]"
    >
      <span className="text-lg leading-none">←</span>
      <span>Back</span>
    </a>
  );
}
