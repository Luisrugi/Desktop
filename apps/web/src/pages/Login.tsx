import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Card, Field, Input } from "../components/ui";
import { ApiError } from "../api/client";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@demo-gmbh.de");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold">Anmelden</h1>
        <p className="mb-6 text-sm text-slate-500">TimeTrack Suite – Zeiterfassung, Rechnungen & mehr</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="E-Mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Passwort">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Anmelden…" : "Anmelden"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Noch keine Firma?{" "}
          <Link to="/register" className="text-brand-600 hover:underline">
            Jetzt registrieren
          </Link>
        </p>
      </Card>
    </div>
  );
}
