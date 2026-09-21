# Entregas com baixa e rastreamento ao vivo

## O que será entregue
- **Baixa no painel:** botão “Marcar como entregue” nos pedidos prontos ou em rota, com confirmação, bloqueio durante o envio e atualização do painel e do acompanhamento do cliente.
- **Tempo desde que ficou pronto:** registrar o momento real da mudança para “Pronto” e mostrar o tempo decorrido. Pedidos antigos sem esse registro não terão um horário inventado.
- **Previsão para o cliente:** mostrar o tempo aproximado restante durante a rota, com indicação da última atualização; não apresentar previsão como garantia.
- **Mapa ao vivo:** mostrar a posição compartilhada pelo entregador no acompanhamento do pedido.
- **Página do entregador:** acesso seguro à entrega atribuída, ações para iniciar a rota, compartilhar/parar a localização e confirmar a entrega. O código de quatro dígitos não será usado sozinho como autorização para publicar posições ou acessar dados pessoais.

## Funcionamento e limites
- O entregador autoriza a localização no celular e mantém a página aberta durante a rota. Navegadores podem suspender atualizações ao bloquear a tela ou colocar a página em segundo plano.
- Cliente e restaurante verão quando a localização estiver desatualizada, indisponível ou sem permissão.
- O compartilhamento termina ao concluir ou cancelar a entrega; a localização fica acessível apenas às pessoas autorizadas para aquele pedido.
- Google Maps pode gerar custos. A conexão será solicitada antes de implementar o mapa e o cálculo de rotas.

## Detalhes técnicos
- Registrar `ready_at` na mudança de status no banco, sem depender da página que efetuou a alteração.
- Manter operações isoladas por restaurante e validar permissões no servidor, incluindo a baixa manual.
- Usar acesso autenticado para o entregador e autorização específica por entrega; proteger também o acesso do cliente ao rastreamento.
- Armazenar apenas a posição mais recente necessária, com horário, precisão e expiração; não criar histórico completo de deslocamentos.
- Atualizar posições com frequência limitada e distância mínima, evitando envios duplicados. Recalcular previsão com intervalo limitado e cache, não a cada posição recebida.
- Calcular rotas por chamadas autenticadas ao Google Maps no servidor; manter credenciais privadas fora do navegador.
- Usar atualizações em tempo real para refletir posição e conclusão sem recarregar a página.

## Validação
- Verificar baixa manual, confirmação duplicada e pedidos cancelados.
- Verificar o cronômetro após recarregar e com pedidos antigos.
- Testar permissão de localização negada, perda de conexão e localização desatualizada.
- Verificar isolamento entre restaurantes, entregadores e clientes.
- Testar apresentação no celular e computador; validar rota e previsão com Google Maps conectado.
