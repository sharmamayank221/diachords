import data from "@/chrods.json";

async function getChords() {
  let chordData: any = [];

  Object.values(data?.chords).forEach((item) => {
    item.forEach((ch) => {
      // this id will be used for searching the database and to generate next js dynamic detail pages
      let id = (ch.key + ch.suffix).toLowerCase().replace("/", "");
      // for pushing the above id into respective objects
      ch = Object.assign({ ...ch }, { id: id });
      // finally to push each object into an array or state
      chordData.push(ch);
    });
  });
  return chordData;
}

export default getChords;
