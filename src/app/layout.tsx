import type { Metadata } from 'next';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import './globals.css';
import './workspace.css';
export const metadata:Metadata={title:'Scrappy · Operations',description:'Franchise billing and collection operations'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=Sora:wght@600;700&display=swap" rel="stylesheet"/></head><body>{children}</body></html>}
