# Vocab Flow Usage

## 기본 원칙

- `단어장 후보 (...)`는 Review before translation 단계입니다. 밑줄에서 뽑힌 term candidates를 바로 번역하지 않고, 필요한 용어만 최종 단어장으로 보내기 위해 먼저 검토합니다.
- 단어장 후보는 색상별 밑줄 메뉴로 빠르게 만들 수 있습니다.
- 초록색을 이미 다른 용도로 쓴다면 노란색, 파란색, 보라색, 빨간색, 회색 밑줄 메뉴를 대신 쓰면 됩니다.
- 색상으로도 구분이 어렵다면 Zotero annotation tag `vocab`이 붙은 밑줄만 읽는 메뉴를 사용할 수 있습니다.
- `고급: 모든 밑줄에서 term candidates 만들기...`는 기존 밑줄을 한 번에 훑는 고급 경로이며, 독서용 밑줄까지 섞일 수 있습니다.
- 영한 뜻 채우기는 보조 기능입니다. 기본적으로 꺼져 있으며, `google-free`, OpenAI-compatible BYO API, Gemini BYO API, Claude/Anthropic BYO API provider를 직접 켠 경우에만 외부 번역 요청을 보냅니다.
- 현재 stable UX 결정은 번역 보조 기능을 메뉴 기반으로 유지하는 것입니다. 별도 settings pane은 provider 설정이 더 복잡해질 때 추가합니다.

## 권장 흐름

1. Zotero PDF reader에서 단어장 후보만 원하는 후보 색상으로 밑줄 표시합니다.
2. 라이브러리 item을 선택하고 우클릭합니다.
3. `Vocab Flow` -> 해당 색상의 `... 밑줄에서 term candidates 만들기...`를 실행합니다.
4. 생성된 `단어장 후보 (...)` 노트에서 `용어 후보 (Term candidate)`를 검토합니다.
5. 제외할 후보는 해당 row의 `저장 여부 (Keep?)` 칸을 `제외` 또는 `x`로 바꿉니다. 저장할 후보는 `저장` 그대로 둡니다.
6. item 또는 생성된 `단어장 후보 (...)` 노트를 우클릭하고 `Vocab Flow` -> `selected candidates로 단어장 만들기`를 실행합니다.
7. 생성된 `단어장 (...)` 노트의 `한국어 뜻 (Korean meaning)` 칸을 필요에 맞게 채웁니다.
8. 선택 사항: 번역 보조 provider를 켠 뒤 item 또는 생성된 `단어장 (...)` 노트에서 `Vocab Flow` -> `빈 Korean meanings 채우기...`를 실행하면 빈 뜻 칸만 채웁니다.

## 재실행 규칙

- 후보 생성은 같은 item 안의 기존 후보 노트를 갱신합니다.
- `제외`, `x` 등으로 바꾼 후보는 재실행해도 제외 상태로 유지됩니다. 이전 버전 노트와의 호환을 위해 `excluded`도 계속 인식합니다.
- 후보 생성은 item당 하나의 활성 후보 노트를 사용합니다. 다른 색상이나 전체 밑줄로 다시 생성하면 기존 후보 노트가 새 범위로 갱신됩니다.
- 후보를 최종 단어장으로 저장하면 후보 노트는 Trash로 이동하고 최종 단어장 노트만 남습니다.
- 저장할 후보가 30개 이상이면 최종 단어장 저장 전에 확인 창이 뜹니다. 취소하면 후보 노트와 최종 노트는 그대로 유지됩니다.
- 최종 단어장 재생성 시 기존 `한국어 뜻` 입력값은 보존됩니다.
- 번역 보조 기능도 기존 `한국어 뜻` 입력값은 덮어쓰지 않고 빈 칸만 채웁니다.
- 번역 보조 기능 실행 시 외부 서비스 전송 확인 창이 먼저 뜹니다. 빈 뜻이 30개 이상이면 대량 번역 확인 창도 추가로 뜹니다.

## 범위 선택

- 색상별 빠른 모드:
  - `초록 밑줄에서 term candidates 만들기...`
  - `노란 밑줄에서 term candidates 만들기...`
  - `파란 밑줄에서 term candidates 만들기...`
  - `보라 밑줄에서 term candidates 만들기...`
  - `빨간 밑줄에서 term candidates 만들기...`
  - `회색 밑줄에서 term candidates 만들기...`
  - 선택한 색상의 underline annotation만 후보 원천으로 사용합니다.
- 정확 모드: `vocab 태그 밑줄에서 term candidates 만들기...`
  - annotation tag가 `vocab`인 underline만 후보 원천으로 사용합니다.
  - 매번 태그를 입력해야 하는 부담이 있으므로, 색상 구분만으로 부족할 때 사용합니다.
- 고급: `고급: 모든 밑줄에서 term candidates 만들기...`
  - PDF의 모든 underline annotation을 후보 원천으로 사용합니다.
  - 독서용 문장 밑줄이 많은 논문에서는 후보가 과하게 늘 수 있습니다.

