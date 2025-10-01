/**
 * KPI card utilities extracted from DashboardOverview component
 */

import React from 'react';
import { Employee } from '../types';
import { IconUsers, IconChartBar, IconSparkles } from '../components/shared/Icons';
import { KpiData, OrganizationalSummary } from '../hooks/useDashboardCalculations';

export interface KpiCard {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  detail?: string;
  score?: string;
}

/**
 * Generate KPI cards data
 */
export const generateKpiCards = (
  kpiData: KpiData,
  organizationalSummary: OrganizationalSummary,
  employeesByLevel: Record<string, Employee[]>
): KpiCard[] => {
  return [
    {
      title: 'Total Pegawai',
      value: kpiData.totalEmployees.toString(),
      icon: IconUsers,
      color: 'text-blue-800 dark:text-blue-200',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30'
    },
    {
      title: 'Eselon (II-IV)',
      value: organizationalSummary.eselon.toString(),
      detail: `II: ${(employeesByLevel['Eselon II'] || []).length}, III: ${(employeesByLevel['Eselon III'] || []).length}, IV: ${(employeesByLevel['Eselon IV'] || []).length}`,
      icon: IconUsers,
      color: 'text-purple-800 dark:text-purple-200',
      bgColor: 'bg-purple-50 dark:bg-purple-900/30'
    },
    {
      title: 'Staff ASN',
      value: organizationalSummary.asnStaff.toString(),
      icon: IconUsers,
      color: 'text-green-800 dark:text-green-200',
      bgColor: 'bg-green-50 dark:bg-green-900/30'
    },
    {
      title: 'Staff Non ASN',
      value: organizationalSummary.nonAsnStaff.toString(),
      icon: IconUsers,
      color: 'text-orange-800 dark:text-orange-200',
      bgColor: 'bg-orange-50 dark:bg-orange-900/30'
    },
    {
      title: 'Skor Rata-rata',
      value: `${kpiData.averageScore.toFixed(1)}`,
      icon: IconChartBar,
      color: 'text-indigo-800 dark:text-indigo-200',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/30'
    },
    {
      title: 'Performa Terbaik',
      value: kpiData.topPerformer ? kpiData.topPerformer.name : 'Tidak Ada',
      score: kpiData.topPerformerScore ? kpiData.topPerformerScore.toFixed(1) : undefined,
      icon: IconSparkles,
      color: 'text-yellow-800 dark:text-yellow-200',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/30'
    }
  ];
};

/**
 * Check if a KPI card is the top performer card
 */
export const isTopPerformerCard = (card: KpiCard): boolean => {
  return card.title === 'Performa Terbaik';
};

/**
 * Check if a KPI card has detail information
 */
export const hasCardDetail = (card: KpiCard): boolean => {
  return 'detail' in card && !!card.detail;
};
