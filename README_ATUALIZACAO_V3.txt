MÉTODO DE LEITURA — V3 UX/MOBILE

CORREÇÕES DESTA VERSÃO
- Cabeçalho sem faixa/overlay escuro sobre os ícones e o nome do app.
- Safe-area do iPhone/iPad aplicada uma única vez no modo instalado.
- Meta de status bar do iOS alterada para default.
- Popup de instalação agora fecha pelo X, pelo botão “Agora não”, tocando fora e pela tecla Esc.
- Correção explícita de [hidden] para Safari/iOS.
- Bloqueio de rolagem por trás de modal/configurações.
- Drawer e popup limitados à área útil da tela.
- Topo responsivo revisado para iPhone pequeno, iPhone padrão, iPad/tablet e desktop.
- Service Worker atualizado para cache v3 e arquivos principais em network-first, reduzindo versão antiga presa em cache.

ATUALIZAÇÃO NA VERCEL
1. Substitua todos os arquivos do repositório pelos desta pasta.
2. Commit/push na branch main.
3. Aguarde o novo deployment ficar Ready na Vercel.
4. No navegador desktop faça Ctrl+Shift+R.
5. Se já instalou o PWA no iPhone, abra a versão web no Safari uma vez após o deploy. Se a versão antiga persistir, remova o ícone da Tela de Início e adicione novamente.
