import { getInitials } from "../context/UserContext";

/** A round photo, or the person's initials when they have none. */
export default function Avatar({ name, url, size = 56, ring }: { name: string; url: string | null; size?: number; ring?: string }) {
  const style = { width: size, height: size, boxShadow: ring ? `0 0 0 3px ${ring}` : undefined };
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" style={style} className="rounded-full object-cover" />
  ) : (
    <span
      aria-hidden
      style={{ ...style, fontSize: size * 0.36 }}
      className="inline-flex items-center justify-center rounded-full bg-gold-500 font-bold text-[#031b1c]"
    >
      {getInitials(name)}
    </span>
  );
}
