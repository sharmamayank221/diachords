import { NextResponse } from "next/server";
import data from "@/chrods.json";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  let arrayWithoutIDs: any;
  Object.values(data.chords).forEach((item) => {
    item.forEach((ch) => {
      // this id will be used for searching the database and to generate next js dynamic detail pages
      let id = (ch.key + ch.suffix).toLowerCase();
      // for pushing the above id into respective objects
      ch = Object.assign({ ...ch }, { id: id });
      // finally to push each object into an array or state
      arrayWithoutIDs.push(ch);
      arrayWithoutIDs.slice(0, 552);
    });
  });
  const ChordData = arrayWithoutIDs?.filter((p: any) =>
    p.id.toLowerCase().includes(key?.toLowerCase() ?? "")
  );
  return NextResponse.json(ChordData);
}
