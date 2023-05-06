import dynamic from "next/dynamic";

import { RootState } from "@/app/store";
import { useAppSelector } from "@/app/hooks";
import ChordName from "@/components/ChordName";
import { useRouter } from "next/router";
import React from "react";
import Layout from "@/components/Layout";

export default function Home() {
  const router = useRouter();

  React.useEffect(() => {
    if (router.asPath === "/") {
      router.push("/chords/cmajor");
    }
  }, [router]);

  return <></>;
}
