import { NavLink } from 'react-router'

interface Tab {
  to: string
  label: string
  /** Only highlight on an exact match. Needed for the default tab. */
  end?: boolean
}

export function TabNav({ tabs, label }: { tabs: Tab[]; label: string }) {
  return (
    <nav aria-label={label} className="flex gap-1 border-b border-line">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              isActive ? 'border-accent text-ink' : 'border-transparent text-ink-muted hover:text-ink'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}