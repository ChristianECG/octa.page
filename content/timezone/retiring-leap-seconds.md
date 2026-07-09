---
title: "Leap Seconds After 2035: What Was Actually Decided, and the Proposals on the Table"
description: "The 2022 CGPM resolution doesn't abolish leap seconds — it raises the tolerated UT1−UTC difference, with the practical effect that insertions cease. A survey of replacement proposals (leap minute, Levine's rate adjustments, BIPM's Continuous UTC group) plus a 4-year scheduled-block variant."
date: 2026-07-08
tags:
  - utc
  - ut1
  - leap-seconds
  - ntp
  - iers
  - timekeeping
status: published
---

In November 2022, the 27th General Conference on Weights and Measures (CGPM, Resolution 4) decided that the maximum allowed value of the difference UT1−UTC will be increased by or before 2035. Read that carefully: it does not abolish leap seconds, and it does not break the connection between UTC and UT1. It raises a tolerance. The practical effect is that leap second insertions cease — but the resolution's second half is just as important: the CIPM is tasked with proposing a new maximum value that ensures UTC remains usable for at least a century, for review at the 28th CGPM in 2026. The replacement mechanism is deliberately left as future work.

A detail that gives the decision texture: the 2035 date was a compromise. Russia pushed to extend it to 2040 because GLONASS, unlike GPS, incorporates leap seconds into its signal structure — retiring them means reengineering the constellation's timekeeping.

## Why leap seconds exist

UTC counts SI seconds from atomic clocks. UT1 *is* the Earth's rotation, expressed as a timescale. UTC was not designed to track the planet as a primary goal — it combines atomic time with occasional one-second adjustments to remain practically close to UT1. The Earth is not a stable oscillator: tidal friction with the Moon, earthquakes, solar activity, and core–mantle dynamics all perturb the rotation. Historically, the divergence has required roughly one leap second every 1–3 years, though the rotation is irregular and cannot be predicted over long horizons.

The IERS (International Earth Rotation and Reference Systems Service, whose Earth Orientation Center operates at the Paris Observatory) announces an insertion whenever |UT1−UTC| approaches the tolerated bound (0.9 s) — with less than six months of notice, via Bulletin C. Since 1972 there have been 27 leap seconds, all positive, leaving UTC 37 seconds behind TAI.

## Why they cause more problems than they solve

A positive leap second produces the timestamp `23:59:60`, which POSIX time cannot represent. Every system handles it differently, because there is no standard handling:

| Strategy | Who | Behavior |
|---|---|---|
| Step | Default NTP / kernel | Repeat or freeze a second at midnight UTC |
| Smear | Google, AWS, others | Stretch the second across a window — but each operator picks its own window and curve |
| Ignore | Unsynced systems | Drift until the next NTP correction |

Smearing is an operational convention, not a standards-defined behavior: Google's 24-hour linear smear and other operators' variants are mutually incompatible by design. Two NTP-synchronized systems using different strategies disagree with each other for the duration of the event.

The insertion lands first on the Stratum 1 servers of the NTP pool — they receive the leap indicator from the reference clocks (atomic/GNSS) and propagate it downward. The blast radius is asymmetric: critical infrastructure (banking, trading, telecom, distributed systems with strict ordering requirements) is where leap seconds hurt. The application layer of everyday non-critical products mostly never notices — it simply trusts whatever time NTP delivers.

And then there is the negative leap second. It has never been applied. The Earth's rotation has been accelerating in recent years, making it plausible for the first time — and it would force every system to skip from `23:59:58` to `00:00:00`. It would exercise code paths that have never run in production at global scale, which makes its operational risk genuinely difficult to quantify: some software would fail, some is prepared, much of it has never been tested against the case at all.

## The proposals on the table

No formal standard exists yet for what happens after 2035, and standardization work is unlikely to conclude before the late 2020s. But the design space is not empty:

- **The leap minute.** Let the drift accumulate until it amounts to a full minute — a block spanning decades. Predictable, plannable, and it defers the operational event to a future generation. Its critics note it concentrates all the risk of today's leap second into one larger, rarer, even-less-rehearsed event.
- **Algorithmic rate adjustments (Levine, NIST, 2024).** Judah Levine's paper *"A Proposal to Change the Leap-Second Adjustments to UTC"* proposes replacing discrete jumps with an algorithmic rate-adjustment (steering) method — corrections distributed over time instead of discontinuities. In one of its formulations, adjustments on the order of −13 s per decade starting in 2035.
- **The BIPM Task Group on Continuous UTC** has been working on exactly this family of solutions, feeding into the CIPM proposal due for the 2026 CGPM.

