/**
 * SINGLE SOURCE OF TRUTH for every CV fact rendered on this site.
 *
 * This file is a typed transcription of the master career document at
 *   Resume_2026/Girish_Kumar_Master_Career_180826.md
 * It is NEVER edited independently. When a fact changes, it changes in the
 * master document first, then here. See REQUIREMENTS.html §2 and §8.
 *
 * CONFIDENTIALITY RULE (REQUIREMENTS.html §14): nothing internal to Visa
 * appears here. Internal solution names have been generalised, no internal
 * architecture, table names, or KPI definitions are present, and only the
 * outcome metrics already stated on an externally-sent resume are included.
 */

/* ------------------------------------------------------------------ types */

export type Social = {
  label: string;
  href: string;
  handle: string;
};

export type Stat = {
  /** The number itself. Rendered large. */
  value: string;
  /** What the number means. Rendered small beneath it. */
  label: string;
};

export type ProjectCard = {
  name: string;
  /** One or two sentences. What was built and why it mattered. */
  summary: string;
  /** Outcome metrics only. Empty array is valid — not every project has one. */
  metrics: string[];
  tags: string[];
};

export type Role = {
  title: string;
  org: string;
  team: string;
  location: string;
  /** ISO-ish, for sorting and <time> elements. */
  start: string;
  /** null means current. */
  end: string | null;
  /** Human-readable, rendered as-is. */
  period: string;
  projects: ProjectCard[];
};

export type SkillGroup = {
  name: string;
  items: string[];
};

export type Award = {
  title: string;
  org: string;
  year: string;
  detail: string;
};

export type SelectedProject = {
  name: string;
  context: string;
  summary: string;
  tags: string[];
};

/**
 * No `specialisation` field: the "Micro Specialisation in AI and Applications"
 * that earlier versions carried was an error and does not exist.
 *
 * No `cgpa` field either, and that one is a choice rather than a correction —
 * the figure is real and lives in the master career document for resumes, but
 * it is not rendered on the site. Leaving the field out entirely means a future
 * edit cannot quietly reintroduce it by populating an unused property.
 */
export type Education = {
  institution: string;
  degree: string;
  field: string;
  period: string;
};

/* ----------------------------------------------------------------- identity */

export const identity = {
  name: 'Girish Kumar',
  /** Sits under the name in the hero. Carries the dual positioning from §1. */
  role: 'Data & AI Engineer',
  /** One line, for the hero and the JSON-LD Person schema. */
  tagline:
    'I build the RAG and LLM tooling layer, and the large-scale distributed infrastructure it has to run on.',
  location: 'Bengaluru, India',
  /**
   * The Visa role ended Aug 2026, so the site can no longer claim it in the
   * present tense. "Ex-Visa" keeps the credential — which is the strongest
   * signal on the page — without asserting current employment. If a new
   * employer lands, this becomes that name and `employerIsPast` goes false.
   */
  employer: 'Visa',
  employerIsPast: true,
} as const;

/** What the hero eyebrow and footer actually print for the employer slot. */
export const employerLabel = identity.employerIsPast
  ? `Ex-${identity.employer}`
  : identity.employer;

/**
 * Contact is deliberately form-only — no mailto and no phone number on an
 * indexed public page. See REQUIREMENTS.html L-6 and D-3.
 */
export const socials: Social[] = [
  {
    label: 'GitHub',
    href: 'https://github.com/girishkmr',
    handle: 'girishkmr',
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/girishkmr',
    handle: 'girishkmr',
  },
];

/* --------------------------------------------------------------- portrait */

/**
 * The About photograph.
 *
 * Here rather than hard-coded in `About.tsx` for the same reason every other
 * fact on this site lives in this file: a path typed into markup is a path that
 * drifts. The intrinsic dimensions travel with it because `next/image` needs
 * them to reserve the box before the file arrives — get them wrong and the
 * section shifts as it loads, which is a Lighthouse penalty and a visibly
 * cheap-looking page.
 *
 * The source file is downscaled to 1200px before it enters the repo. The
 * camera original was 2130px and 3.8 MB; `next/image` would have served a
 * sensible size regardless, but the 3.8 MB copy would still sit in a public
 * git repository forever, in every clone and every build.
 */
