import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <h2 className="text-[20px] font-medium text-[var(--color-text-primary)]">Page not found</h2>
        <p className="mt-2 text-[14px] text-[var(--color-secondary)]">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-[var(--color-primary)] px-4 py-2 text-[14px] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
