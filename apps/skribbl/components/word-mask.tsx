type WordMaskProps = {
  maskedWord: string | null;
  word?: string | null;
  className?: string;
};

export function WordMask({ maskedWord, word, className = "" }: WordMaskProps) {
  const text = word ?? maskedWord ?? "";
  const characters = Array.from(text);

  return (
    <div
      className={`word-mask ${className}`.trim()}
      aria-label={word ? `The word is ${word}` : "Hidden word"}
    >
      {characters.length === 0 ? (
        <span className="mask-box" data-space="true">
          &nbsp;
        </span>
      ) : (
        characters.map((character, index) => {
          if (character === " ") {
            return (
              <span className="mask-box" data-space="true" key={`space-${index}`}>
                &nbsp;
              </span>
            );
          }
          if (character === "_") {
            return <span className="mask-box" key={`blank-${index}`} />;
          }
          return (
            <span className="mask-box" data-revealed="true" key={`letter-${index}`}>
              {character}
            </span>
          );
        })
      )}
    </div>
  );
}
