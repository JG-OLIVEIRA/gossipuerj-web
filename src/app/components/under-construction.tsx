export default function UnderConstruction({ area }: { area: string }) {
  return (
    <main className="under-construction-page" aria-label={`${area} em construção`}>
      <div className="under-construction" role="status">
        <span className="construction-icon" aria-hidden="true">⚒</span>
        <div>
          <strong>{area} está quase babado</strong>
          <span>Estamos preparando tudo. Volte em breve!</span>
        </div>
        <span className="construction-dots" aria-hidden="true">...</span>
      </div>
    </main>
  );
}
