import Link from "next/link";
import { ListProductLink } from "./list-product-link";
import { ProfileLink } from "./profile-link";
import { ArrowBadge, buttonClass } from "./ui";

/**
 * Floating island nav. Live draws and List a product stay in the bar at every
 * width, since most visitors arrive on a phone; How it works joins from sm up.
 */
export function SiteNav() {
  return (
    <>
      <div className="h-20 sm:h-24" aria-hidden />
      <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-3 sm:px-4 sm:pt-5">
        <nav className="flex w-full items-center gap-1 rounded-full bg-[#fdfbf7]/80 p-1.5 pl-4 ring-1 ring-black/[0.06] backdrop-blur-xl sm:w-max sm:gap-2 sm:pl-5">
          <Link href="/" className="mr-auto font-serif text-xl tracking-[-0.03em] text-ink sm:mr-4">
            Alfreed
          </Link>
          <Link
            href="/live"
            className="flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-ink transition-colors duration-500 ease-spring hover:bg-black/[0.05] sm:px-4"
          >
            <span className="breathe size-1.5 rounded-full bg-mint" aria-hidden />
            <span className="sm:hidden">Live</span>
            <span className="hidden sm:inline">Live draws</span>
          </Link>
          <Link
            href="/#how"
            className="hidden min-h-10 items-center rounded-full px-4 text-sm text-ink-2 transition-colors duration-500 ease-spring hover:bg-black/[0.05] hover:text-ink sm:flex"
          >
            How it works
          </Link>
          <ListProductLink className={`${buttonClass} min-h-10 px-4 py-1 text-sm sm:ml-2 sm:py-1.5 sm:pl-5 sm:pr-1.5`}>
            List a product
            <span className="hidden sm:contents">
              <ArrowBadge />
            </span>
          </ListProductLink>
          <ProfileLink />
        </nav>
      </header>
    </>
  );
}
