import Link from "next/link";

export default function SiteGuide() {
  return (
    <section className="site-guide" aria-labelledby="site-guide-title">
      <div className="site-guide-header">
        <div>
          <span className="site-guide-kicker">MANUAL DE SOBREVIVÊNCIA</span>
          <h1 id="site-guide-title">Como usar o Gossip UERJ</h1>
          <p>Um mapa rápido para publicar, descobrir e participar do que está rolando no campus.</p>
        </div>
        <span className="site-guide-stamp">GUIA 2026</span>
      </div>

      <div className="site-guide-grid">
        <article className="site-guide-item guide-publish">
          <span className="site-guide-icon">📢</span>
          <h2>1. Solte uma fofoca</h2>
          <p>Entre na sua conta institucional e use a caixa “Soltar Fofoca no Campus”. Escolha uma categoria, escreva um título chamativo e conte o contexto em até 280 caracteres.</p>
          <ul><li>Use categorias como Crush, Acadêmico, Bandejão, Festa e Alerta.</li><li>Não inclua nome completo, telefone, email, matrícula ou outros dados pessoais.</li><li>Revise antes de publicar: depois, você só poderá excluir as suas próprias publicações.</li></ul>
        </article>

        <article className="site-guide-item guide-discover">
          <span className="site-guide-icon">🔥</span>
          <h2>2. Encontre o que importa</h2>
          <p>Use a busca para procurar palavras, cursos, professores, lugares ou andares. Os filtros por categoria ajudam a separar o barulho do assunto que você quer acompanhar.</p>
          <ul><li><strong>Mais recentes:</strong> acompanha o que acabou de chegar.</li><li><strong>Em alta:</strong> coloca primeiro as publicações mais curtidas.</li><li><strong>Carregar mais:</strong> traz mais fofocas quando houver outra página disponível.</li></ul>
        </article>

        <article className="site-guide-item guide-discuss">
          <span className="site-guide-icon">💬</span>
          <h2>3. Participe da conversa</h2>
          <p>Abra os comentários de uma fofoca para ler as opiniões da comunidade. Os comentários aparecem como anônimos e você precisa estar logado para interagir.</p>
          <ul><li>Clique em <strong>curtir</strong> para apoiar uma publicação.</li><li>Use <strong>comentar</strong> para acrescentar uma opinião respeitosa.</li><li>Use <strong>responder</strong> para continuar a conversa em um comentário específico.</li></ul>
        </article>

        <article className="site-guide-item guide-building">
          <span className="site-guide-icon">🏛️</span>
          <h2>4. Explore o prédio</h2>
          <p>A lateral do feed representa o Pavilhão João Lyra Filho. Abra cada andar para ver os espaços e cursos associados a ele.</p>
          <ul><li>A lista vai do 12º andar até o térreo, como uma torre.</li><li>Se o seu perfil de Crush tiver curso, o andar estimado fica marcado como “você”.</li><li>Essa é uma referência de campus; posts ainda não têm andar salvo na API.</li></ul>
        </article>

        <article className="site-guide-item guide-crush">
          <span className="site-guide-icon">💘</span>
          <h2>5. Use a área de Crushes</h2>
          <p>A galeria só abre para quem está logado e já publicou um perfil de Crush. Depois disso, você vê um perfil por vez, no estilo Tinder.</p>
          <ul><li><strong>Curtir:</strong> envia seu interesse.</li><li><strong>Descartar:</strong> passa para o próximo perfil sem enviar interesse.</li><li>O username é o @ do Instagram e só aparece quando o interesse vira match.</li></ul>
        </article>

        <article className="site-guide-item guide-account">
          <span className="site-guide-icon">🔐</span>
          <h2>6. Cuide da sua conta</h2>
          <p>Use o perfil para acessar sua carteirinha, ver suas publicações e sair da conta. Esqueceu a senha? Use o link de recuperação na tela de login.</p>
          <ul><li>O código de recuperação chega no seu email institucional.</li><li>Para apagar o perfil de Crush, use “Apagar meu perfil”; a foto do Blob também é removida.</li><li>Denuncie conteúdo perigoso pelos canais de moderação da equipe quando disponíveis.</li></ul>
        </article>
      </div>

      <div className="site-guide-footer"><strong>Regra de ouro:</strong> anonimato não é passe livre para expor, ameaçar ou acusar alguém. Publique fatos e vivências sem dados que identifiquem pessoas.</div>
      <Link className="site-guide-back-link" href="/">← Voltar para o feed</Link>
    </section>
  );
}
