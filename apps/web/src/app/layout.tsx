import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SMS CRM Admin',
  description: 'SMS Campaign Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center">
                    <h1 className="text-xl font-bold">SMS CRM</h1>
                  </div>
                  <div className="ml-6 flex space-x-8">
                    <a href="/" className="inline-flex items-center px-1 pt-1 text-sm font-medium">
                      Dashboard
                    </a>
                    <a href="/imports" className="inline-flex items-center px-1 pt-1 text-sm font-medium">
                      Imports
                    </a>
                    <a href="/campaigns" className="inline-flex items-center px-1 pt-1 text-sm font-medium">
                      Campaigns
                    </a>
                    <a href="/reports" className="inline-flex items-center px-1 pt-1 text-sm font-medium">
                      Reports
                    </a>
                    <a href="/settings" className="inline-flex items-center px-1 pt-1 text-sm font-medium">
                      Settings
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
