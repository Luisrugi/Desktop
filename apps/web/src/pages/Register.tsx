import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Card, Field, Input } from "../components/ui";
import { ApiError } from "../api/client";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(companyName, name, email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registrierung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold">Firma registrieren</h1>
        <p className="mb-6 text-sm text-slate-500">Erstellt deine Firma und deinen Admin-Zugang</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Firmenname">
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </Field>
          <Field label="Dein Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="E-Mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Passwort (min. 8 Zeichen)">
            <Input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Erstellen…" : "Firma erstellen"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Schon registriert?{" "}
          <Link to="/login" className="text-brand-600 hover:underline">
            Anmelden
          </Link>
        </p>
      </Card>
    </div>
  );
}
