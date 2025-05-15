// components/ChatwootWidget.tsx
'use client';

import Script from 'next/script';
import { useEffect } from 'react';

declare global {
  interface Window {
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void;
    };
    $chatwoot?: {
      sendMessage: (message: string) => void;
    };
  }
}

const ChatwootWidget = () => {
  const websiteToken = 'Bc5vwDufeKPJ5oVjteaWgVNc';
  const baseUrl = 'https://app.chatwoot.com';
  useEffect(() => {
    // Wait for the Chatwoot widget to load, then inject quick replies
    const injectQuickReplies = () => {
      const widgetIframe = document.querySelector<HTMLIFrameElement>('#chatwoot-widget-frame');
      if (!widgetIframe) return;

      const quickReplies = ['What is Peace Academy'];
      const container = document.createElement('div');
      container.style.padding = '10px';
      container.style.textAlign = 'center';
      container.style.background = '#f9f9f9';

      quickReplies.forEach((text) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.margin = '5px';
        button.style.padding = '10px 15px';
        button.style.border = 'none';
        button.style.background = '#4CAF50';
        button.style.color = '#fff';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';

        button.onclick = () => {
          // Send the selected message using Chatwoot's API
          if (window.$chatwoot) {
            window.$chatwoot.sendMessage(text);
          }
          container.style.display = 'none'; // Hide buttons after selection
        };

        container.appendChild(button);
      });

      // Append the container inside the iframe's body
      const iframeDocument = widgetIframe.contentDocument || widgetIframe.contentWindow?.document;
      if (iframeDocument) {
        iframeDocument.body.appendChild(container);
      }
    };
    window.addEventListener('chatwoot:ready', injectQuickReplies);
    return () => {
      // Cleanup event listener
      window.removeEventListener('chatwoot:ready', injectQuickReplies);
    };
  }, []);
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
