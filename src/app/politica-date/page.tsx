export default function PoliticaDatePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 prose-none">
      <h1 className="font-display text-3xl text-forest">Politica de date</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Versiune 2026.1 · CALI-LAB · Grant Agreement G-07-2025-2
      </p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed">
        <h2 className="font-display text-xl">Operator</h2>
        <p>
          Operatorul datelor aplicației CALI-LAB este Institutul de
          Cercetare-Dezvoltare în Silvicultură (ISV), în parteneriat cu
          Administrația Parcului Național Călimani (APNC).
        </p>

        <h2 className="font-display text-xl">Categorii de date</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Date de cont: nume, email, rol, acord GDPR, acord parental (elevi)</li>
          <li>
            Observații: fotografii, text liber, specie, parametrii de modul
          </li>
          <li>
            Geolocație: latitudine, longitudine, precizie, altitudine, oră
            captură
          </li>
        </ul>

        <h2 className="font-display text-xl">Scop</h2>
        <p>
          Colectarea observațiilor științifice pentru Climate-Smart Forestry și
          integrarea datelor validate în ForestWard Observatory (EFI/FORWARDS).
        </p>

        <h2 className="font-display text-xl">Durata păstrării</h2>
        <p>
          Datele sunt păstrate pe durata proiectului și ulterior cât este
          necesar pentru cercetare științifică și arhivare FAIR, cu
          anonimizare la export.
        </p>

        <h2 className="font-display text-xl">Elevi</h2>
        <p>
          Conturile de elev sunt create de administrator pe baza listei școlare
          și a acordului parental. În interfețele publice și pentru roluri de
          teren, numele elevilor sunt anonimizate.
        </p>
      </section>
    </div>
  );
}
