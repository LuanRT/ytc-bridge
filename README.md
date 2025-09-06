# ytc-bridge

Acts as a bridge to enable requests to YouTube's internal APIs, bypassing CORS and other restrictions.

## Installation

To install this extension, you need to load it as an unpacked extension in a Chromium-based browser.

1.  Download the latest `ytc-bridge-vX.X.X.zip` from the [releases page](https://github.com/LuanRT/ytc-bridge/releases).
2.  Unzip the downloaded file.
3.  Open your browser and navigate to the extensions page (e.g., `chrome://extensions` or `edge://extensions`).
4.  Enable "Developer mode".
5.  Click on "Load unpacked" and select the directory where you unzipped the files.

## Building from Source

If you want to build the extension from the source code, follow these steps:

1.  Clone the repository:
    ```sh
    git clone https://github.com/LuanRT/ytc-bridge.git
    cd ytc-bridge
    ```

2.  Install the dependencies:
    ```sh
    npm install
    ```

3.  Build the project:
    ```sh
    npm run build
    ```
    This will create a `dist` directory containing the bundled extension files.

4.  Follow the steps in the [Installation](#installation) section, but select the root directory of the project instead of the unzipped release folder.

## How It Works

The extension consists of three main parts:

1.  **Injected Script** ([`src/injected.ts`](src/injected.ts)): This script is injected into the web page and exposes a `window.proxyFetch` function. Web applications can use this function as a replacement for the standard `fetch` API to proxy requests through the extension.
2.  **Content Script** ([`src/content.ts`](src/content.ts)): This script acts as a message-passing bridge between the injected script (running in the web page's context) and the background script (running in the extension's context).
3.  **Background Script** ([`src/background.ts`](src/background.ts)): This is the core of the extension. It listens for messages from the content script, performs the actual `fetch` requests, and dynamically adds and removes network request rules to modify headers, ensuring the requests are accepted by YouTube's servers.

The extension also uses declarative network request rules defined in [`rules.json`](rules.json) to modify headers for certain requests, which helps in bypassing origin and referer checks.

## License
Distributed under the [MIT](./LICENSE) License.

<p align="right">
(<a href="#top">back to top</a>)
</p>