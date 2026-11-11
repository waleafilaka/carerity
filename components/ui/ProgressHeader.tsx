import BackButton from "./BackButton";

type ProgressHeaderProps = {
  stage: string;
  progress: string;
  title: string;
  subtitle: string;
  backHref: string;
};

export default function ProgressHeader({
  stage,
  progress,
  title,
  subtitle,
  backHref,
}: ProgressHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <BackButton href={backHref} />

        <img
          src="/carerityblacklogo2.png"
          alt="Carerity"
          className="h-16 md:h-20 w-auto object-contain shrink-0"
        />
      </div>

      <div className="mb-5">
        <p className="text-sm font-semibold text-purple-600 mb-1">
          {stage}
        </p>

        <div className="w-full bg-purple-100 rounded-full h-2 mb-3">
          <div className={`bg-purple-600 h-2 rounded-full ${progress}`} />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-2 leading-tight">
          {title}
        </h1>

        <p className="text-center text-purple-600 text-sm md:text-base font-medium leading-snug">
          {subtitle}
        </p>
      </div>
    </>
  );
}
