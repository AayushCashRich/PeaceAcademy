// components/ChatwootWidget.tsx
'use client';

import Script from 'next/script';

declare global {
  interface Window {
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void;
    };
  }
}

const ChatwootWidget = () => {
  const websiteToken = 'Bc5vwDufeKPJ5oVjteaWgVNc';
  const baseUrl = 'https://app.chatwoot.com';


  return (
    <>
      <Script
        src={`${baseUrl}/packs/js/sdk.js`}
        strategy="lazyOnload"
        onLoad={() => {
          if (window.chatwootSDK) {
            window.chatwootSDK.run({
              websiteToken,
              baseUrl,
            });
          }
        }}
      />
    </>
  );
};

export default ChatwootWidget;
