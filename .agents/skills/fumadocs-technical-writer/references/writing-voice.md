# Writing voice: sound like a colleague who knows the system

The goal is the same accuracy as before, delivered the way a good senior engineer explains something at the next desk. Docs that read like a manual get skimmed and abandoned. Docs that read like a person thinking alongside the reader get finished, and the reader remembers the *why*.

This file is mostly written around Vietnamese docs (the common case for this skill), but the principles carry over to English docs unchanged.

## Contents
- What good tech blogs do
- Voice rules (with the reasoning)
- Honesty guardrails
- Patterns that sound machine-written
- Before / after examples
- Register by doc type
- Self-check before saving

## What good tech blogs do

These patterns come from reading a range of Vietnamese engineering posts (Viblo articles on Redis and Kafka, from older "tổng quan" style overviews to recent practitioner write-ups). The older overview style is accurate but flat: third-person, "chúng ta sẽ tìm hiểu…", feature lists, almost no stance. The posts people actually finish share these habits:

- **They open with a problem the reader already has**, not a definition. A scenario, a failure, or a question comes first; the definition arrives once the reader wants it.
- **They talk to one person.** "Bạn", often "mình", short paragraphs, direct questions.
- **They ask the question the reader is about to ask**, then answer it ("Vậy nếu server tắt thì dữ liệu đi đâu?").
- **They use one good everyday analogy per hard concept** (a message board between waiters and cooks, a desk vs. a filing cabinet vs. a basement archive) and then map it back to the real terms.
- **They take a position.** "Mặc định mình sẽ chọn X, trừ khi…" and "khi nào *không* nên dùng" are what make a post feel written by someone who has used the thing.
- **They name the common misunderstanding or trap** instead of only describing the happy path.
- **They keep English technical terms as English** (cache, thread, event loop, failover, replica) because that is how Vietnamese engineers actually talk.
- **They end with something the reader can act on**, not a recap of what was just said.

Some popular posts also lean on things this skill should *not* copy: invented first-person war stories with precise metrics, hype words ("phi lý", "bá đạo", "thần thánh"), emoji and chat slang, and bold on every other phrase. Those hurt trust in documentation. See the guardrails below.

## Voice rules

**1. Start from the reader's problem.** First paragraph answers "why would I care?" in two or three sentences, using a situation the reader recognises. Why: a definition-first opening is correct but gives no reason to keep reading; a problem-first opening makes the definition feel like the answer to something.

**2. Pick a pronoun pair and hold it.** Default to *mình – bạn* (author speaks to reader). If the user's existing docs use *chúng ta*, *tôi*, or *tác giả*, match them. Never switch mid-doc, and keep the same choice across a series so parts feel like one voice. Use *mình* mainly for opinions and recommendations ("mình khuyên…"), not as decoration on every sentence.

**3. Write reasoning as prose, enumerations as lists.** "Why X over Y" is an argument; bullets chop it into assertions with no connective tissue. Reserve bullets and tables for things that really are parallel (config options, steps, comparisons). Why: the human feel mostly comes from "vì… nên…", "nhưng…", "trừ khi…", and those words die in bullet form.

**4. Anticipate questions.** Where a curious reader would stop and ask "ủa, thế thì…?", ask it for them and answer it. Use this as a seasoning, not a tic: once or twice per section at most.

**5. Use analogies carefully.** One per hard concept, taken from everyday Vietnamese life (quán ăn, kho hàng, bưu điện, hàng đợi ở siêu thị). Say where the analogy stops being true. Skip it for concepts that are already concrete; a forced metaphor is worse than none.

**6. Give a stance, with reasons.** For every "you can do A or B", say which one you'd pick by default and when you'd pick the other. Include a "khi nào không nên dùng" wherever misuse is plausible. Why: a doc that only lists options pushes the whole decision onto the reader, who came to the doc precisely because they lack the context to decide.

**7. Prefer the concrete.** A scenario, a command and its output, a small worked number beats an abstraction. Say what actually happens: "Redis chờ cho tới khi xong lệnh này, mọi client khác đứng đợi" is better than "có thể ảnh hưởng đến hiệu năng".

**8. Use the word the team would say in standup.** Keep *cache*, *thread*, *deploy*, *failover*, *consumer group*. Translate only where Vietnamese is what people genuinely say (*dữ liệu*, *máy chủ* when you want a plain-language register, *hàng đợi*). When you introduce a term that is not obvious, gloss it once in a clause, then use it freely.

**9. Vary rhythm.** Mix short and long sentences. Keep paragraphs to two to four sentences. A one-line paragraph is fine when it carries a real turn in the argument.

**10. Dose personality lightly.** A dry aside or a plain-spoken sentence once per section is plenty. No jokes in warnings, incident steps or runbooks. No emoji. No chat slang. The tone is a friendly, competent colleague, not a streamer.

## Honesty guardrails

The doc is published under the user's name, so anything that sounds like lived experience must really be theirs.