export const portrait = {
  src: '/girish-kumar-portrait.jpg',
  width: 1200,
  height: 1200,
} as const;

/* ------------------------------------------------------------------ resume */

/**
 * FR-06. The single canonical PDF (decision D-2), served from `public/`.
 *
 * Source: Resume_2026/Girish_resume_070926.pdf, copied in — not symlinked,
 * because Vercel builds from the repo and would not resolve a link out of it.
 * When a newer resume becomes canonical, replace `public/resume.pdf` and bump
 * `revised` here; the URL stays stable so any link already sent keeps working.
 *
 * The role-targeted variants in Resume_2026/ stay off the site by design — one
 * public URL, one document, no chance of a recruiter reading a stale variant.
 */
export const resumeFile = {
  href: '/resume.pdf',
  /** Suggested filename when saved. The public URL is generic; this is not. */
  filename: 'Girish-Kumar-Resume.pdf',
  /** Human-readable revision date, for the label beside the link. */
  revised: 'September 2026',
} as const;

/* --------------------------------------------------------------------- bio */

export const bio: string[] = [
  'I am a Data and AI engineer. Across two years at Visa Global Data Solutions I shipped both sides of applied AI in production — the RAG and LLM tooling layer, and the large-scale distributed ETL infrastructure it has to run on.',
  'On one side, that means a GenAI platform that turns a module list and a configuration into a validated, deployed Airflow DAG, with a retrieval-augmented chatbot over the pipelines it generates. On the other, it means a petabyte-scale Iceberg lakehouse feeding a natural-language BI agent, and the performance work that keeps it inside its window.',
  'I graduated from IIT Kharagpur with a dual B.Tech and M.Tech in Computer Science. I care about the part of the job most AI demos skip: cost, latency, correctness, and what happens on the run after the one you watched.',
];

/* ------------------------------------------------------------------- stats */

/**
 * The four About tiles.
 *
 * Note what is NOT here: the 15→4 day solution build time. It is the first row
 * of the run strip, drawn to scale, and asserting it a second time as a tile
 * would weaken both. Tiles carry the figures that have no before/after shape.
 */
export const stats: Stat[] = [
  { value: '4', label: 'Production data & AI systems shipped at Visa' },
  { value: '500+ TB', label: 'Historical load · 10+ TB monthly' },
  { value: '20+', label: 'KPIs shipped to Conversational BI' },
  // CGPA deliberately not shown. The figure is real and stays in the master
  // career document for resumes, but a mid-range number next to a petabyte
  // lakehouse invites the wrong comparison. The credential does the work.
  { value: 'IIT KGP', label: 'B.Tech + M.Tech dual degree, Computer Science' },
];

/**
 * The four headline results, expressed as before/after pairs so they can be
 * drawn to scale rather than asserted as numbers.
 *
 * `before` and `after` MUST share a unit — they are compared by ratio, and a
 * mismatch would silently mis-draw the bar. Human-readable strings are carried
 * separately so the drawing stays honest while the label stays idiomatic
 * ("7 hrs", not "420 min").
 */
export type Run = {
  label: string;
  /** Magnitude before the work. Same unit as `after`. */
  before: number;
  /** Magnitude after the work. Same unit as `before`. */
  after: number;
  beforeLabel: string;
  afterLabel: string;
};

export const headlineRuns: Run[] = [
  {
    label: 'Solution build',
    before: 15,
    after: 4,
    beforeLabel: '15 days',
    afterLabel: '4 days',
  },
  {
    // 7 hrs and 23 min, both in minutes.
    label: 'Pipeline run',
    before: 420,
    after: 23,
    beforeLabel: '7 hrs',
    afterLabel: '23 min',
  },
  {
    // ~3 days and under 2 hrs, both in hours.
    label: 'Manual QC',
    before: 72,
    after: 2,
    beforeLabel: '3 days',
    afterLabel: '2 hrs',
  },
  {
    label: 'Spark stages',
    before: 250,
    after: 25,
    beforeLabel: '250',
    afterLabel: '25',
  },
];

/* -------------------------------------------------------------- experience */

