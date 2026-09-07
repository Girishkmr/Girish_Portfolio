import type { Metadata } from 'next';
import { ThemeLab } from '@/components/admin/ThemeLab';

export const metadata: Metadata = {
  title: 'Theme',
  robots: { index: false, follow: false },
};

/**
 * The theme lab. Behind auth, because it is a tool for the owner rather than a
 * feature for visitors — a public theme switcher on a portfolio says the author
 * could not decide, which is the opposite of what the page is for.
 */
export default function ThemePage() {
  return (
    <div className="shell max-w-3xl py-16">
      <p className="label mb-3">Admin</p>
      <h1 className="display text-3xl lg:text-4xl">Theme</h1>
      <p className="mt-5 max-w-[62ch] leading-relaxed text-ink-2">
        Try palettes and type pairings against the real site. Changes apply
        immediately and everywhere, but only in this browser — nothing here is
        visible to visitors until the CSS is committed.
      </p>

      <div className="mt-12">
        <ThemeLab />
      </div>
    </div>
  );
}