- **Do not invent personal anecdotes** ("năm 2018 mình làm ở một công ty e-commerce…", "mình từng setup cho hệ thống fintech…") or claims of years of experience.
- **Do not invent benchmarks, incident metrics, or customer stories.** Use numbers only when they are well-established facts (e.g. Redis Cluster has 16384 hash slots) or are clearly labelled as illustrative ("ví dụ: giả sử mỗi request mất 50 ms…"). If a real figure matters and you can't verify it, say what to measure instead.
- **Scenarios are hypothetical, and say so**: "Hình dung một đợt flash sale…", "Giả sử bạn có một service…". That keeps the narrative energy without false claims.
- **If the user supplies real experience** (an incident, a decision, a lesson), weave it in, in their voice. This is the best material a doc can have.

## Patterns that sound machine-written

Cut these on sight. They signal "generated" faster than anything else.

Vietnamese filler and clichés:
- "Trong thế giới công nghệ ngày nay / phát triển nhanh chóng…"
- "đóng vai trò quan trọng / then chốt", "giải pháp toàn diện / mạnh mẽ / tối ưu"
- "Hãy cùng khám phá / đi sâu vào…", "Điều đáng chú ý là…", "Không thể phủ nhận rằng…"
- "không chỉ… mà còn…" repeated every few lines
- Nominalised verbs: "thực hiện việc lưu trữ", "tiến hành triển khai", "nhằm mục đích đảm bảo". Say "lưu", "deploy", "để đảm bảo".
- Stacked passives ("được sử dụng để được lưu…"). Make the actor the subject: "Redis ghi…", "Sentinel sẽ promote…".
- Translated-from-English feel: "cung cấp khả năng để…", "làm cho nó có thể…".

English equivalents: "delve", "it's worth noting that", "seamless", "robust", "leverage", "in today's fast-paced world".

Structural tells:
- Every section has the identical shape (one intro line, three bullets, a mini-summary).
- Bullets that are full sentences of reasoning and should be a paragraph.
- A closing "Tóm lại…" that repeats the doc.
- Bold sprinkled on random phrases. Bold is for the one thing a skimming reader must not miss.
- Headings written as slogans. Prefer plain, searchable headings ("Redis lưu dữ liệu xuống đĩa như thế nào?").

## Before / after examples

**Opening**

Before:
> Redis persistence là cơ chế cho phép lưu trữ dữ liệu từ bộ nhớ xuống đĩa cứng nhằm đảm bảo tính toàn vẹn dữ liệu khi xảy ra sự cố. Redis hỗ trợ hai phương thức là RDB và AOF.

After:
> Redis giữ dữ liệu trong RAM, mà RAM thì mất điện là mất sạch. Vậy nếu server restart lúc 3 giờ sáng, dữ liệu của bạn đi đâu? Câu trả lời là persistence: Redis ghi dữ liệu xuống đĩa theo hai cách, RDB và AOF. Bài này giúp bạn chọn cách phù hợp với hệ thống của mình.

**Trade-off**

Before:
> AOF có ưu điểm là độ bền dữ liệu cao. Nhược điểm là kích thước file lớn và tốc độ khôi phục chậm hơn RDB.

After:
> AOF an toàn hơn vì ghi lại từng lệnh write, nhưng đổi lại file phình dần theo thời gian và restart lâu hơn do Redis phải "phát lại" toàn bộ. Nếu mất vài giây dữ liệu là không chấp nhận được (ví dụ đơn hàng), mình chọn AOF. Nếu Redis chỉ làm cache thì RDB là đủ, và nhẹ hơn nhiều.

**Warning**

Before:
> Lưu ý: Không nên sử dụng lệnh KEYS trong môi trường production.

After:
> Đừng chạy `KEYS *` trên production. Lệnh này duyệt toàn bộ key trong khi Redis chỉ có một thread xử lý lệnh, nên mọi client khác phải đứng chờ. Dùng `SCAN` để thay thế.

**Transition between sections**

Before:
> Phần tiếp theo sẽ trình bày về replication.

After:
> Đến đây bạn đã biết dữ liệu được ghi xuống đĩa thế nào. Còn một câu hỏi nữa: nếu cả con server chết hẳn thì sao? Đó là lúc replication vào việc.

## Register by doc type

The voice stays recognisably the same, but how much of it shows depends on what the reader is doing.

- **Explainer / architecture / design doc**: the fullest voice. Problem-first opening, reasoned trade-offs, stance, "khi nào không nên dùng". This is where analogies and anticipated questions pay off most.
- **Getting started / how-to**: warm and encouraging. Predict where people get stuck ("nếu thấy lỗi `ECONNREFUSED` thì gần như chắc chắn là Redis chưa chạy") and say what success looks like after each step.
- **API reference**: lean. Parameter tables and endpoint blocks stay terse and exact. Put the human voice in the intro, the "when to use this", and the gotcha callouts, not in the type tables.
- **Runbook / incident doc**: calm, imperative, short. Someone may be reading this at 3 a.m. under stress. Plain sentences, one action per step, zero humour, the *why* in a brief clause only when it prevents a mistake.

## Self-check before saving

1. Read the first paragraph. Does it start from a situation or question, or from a definition?
2. Pick any section. Is there at least one "vì…", "nhưng…", or "trừ khi…" explaining reasoning, or is it only assertions?
3. Search for the machine-written phrases above and rewrite each hit.
4. Look for invented anecdotes or unverifiable numbers. Remove or relabel them as hypothetical.
5. Is the pronoun pair consistent from top to bottom?
6. Would the last paragraph survive being deleted? If it only repeats the doc, replace it with a concrete next step or cut it.
