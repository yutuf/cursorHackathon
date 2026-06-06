"use client";

type KvkkMaskedImageProps = {
  src: string;
  alt: string;
  className?: string;
  kvkkMasked?: boolean;
};

export default function KvkkMaskedImage({
  src,
  alt,
  className = "h-40 w-full object-cover",
  kvkkMasked = true,
}: KvkkMaskedImageProps) {
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`${className} ${kvkkMasked ? "blur-[2px] saturate-90" : ""}`}
      />
      {kvkkMasked && (
        <span className="absolute bottom-2 left-2 rounded-md bg-emerald-800/90 px-2 py-0.5 text-[10px] font-semibold text-white">
          KVKK anonymized
        </span>
      )}
    </div>
  );
}
