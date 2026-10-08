MÉTODO DE LEITURA PWA — V2

ALTERAÇÕES PRINCIPAIS
- Cabeçalho superior deixou de ser sticky/translúcido para eliminar a faixa escura sobrepondo o conteúdo.
- Pomodoro flutuante dentro do próprio PWA quando o timer está ativo.
- Controle flutuante: pausar/retomar, abrir Pomodoro e parar.
- Sons gerados localmente no navegador ao iniciar, pausar, retomar, nos 5 segundos finais e ao concluir.
- Volume configurável.
- Opção para manter a tela ativa durante o Pomodoro quando o navegador oferece Screen Wake Lock.
- Avisos do sistema opcionais quando a Notifications API está disponível e o usuário autoriza.
- Configurações e preferências continuam salvas localmente no dispositivo.
- Backup/restauração preservados.

LIMITAÇÃO IMPORTANTE DO IPHONE / PWA
Um PWA não pode criar uma bolha/ícone que fique desenhado por cima de outros aplicativos no iPhone. O timer flutuante desta versão aparece dentro do PWA. No iOS, uma experiência persistente fora do app como Dynamic Island/Live Activity exige um aplicativo nativo usando ActivityKit/WidgetKit.

Também não é possível garantir que JavaScript e sons continuem executando com o PWA totalmente suspenso em segundo plano. Por isso o timer usa timestamps: ao voltar ao app, o tempo é recalculado corretamente. Enquanto o PWA estiver aberto/ativo, os sons, contagem final e avisos funcionam normalmente. A opção "Manter tela ativa" ajuda durante leitura de livro físico.

DEPLOY NA VERCEL
Suba o conteúdo DESTA pasta na raiz do projeto.
Framework Preset: Other
Build Command: vazio
Output Directory: vazio

Após o deploy, faça um hard refresh. Como o Service Worker mudou para cache v2, a atualização deve substituir o cache antigo automaticamente. Se necessário, remova o PWA antigo da Tela de Início e instale novamente.
