[![Docker Image CI](https://github.com/pbederke/PolPaL/actions/workflows/docker-image.yml/badge.svg?branch=main)](https://github.com/pbederke/PolPaL/actions/workflows/docker-image.yml)
[![Dependabot Updates](https://github.com/pbederke/PolPaL/actions/workflows/dependabot/dependabot-updates/badge.svg?branch=main)](https://github.com/pbederke/PolPaL/actions/workflows/dependabot/dependabot-updates)
[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)

# Political Party Links (PolPaL)

PolPaL (Political Party Links) is a linkage key infrastructure project for the social sciences. PolPaL provides a unified linkage platform for identifying political entities across social science datasets

PolPaL, inspired by Party Facts, provides new linkage features, broader metadata, and extended coverage. It offers researchers a comprehensive, consistent, and long-term foundation for studying political entities globally and historically.

## Relation to Party Facts

Party Facts (Döring & Regel 2019) has made invaluable contributions to linking parties across a wide variety of datasets. We build upon the Party Facts’ core data model (Bederke, Döring, & Regel, 2023) and extend it in several important ways.

First, we acknowledge that core parties, or PolPaL entities, are oftentimes linked to each other in meaningful ways, e.g., when they are part of the same alliance or when one is the predecessor or successor of another party. With PolPaL, users can discover these links between parties without having to conduct additional research themselves and take them into account when merging according to their use case.

Second, we allow PolPaL entities to be linked to several countries and to parties from other countries. This will facilitate, for example, the study of parties’ historical legacies if they were active during regime changes such as German reunification and Irish independence.

Third, we add a temporal dimension to mitigate issues with differences in the way in which datasets treat party splits and mergers. For example, one dataset might provide information on the German PDS/Left, treating it as one party, while another will provide information on the PDS and the Left separately, treating the Left as the successor of the PDS. In PolPaL, dataset observations for political parties can now be associated with multiple PolPaL IDs across different points in time. In all cases, links will be unique for specific points in time.

We rely on Party Facts’ core parties as a starting point. For the initial list of PolPaL entities, the PolPaL ID is identical to the Party Facts ID. Please note that under special circumstances, it might be that we split one Party Facts core party into several PolPaL entities. Moreover, we integrated Party Facts as an external dataset, allowing users to easily link PolPaL entities back to Party Facts core parties.

- [partyfacts.herokuapp.com](https://partyfacts.herokuapp.com/)
- Döring, H., & Regel, S. (2019). Party Facts: A database of political parties worldwide. *Party Politics*, 25(2), 97–109. [https://doi.org/10.1177/1354068818820671](https://doi.org/10.1177/1354068818820671)
- Bederke, Paul; Döring, Holger; Regel, Sven (2023). "Party Facts – Version 2023". Harvard Dataverse, V1. [https://doi.org/10.7910/DVN/TJINLQ](https://doi.org/10.7910/DVN/TJINLQ)

## Relation to MEDem

Monitoring Electoral Democracy (MEDem) is a new, evolving European research infrastructure that will enable better, more comprehensive, and highly innovative comparative democracy research by bringing together and linking data sources on the functioning of democracies.

We design PolPaL in such a way that its future integration into MEDem is possible, both on a technical as well as on a conceptual level. By integrating PoLPaL into the MEDem infrastructure, we increase PolPaL’s sustainability and FAIRness.

- [medem.eu/](https://www.medem.eu/)

## Getting Started

To run PolPaL locally, see the [Initial setup guide](docs/README_INITIAL_SETUP.md). For development guidelines, see the [Development guide](docs/README_DEVELOPMENT.md).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.4.3 (App Router) |
| Language | TypeScript 6.0.3 |
| Database | PostgreSQL 17 |
| DB Client | pg 8.16.3 |
| ORM | Prisma 7.10 (driver adapter: `@prisma/adapter-pg`) |
| Containerisation | Docker (Node 24 Alpine) + Docker Compose |
| UI | React 19.2.8, Tailwind CSS 4.3, shadcn/ui, Radix UI, Lucide icons |
| Charts | Recharts 3.10 |
| Auth | JWT (`jose` 6.2), bcrypt 6, HTTP-only cookies |
| Validation | Zod 4.6 |
| Email | Nodemailer 10.3 |
| Logging | Pino 10.3 |
| Rate Limiting | rate-limiter-flexible 11.2 |
| CSV handling | PapaParse 5.5.4 |
| Markdown | react-markdown 10, react-syntax-highlighter 16 |
| Testing | Vitest 5.0 |
| Linting | ESLint 9 |
| Misc | disposable-email-detector, country-flag-icons |

Full details: [docs/README_TECH_STACK](docs/README_TECH_STACK.md)

---

## Responsible Persons / Maintainers

- Primary maintainer: [@pbederke](https://github.com/pbederke) (repository owner)
- Additional maintainer: [LeaKaftan](https://github.com/LeaKaftan)

---

## Quick links

**Pages**

- Repository: [pbederke/PolPaL](https://github.com/pbederke/PolPaL)
- Issues: [https://github.com/pbederke/PolPaL/issues](https://github.com/pbederke/PolPaL/issues)
- CI (Docker build): [https://github.com/pbederke/PolPaL/actions](https://github.com/pbederke/PolPaL/actions)
- Website: [https://polpal-test.cleverapps.io/](https://polpal-test.cleverapps.io/)

**Documentation**

- [Project structure](docs/README_STRUCTURE.md)
- [Tech stack](docs/README_TECH_STACK.md)
- [Initial setup](docs/README_INITIAL_SETUP.md)
- [Development guide](docs/README_DEVELOPMENT.md)

---

## License

Distributed under the [GNU Affero General Public License v3.0](LICENSE).

---

## How to cite

| What you used | How to cite it |
|---|---|
| PolPaL software in this repository | Use the machine-readable citation in [`CITATION.cff`](CITATION.cff). |
| Archived PolPaL software | Use the citation provided by its data-archive record. |
| PolPaL data | Use the citation provided at [polpal.org](https://polpal.org). |
| Archived PolPaL data | Use the citation provided by its data-archive record. |