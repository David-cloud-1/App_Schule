'use client'

import type { LucideProps } from 'lucide-react'
import { DepartmentIcon } from '@/components/department-icon'
import { useDepartment } from '@/components/department-provider'

/** Icon des Fachbereichs (Spedition: LKW) — Ersatz für ein festes Icon */
export function BrandIcon(props: LucideProps) {
  const { iconName } = useDepartment()
  return <DepartmentIcon name={iconName} {...props} />
}

/** App-Name des Fachbereichs (Spedition: „SpediLern") */
export function BrandName() {
  return <>{useDepartment().appName}</>
}

/** Untertitel des Fachbereichs auf der Login-Seite */
export function BrandTagline() {
  return <>{useDepartment().tagline}</>
}
