import React, { useEffect, useRef } from 'react';

export default function SearchBox({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (value: string) => void;
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
    <div className="search-container">
      <svg viewBox="0 0 17 17" className="icon-search">
        <path d="M6.78027 13.6729C8.24805 13.6729 9.60156 13.1982 10.709 12.4072L14.875 16.5732C15.0684 16.7666 15.3232 16.8633 15.5957 16.8633C16.167 16.8633 16.5713 16.4238 16.5713 15.8613C16.5713 15.5977 16.4834 15.3516 16.29 15.1582L12.1504 11.0098C13.0205 9.86719 13.5391 8.45215 13.5391 6.91406C13.5391 3.19629 10.498 0.155273 6.78027 0.155273C3.0625 0.155273 0.0214844 3.19629 0.0214844 6.91406C0.0214844 10.6318 3.0625 13.6729 6.78027 13.6729ZM6.78027 12.2139C3.87988 12.2139 1.48047 9.81445 1.48047 6.91406C1.48047 4.01367 3.87988 1.61426 6.78027 1.61426C9.68066 1.61426 12.0801 4.01367 12.0801 6.91406C12.0801 9.81445 9.68066 12.2139 6.78027 12.2139Z"></path>
      </svg>
      <input
        ref={inputRef}
        type="text"
        className="search"
        placeholder="Search"
        autoFocus
        onChange={(event) => setQuery(event.target.value)}
      />
      <a href="#" className="icon-clear-input-container" onClick={clear}>
        <svg viewBox="0 0 30 30" className="icon-clear-input">
          <path d="M15,0C6.716,0,0,6.716,0,15s6.716,15,15,15s15-6.716,15-15S23.284,0,15,0z M22,20.6L20.6,22L15,16.4L9.4,22L8,20.6l5.6-5.6 L8,9.4L9.4,8l5.6,5.6L20.6,8L22,9.4L16.4,15L22,20.6z"></path>
        </svg>
      </a>
    </div>
  );
}