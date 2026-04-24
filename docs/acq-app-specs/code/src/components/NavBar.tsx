import Link from 'next/link'
import { usePathname } from 'next/navigation'

// A simplified navigation bar used across the portfolio.  It highlights the active page
// and collapses into a hamburger menu on small screens.  Customize further as needed.
const navItems = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/writing', label: 'Writing' },
  { href: '/contact', label: 'Contact' },
]

export function NavBar() {
  const pathname = usePathname()
  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto flex items-center h-16 px-4">
        <div className="flex-1" />
        <ul className="hidden sm:flex space-x-4">
          {navItems.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`font-medium ${pathname === href ? 'text-blue-600' : 'text-gray-700'} hover:text-blue-500`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
        {/* TODO: add a hamburger menu for mobile screens */}
      </div>
    </nav>
  )
}
