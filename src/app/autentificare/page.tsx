"use client";

import { FormEvent, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCaliStore } from "@/lib/store";
import { DEMO_ACCOUNTS } from "@/lib/constants";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useCaliStore((s) => s.login);
  const [email, setEmail] = useState("turist@cali-lab.ro");
  const [password, setPassword] = useState("Turist123!");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = () => {
    const res = login(email, password);
    if (!res.ok) {
      setError(res.error ?? "Eroare");
      return;
    }
    const next = params.get("next") || "/acasa";
    router.push(next);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl text-forest">Autentificare</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Accesați modulele de observații după email și parolă.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Parolă</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" className="w-full" onClick={handleLogin}>
          Intră în cont
        </Button>
      </form>

      <div className="mt-8 rounded-lg border bg-card/70 p-4 text-sm">
        <p className="font-medium">Conturi demo</p>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.email}>
              <button
                type="button"
                className="text-left hover:text-foreground"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.password);
                }}
              >
                {a.role}: {a.email} / {a.password}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-center text-sm">
        Nu aveți cont?{" "}
        <Link
          href="/inregistrare"
          className="text-primary underline-offset-2 hover:underline"
        >
          Creare cont
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
