import "./globals.css";
import { StrategyProvider } from "@/context/StrategyContext";
import AppShell from "@/components/AppShell";

export const metadata = {
    title: "OddsLab",
    description: "Quantitative odds dashboard",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" className="dark">
            <body className="bg-slate-900 text-white antialiased">
                <StrategyProvider>
                    <AppShell>{children}</AppShell>
                </StrategyProvider>
            </body>
        </html>
    );
}