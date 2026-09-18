export function PhoneticText({
  phonetic,
  className = "",
}: {
  phonetic?: string | null;
  className?: string;
}) {
  if (!phonetic) return null;
  return (
    <p className={`text-base font-normal italic text-slate-500 ${className}`.trim()}>
      {phonetic}
    </p>
  );
}
