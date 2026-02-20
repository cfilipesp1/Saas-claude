"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const errorMessages: Record<string, string> = {
  "Invalid login credentials": "Email ou senha incorretos.",
  "Email not confirmed":
    "Email ainda não confirmado. Verifique sua caixa de entrada.",
  "Invalid email or password": "Email ou senha incorretos.",
  "User not found": "Usuário não encontrado.",
  "Too many requests":
    "Muitas tentativas. Aguarde um momento e tente novamente.",
  auth: "Erro na confirmação de email. Tente novamente.",
  no_profile:
    "Perfil não encontrado. Sua conta existe mas o perfil não foi criado. Contacte o administrador da clínica.",
};

function translateError(msg: string): string {
  return errorMessages[msg] || msg;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlError = searchParams.get("error");
  const confirmed = searchParams.get("confirmed");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (err) {
        setError(translateError(err.message));
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-cyan-700">O+ Dental</h1>
        <p className="text-slate-500 mt-2">Acesse sua clínica</p>
      </div>

      {confirmed && (
        <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3 mb-4">
          Email confirmado com sucesso! Faça login para continuar.
        </div>
      )}

      {urlError && !confirmed && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">
          {translateError(urlError)}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
            placeholder="••••••••"
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
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Não tem uma conta?{" "}
        <Link
          href="/signup"
          className="text-cyan-600 hover:underline font-medium"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-cyan-100 p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-3xl font-bold text-cyan-700">O+ Dental</h1>
            <p className="text-slate-500 mt-2">Carregando...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
