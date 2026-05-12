import type { Metadata } from 'next';
import { ClientLayout } from '@/components/layout/ClientLayout';
import './globals.css';
import { getLocaleFromCookie } from '@/i18n/get-dictionary';
import { getDictionary } from '@/i18n/get-dictionary';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromCookie();
  const dict = getDictionary(locale);
  return {
    title: dict.meta.title,
    description: dict.meta.description,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocaleFromCookie();
  const dict = getDictionary(locale);

  const themeScript = `(function(){try{var s=JSON.parse(localStorage.getItem('memento-ui'));var t=(s&&s.state&&s.state.theme)||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ClientLayout locale={locale} dictionary={dict}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