## 영한 뜻 채우기 보조 기능

기본값은 꺼짐입니다. 기본 상태에서 `빈 Korean meanings 채우기...`를 실행하면 안내 토스트만 뜨고 외부 요청은 보내지 않습니다.

부정확할 수 있는 무료 번역 보조 기능을 켜려면 item을 우클릭하고 `Vocab Flow` -> `부정확할 수 있는 무료 번역 보조 기능 켜기...`를 실행합니다. 확인 창에서 외부 전송 및 품질 한계 안내를 승인하면 이후 `빈 Korean meanings 채우기...`를 사용할 수 있습니다.

`google-free` 경로는 외부 요청 전에 현재 단어장 노트의 이미 채워진 뜻과 Vocab Flow의 무료 번역 캐시를 먼저 확인합니다. 캐시는 term-to-meaning 쌍과 짧은 실패 기록만 저장하며, 밑줄 문맥은 저장하지 않습니다. 캐시를 지우려면 `Vocab Flow` -> `무료 번역 캐시 비우기`를 실행합니다. 번역 보조 기능을 끄는 것만으로 캐시는 삭제되지 않습니다.

OpenAI-compatible BYO API를 쓰려면 `Vocab Flow` -> `OpenAI-compatible BYO API 설정...`을 실행합니다. endpoint URL, model 이름, API key를 입력한 뒤 밑줄 문맥 전송 여부를 선택합니다. 문맥 전송을 켜면 각 term과 함께 저장된 밑줄 문맥이 사용자가 설정한 외부 API로 전송됩니다. 문맥 전송을 끄면 term만 전송됩니다.

Gemini를 직접 쓰려면 `Vocab Flow` -> `Gemini BYO API 설정...`을 실행합니다. 기본 endpoint는 Gemini `generateContent` model base URL이며, model 이름과 API key를 입력합니다. 문맥 전송을 켜면 term과 저장된 밑줄 문맥이 Gemini API로 함께 전송됩니다.

Claude/Anthropic을 직접 쓰려면 `Vocab Flow` -> `Claude/Anthropic BYO API 설정...`을 실행합니다. 기본 endpoint는 Anthropic Messages API URL이며, Claude model 이름과 API key를 입력합니다. 문맥 전송을 켜면 term과 저장된 밑줄 문맥이 Anthropic API로 함께 전송됩니다.

Gemini, Claude, 다른 저가 모델을 한 화면에서 바꿔 쓰고 싶다면 직접 provider보다 OpenAI-compatible gateway가 더 편합니다. OpenRouter, LiteLLM proxy, 로컬 LLM proxy처럼 Chat Completions-compatible endpoint를 제공하는 서비스는 `OpenAI-compatible BYO API 설정...`으로 연결합니다.

`빈 Korean meanings 채우기...`는 부모 item을 선택해도 되고, 생성된 `단어장 (...)` 노트를 선택한 상태에서 실행해도 됩니다. 생성 note를 선택한 경우 플러그인이 자동으로 부모 item의 단어장으로 해석합니다.

다시 끄려면 `Vocab Flow` -> `번역 보조 기능 끄기`를 실행합니다. 꺼진 상태에서는 `빈 Korean meanings 채우기...` 명령이 안내 토스트만 띄우고 외부 요청을 보내지 않습니다.

주의:

- `google-free`는 API key가 필요 없는 부정확한 무료 provider입니다.
- 별도 비용은 없지만, 연구 용어 번역 품질, 안정성, 속도, 한도는 보장되지 않습니다.
- `google-free`는 같은 실행 안의 중복 term, 이전 성공 캐시, 같은 단어장 안의 수동 뜻을 재사용하고 최근 실패 term은 잠시 건너뜁니다. 그래도 term만 문맥 없이 전송하므로 OCR 오타, 다의어, 전문 용어를 안정적으로 판별하지 못합니다.
- 번역 요청 시 영어 단어/구가 외부 Google Translate 엔드포인트로 전송됩니다.
- BYO API의 API key는 이 머신의 Zotero preference에 저장됩니다.
- BYO API에서 문맥 전송을 켜면 미출판 논문 문장 일부가 외부 API로 전송될 수 있습니다. 연구실/출판/계약 정책상 문제가 있으면 문맥 전송을 끄고 term만 보내세요.
- 실패하거나 차단되면 빈 뜻 칸은 그대로 남습니다.
- provider가 빈칸을 번역하지 못하면 `번역 결과 없음`으로 알려주며, `빈 뜻 없음`으로 오해시키지 않습니다.
- 일부 단어만 실패하면 성공한 뜻은 먼저 저장되고 실패한 칸만 빈칸으로 남습니다.
- 수동으로 입력한 뜻은 자동 번역이 덮어쓰지 않습니다.
- 번역 보조 기능은 후보 검토를 대체하지 않습니다. 먼저 필요한 term candidates를 고른 뒤 최종 단어장에서만 실행하는 보조 단계입니다.