export const experience: Role[] = [
  {
    title: 'Data Engineer',
    org: 'Visa Inc.',
    team: 'Global Data Solutions',
    location: 'Bengaluru, India',
    start: '2024-06',
    end: '2026-08',
    period: 'Jun 2024 — Aug 2026',
    projects: [
      {
        name: 'Solution Modularisation & GenAI Deployment Platform',
        summary:
          'Decomposed multi-layer Spark and Airflow ETL pipelines into a configurable, installable Python package with dependency-ordered sub-packages and class-based interfaces, so a new solution is assembled from existing building blocks instead of written from scratch. Then built a React and Flask web app over it that uses vector search and LLM APIs to generate, validate and deploy the resulting Airflow DAGs from a UI — plus a retrieval-augmented, multi-turn chatbot over the generated pipeline documentation, so engineers can troubleshoot in natural language instead of reading code.',
        metrics: ['End-to-end solution build time cut from 15 days to 4'],
        tags: [
          'PySpark',
          'Airflow',
          'React.js',
          'Flask',
          'RAG',
          'ChromaDB',
          'LLM APIs',
          'Semantic search',
        ],
      },
      {
        name: 'Conversational BI — Data Engineering',
        summary:
          'Owned the data engineering layer beneath a natural-language BI agent used by leadership to query business data and extract KPI insights. PySpark on Kubernetes, orchestrated by Airflow, over an Apache Iceberg lakehouse — one parameterised codebase serving both multi-year historical backfills and steady-state monthly loads, with idempotent re-runs and multi-hop source-to-target reconciliation at every transformation stage.',
        metrics: [
          '500+ TB historical load, 10+ TB monthly across use cases',
          'Executor starvation fixed with dynamic allocation: ~7 hrs → ~23 min (~97% faster)',
          'Checkpoint materialisation and GROUPING SETS consolidation: ~250 → ~25 Spark stages (~10×)',
          '~759,000 small files resolved via Iceberg hash distribution and compaction: 7+ hrs → under 2',
          'Automated QC built into the DAG: 1 day → under 2 hrs',
        ],
        tags: [
          'PySpark',
          'Apache Iceberg',
          'Kubernetes',
          'Airflow',
          'Trino',
          'HDFS',
          'SQL',
          'Data modelling',
        ],
      },
      {
        name: 'AI Agents for Source-to-Target Mapping Automation',
        summary:
          'Built a multi-agent LLM system that determines whether two ETL base pulls are combinable into a single pipeline, using LLM APIs and system prompts over source-to-target mapping data. Delivered during the initial phase of a data transformation initiative and handed to the development team with a full knowledge-transfer session.',
        metrics: [],
        tags: ['Multi-agent LLM', 'LLM APIs', 'Prompt engineering', 'Python'],
      },
      {
        name: 'QC Automation & Template Rollout',
        summary:
          'Automated a manual solution quality-control process with Airflow DAGs and automated email summary notifications, and owned a cross-regional presentation template change request end to end from development through UAT.',
        metrics: ['Manual QC time cut from ~3 days to under 2 hrs', 'UAT closed with zero bugs'],
        tags: ['Airflow', 'Python', 'Data quality', 'UAT'],
      },
    ],
  },
  {
    title: 'Software Engineering Intern',
    org: 'Visa Inc.',
    team: 'Global Solutions Team',
    location: 'Bengaluru, India',
    start: '2023-05',
    end: '2023-07',
    period: 'May 2023 — Jul 2023',
    projects: [
      {
        name: 'Solution Request Portal',
        summary:
          'Replaced a manual form-and-email workflow — filter data, build a presentation by hand, email it out — with an API-based, multi-page portal where a consultant fills a form and the output is generated in real time and delivered as an email attachment. React frontend, Flask REST backend, client- and server-side validation, and dynamic form fields so new solution types could be added without rework. The framework was later adopted into full-time solution delivery work.',
        metrics: [
          'Turnaround cut from 2–3 days to minutes, at 100+ requests/month',
        ],
        tags: ['React.js', 'Flask', 'REST APIs', 'pymysql', 'ThinkCell'],
      },
    ],
  },
];

/* ------------------------------------------------------------------ skills */

