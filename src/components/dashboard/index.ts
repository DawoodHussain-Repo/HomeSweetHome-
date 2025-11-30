/**
 * Dashboard Components Index
 * Exports all dashboard-related components
 */

// Card Components (existing)
export { StatCard, type StatCardProps } from "./StatCard";
export { QuickActionsCard, type QuickAction } from "./QuickActionsCard";
export {
  RecentTransactionsCard,
  type Transaction,
} from "./RecentTransactionsCard";

// New Modular Components
export { DashboardHeader } from "./DashboardHeader";
export { PerformanceChart } from "./PerformanceChart";
export { StatsCards } from "./StatsCards";
export { QuickActions } from "./QuickActions";
export { AccountsSummary } from "./AccountsSummary";
export { RecentTransactionsList } from "./RecentTransactionsList";
