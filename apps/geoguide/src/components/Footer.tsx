import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 text-sm py-6 px-4 mt-auto">
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-4 text-center">
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/terms" className="hover:text-amber-400 transition-colors">
            მომსახურების პირობები
          </Link>
          <Link href="/privacy" className="hover:text-amber-400 transition-colors">
            კონფიდენციალურობა
          </Link>
          <Link href="/support" className="hover:text-amber-400 transition-colors">
            დახმარება
          </Link>
        </nav>
        <p>
          <a href="mailto:info@geoguide.ge" className="hover:text-amber-400 transition-colors">
            info@geoguide.ge
          </a>
          {" | "}
          <a href="tel:+995599946500" className="hover:text-amber-400 transition-colors">
            +995599946500
          </a>
        </p>
        <div className="flex items-center justify-center gap-3">
          <span className="inline-flex items-center text-[10px] font-bold text-[#1A1F71] bg-white/90 px-1.5 py-0.5 rounded tracking-wider">
            VISA
          </span>
          <svg
            className="h-5 w-auto"
            viewBox="0 0 50 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Mastercard"
          >
            <circle cx="18" cy="16" r="10" fill="#EB001B" />
            <circle cx="32" cy="16" r="10" fill="#F79E1B" />
            <path
              d="M25 6.5a10 10 0 0 1 0 19 10 10 0 0 1 0-19z"
              fill="#FF5F00"
            />
          </svg>
        </div>
        <p className="text-gray-400 text-xs">
          © 2026 შპს GeoGuide
        </p>
      </div>
    </footer>
  );
}
