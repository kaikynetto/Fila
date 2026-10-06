# Direção do Fila

Organização aparece na hierarquia: uma agenda legível, conta identificada pelo nome e uma tarefa por etapa na criação. O app tem somente tema escuro e usa a barra nativa do macOS para arrastar e redimensionar a janela.

## Sistema visual

| Elemento | Escolha |
| --- | --- |
| Fundo | `#0F0E0D` |
| Superfície | `#171614` |
| Borda | `#2A2826` |
| Texto | `#EFEBE6` |
| Texto secundário | `#AAA39B` |
| Seleção | `#8AACD6` |
| Controles | Geist |
| Títulos | Faustina |

Badge, RichButton e LabelInput vêm do registry oficial Spell UI. Menus, calendário e campos de horário têm desenho próprio. Os logos vetoriais das seis redes vêm de Font Awesome Brands.

## Fluxos

O onboarding reúne pessoa, empresa, contas e lembretes. Uma rede pode ter várias contas, cada uma com nome, perfil e tipo Empresa ou Dark. A conta tem identificador próprio e o post referencia esse identificador.

A criação ocupa uma tela, dividida em Conteúdo, Arquivos e Agendamento. Não há formulário longo dentro de modal nem resumo lateral permanente. O agendamento mostra uma síntese da conta escolhida e o horário do aviso no fuso configurado.

A agenda semanal e mensal compartilha filtros por conta e status. A seleção de uma postagem abre detalhes, mídia, legenda e ações. A biblioteca organiza arquivos por postagem.

## Ícone

Três cartões azuis sobre uma base escura, com uma marca de conclusão. Representa a fila de conteúdo que já tem lugar no planejamento. É gerado em AppKit pelo script `make-icon.swift` em todas as resoluções do macOS.

## Implementação

Interface React incorporada em WebKit, sem servidor em execução. O shell SwiftUI fornece armazenamento, importação e notificações locais. Os exemplos só são carregados explicitamente em demonstração; o primeiro acesso real começa com o onboarding e uma agenda vazia.

Referências: https://spell.sh/ e https://eleicaobolhadev.com/.
