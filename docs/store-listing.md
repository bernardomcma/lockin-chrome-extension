# Chrome Web Store listing

Everything the dashboard asks for, ready to paste. The extension's **name** and
**short description** are not here: the store reads those from `manifest.json`
and `_locales/`, so it localizes them on its own.

Before submitting, the two URLs below have to resolve - they point at `main`,
so `rewrite-v1` must be merged first.

Two things live outside this page and block publishing on their own, in the
dashboard's **Settings**, not on the item: a publisher contact email, and
clicking through the verification link it sends. Neither appears on the item
form, so the item can look complete and still refuse to publish.

### Product details

| Field | Value |
| --- | --- |
| Package title | comes from `_locales`; leave it |
| Package summary | comes from `_locales`; leave it |
| Description | the detailed description below |
| Category | Productivity |
| Editing language | English (en) is the default; add Portuguese (Brazil) and Spanish as extra listings for their descriptions) |

### Graphics

| Field | File |
| --- | --- |
| Store icon, 128x128 | `icons/icon-128.png` - already the right size, fills the canvas, corners transparent |
| Screenshots, 1280x800 | `store/lock-in-idle.png`, `-running.png`, `-blocked.png`, `-summary.png`, in that order |
| Small promo tile, 440x280 | `store/lock-in-tile-small.png` |
| Marquee promo tile, 1400x560 | `store/lock-in-tile-marquee.png` |
| Promo video | none |

Upload the screenshots under **localized** assets, in the current editing
language. That is the slot the dashboard requires; the global one can stay
empty, and is meant for images with no text in them.

The screenshots do have text - the interface in them is English - so the
English listing is where they belong. Adding a Portuguese or Spanish listing
later means giving each one its own screenshots: either these same four, or
translated ones, which the pipeline can produce because the harness takes
`&locale=pt_BR` and `&locale=es`.

The two promo tiles are optional - they are what Google uses if it ever
features the extension. There is no downside to having them.

### Extra fields

| Field | Value |
| --- | --- |
| Official URL | none - that field only accepts a domain verified in Google Search Console |
| Homepage URL | `https://github.com/bernardomcma/lockin-chrome-extension` |
| Support URL | `https://github.com/bernardomcma/lockin-chrome-extension/issues` |
| Mature content | No |
| Item support | on - the support URL goes to the issue tracker, which is the right place for it |
| Privacy policy URL (Privacy tab) | `https://github.com/bernardomcma/lockin-chrome-extension/blob/main/PRIVACY.md` |

## Single purpose

> Lock In blocks a user-defined list of websites for a timed focus session and
> reports how many times the user tried to open them.

Keep it to one sentence. Reviewers reject a "single purpose" that lists two.

## Permission justifications

**storage**

> Stores the user's list of blocked sites, the state of the current focus
> session, and the per-site attempt counts and session history shown on the
> summary screen. All of it stays in `chrome.storage.local` on the user's
> device.

**tabs**

> Reads the URL of a tab as it navigates so that a site on the user's own block
> list can be replaced with the extension's block page, and so the attempt can
> be counted. URLs are compared in memory against that list and are never
> stored or transmitted.

**Remote code**

> No. The extension executes no remote code. Every script, style, font, and
> image is bundled in the package, and it makes no network requests.

**alarms**

> Ends the focus session at the scheduled time even when the browser has
> unloaded the extension's service worker in the meantime. Without it a session
> would keep running past its end whenever Chrome suspended the worker.

Every declared permission gets its own required field - `alarms` included.

## Data usage

Check **nothing** in the data-types list, then certify all three statements:
the data is not sold to third parties, not used for purposes unrelated to the
single purpose, and not used to determine creditworthiness or for lending.

Lock In collects no data at all. Anything the user enters stays in
`chrome.storage.local` and never leaves the device.

## Detailed description - English (en)

> Block distracting websites, lock into deep work with a focus timer or Pomodoro cycles, and see every time you tried to sneak back.
>
> Most website blockers just say no and move on. Lock In keeps the receipt—counting every blocked attempt per site so at the end of a session you know whether you truly focused or reached for the same tab nine times in forty minutes.
>
> - Focus timer & Pomodoro mode: set a single session (15 to 90+ min) or run configurable Pomodoro rounds with automatic short and long breaks
> - Domain, path, or keyword blocking: shut down youtube.com/shorts while keeping lectures open, or block entire distracting sites
> - Attempt counter on every block: each detour is tallied per site and per day, and shown right on the block page
> - Focus stats & 14-day summary: track completed sessions, total focus time, streaks, and your top distractions
> - 9 languages built in: English, Português, Español, Français, Deutsch, Italiano, 日本語, 한국어, and 简体中文
>
> No account. No sign-up. No servers, no analytics, no telemetry—the extension makes zero network requests and asks for no permission to read page contents. Your block list and stats stay 100% local on your machine.
>
> Free and open source: github.com/bernardomcma/lockin-chrome-extension

## Detailed description - Português (Brasil) (pt-BR)

