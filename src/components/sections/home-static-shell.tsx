import { LoadingSpinner } from "@/components/icons";

/**
 * The homepage as plain HTML, sent by the server and shown while the site loads its data.
 *
 * Before, the server sent only "Loading SetMyStay...", so Google, WhatsApp/Facebook link
 * previews and AI tools that don't run JavaScript saw an empty page. This shows the real
 * headline and sections straight away. It reads nothing from the browser (no storage,
 * dates or random numbers), so the server and browser versions always match.
 */
const services = [
  { title: "Co-living & PG", text: "Fully managed rooms with meals, Wi-Fi and housekeeping — move in with one bag." },
  { title: "Rentals", text: "Apartments for your next move. Compare rent, space and location in one place." },
  { title: "Roommates", text: "Match with people who share your budget, rhythm and neighbourhood." },
];

const steps = [
  { title: "Discover", text: "Browse or swipe through verified homes and roommates." },
  { title: "Unlock", text: "Get owner contact details instantly with a simple plan." },
  { title: "Move in", text: "Visit, connect directly, and get your keys — no brokers." },
];

export function HomeStaticShell() {
  return (
    <div className="flex flex-col min-h-screen bg-background font-body text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="container mx-auto flex h-16 items-center justify-between rounded-xl text-ink-foreground">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="SetMyStay logo" width={40} height={40} className="h-8 w-8 md:h-10 md:w-10" />
            <span className="font-display text-xl md:text-2xl">SetMyStay</span>
          </a>
          <nav aria-label="Main" className="hidden lg:flex items-center gap-6 text-sm font-medium text-ink-foreground/80">
            <span>Home</span>
            <span>PG Listings</span>
            <span>Rentals</span>
            <span>Roommates</span>
            <a href="/list-property" className="hover:text-ink-foreground">List Property</a>
          </nav>
          <span className="text-sm text-ink-foreground/80">Pricing</span>
        </div>
      </header>

      <main className="flex-grow">
        <section className="relative h-[90svh] min-h-[620px] overflow-hidden bg-ink">
          {/* First frame of the hero video, so there is no dark flash before the video starts */}
          <img src="/hero-poster.jpg" alt="" aria-hidden="true" fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-ink-fade" />
          <div className="container relative z-10 flex h-full flex-col justify-end pb-20 sm:pb-24 text-ink-foreground">
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.08] max-w-4xl">
              Find your place.<br />Make it home.
            </h1>
            <div className="mt-8 sm:mt-10 flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-end lg:justify-between">
              <p className="max-w-md text-base sm:text-lg text-ink-foreground/75">
                A room near work. A flat with more space. A roommate you get along with. Find your next stay on SetMyStay.
              </p>
              <p className="flex items-center gap-3 text-sm text-ink-foreground/70" role="status">
                <LoadingSpinner className="h-5 w-5" /> Loading homes and roommates…
              </p>
            </div>
          </div>
        </section>

        <section className="container py-16 sm:py-24">
          <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold leading-tight max-w-2xl">A stay that suits you</h2>
            <p className="max-w-sm text-muted-foreground">Whatever stage of life you're in, there's a space on SetMyStay that fits it.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {services.map((s) => (
              <div key={s.title} className="rounded-lg border border-border bg-card p-6">
                <h3 className="mt-8 font-display text-2xl font-semibold">{s.title}</h3>
                <p className="mt-3 text-base text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-ink py-16 sm:py-24 text-ink-foreground">
          <div className="container">
            <p className="text-sm text-accent">Roommate match</p>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-semibold leading-tight">Find someone to share with.</h2>
            <p className="mt-6 max-w-md text-ink-foreground/70">Swipe right on roommates you'd like to live with, left to skip.</p>
          </div>
        </section>

        <section className="container py-16 sm:py-24">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-center">Your next move starts here</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.title} className="text-center">
                <h3 className="font-display text-2xl">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container pb-16 sm:pb-24 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold">Have a place to rent?</h2>
          <p className="mx-auto mt-5 max-w-lg text-muted-foreground">Let people see your space and get in touch.</p>
          <a href="/list-property" className="mt-8 inline-flex rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground">
            List your property
          </a>
        </section>
      </main>

      <footer className="bg-ink py-10 text-ink-foreground/70">
        <div className="container text-sm">
          <p className="font-display text-lg text-ink-foreground">SetMyStay</p>
          <p className="mt-2">Your trusted partner for finding the perfect living space. Connecting people with their ideal homes.</p>
          <p className="mt-4">Office no. 01, Neelsidhi Splendour, Sector 15, CBD Belapur, Navi Mumbai, Maharashtra 400614</p>
        </div>
      </footer>
    </div>
  );
}