What follows is a variant in that same family — periodic, fixed-date, rate-based — contributed as a point in the design space, not as a novelty. Its distinguishing choices are the block length, the notice period, and where in the stack the adjustment lives.

## A variant: scheduled 4-year correction blocks

The current mechanism mixes two problems that deserve separate answers: **how much** to correct (a geophysical measurement — the IERS's job) and **how** to apply the correction (an engineering standard — currently left to each operator's improvisation). The variant separates them.

**1. Accumulate corrections in fixed 4-year blocks, aligned to leap years.** At the close of each block, the IERS publishes the net correction accumulated during it — positive or negative — and the IANA tz database and downstream standards carry the schedule.

**2. Two years of notice, always.** The correction published at the close of a block takes effect two years later and is applied across the following block:

| Announced | Covers drift from | Applied during |
|---|---|---|
| 2036-01-01 | 2032–2036 | 2038–2041 |
| 2040-01-01 | 2036–2040 | 2042–2045 |
| 2044-01-01 | 2040–2044 | 2046–2049 |

Each application window starts where the previous one ends — announcements and applications interleave, but two corrections are never active at once.

Why 4 years and not 2, 5, or 8: it aligns with the civil leap-year cycle (a familiar planning rhythm), it typically accumulates only 2–3 seconds per block (keeping the correction rate negligible and the UT1 bound single-digit), and it halves the number of standardization events versus a 2-year cycle without stretching the bound the way an 8-year cycle would.

**3. One mandatory application method: proportional tick-rate adjustment.** During the application block, the UTC second is lengthened or shortened by the proportional fraction of the total correction. Spreading 3 seconds across 4 years is a rate offset of ~2.4×10⁻⁸ — orders of magnitude below the crystal drift NTP already disciplines on every machine, every day.

**4. The adjustment lives at the top of the stack, not the bottom.** This is the architectural decision that makes it a standard rather than a smear: the rate adjustment is part of the disseminated UTC timescale itself. The reference laboratories and GNSS systems broadcast already-adjusted time; NTP Stratum 1, PTP grandmasters, kernels, and applications receive plain UTC and implement nothing. Today's smearing is the exact inverse — applied downstream, per operator, each with its own window and curve.

That is also the answer to the obvious objection, *"this is just a permanent leap smear"*:

| | Today's smear | This variant |
|---|---|---|
| Who decides the curve | Each operator | The standard |
| Where it's applied | Downstream (NTP service, kernel) | At the timescale source |
| Window | Hours around the event, operator-specific | The full block, fixed by schedule |
| Interoperability | Two synced systems can disagree | One timescale, by construction |

### The bound, shown

The claim is that |UTC−UT1| stays within roughly ±10 seconds. It should not have to be taken on faith:

```
assume a sustained high drift rate ≈ 0.7 s/year
(historically, one leap second every 1–3 years ⇒ 0.33–1.0 s/year)

accumulation window:   4 y × 0.7 ≈ 2.8 s
notice period:         2 y × 0.7 ≈ 1.4 s
during application:    4 y × 0.7 ≈ 2.8 s   (new drift, corrected next cycle)

worst-case |UTC − UT1| ≈ 2.8 + 1.4 + 2.8 ≈ 7 s
```

Roughly ±7 s in the sustained worst case, ~±10 s with margin for the rotation doing something the model didn't expect. Compare the trade-offs:

| System | Max \|UTC−UT1\| | Notice | Correction |
|---|---|---|---|
| Today | 0.9 s | < 6 months | discrete leap second |
| Leap minute | ~60 s | decades | discrete leap minute |
| Levine-style rate adjustment | model-dependent | fixed dates | periodic rate steering |
| 4-year blocks (this variant) | ~10 s | 2 years, always | continuous rate adjustment |

### The trade-off, explicitly

The price is the bound: ±10 s instead of today's ±0.9 s. What it buys is predictability, a permanent 2-year planning horizon, and one correction mechanism instead of N incompatible ones. And it makes explicit the interpretation the 2022 resolution already gestures at — this part is opinion, not fact: UTC stops chasing the Earth's rotation, because tracking the planet is UT1's job. UTC becomes what it has been in practice all along — the machines' working timescale.

The astronomers will keep debating the long-term relationship between the two scales. Every proposal above lets that debate happen on a multi-year horizon, without a six-month fuse attached to every second.
