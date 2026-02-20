"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          clinic_name: clinicName || "Minha Clínica",
        },
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    // After signup, sign in automatically
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginErr) {
      setError(
        "Conta criada! Verifique seu email para confirmar ou tente fazer login."
      );
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-cyan-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cyan-700">O+ Dental</h1>
          <p className="text-slate-500 mt-2">Crie sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Seu nome completo
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              placeholder="Dr. João Silva"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome da clínica
            </label>
            <input
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              placeholder="Clínica Odontológica Sorriso"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-50"
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Já tem uma conta?{" "}
          <Link href="/login" className="text-cyan-600 hover:underline font-medium">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
