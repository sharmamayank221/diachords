import getChords from "./getChods";

async function getIDs() {
  const chordData = await getChords();

  let chordIds: any = [];

  chordIds = chordData?.map((chord: any) => chord.id);

  return chordIds;
}

export default getIDs;
