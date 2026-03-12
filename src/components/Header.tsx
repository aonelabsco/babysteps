'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Home' },
    { href: '/history', label: 'History' },
    { href: '/growth', label: 'Growth' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-900 border-t border-dark-700 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 py-4 text-center text-base font-medium transition-colors ${
              pathname === item.href
                ? 'text-accent-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
