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
    const injectQuickReplies = () => {
      const widgetIframe = document.querySelector<HTMLIFrameElement>('#chatwoot-widget-frame');
      if (!widgetIframe) {
        console.error('Chatwoot widget iframe not found.');
        return;
      }

      // Wait until the iframe is fully loaded
      const interval = setInterval(() => {
        const iframeDocument = widgetIframe.contentDocument || widgetIframe.contentWindow?.document;
        if (iframeDocument && iframeDocument.body) {
          clearInterval(interval);

          // Create the quick replies container
          const quickRepliesContainer = iframeDocument.createElement('div');
          quickRepliesContainer.id = 'quick-replies-container';
          quickRepliesContainer.style.padding = '10px';
          quickRepliesContainer.style.textAlign = 'center';
          quickRepliesContainer.style.background = '#f9f9f9';

          // Add quick reply buttons
          const quickReplies = ['I want to schedule a call', 'I need account statement', 'I have a question'];
          quickReplies.forEach((text) => {
            const button = iframeDocument.createElement('button');
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
              quickRepliesContainer.style.display = 'none'; // Hide options after selection
            };

            quickRepliesContainer.appendChild(button);
          });

          // Append the container inside the iframe body
          iframeDocument.body.appendChild(quickRepliesContainer);
        }
      }, 100); // Retry every 100ms until iframe is ready
    };

    // Listen for Chatwoot widget readiness
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
