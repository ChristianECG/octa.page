---
title: "Completing the IPoAC Stack: Why DoAC Had to Exist"
description: "The IPoAC protocol family had no naming layer for 35 years. DoAC fills the gap with the AA resource record, the Pigeon of Last Resort bootstrap procedure, retransmission semantics calibrated for multi-day transit, and DNSSEC key distribution via Trusted Courier Pigeon."
date: 2026-06-11
tags:
  - ietf
  - dns
  - ipoac
  - protocol-design
  - rfcs
status: published
pinned: false
---

In 2001, the Bergen Linux User Group sent actual ping packets over actual pigeons across actual Bergen, Norway. Round-trip time: 3,000 seconds. Packet loss: 55%. The experiment was a real implementation of RFC 1149, a document the IETF published in 1990 as an April Fools joke. The joke had become operational.

That experiment exposed a gap that nobody had bothered to document: the IPoAC protocol stack was incomplete. You could transmit IP datagrams over pigeons. You could not resolve a hostname.

I noticed this during a university networking course, years after the Bergen experiment. RFC 1149 came up as comic relief. I mentioned, in a remote session mid-pandemic, that there was an obvious hole in the stack. Nobody in the room understood what I was talking about. The comment went nowhere.

It came back to me earlier this year while reading the transcript of Root KSK Ceremony 61, held in April 2026. The ceremony is the process by which ICANN physically generates and signs the DNSSEC root key, a procedure involving Hardware Security Modules, auditors, Faraday cages, and multiple safety deposit boxes. It is, in its own way, as absurd as putting a DNS query on a pigeon. The connection clicked. I went back to the April Fools RFC family and wrote [draft-cruzgonzalez-ipoac-dns-00](https://datatracker.ietf.org/doc/draft-cruzgonzalez-ipoac-dns/).

## What the IPoAC stack looked like before DoAC

The family consists of three RFCs, each technically rigorous, each published on April 1st:

- **RFC 1149** (1990): IP datagrams on avian carriers. Defines the physical medium (pigeon), the maximum segment size (256 milligrams), and the basic forwarding model. No higher-layer services.
- **RFC 2549** (1999): IPoAC with Quality of Service. Extends RFC 1149 with QoS markings. Introduces the concept of Differentiated Services on a per-feather basis.
- **RFC 6214** (2011): Adaptation for IPv6. Addresses the expanded address space. Notes that IPv6 addresses are too long to fit comfortably on a standard leg band.

All three assume the destination address is already known. None of them address how a host on an avian-carrier network discovers that address. For twenty years, the implicit answer was: hardcode it.

That is not a protocol. That is a workaround.

## The gap

In conventional networking, DNS is so fundamental that it's easy to forget it's a separate layer. IP gives you reachability. DNS gives you names. You need both for a functional network. Remove DNS from any modern stack and you're back to editing `/etc/hosts` and distributing IP addresses out-of-band.

The IPoAC stack had exactly this problem. A host that wanted to reach `loft.example.com` had to already know the IP address of `loft.example.com`. If that address changed (pigeon renumbering events are, apparently, catastrophically disruptive), the operator had to manually update every message attached to every outbound Carrier. At scale, this is unmanageable. At any scale, it's inelegant.

DoAC closes this. It is to IPoAC what DNS is to IP: the naming layer the transport layer was always missing.

## Design decisions

### The AA resource record

DNS already has a record type for geographic location: LOC (RFC 1876). LOC encodes latitude, longitude, altitude, and precision. It was designed for documentation and geolocation, not for Carrier navigation.

DoAC needed something different. The AA (Avian Address) record encodes what a Carrier actually needs to find a Loft: coordinates for navigation, a preferred approach heading (to minimize headwind exposure and avoid raptor nesting sites), and a preferred cruising altitude band. LOC's precision encoding is irrelevant here; sub-meter accuracy matters less than knowing which side of the building to approach from.

The wire format is 12 bytes: two signed 32-bit integers for latitude and longitude in microdegrees (network byte order), a 16-bit unsigned heading in degrees magnetic north, an 8-bit altitude band, and 8 reserved bits.

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

Microdegrees give sub-meter precision globally. The Bergen Loft, for reference:

```
example.com.  86400  IN  AA  60.391263 5.322054 270 1
```

270 degrees: westerly approach. Altitude band 1: medium, 100–300m AGL. Bergen is on the coast. This is not a random example.

### The bootstrapping problem

Every name resolution system eventually hits a version of the same problem: to use the naming service, you must first locate the naming service. DNS resolves this with hardcoded root hints. DHCP resolves it with link-local broadcast. DoH (RFC 8484) resolves it by requiring the resolver's IP address to be configured out-of-band.

In IPoAC, the out-of-band channel is physical. You go to the Loft, you get a Carrier trained to its address. DoAC names this procedure (Manual Resolver Bootstrap, MRB) and formalizes the ongoing solution: the Pigeon of Last Resort (PoLR), a pre-trained Carrier with a hardcoded destination, maintained at every host as the entry point to the recursive resolution infrastructure.

The PoLR is operationally equivalent to the configured recursive resolver in `/etc/resolv.conf`, with the difference that misconfiguration results in a lost bird rather than a timeout.

Hosts SHOULD maintain at least two PoLR Carriers. A single PoLR is a single point of failure, which remains, as always, inadvisable.

### Retransmission

RFC 1035 recommends retransmitting after approximately 5 seconds. This value assumes the transport layer operates in milliseconds. IPoAC does not.

DoAC sets the minimum retransmission interval at 72 hours, with a seasonal jitter factor derived from average wind speed at the Carrier's latitude of origin. The retransmission limit is 1: dispatching multiple Carriers for the same query risks out-of-order delivery if one selects a more efficient flight path, producing query ID collisions that are difficult to debug and impossible to explain to management.

After 21 days without a response, the query is declared lost.

### DNSSEC

DNSSEC requires cryptographic signing of DNS records. The signing key must reach the signing Loft. In DoAC, that means physical transport by Trusted Courier Pigeon (TCP), an acronym collision the document notes and considers appropriate.

Two timing problems emerge immediately.

The first is key rollover. DNSSEC rollover involves distributing new keying material before the old key expires. In DoAC, distributing keying material takes days. Rollover windows that are measured in hours in conventional deployments must be measured in weeks. Rollover MUST be scheduled outside migration season (March–May, September–November in the Northern Hemisphere) when Carriers are liable to deliver keying material to the wrong Loft.

The second is RRSIG expiry. DNSSEC signatures have validity periods. If a signature expires while the Carrier carrying the signed response is still in flight, the response will be invalid on arrival. This condition, In-Flight Expiry (IFE), is a known operational hazard with no equivalent in conventional DNS deployments. The mitigation is straightforward: set RRSIG validity periods longer than your worst-case round-trip transit time.

The interaction between IFE and migration season is, as the document notes, considered particularly hazardous.

## What this is, technically

DoAC is a complete DNS transport specification for a constrained, high-latency, physically-mediated network. The constraints are real (payload size, retransmission behavior, timing assumptions) and the solutions are internally consistent. The record type is properly defined with a wire format and zone file presentation syntax. The IANA considerations request a real registry with a real policy (Standards Action for future altitude band assignments).

The humor is in the subject matter. The protocol engineering is not.

The draft is currently under consideration for publication as an Independent Submission RFC, targeting April 1, 2027, the only appropriate publication date for a document of this kind.
