# Objetivo

Refatorar o serviço mock de gateway de pagamento para permitir maior controle dos comportamentos do processamento utilizando apenas números de cartão.

# Critérios

- Padronizar os números de cartão;
- Criar novos status de pagamento: `FAILED` & `ERROR`;
- Associar comportamentos do gateway de pagamento ao número do cartão:
  - Quanto ao status de pagamento:
    - final 00: `ERROR`;
    - final 10: `DENIED`;
    - final 20: `FAILED`;
    - final 30: `CANCELED`.
    - final 40: `PAID`;
  - Quanto ao tempo de processamento:
    - início 40: processamento imediato assíncrono (vai entrar em fila, pois é a arquitetura do sistema);
    - início 50: processamento de 10 a 30s;
