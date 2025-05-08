import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/app/components/theme-provider'
import { ToastProvider } from '@/app/components/ui/use-toast'
import { PWARegister } from '@/app/components/pwa-register'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const viewport: Viewport = {
  themeColor: '#3B82F6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'Treino na Mão',
  description: 'Aplicativo de gerenciamento de treinos de academia',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Treino na Mão',
    startupImage: [
      '/apple-touch-icon.png',
      '/icons/ios/apple-touch-icon-180x180.png',
      '/icons/ios/splash/splash-750x1334.png',
      '/icons/ios/splash/splash-828x1792.png',
      '/icons/ios/splash/splash-1125x2436.png',
      '/icons/ios/splash/splash-1170x2532.png',
      '/icons/ios/splash/splash-1284x2778.png',
      '/icons/ios/splash/splash-1536x2048.png',
      '/icons/ios/splash/splash-1668x2388.png',
      '/icons/ios/splash/splash-2048x2732.png',
    ],
  },
  applicationName: 'Treino na Mão',
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16.png', sizes: '16x16' },
      { url: '/favicon-32.png', sizes: '32x32' },
      { url: '/icons/icon-192x192.png', sizes: '192x192' },
      { url: '/icons/icon-512x512.png', sizes: '512x512' }
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
      { url: '/icons/ios/apple-touch-icon-57x57.png', sizes: '57x57' },
      { url: '/icons/ios/apple-touch-icon-60x60.png', sizes: '60x60' },
      { url: '/icons/ios/apple-touch-icon-72x72.png', sizes: '72x72' },
      { url: '/icons/ios/apple-touch-icon-76x76.png', sizes: '76x76' },
      { url: '/icons/ios/apple-touch-icon-114x114.png', sizes: '114x114' },
      { url: '/icons/ios/apple-touch-icon-120x120.png', sizes: '120x120' },
      { url: '/icons/ios/apple-touch-icon-144x144.png', sizes: '144x144' },
      { url: '/icons/ios/apple-touch-icon-152x152.png', sizes: '152x152' },
      { url: '/icons/ios/apple-touch-icon-167x167.png', sizes: '167x167' },
      { url: '/icons/ios/apple-touch-icon-180x180.png', sizes: '180x180' }
    ]
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Treino na Mão" />
        <meta name="application-name" content="Treino na Mão" />
        <meta name="msapplication-TileColor" content="#3B82F6" />
        <meta name="theme-color" content="#3B82F6" />
        <meta name="msapplication-TileImage" content="/icons/ios/apple-touch-icon-144x144.png" />
        
        {/* Apple Touch Icons (pré-iOS 7) */}
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon-precomposed" sizes="57x57" href="/icons/ios/apple-touch-icon-57x57.png" />
        <link rel="apple-touch-icon-precomposed" sizes="60x60" href="/icons/ios/apple-touch-icon-60x60.png" />
        <link rel="apple-touch-icon-precomposed" sizes="72x72" href="/icons/ios/apple-touch-icon-72x72.png" />
        <link rel="apple-touch-icon-precomposed" sizes="76x76" href="/icons/ios/apple-touch-icon-76x76.png" />
        <link rel="apple-touch-icon-precomposed" sizes="114x114" href="/icons/ios/apple-touch-icon-114x114.png" />
        <link rel="apple-touch-icon-precomposed" sizes="120x120" href="/icons/ios/apple-touch-icon-120x120.png" />
        <link rel="apple-touch-icon-precomposed" sizes="144x144" href="/icons/ios/apple-touch-icon-144x144.png" />
        <link rel="apple-touch-icon-precomposed" sizes="152x152" href="/icons/ios/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon-precomposed" sizes="167x167" href="/icons/ios/apple-touch-icon-167x167.png" />
        <link rel="apple-touch-icon-precomposed" sizes="180x180" href="/icons/ios/apple-touch-icon-180x180.png" />
        
        {/* iOS home screen icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="57x57" href="/icons/ios/apple-touch-icon-57x57.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/icons/ios/apple-touch-icon-60x60.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/icons/ios/apple-touch-icon-72x72.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/icons/ios/apple-touch-icon-76x76.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/icons/ios/apple-touch-icon-114x114.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/ios/apple-touch-icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/ios/apple-touch-icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/ios/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/ios/apple-touch-icon-167x167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/ios/apple-touch-icon-180x180.png" />
        
        {/* Standard favicon links */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/icons/icon-192x192.png" sizes="192x192" type="image/png" />
        <link rel="icon" href="/icons/icon-512x512.png" sizes="512x512" type="image/png" />
        
        {/* iOS Splash Screens */}
        {/* iPhone SE, 8, 7, 6s, 6 */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="/icons/ios/splash/splash-750x1334.png" />
        {/* iPhone XR, 11 */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" href="/icons/ios/splash/splash-828x1792.png" />
        {/* iPhone X, XS, 11 Pro, 12 mini, 13 mini */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" href="/icons/ios/splash/splash-1125x2436.png" />
        {/* iPhone 12, 12 Pro, 13, 13 Pro, 14 */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" href="/icons/ios/splash/splash-1170x2532.png" />
        {/* iPhone 12 Pro Max, 13 Pro Max, 14 Plus, 14 Pro Max */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" href="/icons/ios/splash/splash-1284x2778.png" />
        {/* iPad (9.7") */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" href="/icons/ios/splash/splash-1536x2048.png" />
        {/* iPad Pro (11") */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" href="/icons/ios/splash/splash-1668x2388.png" />
        {/* iPad Pro (12.9") */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" href="/icons/ios/splash/splash-2048x2732.png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <ToastProvider>{children}</ToastProvider>
          <PWARegister />
        </ThemeProvider>
      </body>
    </html>
  )
} 