---
title: "My First Internet Draft: DNS over Avian Carriers"
description: "Notes on submitting draft-cruzgonzalez-ipoac-dns-00 to the IETF: what DoAC specifies, the AA resource record wire format, the Pigeon of Last Resort bootstrap problem, DNSSEC over Trusted Courier Pigeon, and the path to publication as an April Fools RFC."
date: 2026-06-09
tags:
  - ietf
  - dns
  - ipoac
  - rfcs
status: published
pinned: true
---

I published my first Internet-Draft to the IETF Datatracker: [draft-cruzgonzalez-ipoac-dns-00](https://datatracker.ietf.org/doc/draft-cruzgonzalez-ipoac-dns/). It specifies DNS over Avian Carriers (DoAC) — hostname resolution for networks operating over pigeon-based transport. I've contacted the Independent Submissions Editor to target publication as RFC on April 1, 2027.

## What's an Internet-Draft

An Internet-Draft (I-D) is a working document in the IETF standards process. Anyone can submit one. It expires after 6 months if not renewed. It's not an RFC — but it's the required first step to become one.

RFCs have different publication streams. Most protocol standards go through IETF Working Groups. The **Independent Submissions** stream is for documents outside any WG's scope, reviewed and published by the Independent Submissions Editor (ISE). That's the correct path for April Fools RFCs.

## The April Fools RFC tradition

The IETF has published humor RFCs every April 1st for decades. They are technically rigorous, properly formatted, and go through the same editorial process as any other RFC. The IPoAC family is the canonical example:

- **RFC 1149** (1990) — IP over Avian Carriers
- **RFC 2549** (1999) — IPoAC with Quality of Service
- **RFC 6214** (2011) — Adaptation of RFC 1149 for IPv6

RFC 1149 was actually [implemented in Bergen, Norway in 2001](https://en.wikipedia.org/wiki/IP_over_Avian_Carriers#Real-life_implementation) by the Bergen Linux User Group. The example Loft in DoAC is located at Bergen's coordinates (60.391263, 5.322054). This is not a coincidence.

## What DoAC specifies

DoAC closes the gap in the IPoAC protocol stack: prior work defined how to transmit IP datagrams over pigeons, but never addressed how a host on such a network resolves a hostname.

**New resource record: AA (Avian Address)**

```
                 1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           LATITUDE                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           LONGITUDE                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|             HEADING           |   ALT-BAND    |   (reserved)  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

LATITUDE and LONGITUDE are signed 32-bit big-endian integers in microdegrees (degrees × 10⁶). Zone file presentation uses decimal degrees:

```
example.com.  86400  IN  AA  60.391263 5.322054 270 1
```

**The Pigeon-Before-Egg Problem**

To dispatch a Carrier to resolve a hostname, you first need the IP address of the resolver's Loft. If that address is in DNS, you have a circular dependency. DoAC resolves this with the **Pigeon of Last Resort (PoLR)**: a pre-trained Carrier whose destination is hardcoded at provisioning time, analogous to a resolver of last resort. Hosts SHOULD maintain at least two.

**Retransmission**

RFC 1035 recommends retransmitting unanswered queries after ~5 seconds. DoAC implementations MUST NOT retransmit until 72 hours have elapsed. The retransmission limit is 1. After 21 days without a response, the query MUST be declared lost.

**DNSSEC**

Zone Signing Keys are physically transported by Trusted Courier Pigeon (TCP — the acronym collision is noted and considered appropriate). Key rollover MUST be scheduled outside migration season. Signatures that expire while a Carrier is in flight constitute **In-Flight Expiry (IFE)**.

**Security considerations** include: Hawk-in-the-Middle (HitM) attacks, Denial of Flight (DoF), pigeon spoofing via adversarial dye application, replay attacks via taxidermied Carrier, and the Covert Feather Channel — a side channel encoded in feather arrangement that requires a licensed ornithologist to detect.

## The submission process

The draft is authored in RFC XML v3 format (xml2rfc). The toolchain:

```bash
# Validate before submitting
idnits draft-cruzgonzalez-ipoac-dns-00.xml

# Submit at
# https://datatracker.ietf.org/submit/
```

The submission flow: upload XML → Datatracker generates TXT and HTML → confirm via email → draft is live. The only warning idnits produced was non-ASCII characters (×, −, –) used intentionally in the wire format diagrams. Zero errors, zero flaws.

After submission, I emailed `rfc-ise@rfc-editor.org` directly — the ISE doesn't find your draft on their own. The email referenced the Datatracker URL, noted the April Fools context, and requested an April 1, 2027 publication date.

## What's next

The ISE will acknowledge, possibly assign an external reviewer, and eventually forward to IESG for conflict review (~4 weeks). If no WG objects, the RFC Editor processes it and coordinates the publication date. AUTH48 — author approval of the final text — happens in the final stretch.

The draft expires 2026-12-10. If the process extends past that, a -01 refresh is required.
