"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCaliStore } from "@/lib/store";
import { isValidPassword } from "@/lib/format";

export default function RegisterPage() {
  const router = useRouter();
  const register = useCaliStore((s) => s.register);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [role, setRole] = useState<"turist" | "rezident">("turist");
  const [isAdult, setIsAdult] = useState(false);
  const [captcha, setCaptcha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const captchaAnswer = "7";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError("Parolele nu coincid.");
      return;
    }
    if (!isValidPassword(password)) {
      setError(
        "Parola trebuie să aibă minim 8 caractere, litere, o cifră și un caracter special."
      );
      return;
    }
    if (captcha.trim() !== captchaAnswer) {
      setError("Codul captcha este incorect.");
      return;
    }
    if (!isAdult) {
      setError("Confirmați că sunteți adult.");
      return;
    }
    const res = register({ name, email, password, role, isAdult });
    if (!res.ok) {
      setError(res.error ?? "Eroare");
      return;
    }
    router.push("/acasa");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl text-forest">Creare cont</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Conturile de Elev și Ranger sunt create de administrator. Aici vă puteți
        înregistra ca Turist sau Rezident.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nume și prenume</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Rol solicitat</Label>
          <RadioGroup
            value={role}
            onValueChange={(v) => setRole(v as "turist" | "rezident")}
            className="gap-2"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="turist" />
              Turist
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="rezident" />
              Rezident (deținător de pădure)
            </label>
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Parolă</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password2">Verificare parolă</Label>
          <Input
            id="password2"
            type="password"
            required
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="captcha">Cât face 3 + 4?</Label>
          <Input
            id="captcha"
            required
            value={captcha}
            onChange={(e) => setCaptcha(e.target.value)}
          />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={isAdult}
            onCheckedChange={(v) => setIsAdult(v === true)}
          />
          Confirm că sunt adult (18+)
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" className="w-full" onClick={() => {
          const fake = { preventDefault() {} } as FormEvent;
          onSubmit(fake);
        }}>
          Creează cont
        </Button>
      </form>

      <p className="mt-6 text-center text-sm">
        Aveți deja cont?{" "}
        <Link
          href="/autentificare"
          className="text-primary underline-offset-2 hover:underline"
        >
          Autentificare
        </Link>
      </p>
    </div>
  );
}
