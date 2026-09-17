type BrandMarkProps = {
  size?: number;
  className?: string;
};

/** AI-designed Calltime mark shared by the website and operations workspace. */
export default function BrandMark({
  size = 32,
  className,
}: BrandMarkProps) {
  return (
    <img
      className={`brand-mark-image${className ? ` ${className}` : ""}`}
      src="/calltime-logo-ai.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  );
}
