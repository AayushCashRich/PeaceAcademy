'use client';

import Script from 'next/script';
import { useEffect } from 'react';

declare global {
  interface Window {
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void;
      sendMessage: (message: string) => void;
      on: (event: string, callback: () => void) => void;
    };
  }
}

interface ChatwootWidgetProps {
  baseUrl: string;
  websiteToken: string;
}

const ChatwootWidget: React.FC<ChatwootWidgetProps> = ({ baseUrl, websiteToken }) => {

  websiteToken = 'Bc5vwDufeKPJ5oVjteaWgVNc';
  baseUrl = 'https://app.chatwoot.com';


  useEffect(() => {
    const handleWidgetOpened = () => {
      const widgetIframe = document.querySelector("iframe[title='Chatwoot Widget']") as HTMLIFrameElement;
      if (widgetIframe) {
        const widgetDoc = widgetIframe.contentDocument || widgetIframe.contentWindow?.document;

        if (widgetDoc && !widgetDoc.querySelector('.predefined-questions')) {
          const container = widgetDoc.createElement('div');
          container.className = 'predefined-questions';
          container.style.cssText = `
            padding: 10px;
            background: #f9f9f9;
            border-top: 1px solid #ddd;
            font-family: Arial, sans-serif;
          `;

          container.innerHTML = `
            <p style="margin: 0 0 10px;">Select a question to get started:</p>
            <button style="display: block; margin-bottom: 5px;" onclick="parent.postMessage({ type: 'sendMessage', message: 'What is Peace Academy ?' }, '*')">What is Peace Academy?</button>
            <button style="display: block; margin-bottom: 5px;" onclick="parent.postMessage({ type: 'sendMessage', message: 'What is the mission of Peace Academy?' }, '*')">What is the mission of Peace Academy?</button>
          `;

          widgetDoc.body?.appendChild(container);
        }
      }
    };

    if (window.chatwootSDK) {
      window.chatwootSDK.on('widget:opened', handleWidgetOpened);
    }

    return () => {
      if (window.chatwootSDK) {
        window.chatwootSDK.on('widget:opened', () => { }); // Cleanup listener
      }
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

          window.addEventListener('message', (event) => {
            if (event.data.type === 'sendMessage' && window.chatwootSDK) {
              window.chatwootSDK.sendMessage(event.data.message);
            }
          });
        }}
      />
    </>
  );
};

export default ChatwootWidget;
