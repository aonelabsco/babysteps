'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Home' },
    { href: '/history', label: 'History' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-pink-100 z-50">
      <div className="max-w-lg mx-auto flex">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
              pathname === item.href
                ? 'text-pink-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