> Bloqueie sites que te distraem, entre em foco com o timer ou modo Pomodoro e veja exatamente quantas vezes você tentou escapar.
>
> A maioria dos bloqueadores apenas fecha a aba e esquece. O Lock In guarda o comprovante: cada tentativa de acesso é contada por site para você saber, no fim da sessão, se realmente produziu ou se tentou abrir a mesma rede social nove vezes em quarenta minutos.
>
> - Timer de foco e modo Pomodoro: escolha uma sessão única ou ciclos Pomodoro configuráveis (foco, pausa curta, pausa longa e rodadas) com desbloqueio automático nas pausas
> - Bloqueio por domínio, caminho ou palavra-chave: trave youtube.com/shorts deixando as aulas livres, ou bloqueie sites inteiros
> - Contador de tentativas: cada desvio é somado por site e exibido na página de bloqueio
> - Painel de estatísticas e histórico de 14 dias: acompanhe sessões concluídas, tempo focado, sequência de dias (streak) e os sites que mais te chamam
> - 9 idiomas no popup: Português, English, Español, Français, Deutsch, Italiano, 日本語, 한국어 e 简体中文
>
> Sem conta. Sem cadastro. Sem servidor, sem analytics, sem telemetria — a extensão não faz nenhuma requisição de rede e não lê o conteúdo das páginas que você visita. Tudo fica salvo localmente no seu navegador.
>
> Gratuito e de código aberto: github.com/bernardomcma/lockin-chrome-extension

## Detailed description - Español (es)

> Bloquea los sitios que te distraen, concéntrate con el temporizador o el modo Pomodoro y descubre cuántas veces intentaste volver.
>
> Casi todos los bloqueadores dicen no y se olvidan. Lock In guarda el recibo: cuenta cada intento por sitio para que al terminar la sesión sepas si realmente trabajaste o si intentaste abrir la misma pestaña nueve veces en cuarenta minutos.
>
> - Temporizador y modo Pomodoro: inicia una sesión única o ciclos Pomodoro configurables con pausas cortas, pausas largas y desbloqueo automático durante el descanso
> - Bloqueo por dominio, ruta o palabra clave: cierra youtube.com/shorts dejando las clases abiertas, o bloquea sitios completos
> - Contador de intentos: cada desvío se registra por sitio y se muestra en la página de bloqueo
> - Resumen y estadísticas de 14 días: consulta sesiones completadas, tiempo de enfoque, racha diaria y tus mayores distracciones
> - 9 idiomas integrados: Español, English, Português, Français, Deutsch, Italiano, 日本語, 한국어 y 简体中文
>
> Sin cuenta. Sin registro. Sin servidores, sin analítica ni telemetría: la extensión no realiza ninguna petición de red y tus listas y estadísticas permanecen 100 % locales en tu equipo.
>
> Gratuito y de código abierto: github.com/bernardomcma/lockin-chrome-extension

## Detailed description - Français (fr)

> Bloquez les sites qui vous distraient, travaillez en profondeur avec le minuteur ou le mode Pomodoro et comptez chaque tentative de retour.
>
> La plupart des bloqueurs se contentent de fermer l'onglet. Lock In garde la trace : chaque tentative d'accès est comptée par site pour savoir si vous êtes resté concentré ou si vous avez cédé neuf fois en quarante minutes.
>
> - Minuteur & mode Pomodoro : lancez une session unique ou des cycles Pomodoro configurables (focus, pause courte, pause longue) avec déverrouillage automatique pendant les pauses
> - Blocage par domaine, chemin ou mot-clé : bloquez youtube.com/shorts tout en gardant les cours accessibles
> - Compteur de tentatives : chaque détour est comptabilisé par site et affiché sur la page de blocage
> - Statistiques sur 14 jours : suivez vos sessions, votre temps total de concentration, votre série et vos principales distractions
> - 9 langues disponibles : Français, English, Português, Español, Deutsch, Italiano, 日本語, 한국어 et 简体中文
>
> Sans compte, sans serveur, sans télémétrie : aucune requête réseau, vos données restent 100 % locales.
>
> Gratuit et open source : github.com/bernardomcma/lockin-chrome-extension

## Detailed description - Deutsch (de)

> Sperre ablenkende Websites, arbeite fokussiert mit Timer oder Pomodoro-Zyklen und zähle jeden Versuch, zurückzukehren.
>
> Die meisten Blocker sagen einfach Nein und vergessen es. Lock In zählt jeden Zugriffsversuch pro Website mit — so weißt du am Ende, ob du wirklich im Fokus warst oder neunmal in vierzig Minuten denselben Tab öffnen wolltest.
>
> - Fokus-Timer & Pomodoro-Modus: einzelne Sessions oder konfigurierbare Pomodoro-Runden mit kurzen und langen Pausen (automatische Entsperrung in Pausen)
> - Domain-, Pfad- oder Stichwort-Sperre: sperre z. B. youtube.com/shorts, während Lernvideos offen bleiben
> - Versuchszähler auf der Sperrseite: zeigt dir direkt, wie oft du es heute versucht hast
> - 14-Tage-Übersicht & Statistiken: verfolge abgeschlossene Sessions, Fokuszeit, Serie und Top-Ablenkungen
> - 9 Sprachen integriert: Deutsch, English, Português, Español, Français, Italiano, 日本語, 한국어, 简体中文
>
> Kein Konto, kein Tracking, keine Netzwerkanfragen — alles bleibt lokal auf deinem Gerät.
>
> Kostenlos & Open Source: github.com/bernardomcma/lockin-chrome-extension