export const skills: SkillGroup[] = [
  {
    name: 'Languages',
    items: ['Python', 'SQL', 'C++', 'C', 'JavaScript', 'HTML', 'CSS'],
  },
  {
    name: 'Data & Pipeline',
    items: [
      'Apache Spark',
      'PySpark',
      'Apache Airflow',
      'pandas',
      'NumPy',
      'ETL / ELT',
      'Data modelling',
    ],
  },
  {
    name: 'Big Data & Lakehouse',
    items: [
      'Apache Iceberg',
      'Trino',
      'Hadoop / HDFS',
      'Hive metastore',
      'Kubernetes (Spark-on-K8s)',
      'Parquet',
    ],
  },
  {
    name: 'AI, GenAI & LLM',
    items: [
      'RAG architecture',
      'ChromaDB',
      'Vector search & embeddings',
      'LLM APIs',
      'Prompt-driven code generation',
      'PyTorch',
      'TensorFlow',
      'GitHub Copilot',
      'Cline',
    ],
  },
  {
    name: 'Web & Tools',
    items: ['React.js', 'Flask', 'REST APIs', 'Next.js', 'Git', 'GitHub', 'ThinkCell'],
  },
];

/**
 * Specific Spark techniques, kept separate from the skills grid. These are the
 * things an interviewer actually probes, and naming them precisely is stronger
 * than another row of tags.
 */
export const sparkTechniques: string[] = [
  'Adaptive Query Execution',
  'Skew-join handling',
  'GROUPING SETS / CUBE roll-ups',
  'Salted aggregation',
  'Dynamic executor allocation',
  'Checkpoint-based materialisation',
  'Null-safe joins',
];

/* ------------------------------------------------------------------ awards */

export const awards: Award[] = [
  {
    title: 'Significant Contributor Award',
    org: 'Visa Inc.',
    year: 'FY25',
    detail: 'For accountability, quality and timely delivery on a flagship solution.',
  },
  {
    title: 'Multiple UPLIFT Awards',
    org: 'Visa Inc.',
    year: 'FY25 & FY26',
    detail: 'Peer-nominated for GenAI expertise, collaboration and knowledge-sharing.',
  },
  {
    title: 'Gold Medal — Data Analytics',
    org: 'Inter Hall, IIT Kharagpur',
    year: '2021–22',
    detail:
      'Time-series sales forecasting via ensemble modelling; reduced MAPE to 35%.',
  },
  {
    title: 'Gold Medal — Fine Arts',
    org: 'Inter Hall, IIT Kharagpur',
    year: '2022',
    detail: 'Led a 6-member gold-winning team in Thermocol & Clay Modelling.',
  },
  {
    title: 'JEE Advanced 2019 — Top 3%',
    org: 'IIT JEE',
    year: '2019',
    detail: 'Among 2.45 lakh candidates.',
  },
  {
    title: 'Codeforces Specialist',
    org: 'Codeforces',
    year: '—',
    detail: '1400+ rating.',
  },
];

/* --------------------------------------------------------------- education */

export const education: Education = {
  institution: 'Indian Institute of Technology Kharagpur',
  degree: 'B.Tech + M.Tech (Dual Degree)',
  field: 'Computer Science & Engineering',
  period: '2019 – 2024',
};

/* -------------------------------------------------- selected projects (FR-17) */

