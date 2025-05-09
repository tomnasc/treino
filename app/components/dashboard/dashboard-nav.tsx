"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  BarChart3, 
  BrainCircuit, 
  Dumbbell, 
  Home, 
  ListChecks, 
  Medal,
  CreditCard,
  Settings, 
  Users,
  Sparkles,
  ShieldAlert,
  TrendingUp,
  MessageSquare,
  User
} from "lucide-react"

import { cn } from "@/app/lib/utils"
import { UserSession } from "@/app/lib/auth"

interface DashboardNavProps {
  user: UserSession | null
  onItemClick?: () => void
}

export function DashboardNav({ user, onItemClick }: DashboardNavProps) {
  const pathname = usePathname()

  const routes = [
    {
      label: "Início",
      icon: Home,
      href: "/dashboard",
      pattern: /^\/dashboard$/,
    },
    {
      label: "Meus Treinos",
      icon: Dumbbell,
      href: "/dashboard/workouts",
      pattern: /^\/dashboard\/workouts/,
    },
    {
      label: "Treinar Agora",
      icon: ListChecks,
      href: "/dashboard/train",
      pattern: /^\/dashboard\/train/,
    },
    {
      label: "Gerador de Treinos",
      icon: BrainCircuit,
      href: "/dashboard/ai-workout",
      pattern: /^\/dashboard\/ai-workout/,
    },
    {
      label: "Histórico",
      icon: BarChart3,
      href: "/dashboard/history",
      pattern: /^\/dashboard\/history/,
    },
    {
      label: "Análise de Desempenho",
      icon: TrendingUp,
      href: "/dashboard/performance",
      pattern: /^\/dashboard\/performance/,
    },
    {
      label: "Planos Premium",
      icon: Sparkles,
      href: "/dashboard/planos",
      pattern: /^\/dashboard\/planos/,
    },
    ...(user?.role === "personal" || user?.role === "admin"
      ? [
          {
            label: "Meus Alunos",
            icon: Users,
            href: "/dashboard/clients",
            pattern: /^\/dashboard\/clients/,
          } as const,
        ]
      : []),
    {
      label: "Feedback",
      icon: MessageSquare,
      href: "/dashboard/feedback",
      pattern: /^\/dashboard\/feedback/,
    },
    ...(user?.role !== "personal" && user?.role !== "admin"
      ? [
          {
            label: "Torne-se Personal",
            icon: User,
            href: "/dashboard/personal-request",
            pattern: /^\/dashboard\/personal-request/,
          } as const,
        ]
      : []),
    ...(user?.role === "admin"
      ? [
          {
            label: "Administração",
            icon: ShieldAlert,
            href: "/dashboard/settings/admin",
            pattern: /^\/dashboard\/settings\/admin/,
          } as const,
        ]
      : []),
    {
      label: "Conquistas",
      icon: Medal,
      href: "/dashboard/achievements",
      pattern: /^\/dashboard\/achievements/,
    },
    {
      label: "Configurações",
      icon: Settings,
      href: "/dashboard/settings",
      pattern: /^\/dashboard\/settings/,
    },
  ]

  return (
    <nav className="grid items-start px-2 py-4 gap-1">
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          onClick={onItemClick}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all hover:text-primary md:py-2",
            {
              "bg-muted text-primary": pathname?.match(route.pattern),
              "text-muted-foreground": !pathname?.match(route.pattern),
            }
          )}
        >
          <route.icon className="h-5 w-5 md:h-4 md:w-4" />
          <span>{route.label}</span>
          {route.href === "/dashboard/planos" && user?.role !== "premium" && (
            <span className="ml-auto bg-primary/10 text-primary text-xs py-0.5 px-1.5 rounded-full font-medium">
              Novo
            </span>
          )}
          {route.href === "/dashboard/performance" && user?.role !== "premium" && user?.role !== "personal" && user?.role !== "admin" && (
            <span className="ml-auto bg-primary/10 text-primary text-xs py-0.5 px-1.5 rounded-full font-medium">
              Premium
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
} 