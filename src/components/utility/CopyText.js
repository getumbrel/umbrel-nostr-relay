import { useState } from "react";

export default function CopyText({ value }) {
  const [isCopied, setIsCopied] = useState(false);

  async function copyText() {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value);
    } else {
      let textArea = document.createElement("textarea");
      textArea.value = value;
      textArea.style.position = "absolute";
      textArea.style.opacity = 0;
      document.body.appendChild(textArea);
      textArea.select();
      await document.execCommand("copy");
      textArea.remove();
    }

    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1000);
  }

  return (
    <div className="flex items-end border-dashed border-b border-slate-900 dark:border-slate-500">
      <span className="text-slate-900 dark:text-slate-100 font-mono text-sm">
        {value}
      </span>
      <button onClick={copyText}>
        {isCopied ? (
          <svg
            className="ml-2 mb-[0.3rem] fill-slate-900 dark:fill-slate-100 w-3"
            viewBox="0 0 116 123"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_25_37)">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M89.62 21.69V13.94H89.6C89.59 10.1 88.03 6.63 85.53 4.12C83.01 1.59 79.52 0.03 75.67 0.02V0H13.94V0.02C10.1 0.03 6.63 1.59 4.12 4.09C1.6 6.61 0.03 10.1 0.02 13.95H0V78.57H0.02C0.03 82.41 1.59 85.88 4.09 88.39C6.61 90.92 10.11 92.48 13.95 92.49V92.51H26.15V108.94H26.17C26.18 112.78 27.74 116.25 30.24 118.76C32.76 121.29 36.26 122.85 40.1 122.86V122.88H101.83V122.86C105.67 122.85 109.14 121.29 111.65 118.79C114.18 116.26 115.74 112.77 115.75 108.93H115.77V35.63H115.75C115.74 31.79 114.18 28.32 111.68 25.81C109.16 23.28 105.67 21.72 101.82 21.71V21.69H89.62ZM79.04 21.69H40.1V21.71C36.26 21.72 32.79 23.28 30.28 25.78C27.76 28.3 26.19 31.79 26.18 35.64H26.16V81.92H13.96V81.94C13.05 81.94 12.2 81.55 11.59 80.94C10.97 80.32 10.58 79.48 10.58 78.57H10.6V13.95H10.58C10.58 13.04 10.97 12.19 11.58 11.58C12.2 10.96 13.04 10.57 13.95 10.57V10.59H75.68V10.57C76.59 10.57 77.44 10.96 78.05 11.57C78.67 12.19 79.06 13.03 79.06 13.94H79.04V21.69Z"
              />
            </g>
            <defs>
              <clipPath id="clip0_25_37">
                <rect width="115.77" height="122.88" fill="white" />
              </clipPath>
            </defs>
          </svg>
        ) : (
          <svg
            className="ml-2 mb-[0.3rem] fill-slate-900 dark:fill-slate-100 w-3"
            version="1.1"
            id="Layer_1"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            x="0px"
            y="0px"
            viewBox="0 0 115.77 122.88"
            style={{ enableBackground: "ew 0 0 115.77 122.88" }}
            xmlSpace="preserve"
          >
            <g>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M89.62,13.96v7.73h12.19h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02v0.02 v73.27v0.01h-0.02c-0.01,3.84-1.57,7.33-4.1,9.86c-2.51,2.5-5.98,4.06-9.82,4.07v0.02h-0.02h-61.7H40.1v-0.02 c-3.84-0.01-7.34-1.57-9.86-4.1c-2.5-2.51-4.06-5.98-4.07-9.82h-0.02v-0.02V92.51H13.96h-0.01v-0.02c-3.84-0.01-7.34-1.57-9.86-4.1 c-2.5-2.51-4.06-5.98-4.07-9.82H0v-0.02V13.96v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07V0h0.02h61.7 h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02V13.96L89.62,13.96z M79.04,21.69v-7.73v-0.02h0.02 c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v64.59v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h12.19V35.65 v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07v-0.02h0.02H79.04L79.04,21.69z M105.18,108.92V35.65v-0.02 h0.02c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v73.27v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h61.7h0.02 v0.02c0.91,0,1.75-0.39,2.37-1.01c0.61-0.61,1-1.46,1-2.37h-0.02V108.92L105.18,108.92z"
              />
            </g>
          </svg>
        )}
      </button>
    </div>
  );
}
