# Portfolio and Demo Improvement Backlog

This backlog converts the earlier conceptual plan and user feedback into actionable improvements for the portfolio site and demo application. Each task links back to UX or design best‑practice sources (see citations). The tasks are grouped by theme.

## Navigation & Information Architecture

- **Restructure top navigation** – Update the global navigation to use simple, two‑word labels and limit the number of items to around five: _Home, About, Projects, Writing, Contact_. Keeping top‑level navigation short and simple helps visitors find what they need quickly[\[1\]](https://www.airtightdesign.com/blog/best-website-navigation-practices/#:~:text=3,short%20and%20simple), and research shows that well‑structured navigation increases engagement and conversions[\[2\]](https://www.airtightdesign.com/blog/best-website-navigation-practices/#:~:text=Well). Implement this in the site layout component; also include a sticky header so the menu remains visible when scrolling[\[3\]](https://www.airtightdesign.com/blog/best-website-navigation-practices/#:~:text=Sticky%20top%20navigation%20menus%20stay,friendly%20and%20always%20within%20reach).
- **Add a header CTA** – Include a call‑to‑action (e.g., “Get in touch” or “Start a project”) in the header so that visitors can act from anywhere on the site. Best‑practice advice suggests that placing a CTA in the header makes it easier for users to take action[\[4\]](https://www.airtightdesign.com/blog/best-website-navigation-practices/#:~:text=7.%20Add%20a%20call,to%20your%20website%20header).
- **Ensure mobile‑friendly navigation** – Review the navigation on small screens and adjust for usability. Limit the number of menu items and use clear labels so that the top menu stays usable on phones and tablets[\[5\]](https://www.airtightdesign.com/blog/best-website-navigation-practices/#:~:text=frustration.%20Keep%20your%20top,items%20in%20your%20main%20menu)[\[6\]](https://www.airtightdesign.com/blog/best-website-navigation-practices/#:~:text=9,more%20of%20your%20website%20traffic).

## Projects Section

- **Create a projects index page** – Replace the single flagship project page with an index page that lists multiple projects using cards or tiles. Each card should show a project title, a short description, and a link to a detailed case study. Use dynamic routing (e.g., /projects/\[slug\]) so that additional projects can be added easily.
- **Support multiple project entries** – Define a data structure or markdown front‑matter format for each project (title, problem, thesis, architecture, screenshots, metrics, etc.). Generate pages dynamically so future projects (for example, Agent‑Managed Acquisition or AI‑Native Product Build) can be added without rewriting code.
- **Add navigation between projects** – Within a project page, provide “previous/next project” links or breadcrumbs so visitors can easily browse through multiple case studies.

## About Page Expansion

- **Expand competencies and capabilities section** – Add an “Expertise” subsection to the About page listing competencies beyond AI‑driven revenue systems. For example: product strategy, growth & marketing, technical leadership, subscription economics, data governance, AI adoption, cross‑functional team management, and advisory work. Use bullet lists or cards to make the content skimmable.
- **Add a professional timeline** – Include a simple timeline or vertical list of key roles and achievements to provide visitors with context about your career trajectory and credibility.
- **Highlight values and working style** – Incorporate a brief section on your principles (e.g., system thinking, economic orientation, AI pragmatism) and how you approach product and growth challenges.
- **Include a “Work with me” CTA** – Encourage outreach by adding a call‑to‑action at the end of the About page (e.g., “Interested in collaboration? Let’s connect”).

## Demo App UX & Visual Improvements

### Assumptions & Simulation

- **Add an assumptions panel** – Create a clearly labeled panel explaining the dataset and scoring assumptions (e.g., segment distribution, interest weights, change type weights). Allow users to adjust assumptions via sliders or input fields and immediately see how revenue estimates change. Making assumptions explicit improves transparency and helps users understand the system.
- **Improve onboarding** – Provide a brief onboarding walkthrough for the demo that explains how entity deltas, interest graphs and audience segments combine to create campaign candidates. Use tooltips or a short tutorial overlay on first visit.

### Event Flow & System Visualization

- **Visualize event flow** – Implement an interactive diagram or flowchart showing how a change detected on an entity (delta) flows through the interest graph, audience layer and merge engine to produce a campaign. Use simple nodes and arrows instead of complex charts, following data‑visualization advice to avoid unnecessary backgrounds, borders and effects[\[7\]](https://givegoodux.com/simplify-ui-data-visualizations-7-simple-steps/#:~:text=1). The diagram should help users quickly grasp the system without cognitive overload; design guidelines note that “less is more” in data visualizations[\[8\]](https://givegoodux.com/simplify-ui-data-visualizations-7-simple-steps/#:~:text=%5BImage%2025%3A%2008,guides).
- **Highlight key leverage points** – Add a breakdown of the priority score showing contributions from interest score, segment value, change type, and recency. Display this as a waterfall or stacked bar chart. Emphasize the most impactful factors using subdued colours and clear labels, per best‑practice advice to reduce colour count and remove redundant labels[\[7\]](https://givegoodux.com/simplify-ui-data-visualizations-7-simple-steps/#:~:text=1).
- **Show end‑to‑end user journey** – Create a narrative section where visitors can follow a single campaign candidate from detection through to the generated email and landing page. This story should illustrate the continuity of the experience and highlight the commercial opportunity.

### Outcome & Metrics Visualization

- **Use charts for metrics** – Replace static KPI cards with interactive charts that communicate open rates, click rates, conversion rates and estimated revenue. For example, use bar or funnel charts to show drop‑offs at each stage, or a line chart to show how metrics change across runs. Keep charts clean: remove unnecessary backgrounds or 3D effects and highlight the most important data[\[7\]](https://givegoodux.com/simplify-ui-data-visualizations-7-simple-steps/#:~:text=1).
- **Add segment breakdowns** – Visualize how different user segments (e.g., Free, Trial, Lapsed, Active) contribute to conversion and revenue. A grouped bar chart or pie chart could be used to compare segments. Again, follow the principle of simplifying visuals to aid fast comprehension[\[8\]](https://givegoodux.com/simplify-ui-data-visualizations-7-simple-steps/#:~:text=%5BImage%2025%3A%2008,guides).
- **Implement filtering and sorting** – Improve the campaign table by adding filters for segment, priority score range, or change type. Allow sorting on columns (user, score, segment). Highlight high‑priority campaigns with subtle colour tags instead of heavy borders or backgrounds, aligning with minimalist design guidelines[\[7\]](https://givegoodux.com/simplify-ui-data-visualizations-7-simple-steps/#:~:text=1).

### Interactive Sandbox Features

- **Trigger new deltas manually** – Provide a “Simulate new event” button that inserts a new entity delta into the database and immediately updates the dashboard. This interactive feature will help demonstrate how the system responds in real time.
- **Run scoring model on demand** – Let users run the merge and scoring engine manually and view intermediate results. Show the sorted list of candidates and allow users to select one to view details.
- **Generate content in‑app** – Enable the app to call the OpenAI API directly from the browser for demo purposes (with fallback to static templates). Provide a “Regenerate copy” button on campaign pages so visitors can see how different prompts produce different messages.

## Scoring & Messaging Customisation

The next step in evolving the demo toward a fully fledged SaaS product is giving users control over how scores and messages are constructed and interpreted. Weighted scoring models often benefit from **interactive adjustment tools**: UX guidance suggests using sliders or spin‑buttons to let users allocate weight across multiple factors; when one value changes, the others should adjust automatically to keep the total constant[\[9\]](https://ux.stackexchange.com/questions/38434/how-to-present-weighted-values#:~:text=Often%2C%20role,points%20between%20the%20different%20skills). Lock buttons can also prevent specific weights from changing while others adjust[\[10\]](https://ux.stackexchange.com/questions/38434/how-to-present-weighted-values#:~:text=2). Applying these principles will make the scoring system more transparent and user friendly.

- **Expose scoring weights and segment values** – Add a **scoring configuration panel** where users can view and adjust the relative importance of interest score, recency, segment value and change significance. Use interactive sliders or numeric inputs that automatically rebalance other factors when one is changed, optionally with a lock toggle[\[9\]](https://ux.stackexchange.com/questions/38434/how-to-present-weighted-values#:~:text=Often%2C%20role,points%20between%20the%20different%20skills)[\[10\]](https://ux.stackexchange.com/questions/38434/how-to-present-weighted-values#:~:text=2). Show tooltips explaining what each factor means and display the updated formula so users understand the effect of their changes.
- **Make segments modifiable** – Allow users to edit segment categories (Free, Trial, Lapsed, Active) and assign custom values (e.g., 0–1 scale) instead of hard‑coding them. Provide sensible defaults but let visitors experiment with different segment weights. Display how the adjusted segments influence priority rankings and conversion models.
- **Create a messaging copy editor** – Build a **message‑editing interface** where users can modify the base prompts that feed the AI generation and preview the resulting email and landing page copy. Present examples of generated messages for different change types and segments so users see how copy adapts. Include a simple A/B testing capability to compare two versions side by side.
- **Provide robust SaaS‑like features** – Improve the demo’s impression of being a mature product by adding settings pages, user authentication, persistent storage of scoring and messaging configurations, and multi‑tenant awareness (e.g., separate datasets per account). These features will help visitors imagine deploying the system in a real business context.

## Project 2 – Agent‑Managed Paid Acquisition System

The second flagship project will demonstrate how agents can automate paid advertising. The system should feel as integrated and polished as the lifecycle engine, with clear architecture and performance dashboards. Treat it as another case study in the Projects section.

- **Create a new project entry and case study** – Add a “Paid Acquisition System” card to the projects index page and create a detailed case‑study page (/projects/agent‑acquisition) following the same structure as the lifecycle engine: problem, thesis, architecture, demo walkthrough, economic framing, what was built and why it matters.
- **Design campaign structure and AI generation** – Implement modules that:
    - Generate ad creatives (e.g., headlines, descriptions and images) using AI models based on campaign themes, offers and target personas.
    - Select and test keywords or audience segments for search and social platforms.
    - Allocate and reallocate budgets based on performance metrics like cost per acquisition (CPA), click‑through rate (CTR) and return on ad spend (ROAS). Describe the decision logic that agents use to iterate on creative and keyword sets and to move budget from underperforming ads to those with better CAC‑versus‑LTV ratios.
- **Showcase decision iteration** – In the demo, visualise how the agents learn over time: include tables or charts that display campaign experiments, creative variations and performance metrics. When explaining agent iteration, reference the **weighted adjustments pattern** used in the scoring tool—visitors should see how the AI system continually rebalances decisions based on new data.
- **Optimize CAC vs LTV** – Integrate simple models of customer acquisition cost (CAC) and lifetime value (LTV) into the acquisition dashboard. Allow users to adjust CAC and LTV targets, and show how agents reallocate spend to achieve those targets. Visualise the trade‑offs with clear charts and avoid clutter, following data‑visualisation principles[\[7\]](https://givegoodux.com/simplify-ui-data-visualizations-7-simple-steps/#:~:text=1).
- **Create robust analytics dashboards** – Provide high‑level metrics (spend by channel, conversions, CAC, ROAS) and allow deeper exploration (ad level performance, keyword performance, creative performance). Use clean, minimal charts and emphasise the most important metrics to reduce cognitive load[\[7\]](https://givegoodux.com/simplify-ui-data-visualizations-7-simple-steps/#:~:text=1)[\[8\]](https://givegoodux.com/simplify-ui-data-visualizations-7-simple-steps/#:~:text=%5BImage%2025%3A%2008,guides).
- **Ensure extensibility** – Build the acquisition system with configurable data sources and easily swappable ad networks so that future enhancements (e.g., adding new channels or creative types) require minimal code changes. Document the architecture and provide sample code for integrating additional ad platforms.

By incorporating these tasks into the backlog, the project can evolve from a conceptual demo to a comprehensive portfolio of AI‑enabled systems. The scoring customisation features empower visitors to explore how changes to weights and segments affect outcomes, while the message‑editing tools demonstrate practical uses of AI content generation. The Paid Acquisition System highlights your ability to extend these principles beyond lifecycle marketing into broader growth and advertising domains.

## Visual Design & Branding

- **Define a cohesive visual system** – Establish a colour palette, typography scale and spacing rules that convey a restrained, premium feel. Use muted backgrounds and accent colours to highlight important information. Avoid 3‑D effects and heavy shadows in charts[\[7\]](https://givegoodux.com/simplify-ui-data-visualizations-7-simple-steps/#:~:text=1).
- **Unify components** – Refactor UI components (cards, tables, buttons, sections) into a design system library so that styling is consistent across the portfolio and demo. Use Tailwind classes or a component library to enforce the system.
- **Improve readability** – Increase line heights and white space around text and charts. Use clear, concise headings; remove redundant labels; and ensure high contrast for accessibility[\[7\]](https://givegoodux.com/simplify-ui-data-visualizations-7-simple-steps/#:~:text=1).
- **Introduce subtle animations** – Add micro‑interactions (e.g., hover effects on cards, slide‑in transitions for panels) to create a polished experience without overwhelming the user.
- **Ensure responsive design** – Test the portfolio and demo on mobile and tablet breakpoints; adjust layouts to maintain clarity and usability on small screens[\[6\]](https://www.airtightdesign.com/blog/best-website-navigation-practices/#:~:text=9,more%20of%20your%20website%20traffic).

## Writing & Contact Sections

- **Implement a writing index page** – List essays and posts on the “Writing” page using previews. Use MDX or Markdown files for content so posts can be added easily.
- **Add a contact form** – Provide a simple form on the Contact page that sends messages to an email address. Include fields for name, email, and message. Add spam protection (e.g., honeypot field) and clear success/error states.
- **Improve SEO and metadata** – Ensure each page has appropriate meta tags (title, description, Open Graph). Clear metadata helps search engines index the site and improves shareability.

## Performance & Infrastructure

- **Refactor code for Prisma v7 or pin Prisma v6** – The initial code was written for Prisma 6 and fails on Prisma 7 (see earlier errors). Update the Prisma config to use prisma.config.ts and @prisma/adapter-pg, or pin the dependencies to Prisma 6 across environments so deployment builds succeed consistently.
- **Introduce proper error handling** – Ensure that API routes gracefully handle errors (e.g., missing records, database connection issues). Return consistent JSON error messages to aid debugging.
- **Add environment‑specific configuration** – Disable seed and simulate‑delta API routes in production. Restrict access to the demo area with environment variables or simple authentication.
- **Write tests or lint rules** – Add unit tests or integration tests for the scoring algorithm, API routes and UI components. Use TypeScript strict mode and ESLint to catch type errors early.

This backlog aims to guide incremental refinements to both the portfolio site and the demo application. By following navigation best‑practices (simple menu labels and limited items)[\[1\]](https://www.airtightdesign.com/blog/best-website-navigation-practices/#:~:text=3,short%20and%20simple), focusing dashboards on clear metrics[\[11\]](https://design4users.com/dashboard-design-concepts/#:~:text=Put%20simply%2C%20a%20dashboard%20is,blocks%20sharing%20findings%20and%20insights) and simplifying visualizations[\[8\]](https://givegoodux.com/simplify-ui-data-visualizations-7-simple-steps/#:~:text=%5BImage%2025%3A%2008,guides), the project can deliver a more intuitive, engaging and visually polished experience.

[\[1\]](https://www.airtightdesign.com/blog/best-website-navigation-practices/#:~:text=3,short%20and%20simple) [\[2\]](https://www.airtightdesign.com/blog/best-website-navigation-practices/#:~:text=Well) [\[3\]](https://www.airtightdesign.com/blog/best-website-navigation-practices/#:~:text=Sticky%20top%20navigation%20menus%20stay,friendly%20and%20always%20within%20reach) [\[4\]](https://www.airtightdesign.com/blog/best-website-navigation-practices/#:~:text=7.%20Add%20a%20call,to%20your%20website%20header) [\[5\]](https://www.airtightdesign.com/blog/best-website-navigation-practices/#:~:text=frustration.%20Keep%20your%20top,items%20in%20your%20main%20menu) [\[6\]](https://www.airtightdesign.com/blog/best-website-navigation-practices/#:~:text=9,more%20of%20your%20website%20traffic) Airtight Design | 10 Best Practices for Website Navigation

https://www.airtightdesign.com/blog/best-website-navigation-practices/

[\[7\]](https://givegoodux.com/simplify-ui-data-visualizations-7-simple-steps/#:~:text=1) [\[8\]](https://givegoodux.com/simplify-ui-data-visualizations-7-simple-steps/#:~:text=%5BImage%2025%3A%2008,guides) Simplify UI Data Visualizations – in 7 Simple Steps | Joe Natoli :: UX Consultant, Speaker and Author

https://givegoodux.com/simplify-ui-data-visualizations-7-simple-steps/

[\[9\]](https://ux.stackexchange.com/questions/38434/how-to-present-weighted-values#:~:text=Often%2C%20role,points%20between%20the%20different%20skills) [\[10\]](https://ux.stackexchange.com/questions/38434/how-to-present-weighted-values#:~:text=2) forms - How to present weighted values - User Experience Stack Exchange

https://ux.stackexchange.com/questions/38434/how-to-present-weighted-values

[\[11\]](https://design4users.com/dashboard-design-concepts/#:~:text=Put%20simply%2C%20a%20dashboard%20is,blocks%20sharing%20findings%20and%20insights) Dashboard Design Inspiration: 22 UI/UX Design Concepts — Design4Users

https://design4users.com/dashboard-design-concepts/