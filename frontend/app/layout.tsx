import type { Metadata } from 'next';
import { Inter, Urbanist } from 'next/font/google';
import './globals.css';
import { ThemeInitializer } from './ThemeInitializer';
import { AppBridgeProvider } from './AppBridgeProvider';
import { BrandingProvider } from './BrandingProvider';
import { EmbeddedLayoutWrapper } from './EmbeddedLayoutWrapper';
import { ChatProvider } from '../components/ChatProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const urbanist = Urbanist({ subsets: ['latin'], variable: '--font-urbanist' });

// CUSTOMIZE: Set your plugin's metadata
export const metadata: Metadata = {
  title: '{{PLUGIN_DISPLAY_NAME}} - {{PLUGIN_TAGLINE}}',
  description: '{{PLUGIN_DESCRIPTION}}',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover' as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${urbanist.variable} h-full`}>
      <body className="font-sans antialiased bg-white dark:bg-coinest-bg-primary text-neutral-900 dark:text-white h-full overflow-hidden transition-colors">
        <ThemeInitializer />
        <AppBridgeProvider />
        <BrandingProvider />
        <ChatProvider>
          <EmbeddedLayoutWrapper>
            {children}
          </EmbeddedLayoutWrapper>
        </ChatProvider>
      </body>
    </html>
  );
}
