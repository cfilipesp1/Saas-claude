"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const errorMessages: Record<string, string> = {
  "User already registered": "Este email já está cadastrado. Tente fazer login.",
  "Password should be at least 6 characters":
    "A senha deve ter pelo menos 6 caracteres.",
  "Unable to validate email address: invalid format":
    "Formato de email inválido.",
  "Signup requires a valid password": "Informe uma senha válida.",
};

function translateError(msg: string): string {
  for (const [key, value] of Object.entries(errorMessages)) {
    if (msg.includes(key)) return value;
  }
  return msg;
}

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: err } = await supabase.auth.signUp({
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
        setError(translateError(err.message));
        setLoading(false);
        return;
      }

      // If email confirmation is required, Supabase returns a user
      // with identities = [] or session = null
      const needsConfirmation =
        data.user &&
        (!data.session ||
          data.user.identities?.length === 0);

      if (needsConfirmation) {
        setSuccess(true);
        setLoading(false);
        return;
      }

      // Auto-login succeeded (email confirmation disabled in Supabase)
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-cyan-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Verifique seu email
          </h2>
          <p className="text-slate-500 mb-2">
            Enviamos um link de confirmação para:
          </p>
          <p className="font-medium text-slate-700 mb-6">{email}</p>
          <p className="text-sm text-slate-400 mb-6">
            Clique no link do email para ativar sua conta. Depois, volte aqui
            para fazer login.
          </p>
          <Link
            href="/login"
            className="inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg px-6 py-2.5 transition"
          >
            Ir para o Login
          </Link>
        </div>
      </div>
    );
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
          <Link
            href="/login"
            className="text-cyan-600 hover:underline font-medium"
          >
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
