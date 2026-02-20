// ─── Pricing & Model Configuration ───────────────────────────
// Altere valores aqui para atualizar todo o wizard automaticamente.

export const INSTALLMENTS = 36;
export const CASH_DISCOUNT = 0.05; // 5% desconto à vista
export const MONTHLY_UPSELL_INVISIBLE_CONTENTION = 20; // +R$ 20 contenção invisível
export const LATE_PAYMENT_SURCHARGE = 20; // +R$ 20 após vencimento

// ─── Modelos Tradicionais ────────────────────────────────────

export interface OrthoModel {
  id: string;
  name: string;
  monthlyBase: number;
  lateMonthly: number;
  benefits: string[];
}

export const TRADITIONAL_MODELS: OrthoModel[] = [
  {
    id: "convencional",
    name: "Convencional",
    monthlyBase: 119.9,
    lateMonthly: 139.9,
    benefits: ["Clareamento após a fase de contenção"],
  },
  {
    id: "ceramico",
    name: "Cerâmico",
    monthlyBase: 159.9,
    lateMonthly: 179.9,
    benefits: ["Clareamento após a fase de contenção"],
  },
  {
    id: "autoligado",
    name: "Autoligado",
    monthlyBase: 169.9,
    lateMonthly: 189.9,
    benefits: ["Clareamento após a fase de contenção"],
  },
  {
    id: "safira",
    name: "Safira",
    monthlyBase: 169.9,
    lateMonthly: 189.9,
    benefits: ["Clareamento após a fase de contenção"],
  },
];

// ─── Modelos Invisalign ──────────────────────────────────────

export const INVISALIGN_MODELS: OrthoModel[] = [
  {
    id: "invisalign-lite",
    name: "Invisalign Lite",
    monthlyBase: 249.9,
    lateMonthly: 269.9,
    benefits: ["Até 14 alinhadores", "Clareamento após a fase de contenção"],
  },
  {
    id: "invisalign-moderate",
    name: "Invisalign Moderate",
    monthlyBase: 349.9,
    lateMonthly: 369.9,
    benefits: ["Até 26 alinhadores", "Clareamento após a fase de contenção"],
  },
  {
    id: "invisalign-comprehensive",
    name: "Invisalign Comprehensive",
    monthlyBase: 449.9,
    lateMonthly: 469.9,
    benefits: ["Alinhadores ilimitados", "Clareamento após a fase de contenção"],
  },
];

// ─── Upsells Obrigatórios (radio) ────────────────────────────

export interface MandatoryUpsell {
  id: string;
  title: string;
  monthlyDelta: number;
}

export const MANDATORY_UPSELLS: MandatoryUpsell[] = [
  {
    id: "contencao-tradicional",
    title: "Aparelho extra + Contenção Tradicional",
    monthlyDelta: 0,
  },
  {
    id: "contencao-invisivel",
    title: "Aparelho extra + Contenção Invisível",
    monthlyDelta: MONTHLY_UPSELL_INVISIBLE_CONTENTION,
  },
];

// ─── Upsells Opcionais (checkbox) ────────────────────────────
// Estrutura preparada para futura expansão com deltas de valor.

export interface OptionalUpsell {
  id: string;
  title: string;
  monthlyDelta: number;
  oneTimeDelta: number;
}

export const OPTIONAL_UPSELLS: OptionalUpsell[] = [
  {
    id: "rx-panoramico",
    title: "RX panorâmico a cada 6 meses",
    monthlyDelta: 0,
    oneTimeDelta: 0,
  },
  {
    id: "rx-limpeza",
    title: "RX (próprio ou parceria local) + Limpeza a cada 6 meses",
    monthlyDelta: 0,
    oneTimeDelta: 0,
  },
  {
    id: "limpeza",
    title: "Limpeza a cada 6 meses",
    monthlyDelta: 0,
    oneTimeDelta: 0,
  },
];
