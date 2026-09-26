import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-forest text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[1fr_auto] md:items-start">
        <div className="space-y-3 text-sm leading-relaxed text-primary-foreground/90">
          <div className="flex flex-wrap items-center gap-4">
            <div
              className="flex h-12 w-16 items-center justify-center rounded-sm bg-[#003399] text-[10px] font-bold tracking-wide text-yellow-300"
              aria-label="Emblema Uniunii Europene"
            >
              EU
            </div>
            <div>
              <p className="font-medium">Funded by the European Union</p>
              <p className="text-primary-foreground/70">
                EFI · FORWARDS · Climate-Smart Forestry
              </p>
            </div>
          </div>
          <p className="max-w-2xl text-xs text-primary-foreground/65">
            Views and opinions expressed are however those of the author(s) only
            and do not necessarily reflect those of the European Union or the
            European Forest Institute. Neither the European Union nor the
            granting authority can be held responsible for them.
          </p>
          <p className="text-xs text-primary-foreground/70">
            CALI-LAB · Grant Agreement G-07-2025-2 · ISV &amp; Administrația
            Parcului Național Călimani (APNC)
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/politica-date" className="underline-offset-2 hover:underline">
            Politica de date
          </Link>
          <Link href="/harta" className="underline-offset-2 hover:underline">
            Hartă observații
          </Link>
          <span className="text-primary-foreground/60">cali-lab.ro</span>
        </div>
      </div>
    </footer>
  );
}
