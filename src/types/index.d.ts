type valueOf<T> = T[keyof T]; // util

type IconType = valueOf<typeof import('../popup/constants').ICON_TYPE>;

type Item = {
  title: string;
  url: string;
  text?: string;
  pageIcon?: {
    type: IconType;
    value: string;
  };
  parentsPath?: string;
};

type SearchResult = {
  items: Item[];
  total: number;
};

type StorageData = {
  query: string;
  searchResult: SearchResult;
};

type FiltersBy = {
  [key in valueOf<typeof import('../popup/constants').FiltersBy>]?: boolean;
};
