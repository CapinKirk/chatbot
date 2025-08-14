export const metadata = { title: 'Chat Web' };
export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="en">
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function(){
              navigator.serviceWorker.register('/sw.js').catch(()=>{});
            });
          }
        ` }} />
      </body>
    </html>
  );
}


