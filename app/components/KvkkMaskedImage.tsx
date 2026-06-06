"use client";

type KvkkMaskedImageProps = {
  src: string;
  alt: string;
  className?: string;
};

/** Renders Google imagery as-is — Street View / Places photos are already face- and plate-blurred by Google. */
export default function KvkkMaskedImage({
  src,
  alt,
  className = "h-40 w-full object-cover",
}: KvkkMaskedImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
