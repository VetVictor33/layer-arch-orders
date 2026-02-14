# Objetivos

Criar uma API responsável por receber requisições de pagamentos com cartão de crédito que seja capaz de lidar com alta carga, idempotência e mensageira.
O intuito é ter um produto resiliente e confiável. Ou seja, quando ele receber uma requisição, sem comportamento deve ser determinístico conforme os critérios de produto.

# Critérios de produto (MVP)

- Receber objeto com dados de compras:
  - produto;
  - valor;
  - dados do cartão de crédito;
  - dados do cliente.
- Processar requisições:
  - Salvar imediatamente a venda;
  - Processar o pagamento;
  - Informar o cliente do pagamento.

# Critérios de arquitetura

- Arquitetura camadas modulares (inspiração NestJs)
  - Controllers (recebem a requisição)
  - Services (regra de negócios)
  - Repositories (acesso ao banco de dados)

# Critérios de desenvolvimento

## Modelagem

### Order (Postgres)

```javascript
	model Order
	// <>Dados universais<>
	id uuid
	createdAt Date // UTC
	updatedAt Date // UTC
	// <>Dados da venda<>
	productId string // Sem significado atual. Pós MVP: deve referenciar ao model do produto
	price Number // Dado do cliente
	customerName String
	customerEmail String
	// <>Dados do pagamento<>
	paymentType Enum (CARD)
	paymentId String // id fornecido pelo gateway
	gatewayId String // id do gateway
	paymentStatus Enum (PENDING | PAIED | DENIED | CANCELED)
```

### IdempotencyKey (Redis)

```javascript
	Key: idempotencyKey (string - UUID)
	Value: {
		response: Object {
			orderId: string,
			paymentStatus: string,
			message: string
		},
		createdAt: timestamp (ISO8601),
		expiresAt: timestamp (ISO8601)
	}
	TTL: 86400 // 24 horas em segundos
```

## Tecnologias e bibliotecas (JavaScript)

- Typescript
- PostgreSQL
- Redis
- Prisma
- Zod
- Docker

## Rotas da API

### [POST] `/order`

Efetiva uma compra.

```json

    "product" : {
        "id": "string",
        "price": "number"
    },
    "customer": {
        "name": "string",
        "email": "string"
    },
    "payment": {
        "type": "string/enum (CARD)",
        "card": {
            "number": "string",
            "holderName": "string",
            "cvv": "string",
            "expirationDate": "string (MM/YY)"
        }
    }
```

### [GET] `/order/id/status`

Consulta o status de um pedido.

## Fluxograma da API - bases (MVP 0.1)

### Compra (sem fila)

```mermaid
flowchart TD
    A["Recebe pedido"] --> B["Processa objeto da requisição"]
    B --> C{Os dados são válidos?}
    C -->|Não| D["Devolve erro 400<br/>especificando motivo"]
    D --> E["FIM"]
    C -->|Sim| F["Salva tentativa no BD"]
    F --> G["Faz requisição para<br/>gateway de pagamento"]
    G --> H{Gateway respondeu<br/>com sucesso?}
    H -->|Não| I["Atualiza status do pagamento"]
    I --> J["Interpreta erro e retorna<br/>para o cliente"]
    J --> E
    H -->|Sim| K["Atualiza status do pagamento"]
    K --> L["Envia mensagem de sucesso<br/>para o cliente"]
    L --> E
```

### Verificar status da compra

```mermaid
flowchart TD
    A["Recebe ID da compra"] --> B["Valida corpo da requisição"]
    B --> C{Os dados são válidos?}
    C -->|Não| D["Devolve erro 400<br/>especificando motivo"]
    D --> E["FIM"]
    C -->|Sim| F["Busca compra no BD"]
    F --> G{Encontrou?}
    G -->|Não| H["Retorna erro 404"]
    H --> E
    G -->|Sim| I["Retorna status da venda"]
    I --> E
```

## Fluxograma da API - fila (MVP 0.2)

### Compra

```mermaid
flowchart TD
    A["Recebe pedido"] --> B["Processa objeto da requisição"]
    B --> C{Os dados são válidos?}
    C -->|Não| D["Devolve erro 400<br/>especificando motivo"]
    D --> E["FIM"]
    C -->|Sim| F["Envia mensagem de<br/>pedido realizado com sucesso"]
    F --> G["Requisição entra em fila"]
    G --> H["Salva tentativa no BD"]
    H --> I["Faz requisição em fila<br/>para gateway de pagamento"]
    I --> J["Atualiza status do pagamento"]
    J --> E
```

## Fluxograma da API - idempotência (MVP 0.3)

### Compra com idempotência

```mermaid
flowchart TD
    A["Recebe pedido"] --> B["Processa objeto da requisição"]
    B --> C{Os dados são válidos?}
    C -->|Não| D["Devolve erro 400<br/>especificando motivo"]
    D --> E["FIM"]
    C -->|Sim| F["Gera idempotencyKey único"]
    F --> G["Busca requisição prévia<br/>com mesmo idempotencyKey"]
    G --> H{Requisição já foi<br/>processada?}
    H -->|Sim| I["Retorna resposta anterior<br/>armazenada"]
    I --> E
    H -->|Não| J["Envia mensagem de<br/>pedido realizado com sucesso"]
    J --> K["Requisição entra em fila"]
    K --> L["Salva tentativa no BD<br/>com idempotencyKey"]
    L --> M["Faz requisição em fila<br/>para gateway de pagamento"]
    M --> N["Atualiza status do pagamento"]
    N --> E
```

## Fluxograma da API - mensageria (MVP 0.4)

### Compra com idempotência e eventos de email

```mermaid
flowchart TD
    A["Recebe pedido"] --> B["Processa objeto da requisição"]
    B --> C{Os dados são válidos?}
    C -->|Não| D["Devolve erro 400<br/>especificando motivo"]
    D --> E["FIM"]
    C -->|Sim| F["Gera idempotencyKey único"]
    F --> G["Busca requisição prévia<br/>com mesmo idempotencyKey"]
    G --> H{Requisição já foi<br/>processada?}
    H -->|Sim| I["Retorna resposta anterior<br/>armazenada"]
    I --> E
    H -->|Não| J["Salva tentativa no BD<br/>com idempotencyKey"]
    J --> K["Entra em fila: Email de<br/>confirmação do pedido"]
    K --> L["Requisição entra em fila<br/>de pagamento"]
    L --> M["Faz requisição em fila<br/>para gateway de pagamento"]
    M --> N["Atualiza status do pagamento"]
    N --> O["Entra em fila: Email de<br/>status do pagamento"]
    O --> P["Retorna sucesso ao cliente"]
    P --> E
```
