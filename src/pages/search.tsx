import React from "react";
import AppShell from "@/components/Navigation/AppShell";
import SearchPage from "@/components/Search/SearchPage";

function Search() {
  return <SearchPage />;
}

Search.getLayout = (page: React.ReactElement) => (
  <AppShell mobileTitle="Search">{page}</AppShell>
);

export default Search;
