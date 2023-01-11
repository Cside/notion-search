type Dir = {
  title: string;
  block: Response.Block; // workspace, collection は dir から除外してるので
};

type Item = {
  title: string;
  url: string;
  text?: string;
  icon: {
    type: valueOf<typeof import('../../popup/constants').ICON_TYPE>;
    value: string;
  };
  dirs: Dir[];
  // type: BlocksInSpace と API に指定している限り workspace, collection は含まれないため
  block: Response.Block;
};

type SearchResult = {
  items: Item[];
  total: number;
};

type SearchResultCache = {
  query: string;
  searchResult: SearchResult;
};
