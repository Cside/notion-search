import React, { useEffect, useRef } from 'react';

export default function SearchBox({
  query,
  setQuery,
  workspaceName,
}: {
  query: string;
  setQuery: (value: string) => void;
  workspaceName: string;
}) {
  const clear = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    setQuery('');
    event.preventDefault();
  };

  // input の value に state を指定すると onhashchange 時に変化が取り消されてしまう
  // ため、回避策 (use-hash-param の問題)
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.value = query;
  }, [query]);

  return (
    <div className="search-box">
      <img
        className="icon-search"
        src={chrome.runtime.getURL('./images/search.svg')}
      ></img>
      <input
        ref={inputRef}
        type="text"
        className="search"
        placeholder={`Search ${workspaceName}...`}
        autoFocus
        onChange={(event) => setQuery(event.target.value)}
      />
      {query.trim() && (
        <a href="#" className="icon-clear-query-container" onClick={clear}>
          <img
            className="icon-clear-query"
            src={chrome.runtime.getURL('./images/clear-query.svg')}
          />
        </a>
      )}
    </div>
  );
}