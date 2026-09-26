import Link from "next/link";
import { PublicStats } from "@/components/stats/public-stats";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div>
      <section className="relative min-h-[88dvh] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-calimani.svg"
          alt="Pădure vulcanică în ceață, Parcul Național Călimani"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1f18]/95 via-[#0f1f18]/45 to-[#0f1f18]/25" />
        <div className="animate-mist absolute top-[18%] left-[10%] h-24 w-2/3 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto flex min-h-[88dvh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 text-white">
          <p className="animate-rise font-display text-5xl tracking-tight sm:text-7xl md:text-8xl">
            CALI
          </p>
          <h1 className="animate-rise-delay-1 mt-3 max-w-xl font-display text-2xl font-medium leading-snug text-white/95 sm:text-3xl">
            Observații din pădurile vulcanice ale Călimanilor
          </h1>
          <p className="animate-rise-delay-2 mt-4 max-w-lg text-base text-white/80 sm:text-lg">
            Colectați fenologie, perturbări și acoperire de sol pentru
            Climate-Smart Forestry — date validate de rangerii PNC.
          </p>
          <div className="animate-rise-delay-2 mt-8 flex flex-wrap gap-3">
            <Link
              href="/inregistrare"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-white text-forest hover:bg-white/90"
              )}
            >
              Începeți o observație
            </Link>
            <Link
              href="/harta"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "border-white/40 bg-transparent text-white hover:bg-white/10"
              )}
            >
              Explorați harta
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 max-w-2xl">
          <h2 className="font-display text-3xl tracking-tight text-forest">
            Statistici publice
          </h2>
          <p className="mt-2 text-muted-foreground">
            Indicatori disponibili fără autentificare. Observațiile aprobate
            alimentează ForestWard Observatory (EFI/FORWARDS).
          </p>
        </div>
        <PublicStats />
      </section>
    </div>
  );
}
