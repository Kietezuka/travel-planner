import AuthProvider from "./components/AuthProvider";
import { ToastProvider } from "./components/ToastProvider";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import OfflineBanner from "./components/OfflineBanner";

import { Roboto } from "next/font/google"

const roboto = Roboto({
  subsets: ["latin"],
  display: "swap"
});

export const metadata = {
  title: {
    template: "%s | Travel Planner",
    default: "Travel Planner",
  },
  description: "Plan multi-day trips faster & clearer",
};

export default function RootLayout({children}){
  return(
    <html lang="en">
      <body className={`${roboto.className} `} suppressHydrationWarning={true}>

        <a href="#main-content" className="skip-link">Skip to main content</a>
        <AuthProvider>
          <ToastProvider>
            <div className="app-top">
              <Header/>
              <OfflineBanner/>
            </div>
            <div id="main-content">
              {children}
            </div>
            <Footer/>
          </ToastProvider>
        </AuthProvider>

      </body>
    </html>
  )
}
