import { Link } from '@tanstack/react-router'
import { ThemeToggle } from './theme-toggle'

export function TopBar() {
  return (
    <div className="h-8 border-b bg-background/95 backdrop-blur">
      <div className="px-2 h-full flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <Link to="/" className="[&.active]:font-bold">
            Home
          </Link>
          <Link to="/about" className="[&.active]:font-bold">
            About
          </Link>
        </div>
        <ThemeToggle />
      </div>
    </div>
  )
}