export const selectedProjects: SelectedProject[] = [
  {
    // First deliberately: it is the only project here that goes all the way
    // from a raw dataset problem to a deployed product, which is the shape the
    // Visa work has and the other academic entries do not.
    name: 'Paddy Disease Classification',
    context: 'M.Tech thesis · IIT Kharagpur · 2024',
    summary:
      'Merged four public datasets with mismatched resolutions and inconsistent labels into a single 20,352-image, 15-class corpus, then benchmarked ImageNet-pretrained VGG16, MobileNetV2 and ResNet50V2 under an identical fine-tuning regime. MobileNetV2 won on generalisation rather than raw accuracy — 88.3% validation with under half a point of train/validation gap, and the smallest model of the three. Shipped it as a farmer-facing web app: converted to TensorFlow.js behind an Express API with a Next.js upload UI, so a leaf photo becomes a diagnosis with no GPU at inference.',
    tags: ['TensorFlow', 'Transfer learning', 'TensorFlow.js', 'Next.js', 'Express'],
  },
  {
    name: 'Vision Transformer Image Classifier',
    context: 'IIT Kharagpur · Apr 2022',
    summary:
      'Built and trained a Vision Transformer on Tiny ImageNet in PyTorch and PyTorch Lightning, implementing Shifted Patch Tokenization to improve performance on a small dataset.',
    tags: ['PyTorch', 'PyTorch Lightning', 'Transformers', 'Computer vision'],
  },
  {
    name: 'Image Recognition with ResNet',
    context: 'IIT Kharagpur · Mar 2022',
    summary:
      'Implemented ResNet-50/101/152 from scratch in PyTorch with bottleneck blocks and identity downsampling; reached 70.48% accuracy on Tiny ImageNet and fine-tuned on Office31.',
    tags: ['PyTorch', 'CNNs', 'Transfer learning'],
  },
  {
    name: 'KGP-RISC 32-bit CPU',
    context: 'IIT Kharagpur · Oct–Nov 2021',
    summary:
      'Designed a 5-stage single-cycle MIPS-based CPU in Verilog, configured it on an FPGA via Xilinx, and validated the datapath with assembly-language testbenches.',
    tags: ['Verilog', 'FPGA', 'Computer architecture'],
  },
  {
    name: 'Time-Series Sales Forecasting',
    context: 'Inter Hall Data Analytics Competition · 2021–22 · Gold Medal',
    summary:
      'Ensemble of decision tree, gradient-boosted regressor and neural ensembling for sales forecasting, reducing MAPE to 35% and taking the gold medal.',
    tags: ['Ensemble modelling', 'Time series', 'scikit-learn'],
  },
];

/* --------------------------------------------------- certifications (FR-19) */

/**
 * Transcribed from the certificates themselves in `certifcations/`, so the
 * dates and credential IDs are exact rather than remembered.
 *
 * Ordered newest first, which is also strongest first: the Claude Code course
 * is the one that supports the AI/LLM positioning, and the two 2020–21 Coursera
 * Python courses are the weakest items on the page — introductory, and older
 * than the degree. They are included because they are real, but if this section
 * ever needs to be shorter, they are what goes.
 */
export type Certification = {
  name: string;
  issuer: string;
  /** Human-readable, rendered as-is. */
  date: string;
  /** ISO, for the <time> element and for sorting. */
  dateISO: string;
  /** Public verification page. Every entry here must be verifiable. */
  href: string;
};

export const certifications: Certification[] = [
  {
    name: 'Claude Code — The Practical Guide',
    issuer: 'Udemy · Academind',
    date: 'August 2026',
    dateISO: '2026-08-06',
    href: 'https://ude.my/UC-f1692c42-3abf-4496-bfe2-99839d5e4008',
  },
  {
    name: 'System Design for Beginners: Build Scalable Backend Systems',
    issuer: 'Udemy · Hayk Simonyan',
    date: 'March 2026',
    dateISO: '2026-03-21',
    href: 'https://ude.my/UC-b3835f9e-7159-474d-836d-acd83cf62926',
  },
  {
    name: 'Understanding APIs and RESTful APIs Crash Course',
    issuer: 'Udemy · Kalob Taulien',
    date: 'March 2026',
    dateISO: '2026-03-21',
    href: 'https://ude.my/UC-87d9250a-a863-4c97-8309-764df8bbe0dd',
  },
  {
    name: 'Python Data Structures',
    issuer: 'University of Michigan · Coursera',
    date: 'May 2021',
    dateISO: '2021-05-27',
    href: 'https://coursera.org/verify/KZCK7G3W246L',
  },
  {
    name: 'Programming for Everybody (Getting Started with Python)',
    issuer: 'University of Michigan · Coursera',
    date: 'June 2020',
    dateISO: '2020-06-29',
    href: 'https://coursera.org/verify/3LY34WTKRH3R',
  },
];

/* ------------------------------------------------------------------ export */

export const resume = {
  identity,
  socials,
  resumeFile,
  bio,
  stats,
  headlineRuns,
  experience,
  skills,
  sparkTechniques,
  awards,
  education,
  selectedProjects,
  certifications,
} as const;

export default resume;
