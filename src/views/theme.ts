// "Stickers" look shared by every page: bold type, thick ink borders and hard offset shadows on a
// dotted paper background.
export const STICKER_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap";

export const STICKER_BODY =
  "bg-[#e6ebf1] bg-[radial-gradient(#c9d2dd_1.2px,transparent_1.3px)] bg-[length:18px_18px] font-['Bricolage_Grotesque',system-ui,sans-serif] text-zinc-950 antialiased";

export const STICKER_CSS = `
  .sound-pad[data-playing="true"] { animation: sticker-wobble 0.25s ease-in-out infinite alternate; }
  @keyframes sticker-wobble {
    from { transform: rotate(-3deg) scale(1.04); }
    to { transform: rotate(3deg) scale(1.04); }
  }
  @media (prefers-reduced-motion: reduce) {
    .sound-pad[data-playing="true"] { animation: none; }
  }
`;
