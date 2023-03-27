import "@/styles/globals.css";
import { store } from "../../app/store";
import { Provider } from "react-redux";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <Component {...pageProps} />
    </Provider>
  );
}
