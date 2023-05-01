import Head from "next/head";
import dynamic from "next/dynamic";

import { RootState } from "@/app/store";
import { useAppSelector } from "@/app/hooks";
import ChordName from "@/components/ChordName";
import { useRouter } from "next/router";
import React from "react";
import Layout from "@/components/Layout";

export default function Home() {
  const router = useRouter();
  const singleData = useAppSelector(
    (state: RootState) => state.searchDataSlice.singleData
  );

  const DynamicComponentWithNoSSR = dynamic(
    () => import("../components/Guitar"),
    { ssr: false }
  );

  React.useEffect(() => {
    if (router.asPath === "/") {
      router.push("/chords/cmajor");
    }
  }, []);

  return (
    <Layout>
      <div className="w-full overflow-hidden bg-black h-full">
        <DynamicComponentWithNoSSR
          id={singleData?.[0]?.id}
          data={singleData?.[0]}
        />
      </div>
      <ChordName singleDatafromDynamicPage={singleData?.[0]} />
    </Layout>
  );
}
