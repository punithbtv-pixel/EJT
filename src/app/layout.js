import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata = {
  title: "ZYN Engineering Job Tracker",
  description: "Notification and work-order tracker for ZYN Electrical's engineering team",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <NavBar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
        <footer className="text-right text-xs text-slate-400 py-4 max-w-7xl mx-auto w-full px-4 sm:px-6">
          ZYN Engineering Job Tracker (EJT)
        </footer>
      </body>
    </html>
  );
}
