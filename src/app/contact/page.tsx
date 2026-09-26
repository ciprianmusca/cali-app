"use client";

import { useI18n } from "@/lib/i18n/use-i18n";

export default function ContactPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-4xl text-forest">{t("contact.title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("contact.lead")}</p>

      <dl className="mt-10 space-y-6 text-sm">
        <div>
          <dt className="font-medium text-forest">{t("contact.emailLabel")}</dt>
          <dd className="mt-1">
            <a
              href="mailto:contact@cali.ipsv.ro"
              className="text-primary underline-offset-2 hover:underline"
            >
              contact@cali.ipsv.ro
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-medium text-forest">{t("contact.isvLabel")}</dt>
          <dd className="mt-1 text-foreground/90">
            {t("contact.isvBody")}
            <br />
            <a
              href="https://www.ipsv.ro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              www.ipsv.ro
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-medium text-forest">{t("contact.apncLabel")}</dt>
          <dd className="mt-1 text-foreground/90">
            {t("contact.apncBody")}
            <br />
            <a
              href="https://calimani.info"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              calimani.info
            </a>
          </dd>
        </div>
      </dl>
    </div>
  );
}