## Detailed description - Italiano (it)

> Blocca i siti che ti distraggono, concentrati con il timer o la modalità Pomodoro e conta ogni volta che provi a tornare.
>
> La maggior parte dei blocker dice no e basta. Lock In tiene il conto: registra ogni tentativo per sito così a fine sessione sai davvero come è andata.
>
> - Timer e modalità Pomodoro: sessioni singole o cicli Pomodoro personalizzabili con pause brevi, lunghe e sblocco automatico durante la pausa
> - Blocco per dominio, percorso o parola chiave: blocca youtube.com/shorts lasciando aperte le lezioni
> - Contatore dei tentativi: ogni distrazione viene contata per sito e mostrata nella pagina di blocco
> - Statistiche a 14 giorni: monitora sessioni completate, tempo di focus, serie e siti più tentati
> - 9 lingue integrate: Italiano, English, Português, Español, Français, Deutsch, 日本語, 한국어, 简体中文
>
> Nessun account, nessun tracciamento, nessuna richiesta di rete: tutto resta al 100% sul tuo dispositivo.
>
> Gratuito e open source: github.com/bernardomcma/lockin-chrome-extension

## Detailed description - 日本語 (ja)

> 集中を妨げるサイトをブロックし、タイマーまたはポモドーロで作業に没頭。開こうとした回数もすべて記録します。
>
> 多くのサイトブロッカーはただ遮断するだけですが、Lock In は「誘惑に負けそうになった回数」をサイトごとに記録します。
>
> - 集中タイマー＆ポモドーロモード：単発タイマーに加え、集中・小休憩・長休憩・ラウンド数を設定できるポモドーロを搭載（休憩中は自動でブロック解除）
> - ドメイン・パス・キーワード指定：たとえば youtube.com/shorts だけを防ぎ、講義動画は視聴可能にできます
> - ブロック回数の可視化：ブロック画面やポップアップでサイト別の試行回数を表示
> - 14日間の統計＆履歴：集中時間、完了セッション数、連続記録を確認可能
> - 9言語対応：日本語、English、Português、Español、Français、Deutsch、Italiano、한국어、简体中文
>
> アカウント不要・通信ゼロ・トラッキングなし。データはすべてローカルに保存されます。
>
> 無料・オープンソース：github.com/bernardomcma/lockin-chrome-extension

## Detailed description - 한국어 (ko)

> 방해되는 사이트를 차단하고 타이머 또는 뽀모도로 모드로 깊이 집중하세요. 다시 접속하려 한 횟수도 모두 기록됩니다.
>
> 대부분의 차단기는 막기만 하고 끝납니다. Lock In은 사이트별 접속 시도 횟수를 기록해 세션이 끝난 뒤 실제로 얼마나 집중했는지 보여줍니다.
>
> - 집중 타이머 & 뽀모도로 모드: 단일 타이머는 물론 집중/짧은 휴식/긴 휴식/라운드 설정이 가능한 뽀모도로 지원 (휴식 중 자동 잠금 해제)
> - 도메인, 경로, 키워드 차단: youtube.com/shorts만 막고 강의 영상은 열어둘 수 있습니다
> - 시도 횟수 카운터: 차단 페이지에서 오늘 몇 번 시도했는지 바로 확인
> - 14일 통계 & 기록: 완료한 세션, 누적 집중 시간, 연속 기록 확인
> - 9개 언어 지원: 한국어, English, Português, Español, Français, Deutsch, Italiano, 日本語, 简体中文
>
> 회원가입 없음, 서버 통신 없음, 추적 없음. 모든 데이터는 기기에 로컬로 저장됩니다.
>
> 무료 오픈소스: github.com/bernardomcma/lockin-chrome-extension

## Detailed description - 简体中文 (zh-CN)

> 屏蔽让你分心的网站，用倒计时或番茄钟进入深度专注，并记录每一次试图偷溜回去的次数。
>
> 大多数屏蔽插件只是拦截后就结束，而 Lock In 会替你记账：按网站统计每次拦截尝试，让你在专注结束后清楚自己到底专心了多久。
>
> - 专注计时器 & 番茄钟模式：支持单次定时，也支持可自定义专注/短休息/长休息/轮数的番茄钟（休息期间自动解锁网站）
> - 域名、路径或关键词屏蔽：可精准屏蔽 youtube.com/shorts 而保留课程视频
> - 拦截次数统计：在拦截页面与弹窗中实时显示各网站的尝试次数
> - 14天数据统计与历史：查看完成次数、累计专注时长、连续天数与最常分心网站
> - 内置 9 种语言：简体中文、English、Português、Español、Français、Deutsch、Italiano、日本語、한국어
>
> 无需账号，无服务器请求，无任何追踪与遥测，所有数据均 100% 保存在本地。
>
> 免费开源：github.com/bernardomcma/lockin-chrome-extension
