'use client'

import * as React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

/**
 * Tab-Leiste im Lehrkräfte-Bereich (PROJ-83): ein Aussehen für alle Seiten.
 * Unterstrichen in Grün, 44 px hoch. Tabs wechseln eine Ansicht; wenige Werte
 * einer Auswahl sind dagegen ein `AdminSegmented` (gerahmte Schaltfläche).
 * Auf schmalen Bildschirmen scrollt die Leiste in sich, die Seite nie.
 */
export const AdminTabs = Tabs
export const AdminTabsContent = TabsContent

export const AdminTabsList = React.forwardRef<
  React.ElementRef<typeof TabsList>,
  React.ComponentPropsWithoutRef<typeof TabsList>
>(({ className, ...props }, ref) => (
  <TabsList
    ref={ref}
    className={cn(
      'h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-ws-line bg-transparent p-0',
      className,
    )}
    {...props}
  />
))
AdminTabsList.displayName = 'AdminTabsList'

export const AdminTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsTrigger>,
  React.ComponentPropsWithoutRef<typeof TabsTrigger>
>(({ className, ...props }, ref) => (
  <TabsTrigger
    ref={ref}
    className={cn(
      'min-h-11 shrink-0 gap-2 rounded-none border-b-2 border-transparent bg-transparent px-3 text-ws-muted shadow-none',
      'transition-colors duration-200 hover:text-ws-text',
      'focus-visible:ring-2 focus-visible:ring-ws-green focus-visible:ring-offset-0',
      'data-[state=active]:border-ws-green data-[state=active]:bg-transparent data-[state=active]:font-semibold',
      'data-[state=active]:text-ws-text data-[state=active]:shadow-none',
      className,
    )}
    {...props}
  />
))
AdminTabsTrigger.displayName = 'AdminTabsTrigger'
